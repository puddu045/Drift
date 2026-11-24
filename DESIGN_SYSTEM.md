# Drift — Design System

See `DECISIONS.md` (#14) for the approved palette direction.

## 1. Visual direction
Premium, minimal, calm, dreamy, slightly magical. Avoid: heavy gradients, clutter, excessive
icons, heavy shadows, childish illustration, aggressive gamification.

## 2. Color palette — "Soft Dawn"

Replaced "Midnight Dreamscape" (2026-11-24) — the dark navy palette read as too dull once seen
live on a device. Soft Dawn is a full light/warm theme instead.

| Token | Hex | Use |
|---|---|---|
| `palette.warmWhite` | `#FFFBF7` | Primary background |
| `palette.navy` | `#15213B` | Primary text, the palette's dark anchor tone (also used as dark text on any light mood badge, regardless of overall theme) |
| `palette.blush` | `#F6D6E0` | Accent, love mood tag |
| `palette.apricot` | `#F8C9A7` | Primary accent (buttons), happy/hopeful mood tag |
| `palette.lilac` | `#D8C9F0` | Accent, deep/curious mood tag |
| `palette.paleSky` | `#BFE1F6` | Accent, reflective/random/lonely mood tag |

Derived tokens (`src/theme/colors.ts`): `background` = warmWhite, `surface` (cards) = a soft
blush-white tint, `textPrimary`/`textSecondary` = navy at full/62% opacity, `accent` = apricot,
`onAccent` (text drawn on top of the accent color) = navy.

The two other directions considered are kept here for reference in case this needs revisiting:
- **Midnight Dreamscape** (original, replaced): navy `#101A35`, deep blue `#24365E`, pastel blue
  `#A9C9F5`, lavender `#C8B7F0`, soft pink `#F2C7DA`, peach `#F4D1BD`, off-white `#F8F9FD`.
- **Deep Aurora** (never used): a darker/moodier alternative — space navy `#0B1026`, indigo
  `#2E2B5F`, aurora teal `#4FD1C5`, soft violet `#B39DDB`, warm coral `#F4A896`.

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
