import { Test } from '@nestjs/testing';
import { afterEach, vi } from 'vitest';

import { PrismaService } from '../prisma/prisma.service.js';
import { TranslationService } from './translation.service.js';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) } as Response;
}

describe('TranslationService', () => {
  const prisma = {
    translation: { findMany: vi.fn(), createMany: vi.fn() },
    translationUsage: { findUnique: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
    translationQuota: { findUnique: vi.fn(), count: vi.fn(), create: vi.fn() },
    userPreferences: { findUnique: vi.fn() },
  };
  let service: TranslationService;
  const originalApiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  const originalLimit = process.env.TRANSLATION_MONTHLY_CHAR_LIMIT;
  const originalDailyLimit = process.env.TRANSLATE_DAILY_LIMIT;

  // Cache-lookup and "known source language" queries both hit
  // prisma.translation.findMany, distinguished by whether `targetLanguage`
  // is part of the where clause — this routes each to the right fixture
  // instead of guessing the service's hash algorithm.
  function mockTranslationLookups(opts: {
    cached?: { textHash: string; translatedText: string }[];
    knownSource?: { textHash: string; detectedSourceLanguage: string }[];
  }) {
    prisma.translation.findMany.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
      if ('targetLanguage' in where) return opts.cached ?? [];
      return opts.knownSource ?? [];
    });
  }

  beforeEach(async () => {
    vi.resetAllMocks();
    process.env.GOOGLE_TRANSLATE_API_KEY = 'test-key';
    delete process.env.TRANSLATION_MONTHLY_CHAR_LIMIT;
    delete process.env.TRANSLATE_DAILY_LIMIT;
    mockTranslationLookups({});
    prisma.translationUsage.findUnique.mockResolvedValue(null);
    prisma.translationUsage.updateMany.mockResolvedValue({ count: 1 });
    const moduleRef = await Test.createTestingModule({
      providers: [TranslationService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(TranslationService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.GOOGLE_TRANSLATE_API_KEY = originalApiKey;
    if (originalLimit === undefined) delete process.env.TRANSLATION_MONTHLY_CHAR_LIMIT;
    else process.env.TRANSLATION_MONTHLY_CHAR_LIMIT = originalLimit;
    if (originalDailyLimit === undefined) delete process.env.TRANSLATE_DAILY_LIMIT;
    else process.env.TRANSLATE_DAILY_LIMIT = originalDailyLimit;
  });

  describe('translateBatch', () => {
    it('returns the originals unchanged when no API key is configured', async () => {
      delete process.env.GOOGLE_TRANSLATE_API_KEY;
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      await expect(service.translateBatch(['hola'], 'en')).resolves.toEqual(['hola']);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns a cached translation without calling the API (cache hit)', async () => {
      // Mirrors whatever textHash the service actually looked up, rather
      // than guessing its hash algorithm — the point here is that a hit
      // skips the network call entirely, not the hash itself.
      prisma.translation.findMany.mockImplementation(
        async ({ where }: { where: { textHash?: { in: string[] }; targetLanguage?: string } }) =>
          where.targetLanguage ? where.textHash!.in.map((textHash) => ({ textHash, translatedText: 'hello' })) : [],
      );
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      await expect(service.translateBatch(['hola'], 'en')).resolves.toEqual(['hello']);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('calls the API for a cache miss, translates, caches the result with detected language and source ref', async () => {
      const fetchSpy = vi
        .fn()
        .mockResolvedValue(jsonResponse({ data: { translations: [{ translatedText: 'hello', detectedSourceLanguage: 'es' }] } }));
      vi.stubGlobal('fetch', fetchSpy);

      await expect(
        service.translateBatch(['hola'], 'en', [{ type: 'thought', id: 't1' }]),
      ).resolves.toEqual(['hello']);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(String(url)).toContain('translation.googleapis.com');
      expect(JSON.parse(init.body)).toEqual({ q: ['hola'], target: 'en', format: 'text' });

      expect(prisma.translation.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            targetLanguage: 'en',
            sourceText: 'hola',
            translatedText: 'hello',
            detectedSourceLanguage: 'es',
            sourceType: 'thought',
            sourceId: 't1',
          }),
        ],
        skipDuplicates: true,
      });
      expect(prisma.translationUsage.upsert).toHaveBeenCalled();
    });

    it('treats different text (e.g. edited content) as an independent cache entry', async () => {
      // Nothing is pre-seeded as cached, so "hello!" (as if some other,
      // already-cached text like "hello" had just been edited to this)
      // still goes to the API — a hash-keyed cache invalidates
      // automatically on any content change, with no separate
      // invalidation step needed.
      const fetchSpy = vi
        .fn()
        .mockResolvedValue(jsonResponse({ data: { translations: [{ translatedText: 'bonjour!' }] } }));
      vi.stubGlobal('fetch', fetchSpy);

      await expect(service.translateBatch(['hello!'], 'fr')).resolves.toEqual(['bonjour!']);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(JSON.parse(fetchSpy.mock.calls[0][1].body).q).toEqual(['hello!']);
    });

    it('skips the API call when the text is already in the target language (reusing a previously detected source)', async () => {
      prisma.translation.findMany.mockImplementation(
        async ({ where }: { where: { targetLanguage?: string; textHash?: { in: string[] } } }) => {
          if (where.targetLanguage) return []; // no direct (text, target) cache hit
          // But a prior translation of this exact text (into some other
          // target) told us its real source language is "en".
          return (where.textHash?.in ?? []).map((textHash) => ({ textHash, detectedSourceLanguage: 'en' }));
        },
      );
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      await expect(service.translateBatch(['hello'], 'en')).resolves.toEqual(['hello']);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('falls back to the original text when the API call fails', async () => {
      const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({}, false, 500));
      vi.stubGlobal('fetch', fetchSpy);

      await expect(service.translateBatch(['hola'], 'en')).resolves.toEqual(['hola']);
      expect(prisma.translation.createMany).not.toHaveBeenCalled();
    });

    it('falls back to the original text when fetch itself throws, with no retry', async () => {
      const fetchSpy = vi.fn().mockRejectedValue(new Error('network down'));
      vi.stubGlobal('fetch', fetchSpy);

      await expect(service.translateBatch(['hola'], 'en')).resolves.toEqual(['hola']);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('returns an empty array without touching the cache or the API for no texts', async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      await expect(service.translateBatch([], 'en')).resolves.toEqual([]);
      expect(prisma.translation.findMany).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('skips empty, URL-only and emoji-only text without a cache lookup or API call', async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      await expect(service.translateBatch(['', '   ', 'https://example.com/x', '😀🎉'], 'en')).resolves.toEqual([
        '',
        '   ',
        'https://example.com/x',
        '😀🎉',
      ]);
      expect(prisma.translation.findMany).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('still translates real text mixed in with untranslatable entries', async () => {
      const fetchSpy = vi
        .fn()
        .mockResolvedValue(jsonResponse({ data: { translations: [{ translatedText: 'hola' }] } }));
      vi.stubGlobal('fetch', fetchSpy);

      await expect(service.translateBatch(['', 'hello', '😀'], 'es')).resolves.toEqual(['', 'hola', '😀']);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(JSON.parse(fetchSpy.mock.calls[0][1].body).q).toEqual(['hello']);
    });

    it('de-dupes concurrent requests for the same (text, target) into a single API call', async () => {
      let resolveFetch!: (value: Response) => void;
      const fetchSpy = vi.fn().mockReturnValue(
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
      );
      vi.stubGlobal('fetch', fetchSpy);

      // Both start before either finishes — the second must reuse the
      // first's in-flight call rather than firing its own.
      const first = service.translateBatch(['hola'], 'en');
      const second = service.translateBatch(['hola'], 'en');

      resolveFetch(jsonResponse({ data: { translations: [{ translatedText: 'hello' }] } }));

      await expect(first).resolves.toEqual(['hello']);
      await expect(second).resolves.toEqual(['hello']);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('does not call the API once the monthly character limit is reached, falling back to original text', async () => {
      process.env.TRANSLATION_MONTHLY_CHAR_LIMIT = '10';
      prisma.translationUsage.findUnique.mockResolvedValue({ characterCount: 10 });
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      await expect(service.translateBatch(['hola'], 'en')).resolves.toEqual(['hola']);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(prisma.translationUsage.upsert).not.toHaveBeenCalled();
    });

    it('records actual character usage for a successful call', async () => {
      const fetchSpy = vi
        .fn()
        .mockResolvedValue(jsonResponse({ data: { translations: [{ translatedText: 'hola' }] } }));
      vi.stubGlobal('fetch', fetchSpy);

      await service.translateBatch(['hello'], 'es');

      expect(prisma.translationUsage.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { characterCount: { increment: 'hello'.length } },
        }),
      );
    });
  });

  describe('getPreferredLanguage', () => {
    it('returns null when the user has no preference set', async () => {
      prisma.userPreferences.findUnique.mockResolvedValue({ preferredLanguage: null });
      await expect(service.getPreferredLanguage('u1')).resolves.toBeNull();
    });

    it('returns null when the user has no preferences row at all', async () => {
      prisma.userPreferences.findUnique.mockResolvedValue(null);
      await expect(service.getPreferredLanguage('u1')).resolves.toBeNull();
    });

    it('returns the set language', async () => {
      prisma.userPreferences.findUnique.mockResolvedValue({ preferredLanguage: 'es' });
      await expect(service.getPreferredLanguage('u1')).resolves.toBe('es');
    });
  });

  describe('reserveDailyQuota', () => {
    it('allows and records a first-time translation of a piece of content today', async () => {
      prisma.translationQuota.findUnique.mockResolvedValue(null);
      prisma.translationQuota.count.mockResolvedValue(0);

      await expect(service.reserveDailyQuota('u1', 'thought', 't1')).resolves.toBe(true);
      expect(prisma.translationQuota.create).toHaveBeenCalledWith({
        data: { userId: 'u1', contentType: 'thought', contentId: 't1', day: expect.any(String) },
      });
    });

    it('allows re-translating something already recorded today without spending another slot', async () => {
      prisma.translationQuota.findUnique.mockResolvedValue({ id: 'q1' });
      prisma.translationQuota.count.mockResolvedValue(5); // would otherwise be at the limit

      await expect(service.reserveDailyQuota('u1', 'thought', 't1')).resolves.toBe(true);
      expect(prisma.translationQuota.create).not.toHaveBeenCalled();
    });

    it('refuses a new piece of content once the shared daily limit is reached', async () => {
      prisma.translationQuota.findUnique.mockResolvedValue(null);
      prisma.translationQuota.count.mockResolvedValue(5);

      await expect(service.reserveDailyQuota('u1', 'reply', 'r1')).resolves.toBe(false);
      expect(prisma.translationQuota.create).not.toHaveBeenCalled();
    });

    it('respects TRANSLATE_DAILY_LIMIT', async () => {
      process.env.TRANSLATE_DAILY_LIMIT = '2';
      prisma.translationQuota.findUnique.mockResolvedValue(null);
      prisma.translationQuota.count.mockResolvedValue(2);

      await expect(service.reserveDailyQuota('u1', 'profile_bio', 'u2')).resolves.toBe(false);
    });

    it('shares the pool across content types — a bio counts toward the same limit as thoughts', async () => {
      prisma.translationQuota.findUnique.mockResolvedValue(null);
      prisma.translationQuota.count.mockResolvedValue(3);

      await expect(service.reserveDailyQuota('u1', 'profile_bio', 'u2')).resolves.toBe(true);
      expect(prisma.translationQuota.count).toHaveBeenCalledWith({
        where: { userId: 'u1', day: expect.any(String) },
      });
    });
  });

  describe('getDailyUsage', () => {
    it('returns how much of the shared quota has been used today, and the configured limit', async () => {
      prisma.translationQuota.count.mockResolvedValue(3);
      await expect(service.getDailyUsage('u1')).resolves.toEqual({ used: 3, limit: 5 });
    });

    it('reflects TRANSLATE_DAILY_LIMIT', async () => {
      process.env.TRANSLATE_DAILY_LIMIT = '10';
      prisma.translationQuota.count.mockResolvedValue(3);
      await expect(service.getDailyUsage('u1')).resolves.toEqual({ used: 3, limit: 10 });
    });
  });
});
