import { createHash } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

// Google Translate v2's documented cap on `q` entries per request.
const GOOGLE_TRANSLATE_BATCH_LIMIT = 128;
const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

type GoogleTranslateResponse = {
  data?: { translations?: { translatedText: string }[] };
};

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

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
   * Cached by a hash of the source text (see prisma/schema.prisma's
   * Translation model), so the same text in the same target language is
   * only ever sent to Google once. Best-effort: if the API key isn't
   * configured, or a call fails, falls back to the original text for
   * whichever entries couldn't be translated rather than failing the
   * request that needed them.
   */
  async translateBatch(texts: string[], targetLanguage: string): Promise<string[]> {
    if (texts.length === 0) return [];
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) return texts;

    const hashes = texts.map(hashText);
    const cached = await this.prisma.translation.findMany({
      where: { targetLanguage, textHash: { in: [...new Set(hashes)] } },
      select: { textHash: true, translatedText: true },
    });
    const byHash = new Map(cached.map((c) => [c.textHash, c.translatedText]));

    const missingIndexes: number[] = [];
    const results = texts.map((text, i) => {
      const hit = byHash.get(hashes[i]);
      if (hit !== undefined) return hit;
      missingIndexes.push(i);
      return text;
    });
    if (missingIndexes.length === 0) return results;

    for (let start = 0; start < missingIndexes.length; start += GOOGLE_TRANSLATE_BATCH_LIMIT) {
      const chunkIndexes = missingIndexes.slice(start, start + GOOGLE_TRANSLATE_BATCH_LIMIT);
      await this.translateChunk(chunkIndexes, texts, hashes, targetLanguage, results);
    }

    return results;
  }

  private async translateChunk(
    chunkIndexes: number[],
    texts: string[],
    hashes: string[],
    targetLanguage: string,
    results: string[],
  ): Promise<void> {
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    try {
      const response = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${encodeURIComponent(apiKey!)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: chunkIndexes.map((i) => texts[i]), target: targetLanguage, format: 'text' }),
      });
      if (!response.ok) {
        this.logger.warn(`Google Translate request failed: ${response.status} ${await response.text()}`);
        return;
      }

      const body = (await response.json()) as GoogleTranslateResponse;
      const translations = body.data?.translations ?? [];

      const toCache: { textHash: string; targetLanguage: string; sourceText: string; translatedText: string }[] = [];
      chunkIndexes.forEach((i, j) => {
        const translated = translations[j]?.translatedText;
        if (translated === undefined) return;
        results[i] = translated;
        toCache.push({ textHash: hashes[i], targetLanguage, sourceText: texts[i], translatedText: translated });
      });

      if (toCache.length > 0) {
        await this.prisma.translation.createMany({ data: toCache, skipDuplicates: true });
      }
    } catch (err) {
      this.logger.warn(`Google Translate request errored: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
