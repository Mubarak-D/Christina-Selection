# Christina Jewellers — design system

Quiet luxury. The jewellery is the hero; the interface recedes.

Sources (awesome-design-md): **Apple** — photography-first, near-invisible chrome, one accent colour,
17px body, frosted sticky bar, `scale(0.95)` press. **Bugatti** — letterspaced uppercase display,
regular weights only (no bold), outlined pill buttons, square-edged photography.
Fonts and palette from ui-ux-pro-max ("luxury jewellery"): Cormorant / Montserrat, stone + gold.

## Colour (light only)
| Token | Hex | Use | Contrast on ivory |
|---|---|---|---|
| ivory | #FAF7F0 | page background | — |
| pearl | #FFFFFF | cards, inputs | — |
| ink | #1C1917 | text, primary buttons | 16.4:1 |
| muted | #57534E | secondary text | 7.1:1 |
| line | #E7E1D6 | hairlines, borders | decorative |
| gold | #A16207 | the one accent: selection ring, gold buttons (white text 4.9:1) | 4.6:1 |
| gold-ink | #8A5A0B | gold text at small sizes (prices) | 5.5:1 |
| danger | #B42318 | errors | 6.1:1 |

Gold is the only accent. No gradients, no gradient text.

## Type
- **Display:** Cormorant 500, UPPERCASE, tracking 0.08em (Bugatti). Customer headings 28–40px.
- **Body:** Montserrat 400, 17px / 1.47 (Apple). Strong = 500. Never bold 700.
- **Wordmark:** Cormorant 500, UPPERCASE, tracking 0.32em, in its own bar with a hairline. Never a small label stacked on a heading.
- **Eyebrow:** Montserrat 500, 12px, UPPERCASE, tracking 0.2em, muted. Only for metadata (specs, nav), never above a heading.
- Prices and dates use tabular lining numerals (`.price`).

## Browser surfaces
Selection = 22% gold tint; caret = gold; focus ring = 2px gold-ink; file-picker button = outline pill.

## Shape & space
- Photos: square, 0 radius, edge-to-edge on phones (Bugatti).
- Buttons: pill. Primary = ink fill; secondary = 1px outline (Bugatti); gold = selected state.
- Inputs: 8px radius, 1px line border, 44px min height.
- Spacing: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 80. Sections breathe (≥48px).
- Shadow: none, except product photos may use `0 10px 30px rgba(28,25,23,.12)`.

## Motion (CSS only; tokens from ecc:motion-foundations)
| Token | Value |
|---|---|
| --dur-fast | 180ms (button feedback, toggles) |
| --dur-normal | 350ms (view swaps) |
| --dur-slow | 600ms (card reveal) |
| --ease-smooth | cubic-bezier(.22,1,.36,1) |
| --ease-bounce | cubic-bezier(.34,1.56,.64,1) (selection pop only) |

- Cards reveal once on scroll: fade + 16px rise, stagger 80ms (cap 4).
- Choosing a piece: gold ring + 1.04 "pop".
- Submit bar slides up once on first render. Press = scale(0.95).
- Thank-you: fade in; a 1px gold hairline draws out from the centre under the heading (the one authored moment).
- Staff app: hover/focus states only.
- `prefers-reduced-motion: reduce`: no transforms, no shimmer; opacity fades ≤ 150ms.
