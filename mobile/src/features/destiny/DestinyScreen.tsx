import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { MoodTag } from '@/components/MoodTag';
import { ScreenContainer } from '@/components/ScreenContainer';
import { replyToThought, Thought } from '@/features/thoughts/api';
import { ApiError } from '@/lib/api';
import { colors, spacing, typography } from '@/theme';

import { getTodayDestiny } from './api';

export function DestinyScreen() {
  const [thought, setThought] = useState<Thought | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    getTodayDestiny()
      .then(setThought)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'No Destiny thought available today.'),
      );
  }, []);

  const onReply = async () => {
    if (!thought || !replyText.trim()) return;
    await replyToThought(thought.id, replyText.trim());
    setReplyText('');
    setSent(true);
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Destiny</Text>
        <Text style={styles.subtitle}>One stranger&rsquo;s thought, just for you today.</Text>
      </View>

      <View style={styles.content}>
        {!thought && !error && <ActivityIndicator color={colors.accent} />}
        {error && <Text style={styles.error}>{error}</Text>}
        {thought && (
          <Card style={styles.card}>
            <MoodTag mood={thought.mood} />
            <Text style={styles.text}>{thought.text}</Text>
            {sent ? (
              <Text style={styles.sent}>Your reply drifted their way.</Text>
            ) : (
              <View style={styles.replyRow}>
                <TextInput
                  style={styles.input}
                  value={replyText}
                  onChangeText={setReplyText}
                  placeholder="Reply..."
                  placeholderTextColor={colors.textSecondary}
                  maxLength={280}
                />
                <Button label="Send" onPress={onReply} disabled={!replyText.trim()} />
              </View>
            )}
          </Card>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  card: {
    gap: spacing.md,
  },
  text: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
    lineHeight: 28,
  },
  error: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.danger,
    textAlign: 'center',
  },
  sent: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.accent,
  },
  replyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
  },
});
