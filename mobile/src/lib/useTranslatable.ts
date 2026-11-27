import { useState } from 'react';

import { updatePreferences } from '@/features/profile/api';
import { ApiError } from '@/lib/api';

type TranslateFn = () => Promise<{ translatedText: string; language: string }>;

/**
 * Drives a single "Translate" / "Show original" toggle for one piece of
 * content (a thought, a reply, a bio — anything with its own translate
 * endpoint). On-demand only: nothing is translated until `toggle()` is
 * called.
 *
 * If the viewer hasn't set a preferred language yet, the backend rejects
 * the request with a 400 — `needsLanguage` turns on so the caller can show
 * a language picker, and `onLanguageChosen` saves it and retries this same
 * translation automatically.
 */
export function useTranslatable(translateFn: TranslateFn) {
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [showingTranslation, setShowingTranslation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [needsLanguage, setNeedsLanguage] = useState(false);

  const attempt = async () => {
    setLoading(true);
    try {
      const result = await translateFn();
      setTranslatedText(result.translatedText);
      setShowingTranslation(true);
      setNeedsLanguage(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setNeedsLanguage(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    if (showingTranslation) {
      setShowingTranslation(false);
      return;
    }
    if (translatedText) {
      setShowingTranslation(true);
      return;
    }
    attempt();
  };

  const onLanguageChosen = async (code: string) => {
    await updatePreferences({ preferredLanguage: code });
    await attempt();
  };

  return {
    text: showingTranslation ? translatedText : null,
    showingTranslation,
    loading,
    needsLanguage,
    toggle,
    onLanguageChosen,
    dismissLanguagePrompt: () => setNeedsLanguage(false),
  };
}
