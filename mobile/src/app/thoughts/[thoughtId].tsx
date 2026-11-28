import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { getThought, ThoughtDetail } from '@/features/thoughts/api';
import { ThoughtDetailOverlay } from '@/features/universe/ThoughtDetailOverlay';
import { colors } from '@/theme';

// Deep-link target for a single thought (e.g. tapping a reaction/reply
// notification) — everywhere else opens ThoughtDetailOverlay from a Thought
// it already has on hand (a feed card, Destiny's preview), so this is the
// one place that fetches a thought by id with nothing else to show first.
export default function ThoughtRoute() {
  const { thoughtId } = useLocalSearchParams<{ thoughtId: string }>();
  const router = useRouter();
  const [thought, setThought] = useState<ThoughtDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    getThought(thoughtId)
      .then((result) => {
        if (!cancelled) setThought(result);
      })
      .catch(() => {
        if (!cancelled) router.back();
      });
    return () => {
      cancelled = true;
    };
  }, [thoughtId, router]);

  if (!thought) {
    return (
      <ScreenContainer background="haze">
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      </ScreenContainer>
    );
  }

  return <ThoughtDetailOverlay thought={thought} onClose={() => router.back()} onDeleted={() => router.back()} />;
}
