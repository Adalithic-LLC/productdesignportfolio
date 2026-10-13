export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const easeOutCubic = (k: number) => 1 - (1 - k) ** 3;
export const easeInOutCubic = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
/** Apple-ish camera ease: quick to start, long soft landing. */
export const easeOutExpo = (k: number) => (k >= 1 ? 1 : 1 - 2 ** (-10 * k));
export const easeInOutQuint = (k: number) => (k < 0.5 ? 16 * k ** 5 : 1 - (-2 * k + 2) ** 5 / 2);
export const easeOutBack = (k: number) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * (k - 1) ** 3 + c1 * (k - 1) ** 2;
};
/** Progress of t through [a, b], clamped and eased. */
export const span = (t: number, a: number, b: number, ease: (k: number) => number = easeInOutCubic) =>
  ease(clamp01((t - a) / (b - a)));
