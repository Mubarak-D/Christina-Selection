// Motion values shared by motion.dev components; mirrors the CSS tokens in globals.css / DESIGN.md.
export const motionTokens = {
  duration: { fast: 0.18, normal: 0.35, slow: 0.6 },
  easing: { smooth: [0.22, 1, 0.36, 1] as const },
  distance: { sm: 8 },
};
