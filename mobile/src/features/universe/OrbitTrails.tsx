import { Fragment } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse } from 'react-native-svg';

import { palette } from '@/theme';

// Purely decorative — fixed proportions of the field, not tied to any
// specific bubble/thought, same spirit as DreamyBackground's sparkles.
const ORBITS = [
  { cx: 0.78, cy: 0.42, rx: 0.32, ry: 0.07, rotation: -18, dotAngle: 35 },
  { cx: 0.22, cy: 0.68, rx: 0.26, ry: 0.06, rotation: 12, dotAngle: 200 },
] as const;

export function OrbitTrails({ width, height }: { width: number; height: number }) {
  if (width <= 0 || height <= 0) return null;

  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
      {ORBITS.map((orbit, i) => {
        const cx = orbit.cx * width;
        const cy = orbit.cy * height;
        const rx = orbit.rx * width;
        const ry = orbit.ry * width;
        const angleRad = (orbit.dotAngle * Math.PI) / 180;
        const rotationRad = (orbit.rotation * Math.PI) / 180;
        // Point on the un-rotated ellipse, then rotated by `rotation` around its center.
        const ex = rx * Math.cos(angleRad);
        const ey = ry * Math.sin(angleRad);
        const dotX = cx + ex * Math.cos(rotationRad) - ey * Math.sin(rotationRad);
        const dotY = cy + ex * Math.sin(rotationRad) + ey * Math.cos(rotationRad);

        return (
          <Fragment key={i}>
            <Ellipse
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              rotation={orbit.rotation}
              originX={cx}
              originY={cy}
              fill="none"
              stroke={palette.navy}
              strokeOpacity={0.14}
              strokeWidth={1}
            />
            <Circle cx={dotX} cy={dotY} r={3} fill={palette.apricot} opacity={0.7} />
          </Fragment>
        );
      })}
    </Svg>
  );
}
