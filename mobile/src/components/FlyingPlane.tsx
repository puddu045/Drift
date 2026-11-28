import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useReducedMotion } from '@/features/universe/useReducedMotion';

// Cubic segments form a rising sweep with one small loop above the lettering.
const segments = [
  [4, 49, 25, 49, 50, 48, 66, 34],
  [66, 34, 82, 20, 64, 13, 60, 25],
  [60, 25, 55, 40, 78, 43, 113, 9],
];

function sampleFlight() {
  const points = [{ x: 4, y: 49, distance: 0, angle: 0 }];
  for (const [x0, y0, x1, y1, x2, y2, x3, y3] of segments) {
    for (let step = 1; step <= 24; step++) {
      const t = step / 24;
      const u = 1 - t;
      const x = u ** 3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x3;
      const y = u ** 3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y3;
      const prev = points[points.length - 1];
      const direction = Math.atan2(y - prev.y, x - prev.x) * 180 / Math.PI;
      const turn = ((direction - prev.angle + 540) % 360 + 360) % 360 - 180;
      points.push({ x, y, distance: prev.distance + Math.hypot(x - prev.x, y - prev.y), angle: prev.angle + turn });
    }
  }
  return points;
}

const path = sampleFlight();
const length = path[path.length - 1].distance;
const times = path.map(p => p.distance / length);
const dashes: { x: number; y: number; angle: number; time: number }[] = [];
for (let distance = 1; distance < length - 8; distance += 7) {
  const index = path.findIndex(p => p.distance >= distance);
  const a = path[index - 1];
  const b = path[index];
  const fraction = (distance - a.distance) / (b.distance - a.distance);
  dashes.push({ x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction, angle: b.angle, time: distance / length });
}

export function FlyingPlane({ welcome = false }: { welcome?: boolean }) {
  const [progress] = useState(() => new Animated.Value(0));
  const reduced = useReducedMotion();
  useEffect(() => {
    progress.setValue(reduced ? 1 : 0);
    if (reduced) return;
    const flight = Animated.timing(progress, {
      toValue: 1, duration: welcome ? 2300 : 1950,
      easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false,
    });
    const animation = welcome ? flight : Animated.loop(Animated.sequence([flight, Animated.delay(220)]));
    animation.start();
    return () => animation.stop();
  }, [progress, reduced, welcome]);

  const scale = welcome ? 1 : 0.72;
  const size = welcome ? 26 : 21;
  const color = welcome ? '#FFFFFF' : '#34567C';
  return (
    <View pointerEvents="none" accessible={false} style={[styles.stage, welcome ? styles.wordmark : styles.loader]}>
      {dashes.map(dash => (
        <Animated.View key={dash.time} style={{
          position: 'absolute', left: dash.x * scale - 2, top: dash.y * scale,
          width: 4 * scale, height: 1.3, borderRadius: 1, backgroundColor: color,
          transform: [{ rotate: dash.angle + 'deg' }],
          opacity: progress.interpolate({
            inputRange: [dash.time, dash.time + 0.02], outputRange: [0, 0.8], extrapolate: 'clamp',
          }),
        }} />
      ))}
      <Animated.View style={{
        position: 'absolute', left: -size / 2, top: -size / 2, width: size, height: size,
        transform: [
          { translateX: progress.interpolate({ inputRange: times, outputRange: path.map(p => p.x * scale) }) },
          { translateY: progress.interpolate({ inputRange: times, outputRange: path.map(p => p.y * scale) }) },
          { rotate: progress.interpolate({ inputRange: times, outputRange: path.map(p => (p.angle + 45) + 'deg') }) },
        ],
      }}>
        <Ionicons name="paper-plane-outline" size={size} color={color} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { alignSelf: 'center' },
  wordmark: { width: 126, height: 62, marginBottom: -32, transform: [{ translateX: 48 }] },
  loader: { width: 90, height: 45, marginBottom: 8 },
});
