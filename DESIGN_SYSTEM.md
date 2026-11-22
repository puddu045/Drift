# Drift — Design System

See `DECISIONS.md` (#14) for the approved palette direction.

## 1. Visual direction
Premium, minimal, calm, dreamy, slightly magical. Avoid: heavy gradients, clutter, excessive
icons, heavy shadows, childish illustration, aggressive gamification.

## 2. Color palette — "Midnight Dreamscape"

| Token | Hex | Use |
|---|---|---|
| `color.navy` | `#101A35` | Primary background (dark mode base) |
| `color.deepBlue` | `#24365E` | Secondary surfaces, cards |
| `color.pastelBlue` | `#A9C9F5` | Accents, calm mood tag |
| `color.lavender` | `#C8B7F0` | Accents, deep/reflective mood tag |
| `color.softPink` | `#F2C7DA` | Accents, love mood tag |
| `color.peach` | `#F4D1BD` | Accents, hopeful mood tag |
| `color.offWhite` | `#F8F9FD` | Primary text on dark surfaces, light-mode background |

Exact mood-color mapping and a light-mode variant will be finalized once real screens exist
(Phase 1), using this palette as the fixed starting point.

## 3. Typography
- UI text: a clean, highly legible sans-serif (e.g. Inter or similar) — final pick proposed once
  first screens are built, so it can be seen in context.
- Logo/wordmark: may use a more expressive display font; never for body text or the composer.
- Full dynamic type / scalable font size support required (iOS/Android accessibility settings).

## 4. Navigation (working assumption, see DECISIONS.md)
Bottom tabs: **Universe · Destiny · Create · Connections · Profile**. Messaging lives inside
Connections rather than as its own tab, to keep the tab bar minimal.

## 5. Bubble visual spec
- Soft, semi-transparent "glass" surface with a subtle glow at the edge.
- Varying sizes; avoid heavy overlap; readable text at rest (not just when expanded).
- Slow, non-rigid drifting motion (2D, per decision #2) — not bouncing off walls like a screensaver,
  more like gentle suspension.
- Tap → pause in place → smooth expand → full thought readable → reactions/reply/connect actions
  appear → close returns it to drifting.
- Mood indicated by a subtle color tint/glow using the palette's accent tokens, not a loud badge.
- Respects OS-level reduced-motion: falls back to a fade/static layout instead of continuous drift.

## 6. Accessibility baseline
- Dynamic font scaling, screen reader labels on all interactive elements (bubbles, reactions,
  buttons), minimum touch target size (44x44pt), visible focus states, sufficient contrast
  against both dark and light backgrounds, full reduced-motion fallback.

## 7. Status
This is the Phase 0 design foundation. Phase 1 will turn this into actual component specs
(buttons, inputs, cards, mood tags) and the first real screens for review.
