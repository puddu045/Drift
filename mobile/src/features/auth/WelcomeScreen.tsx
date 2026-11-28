import { useFonts } from 'expo-font';
import { FlyingPlane } from '@/components/FlyingPlane';
import { UnwrittenWordmark } from '@/components/UnwrittenWordmark';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, spacing, typography } from '@/theme';

const taglineFont = { LatoRegular: require('../../../assets/fonts/Lato_400Regular.ttf') };

type Props = {
  onGetStarted: () => void;
  onSignIn: () => void;
};

/** First screen shown before sign-in/sign-up — see AuthScreen.tsx for the
 * actual form. Picks which of its two modes AuthScreen opens in. */
export function WelcomeScreen({ onGetStarted, onSignIn }: Props) {
  const [fontLoaded] = useFonts(taglineFont);
  return (
    <ScreenContainer background="overlook">
      <View style={styles.content}>
        <View style={styles.hero}>
          <FlyingPlane welcome />
          <UnwrittenWordmark size={65} color="white" />
          <Text style={[styles.subtitle, fontLoaded && { fontFamily: 'LatoRegular' }]}>{'The next chapter\ncould be a stranger away.'}</Text>
        </View>

        <View style={styles.actions}>
          <Button label="Get Started" labelColor={colors.textPrimary} onPress={onGetStarted} style={styles.getStartedButton} />
          <Pressable accessibilityRole="button" onPress={onSignIn} style={styles.signInButton}><Text style={styles.link}>I already have an account</Text></Pressable>
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
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 19,
    maxWidth: 310,
    lineHeight: 28,
    color: 'white',
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  getStartedButton: {
    width: '70%',
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  signInButton: { minHeight: 44, justifyContent: 'center' },
  link: { textDecorationLine: 'underline', color: 'white', fontSize: 14 },
});
