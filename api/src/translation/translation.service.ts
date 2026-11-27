import { createHash } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

// Google Translate v2's documented cap on `q` entries per request.
const GOOGLE_TRANSLATE_BATCH_LIMIT = 128;
const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';

// Configurable via env; defaults chosen to stay comfortably inside Google's
// free tier (500,000 characters/month) even if usage estimates drift. Read
// live (not a module-level constant) so it reflects the current env value
// on every call, not just whatever it was at process start.
function monthlyCharLimit(): number {
  return Number(process.env.TRANSLATION_MONTHLY_CHAR_LIMIT) || 450_000;
}
const WARNING_THRESHOLDS = [0.8, 0.9];

const URL_ONLY_PATTERN = /^(https?:\/\/|www\.)\S+$/i;

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function sameLanguage(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Strips emoji (incl. variation selectors/ZWJ joins) and whitespace; empty
 * remainder with at least one emoji present means "emoji-only". Three
 * separate passes, not one combined character class, since mixing a
 * combining mark (ZWJ) into a character class with other ranges is
 * flagged as unreliable by linters/engines. */
function isEmojiOnly(text: string): boolean {
  const stripped = text
    .replace(/\u200D/gu, '')
    .replace(/\uFE0F/gu, '')
    .replace(/[\p{Extended_Pictographic}\s]/gu, '');
  return stripped.length === 0 && /\p{Extended_Pictographic}/u.test(text);
}

/** Content that plainly isn't translatable prose — skipped before any cache
 * lookup or API call, not just before billing. */
function needsTranslation(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  if (URL_ONLY_PATTERN.test(trimmed)) return false;
  if (isEmojiOnly(trimmed)) return false;
  return true;
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

type GoogleTranslateResponse = {
  data?: { translations?: { translatedText: string; detectedSourceLanguage?: string }[] };
};

/** Optional "this text belongs to X" metadata, stored alongside a
 * translation purely for traceability — never part of the cache key, so it
 * doesn't affect whether identical text in different content reuses a row. */
export type TranslationSourceRef = { type: string; id: string } | null;

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  // In-process de-dup for concurrent requests translating the *same* text
  // into the *same* language at the *same* time — e.g. five viewers opening
  // a newly-popular thought within the same second. Keyed by
  // `${textHash}:${targetLanguage}`; a single Render instance, so this is
  // sufficient (the DB cache below is what de-dupes across time/instances).
  private readonly inFlight = new Map<string, Promise<string>>();

  constructor(private readonly prisma: PrismaService) {}

  /** Null means "show content exactly as written" — no preference set. */
  async getPreferredLanguage(userId: string): Promise<string | null> {
    const prefs = await this.prisma.userPreferences.findUnique({
      where: { userId },
      select: { preferredLanguage: true },
    });
    return prefs?.preferredLanguage ?? null;
  }

  /**
   * Translates each text into targetLanguage, preserving order and length.
   * `sourceRefs[i]`, if given, is stored as metadata on texts[i]'s cache row
   * (only on first write — ignored on a cache hit).
   *
   * Short-circuits, with no DB query and no API call, for: text that
   * doesn't need translating (empty/URL-only/emoji-only); text whose
   * already-known source language matches targetLanguage; a cached (text,
   * target) pair; and a request already in flight for the same pair. Falls
   * back to the original text if the API key isn't configured, the monthly
   * character limit has been reached, or the call itself fails — never
   * throws, since showing untranslated content is always an acceptable
   * degradation and failing the request that needed it isn't.
   */
  async translateBatch(
    texts: string[],
    targetLanguage: string,
    sourceRefs?: TranslationSourceRef[],
  ): Promise<string[]> {
    if (texts.length === 0) return [];
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    const results = [...texts];
    if (!apiKey) return results;

    const hashes = texts.map(hashText);
    const candidateIndexes = texts.map((_, i) => i).filter((i) => needsTranslation(texts[i]));
    if (candidateIndexes.length === 0) return results;

    const cacheRows = await this.prisma.translation.findMany({
      where: { targetLanguage, textHash: { in: [...new Set(candidateIndexes.map((i) => hashes[i]))] } },
      select: { textHash: true, translatedText: true },
    });
    const cachedByHash = new Map(cacheRows.map((r) => [r.textHash, r.translatedText]));

    const stillMissing: number[] = [];
    for (const i of candidateIndexes) {
      const hit = cachedByHash.get(hashes[i]);
      if (hit !== undefined) results[i] = hit;
      else stillMissing.push(i);
    }
    if (stillMissing.length === 0) return results;

    // A prior translation of this exact text, into ANY target language,
    // tells us its real source language — if that matches what's being
    // asked for now, the text is already in the target language and there's
    // nothing to translate. Reuses detection piggybacked on an earlier
    // translate call rather than ever calling a separate detect endpoint.
    const knownSource = await this.prisma.translation.findMany({
      where: {
        textHash: { in: [...new Set(stillMissing.map((i) => hashes[i]))] },
        detectedSourceLanguage: { not: null },
      },
      select: { textHash: true, detectedSourceLanguage: true },
      distinct: ['textHash'],
    });
    const sourceLangByHash = new Map(knownSource.map((r) => [r.textHash, r.detectedSourceLanguage as string]));

    const toCall: number[] = [];
    for (const i of stillMissing) {
      const known = sourceLangByHash.get(hashes[i]);
      if (known && sameLanguage(known, targetLanguage)) {
        results[i] = texts[i];
      } else {
        toCall.push(i);
      }
    }
    if (toCall.length === 0) return results;

    for (let start = 0; start < toCall.length; start += GOOGLE_TRANSLATE_BATCH_LIMIT) {
      const chunk = toCall.slice(start, start + GOOGLE_TRANSLATE_BATCH_LIMIT);
      await this.translateChunk(chunk, texts, hashes, targetLanguage, results, apiKey, sourceRefs);
    }

    return results;
  }

  private async translateChunk(
    indexes: number[],
    texts: string[],
    hashes: string[],
    targetLanguage: string,
    results: string[],
    apiKey: string,
    sourceRefs?: TranslationSourceRef[],
  ): Promise<void> {
    const waiters: { index: number; promise: Promise<string> }[] = [];
    const newIndexes: number[] = [];

    for (const i of indexes) {
      const key = `${hashes[i]}:${targetLanguage}`;
      const existing = this.inFlight.get(key);
      if (existing) waiters.push({ index: i, promise: existing });
      else newIndexes.push(i);
    }

    let callPromise: Promise<void> | undefined;
    if (newIndexes.length > 0) {
      const resolvers = new Map<number, (value: string) => void>();
      for (const i of newIndexes) {
        const key = `${hashes[i]}:${targetLanguage}`;
        // Registered synchronously, before the API call below is awaited,
        // so a concurrent call arriving in the meantime finds this and
        // waits on it instead of starting a second request for the same text.
        this.inFlight.set(
          key,
          new Promise<string>((resolve) => resolvers.set(i, resolve)),
        );
      }

      callPromise = this.callGoogleTranslate(newIndexes, texts, hashes, targetLanguage, apiKey, sourceRefs)
        .then((translated) => {
          newIndexes.forEach((i, j) => {
            results[i] = translated[j] ?? texts[i];
            resolvers.get(i)?.(results[i]);
          });
        })
        .catch((err: unknown) => {
          this.logger.warn(`Google Translate request errored: ${err instanceof Error ? err.message : String(err)}`);
          newIndexes.forEach((i) => {
            results[i] = texts[i];
            resolvers.get(i)?.(texts[i]);
          });
        })
        .finally(() => {
          for (const i of newIndexes) this.inFlight.delete(`${hashes[i]}:${targetLanguage}`);
        });
    }

    await Promise.all([
      ...(callPromise ? [callPromise] : []),
      ...waiters.map(async (w) => {
        results[w.index] = await w.promise;
      }),
    ]);
  }

  /** The only place that actually calls Google and spends quota. Never
   * throws for a quota block — only for a genuine request failure, which
   * the caller (translateChunk) already catches and falls back on. */
  private async callGoogleTranslate(
    indexes: number[],
    texts: string[],
    hashes: string[],
    targetLanguage: string,
    apiKey: string,
    sourceRefs?: TranslationSourceRef[],
  ): Promise<string[]> {
    const chunkTexts = indexes.map((i) => texts[i]);
    const charCount = chunkTexts.reduce((sum, t) => sum + t.length, 0);

    if (!(await this.reserveQuota(charCount))) {
      this.logger.warn(
        `Monthly translation character limit reached (${monthlyCharLimit()}) — showing original text until next month.`,
      );
      return chunkTexts;
    }

    const response = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: chunkTexts, target: targetLanguage, format: 'text' }),
    });
    if (!response.ok) {
      this.logger.warn(`Google Translate request failed: ${response.status} ${await response.text()}`);
      return chunkTexts;
    }

    const body = (await response.json()) as GoogleTranslateResponse;
    const translations = body.data?.translations ?? [];

    const toCache = indexes.map((i, j) => {
      const translated = translations[j]?.translatedText ?? texts[i];
      const detected = translations[j]?.detectedSourceLanguage ?? null;
      const ref = sourceRefs?.[i] ?? null;
      return {
        textHash: hashes[i],
        targetLanguage,
        sourceText: texts[i],
        translatedText: translated,
        detectedSourceLanguage: detected,
        sourceType: ref?.type ?? null,
        sourceId: ref?.id ?? null,
      };
    });
    if (toCache.length > 0) {
      await this.prisma.translation.createMany({ data: toCache, skipDuplicates: true });
    }

    return toCache.map((row) => row.translatedText);
  }

  /** Atomically increments this month's usage counter and returns whether
   * the call is within budget. Logs once per threshold crossing (80%/90%)
   * and once when the limit itself is first reached this call.
   *
   * The increment and the under-limit check happen in one conditional
   * UPDATE (not a separate read-then-write) so concurrent calls near the
   * cap can't all pass the check before any of their writes land — without
   * this, simultaneous requests could jointly push usage arbitrarily far
   * past the configured monthly budget. */
  private async reserveQuota(charCount: number): Promise<boolean> {
    const limit = monthlyCharLimit();
    const month = currentMonthKey();

    const existing = await this.prisma.translationUsage.findUnique({ where: { month } });
    const before = existing?.characterCount ?? 0;
    if (before >= limit) return false;

    if (!existing) {
      await this.prisma.translationUsage.upsert({
        where: { month },
        create: { month, characterCount: 0 },
        update: {},
      });
    }

    // Conditional on the row still being under budget *at the moment of the
    // write*, not on the `before` value read above — so two concurrent
    // calls that both read "under budget" can't both then write: only
    // whichever one's UPDATE actually finds the row still under the limit
    // (not yet incremented by the other) applies.
    const result = await this.prisma.translationUsage.updateMany({
      where: { month, characterCount: { lt: limit } },
      data: { characterCount: { increment: charCount } },
    });
    if (result.count === 0) return false;

    const after = before + charCount;

    for (const threshold of WARNING_THRESHOLDS) {
      const thresholdChars = limit * threshold;
      if (before < thresholdChars && after >= thresholdChars) {
        this.logger.warn(
          `Translation usage crossed ${Math.round(threshold * 100)}% of the monthly limit (${after}/${limit} characters, ${month}).`,
        );
      }
    }
    if (before < limit && after >= limit) {
      this.logger.warn(`Translation monthly limit reached (${after}/${limit} characters, ${month}).`);
    }

    return true;
  }
}
