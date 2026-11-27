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
    userPreferences: { findUnique: vi.fn() },
  };
  let service: TranslationService;
  const originalApiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

  beforeEach(async () => {
    vi.resetAllMocks();
    process.env.GOOGLE_TRANSLATE_API_KEY = 'test-key';
    prisma.translation.findMany.mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      providers: [TranslationService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(TranslationService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.GOOGLE_TRANSLATE_API_KEY = originalApiKey;
  });

  describe('translateBatch', () => {
    it('returns the originals unchanged when no API key is configured', async () => {
      delete process.env.GOOGLE_TRANSLATE_API_KEY;
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      await expect(service.translateBatch(['hola'], 'en')).resolves.toEqual(['hola']);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns a cached translation without calling the API', async () => {
      // Mirrors whatever textHash the service actually looked up, rather
      // than guessing the hash algorithm — the point of this test is that
      // a cache hit skips the network call, not the hash itself.
      prisma.translation.findMany.mockImplementation(
        async ({ where }: { where: { textHash: { in: string[] } } }) =>
          where.textHash.in.map((textHash) => ({ textHash, translatedText: 'hello' })),
      );
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      await expect(service.translateBatch(['hola'], 'en')).resolves.toEqual(['hello']);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('calls the API for a cache miss, translates, and caches the result', async () => {
      const fetchSpy = vi.fn().mockResolvedValue(
        jsonResponse({ data: { translations: [{ translatedText: 'hello' }] } }),
      );
      vi.stubGlobal('fetch', fetchSpy);

      await expect(service.translateBatch(['hola'], 'en')).resolves.toEqual(['hello']);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(String(url)).toContain('translation.googleapis.com');
      expect(JSON.parse(init.body)).toEqual({ q: ['hola'], target: 'en', format: 'text' });

      expect(prisma.translation.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ targetLanguage: 'en', sourceText: 'hola', translatedText: 'hello' })],
        skipDuplicates: true,
      });
    });

    it('falls back to the original text when the API call fails', async () => {
      const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({}, false, 500));
      vi.stubGlobal('fetch', fetchSpy);

      await expect(service.translateBatch(['hola'], 'en')).resolves.toEqual(['hola']);
      expect(prisma.translation.createMany).not.toHaveBeenCalled();
    });

    it('falls back to the original text when fetch itself throws', async () => {
      const fetchSpy = vi.fn().mockRejectedValue(new Error('network down'));
      vi.stubGlobal('fetch', fetchSpy);

      await expect(service.translateBatch(['hola'], 'en')).resolves.toEqual(['hola']);
    });

    it('returns an empty array without touching the cache or the API for no texts', async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      await expect(service.translateBatch([], 'en')).resolves.toEqual([]);
      expect(prisma.translation.findMany).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
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
});
