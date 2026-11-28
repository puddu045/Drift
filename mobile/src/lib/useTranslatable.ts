import { useEffect, useRef, useState } from 'react';

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
 *
 * `autoStart`: starts already translated — for a screen that opens into a
 * second view of the *same* content (e.g. Destiny's compact card handing
 * off to ThoughtDetailOverlay). Each is its own independent instance of
 * this hook, so without this the second view would silently fall back to
 * the original-language text even though the first was showing a
 * translation. Fires once, on mount, via the backend's translation cache
 * (same text+language never re-calls Google) rather than carrying the
 * translated string across as a prop — simpler, and correct even if the
 * two views ask for different source text (e.g. a thought vs. one of its
 * replies) since each independently resolves its own translation.
 */
export function useTranslatable(translateFn: TranslateFn, options?: { autoStart?: boolean }) {
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [showingTranslation, setShowingTranslation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [needsLanguage, setNeedsLanguage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attempt = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await translateFn();
      setTranslatedText(result.translatedText);
      setShowingTranslation(true);
      setNeedsLanguage(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setNeedsLanguage(true);
      } else if (err instanceof ApiError) {
        // e.g. the daily translate quota being used up (403) — anything
        // else that isn't the "set a language first" case still deserves
        // visible feedback rather than Translate silently doing nothing.
        setError(err.message);
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

  // Deliberately fires at most once per mount (empty deps) — a flag to seed
  // the initial view, not something that should re-fire if `autoStart`
  // itself changes later.
  const didAutoStart = useRef(false);
  useEffect(() => {
    if (options?.autoStart && !didAutoStart.current) {
      didAutoStart.current = true;
      attempt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    text: showingTranslation ? translatedText : null,
    showingTranslation,
    loading,
    needsLanguage,
    error,
    toggle,
    onLanguageChosen,
    dismissLanguagePrompt: () => setNeedsLanguage(false),
  };
}
