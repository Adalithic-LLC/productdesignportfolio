import type { ReactNode } from 'react';
import { clamp01, lerp } from './ease';

/**
 * The app's first-launch splash, frame for frame: Arcatext/SplashAnimationView
 * .swift on main (playFullAnimation, dark appearance). Measured in points like
 * the Swift view and scaled up as a whole for the film.
 *
 *   0.0–0.4  the column grows from its centre (0 → 120pt)
 *   0.4–0.6  the four beams grow out of its sides (0 → 36pt)
 *   0.6–0.8  the beams shift 15pt outward to cap the column's ends
 *   1.0–1.2  the i-beam scales down to 28pt tall
 *   1.5      it turns grey, and "Arcatext" types out above it in 0.75s
 *   2.25–3.0 hold
 *
 * Every step is SwiftUI's .easeInOut. `children` (a tagline) sits under the
 * stack without changing how the stack centres, so the logo moves exactly as
 * it does in the app. One deliberate difference: the name types into a box
 * the width of the whole word, so it doesn't drift sideways letter by letter.
 */

// SwiftUI's .easeInOut is cubic-bezier(0.42, 0, 0.58, 1).
function easeInOut(x: number) {
  const k = clamp01(x);
  // Solve the bezier for t at progress k, then return its y.
  let t = k;
  for (let i = 0; i < 8; i++) {
    const bx = 3 * (1 - t) ** 2 * t * 0.42 + 3 * (1 - t) * t * t * 0.58 + t ** 3;
    const dx = 3 * (1 - t) ** 2 * 0.42 + 6 * (1 - t) * t * (0.58 - 0.42) + 3 * t * t * (1 - 0.58);
    if (Math.abs(dx) < 1e-6) break;
    t = clamp01(t - (bx - k) / dx);
  }
  return 3 * (1 - t) * t * t + t ** 3;
}

const COLUMN_W = 21;
const COLUMN_H = 120;
const BEAM_W = 36;
const BEAM_H = 15;
const TOTAL_H = COLUMN_H + 2 * BEAM_H; // 150
const TARGET_SCALE = 28 / TOTAL_H;
const NAME = 'Arcatext';
const TYPE_START = 1.5;
const TYPE_LEN = 0.75;

// Dark appearance: the Reword blue, and the grey it settles to.
const BLUE: [number, number, number] = [0x33, 0x70, 0xff];
const GREY: [number, number, number] = [0xc0, 0xc0, 0xc0];

/** When each letter of "Arcatext" appears, from the start of the splash. */
export const SPLASH_LETTERS = Array.from({ length: NAME.length }, (_, i) => TYPE_START + (TYPE_LEN / NAME.length) * i);
export const SPLASH_DONE = 3.0;

/** How long the splash's logo steps run, to the grey settling (see above). */
export const SPLASH_LOGO_LEN = TYPE_START + 0.1;

/**
 * `out`, when set, is seconds into a true reversal of the splash: the logo's
 * steps run backwards from the end (grey to blue, back up to full size, the
 * beams in until it's a line, the line shrinking away) while "Arcatext"
 * backspaces at the rate it typed.
 */
export default function SplashLogo({ s: sIn, scale = 1, out, children }: { s: number; scale?: number; out?: number; children?: ReactNode }) {
  const s = out != null ? Math.max(0, SPLASH_LOGO_LEN - out) : sIn;
  const column = COLUMN_H * easeInOut(s / 0.4);
  const beam = BEAM_W * easeInOut((s - 0.4) / 0.2);
  const shift = BEAM_H * easeInOut((s - 0.6) / 0.2);
  const logoScale = lerp(1, TARGET_SCALE, easeInOut((s - 1.0) / 0.2));
  const g = easeInOut((s - TYPE_START) / 0.1);
  const color = `rgb(${BLUE.map((c, i) => Math.round(lerp(c, GREY[i], g))).join(',')})`;
  let letters = 0;
  while (letters < NAME.length && sIn >= SPLASH_LETTERS[letters]) letters++;
  // Backspacing: a letter goes at once, then one per typing step.
  if (out != null) letters = Math.max(0, NAME.length - Math.ceil(out / (TYPE_LEN / NAME.length) - 1e-9));

  const w = COLUMN_W + BEAM_W * 2;
  const beamY = COLUMN_H / 2 - BEAM_H / 2 + shift; // centre offset of the lower beams
  const rect = (x: number, y: number, bw: number, bh: number) => (
    <div className="absolute" style={{ left: w / 2 + x - bw / 2, top: TOTAL_H / 2 + y - bh / 2, width: bw, height: bh, background: color }} />
  );

  return (
    <div className="relative" style={{ transform: `scale(${scale})` }}>
      <div className="flex flex-col items-center" style={{ gap: 2 }}>
        {/* The name, typed in place above the mark. The box is sized for the
            whole word and the letters fill it from the left, so the name
            doesn't re-centre (and slide) as each letter lands. */}
        <div
          className="relative"
          style={{
            fontFamily: "'Noto Sans', sans-serif",
            fontWeight: 700,
            fontSize: 32,
            lineHeight: 1.362,
            color: `rgb(${BLUE.join(',')})`,
            whiteSpace: 'pre',
          }}
        >
          <span style={{ visibility: 'hidden' }}>{NAME}</span>
          <span className="absolute left-0 top-0" style={{ opacity: letters > 0 ? 1 : 0 }}>
            {NAME.slice(0, letters)}
          </span>
        </div>
        {/* The i-beam: drawn at full size, scaled, in a frame of its scaled size. */}
        <div style={{ width: w * logoScale, height: TOTAL_H * logoScale }}>
          <div className="relative" style={{ width: w, height: TOTAL_H, transform: `scale(${logoScale})`, transformOrigin: '0 0' }}>
            {rect(0, 0, COLUMN_W, column)}
            {rect(-(COLUMN_W / 2 + beam / 2), -beamY, beam, BEAM_H)}
            {rect(COLUMN_W / 2 + beam / 2, -beamY, beam, BEAM_H)}
            {rect(-(COLUMN_W / 2 + beam / 2), beamY, beam, BEAM_H)}
            {rect(COLUMN_W / 2 + beam / 2, beamY, beam, BEAM_H)}
          </div>
        </div>
      </div>
      {children && <div className="absolute left-1/2 top-full -translate-x-1/2">{children}</div>}
    </div>
  );
}
