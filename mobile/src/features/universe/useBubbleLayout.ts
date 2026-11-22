import { useMemo } from 'react';

export type BubbleLayout = {
  x: number;
  y: number;
  size: number;
  driftRadiusX: number;
  driftRadiusY: number;
  periodMs: number;
  phase: number;
};

const MIN_SIZE = 92;
const MAX_SIZE = 148;

// Deterministic pseudo-random in [0, 1), seeded by a plain number. Used instead of
// Math.random() so bubble placement stays a pure function of (index, size) — this
// keeps it compatible with the React Compiler's purity checks and means layout
// doesn't jump around on unrelated re-renders.
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 43758.5453123;
  return x - Math.floor(x);
}

function computeLayout(count: number, width: number, height: number): BubbleLayout[] {
  const columns = Math.max(1, Math.round(Math.sqrt((count * width) / height)));
  const rows = Math.ceil(count / columns);
  const cellWidth = width / columns;
  const cellHeight = height / rows;

  // Deterministic shuffle of grid cells (Fisher-Yates seeded by the loop index).
  const cells = Array.from({ length: columns * rows }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(i * 7.13 + 1) * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  return Array.from({ length: count }, (_, i) => {
    const cell = cells[i % cells.length];
    const col = cell % columns;
    const row = Math.floor(cell / columns);
    const size = MIN_SIZE + seededRandom(i * 3.17 + 11) * (MAX_SIZE - MIN_SIZE);

    const jitterX = (seededRandom(i * 5.31 + 23) - 0.5) * (cellWidth - size) * 0.6;
    const jitterY = (seededRandom(i * 6.47 + 29) - 0.5) * (cellHeight - size) * 0.6;

    const x = col * cellWidth + (cellWidth - size) / 2 + jitterX;
    const y = row * cellHeight + (cellHeight - size) / 2 + jitterY;

    return {
      x: Math.max(0, Math.min(width - size, x)),
      y: Math.max(0, Math.min(height - size, y)),
      size,
      driftRadiusX: 10 + seededRandom(i * 2.71 + 41) * 14,
      driftRadiusY: 10 + seededRandom(i * 4.19 + 53) * 14,
      periodMs: 9000 + seededRandom(i * 8.59 + 61) * 7000,
      phase: seededRandom(i * 9.73 + 71) * Math.PI * 2,
    };
  });
}

/**
 * Places bubbles on a loose grid with per-cell jitter so they stay spread out
 * and readable rather than clumping or heavily overlapping, while still
 * looking organic rather than a rigid grid. Recomputed only when the bubble
 * count or the container size changes.
 */
export function useBubbleLayout(count: number, width: number, height: number): BubbleLayout[] {
  return useMemo(() => {
    if (width <= 0 || height <= 0) return [];
    return computeLayout(count, width, height);
  }, [count, width, height]);
}
