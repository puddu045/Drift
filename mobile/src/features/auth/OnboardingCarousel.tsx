import { ComponentRef, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from '@/features/universe/useReducedMotion';

const slides = [
  [require('../../../assets/onboarding/1.png'), 'Thoughts from Around the World. Discover thoughts from people worldwide. You never know who you might connect with.'],
  [require('../../../assets/onboarding/2.png'), 'Share in Your Own Language. Express your thoughts in your preferred language.'],
  [require('../../../assets/onboarding/3.png'), 'Translate with Ease. Translate thoughts from supported languages into your preferred language.'],
  [require('../../../assets/onboarding/4.png'), 'Destiny Brings a Thought. Discover a random person’s thought that could lead to an unexpected connection.'],
  [require('../../../assets/onboarding/5.png'), 'Connect If the Vibes Match. Connect with people and continue chatting.'],
  [require('../../../assets/onboarding/6.png'), 'Post Anonymously. Share thoughts without revealing your identity to other users.'],
  [require('../../../assets/onboarding/7.png'), 'Use Unwritten in Your Language. Experience the app in your preferred supported language.'],
] as const;

export function OnboardingCarousel({ onFinish }: { onFinish: () => void }) {
  const pager = useRef<ComponentRef<typeof ScrollView>>(null);
  const [page, setPage] = useState(0);
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });
  const reducedMotion = useReducedMotion();
  const artWidth = Math.min(width, height * 941 / 1672);
  const artHeight = artWidth * 1672 / 941;
  const dot = artWidth * 0.023;
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.viewport} onLayout={({ nativeEvent }) => {
        const layout = nativeEvent.layout;
        if (layout.width !== width || layout.height !== height) {
          setSize(layout);
          pager.current?.scrollTo({ x: page * layout.width, animated: false });
        }
      }}>
        {width > 0 && <ScrollView ref={pager} horizontal pagingEnabled bounces={false}
          showsHorizontalScrollIndicator={false} scrollEventThrottle={16}
          onScroll={({ nativeEvent }) => setPage(Math.max(0, Math.min(slides.length - 1, Math.round(nativeEvent.contentOffset.x / width))))}>
          {slides.map(([source, description], i) => (
            <View key={description} style={[styles.slide, { width, height }]}
              accessibilityElementsHidden={i !== page} importantForAccessibility={i === page ? 'auto' : 'no-hide-descendants'}>
              <View style={{ width: artWidth, height: artHeight }}>
                {Math.abs(i - page) <= 1 && <Image source={source} fadeDuration={0}
                  style={{ width: artWidth, height: artHeight }} accessible
                  accessibilityLabel={`Page ${i + 1} of 7. ${description}`} />}
                <View pointerEvents="none" style={[styles.dots, { top: artHeight * 0.877 - dot / 2, left: artWidth * 0.31, gap: dot * 0.65 }]}>
                  {slides.map((_, n) => <View key={n} style={{ width: dot, height: dot, borderRadius: dot / 2,
                    backgroundColor: n === i ? '#334975' : '#DCD7E2' }} />)}
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={i === 6 ? 'Get Started' : 'Next'}
                  style={styles.next} hitSlop={4} onPress={() => {
                    if (i === 6) onFinish();
                    else pager.current?.scrollTo({ x: width * (i + 1), animated: !reducedMotion });
                  }} />
              </View>
            </View>
          ))}
        </ScrollView>}
        <Pressable accessibilityRole="button" onPress={onFinish} style={styles.skip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FBF4F6' },
  viewport: { flex: 1 },
  slide: { alignItems: 'center', justifyContent: 'center' },
  dots: { position: 'absolute', flexDirection: 'row' },
  next: { position: 'absolute', left: '11%', right: '11%', top: '90.6%', bottom: '3.3%' },
  skip: { position: 'absolute', top: 0, right: 8, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  skipText: { color: '#566582', fontSize: 14 },
});
