#!/usr/bin/env node
// One-time batch translation of the mobile app's UI strings. Reads
// mobile/src/i18n/locales/en.json (the single English source of truth) and
// writes mobile/src/i18n/locales/<code>.json for every other supported
// locale, via the same Google Translate v2 REST API the backend already
// uses for on-demand content translation (api/src/translation/translation.service.ts).
//
// This is NOT run by the app or the backend at request time — it's a
// one-off generator you re-run by hand whenever en.json gains new keys, so
// the mobile app can load static, pre-translated JSON with zero runtime API
// calls for its own UI chrome.
//
// Usage (from the api/ directory, with a Google Translate API key available
// as either GOOGLE_TRANSLATE_API_KEY, matching production, or a plain `key`
// env var):
//   node scripts/generate-mobile-i18n.mjs
//   node scripts/generate-mobile-i18n.mjs es,fr,de   # only regenerate these codes

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, '..', '..', 'mobile', 'src', 'i18n', 'locales');
const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';
const BATCH_LIMIT = 128; // Google Translate v2's documented cap on `q` entries per request.

// Keep in sync with mobile/src/i18n/supportedLocales.ts — RTL languages
// (ar, he, fa, ur) are deliberately excluded; they need layout mirroring,
// not just text, which is a separate follow-up.
const ALL_LOCALES = [
  'es', 'pt', 'fr', 'de', 'it', 'nl', 'pl', 'sv', 'el', 'tr', 'ru', 'uk',
  'hi', 'bn', 'pa', 'gu', 'mr', 'ta', 'te', 'kn', 'ml', 'th', 'vi', 'id',
  'ms', 'tl', 'ko', 'ja', 'zh-CN', 'zh-TW', 'sw',
];

function apiKey() {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.key;
  if (!key) {
    console.error('No Google Translate API key found (checked GOOGLE_TRANSLATE_API_KEY and key env vars).');
    process.exit(1);
  }
  return key;
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

async function translateBatch(texts, target, key) {
  const response = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: texts, target, format: 'text' }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Google Translate request failed (${response.status}): ${body}`);
  }
  const data = await response.json();
  return data.data.translations.map((t) => t.translatedText);
}

async function translateLocale(sourceEntries, target, key) {
  const keys = sourceEntries.map(([k]) => k);
  const texts = sourceEntries.map(([, v]) => v);
  const result = {};
  for (const batch of chunk(keys.map((k, i) => [k, texts[i]]), BATCH_LIMIT)) {
    const translated = await translateBatch(batch.map(([, v]) => v), target, key);
    batch.forEach(([k], i) => {
      result[k] = translated[i];
    });
  }
  return result;
}

async function main() {
  const key = apiKey();
  const requested = process.argv[2]?.split(',').filter(Boolean);
  const locales = requested && requested.length > 0 ? requested : ALL_LOCALES;

  const en = JSON.parse(readFileSync(join(LOCALES_DIR, 'en.json'), 'utf8'));
  const entries = Object.entries(en);

  for (const locale of locales) {
    if (!ALL_LOCALES.includes(locale)) {
      console.warn(`Skipping unknown locale "${locale}" (not in ALL_LOCALES).`);
      continue;
    }
    process.stdout.write(`Translating ${entries.length} strings to ${locale}... `);
    try {
      const translated = await translateLocale(entries, locale, key);
      // Preserve en.json's key order for readable diffs.
      const ordered = {};
      for (const [k] of entries) ordered[k] = translated[k];
      writeFileSync(join(LOCALES_DIR, `${locale}.json`), JSON.stringify(ordered, null, 2) + '\n');
      console.log('done.');
    } catch (err) {
      console.log('FAILED.');
      console.error(err instanceof Error ? err.message : err);
    }
  }
}

main();
