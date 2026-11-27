import { Image, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, spacing, typography } from '@/theme';

type Props = {
  onGetStarted: () => void;
  onSignIn: () => void;
};

/** First screen shown before sign-in/sign-up — see AuthScreen.tsx for the
 * actual form. Picks which of its two modes AuthScreen opens in. */
export function WelcomeScreen({ onGetStarted, onSignIn }: Props) {
  return (
    <ScreenContainer background="sunset">
      <View style={styles.content}>
        <View style={styles.hero}>
          <Image
            source={require('../../../assets/paper-plane-flourish.png')}
            style={styles.planeAccent}
            resizeMode="contain"
          />
          <Text style={styles.title}>Drift</Text>
          <Text style={styles.subtitle}>Somewhere, someone feels the same.</Text>
        </View>

        <View style={styles.actions}>
          <Button label="Get Started" onPress={onGetStarted} />
          <Button label="I already have an account" variant="ghost" onPress={onSignIn} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  planeAccent: {
    width: 64,
    height: 64,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
  },
});
