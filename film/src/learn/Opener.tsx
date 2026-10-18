/**
 * Arcatext 02's opening (?cut=a02): a point bursts into a slow, turning
 * cloud of iOS-style contact avatars; "You text a lot of people" types out
 * in a clearing it opens for itself; then the cloud and the line collapse
 * back into the point. After it, a text block reads line by line.
 *
 * Everything is a pure function of t, so the renderer can seek any frame.
 */
import { clamp01, easeOutBack, easeOutCubic, lerp, span } from '../ease';
import {
  AV_BURST,
  AV_COLLAPSE,
  AV_END,
  AV_GONE,
  AV_POINT,
  AV_TEXT,
  AV_TYPE_TIMES,
  BLOCK_AT,
  BLOCK_LINES,
  BLOCK_FADE,
  BLOCK_OUT,
  D,
  FRAME,
  PORTRAIT,
  STAGE,
} from './learnTimeline';

const DISPLAY = "'Inter Display', Inter, system-ui, sans-serif";
const ROUNDED = "'SF Pro Rounded', Inter, system-ui, sans-serif";
const ACCENT = '#7FA2FF';
const easeInCubic = (k: number) => k * k * k;
/** The typed line: its size and the width it wraps in. It is laid out whole
    (the untyped rest invisible), so it never reflows as it types; Metrics
    carries the box around each typed prefix. */
export const AV_SIZE = 76;
export const AV_BOX_W = PORTRAIT ? 860 : 1100;
export const AV_TEXT_STYLE = {
  width: AV_BOX_W,
  fontFamily: DISPLAY,
  fontWeight: 700,
  fontSize: AV_SIZE,
  lineHeight: 1.15,
  letterSpacing: '-0.02em',
  textAlign: 'center',
  textWrap: 'balance',
  whiteSpace: 'normal',
} as const;

// ── The avatars ──

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** iOS contact colours: the default grey monogram, and the tinted ones. */
const GREY: [string, string] = ['#A9AFBB', '#868B97'];
const TINTS: [string, string][] = [
  ['#7DBBFF', '#3A86F6'],
  ['#8EE09A', '#30B550'],
  ['#FFBE6E', '#FF8A00'],
  ['#FF9CC0', '#F2357E'],
  ['#CDA6FF', '#8E4CE8'],
  ['#7FE6E3', '#1FAFC4'],
  ['#FF9B8F', '#F2453A'],
  ['#FFDD70', '#EDB100'],
  ['#9AA0FF', '#5856D6'],
];
const PASTELS: [string, string][] = [
  ['#FFE3B0', '#FFC56E'],
  ['#CDE8FF', '#92C6FF'],
  ['#E6D6FF', '#BFA2FF'],
  ['#D3F5DA', '#99E2A8'],
  ['#FFD6E2', '#FFA9C2'],
];
/** Arcatext's own avatar set (generated for the film): men and women of
    every background, pre-cut into iOS-style circles on a pastel gradient. */
const FACE_FILES = Object.entries(import.meta.glob('./avatars/*.webp', { eager: true, import: 'default' })).sort(([a], [b]) =>
  a.localeCompare(b),
);
const FACES: string[] = FACE_FILES.map(([, url]) => url as string);
/** The faces in five equal skin-tone groups (file suffix -t1 deepest ... -t5
    lightest, measured from the artwork), so the cloud can deal them evenly. */
const BY_TONE: string[][] = [[], [], [], [], []];
for (const [path, url] of FACE_FILES) BY_TONE[Math.min(4, Math.max(0, +(/-t(\d)\.webp$/.exec(path)?.[1] ?? 3) - 1))].push(url as string);
/** Resolves once every face is decoded, so no frame is drawn with one missing. */
export function preloadAvatars(): Promise<void> {
  return Promise.all(
    FACES.map((src) => {
      const im = new Image();
      im.src = src;
      return im.decode().catch(() => undefined);
    }),
  ).then(() => undefined);
}
const LETTERS = 'ABCDEFGHIJKLMNOPRSTVWY';

type Avatar = {
  dir: [number, number, number];
  r: number;
  size: number;
  delay: number;
  bob: number;
  phase: number;
  kind: 'mono' | 'tint' | 'person' | 'face';
  grad: [string, string];
  label: string;
};

const AVATARS_N = PORTRAIT ? 140 : 160;
const AVATARS: Avatar[] = (() => {
  const rnd = mulberry32(20261018);
  const out: Avatar[] = [];
  // Faces are dealt round-robin across the skin-tone groups (in a fresh
  // random order each round), so every shade is equally present and
  // neighbouring avatars, which sit next to each other on the spiral, vary.
  const shuffle = <T,>(xs: T[]) => xs.map((x) => [x, rnd()] as const).sort((p, q) => p[1] - q[1]).map((p) => p[0]);
  const groups = BY_TONE.filter((g) => g.length).map((g) => shuffle(g));
  const used = groups.map(() => 0);
  const SEQ: string[] = [];
  while (SEQ.length < AVATARS_N) {
    for (const gi of shuffle(groups.map((_, k) => k))) {
      SEQ.push(groups[gi][used[gi] % groups[gi].length]);
      used[gi]++;
    }
  }
  let faceAt = 0;
  for (let i = 0; i < AVATARS_N; i++) {
    // Directions spread evenly over the sphere (a jittered golden spiral),
    // radii through the shell's depth, so it reads as a full round cloud.
    const y = 1 - (2 * (i + 0.5)) / AVATARS_N + (rnd() - 0.5) * 0.04;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const phi = i * 2.399963 + rnd() * 0.5;
    const roll = rnd();
    // Mostly faces, with some iOS monograms and placeholders among them, as a real contact list has.
    const kind = roll < 0.74 && FACES.length ? 'face' : roll < 0.86 ? 'mono' : roll < 0.94 ? 'tint' : 'person';
    const grad =
      kind === 'mono' || kind === 'person' ? GREY : kind === 'tint' ? TINTS[Math.floor(rnd() * TINTS.length)] : PASTELS[0];
    const label =
      kind === 'face'
        ? SEQ[faceAt++ % SEQ.length]
        : LETTERS[Math.floor(rnd() * LETTERS.length)] + (rnd() < 0.8 ? LETTERS[Math.floor(rnd() * LETTERS.length)] : '');
    out.push({
      dir: [ring * Math.cos(phi), y, ring * Math.sin(phi)],
      r: 0.5 + 0.5 * Math.pow(rnd(), 0.7),
      size: 0.72 + rnd() * 0.56,
      delay: rnd() * 0.16,
      bob: 4 + rnd() * 8,
      phase: rnd() * Math.PI * 2,
      kind,
      grad,
      label,
    });
  }
  return out;
})();

function Face({ a, px }: { a: Avatar; px: number }) {
  const bg = `linear-gradient(180deg, ${a.grad[0]}, ${a.grad[1]})`;
  const base = { width: px, height: px, borderRadius: '50%', background: bg, overflow: 'hidden' as const };
  if (a.kind === 'face') {
    return <img src={a.label} width={px} height={px} alt="" style={{ display: 'block', width: px, height: px, maxWidth: 'none', borderRadius: '50%' }} />;
  }
  if (a.kind === 'person') {
    // The iOS placeholder: a white head and shoulders on grey.
    return (
      <div style={base}>
        <svg viewBox="0 0 100 100" width={px} height={px}>
          <circle cx="50" cy="39" r="17" fill="#fff" />
          <path d="M18 92c3-19 17-30 32-30s29 11 32 30z" fill="#fff" />
        </svg>
      </div>
    );
  }
  return (
    <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: ROUNDED, fontWeight: 600, fontSize: px * (a.label.length > 1 ? 0.4 : 0.46), color: '#fff', letterSpacing: '0.01em', lineHeight: 1 }}>
        {a.label}
      </span>
    </div>
  );
}

const countAt = (times: number[], t: number) => {
  let n = 0;
  while (n < times.length && times[n] <= t) n++;
  return n;
};

/** The cloud's radius, its camera distance and the avatars' base size. */
const R = PORTRAIT ? 470 : 520;
/** 9:16 stretches the cloud upright to fill the tall frame. */
const STRETCH_Y = PORTRAIT ? 1.5 : 1;
const FOCAL = 1500;
const BASE = PORTRAIT ? 92 : 88;
/** Room kept around the typed line, beyond its own box. */
const PAD_X = 34;
const PAD_Y = 30;

/** [left, right, top, bottom] of the typed text, from the line box's centre. */
export type Box = [number, number, number, number];

export function AvatarOpener({ t, boxes }: { t: number; boxes: Box[] }) {
  if (t >= AV_END) return null;
  const cx = STAGE.cx;
  const cy = PORTRAIT ? STAGE.cy : FRAME.h / 2;
  const since = t - AV_BURST;
  const cAll = clamp01((t - AV_COLLAPSE) / D.avCollapse);
  // The cloud turns slowly, then spins up as it falls in.
  const yaw = 0.2 * Math.max(0, since) + 2.4 * cAll * cAll;
  const pitch = -0.3 + 0.06 * Math.sin(0.35 * t);
  const [cyw, syw, cp, sp] = [Math.cos(yaw), Math.sin(yaw), Math.cos(pitch), Math.sin(pitch)];

  // The clearing: an ellipse around the typed text, sized to what is typed
  // a moment ahead, so the room opens just before each letter needs it.
  const box = [0, 0, 0, 0];
  for (let j = 0; j < 8; j++) {
    const b = boxes[countAt(AV_TYPE_TIMES, t + 0.1 - (0.24 * j) / 8)] ?? boxes[0];
    for (let q = 0; q < 4; q++) box[q] += b[q] / 8;
  }
  const open = easeOutCubic(clamp01((t - (AV_TYPE_TIMES[0] - 0.45)) / 0.5));
  const shrink = 1 - easeInCubic(cAll);
  const ecx = ((box[0] + box[1]) / 2) * shrink;
  const ecy = ((box[2] + box[3]) / 2) * shrink;
  const ax = ((box[1] - box[0]) / 2 + PAD_X) * shrink;
  const ay = ((box[3] - box[2]) / 2 + PAD_Y) * shrink;

  type Placed = { k: number; a: Avatar; x: number; y: number; z: number; px: number; o: number; depth: number };
  const placed: Placed[] = [];
  for (const [k, a] of AVATARS.entries()) {
    // A fast burst that settles into slow motion, then a slow drift outward.
    const e = 1 - Math.pow(1 - clamp01((since - a.delay) / D.avBurst), 4);
    const c = easeInCubic(clamp01((t - AV_COLLAPSE - a.delay * 0.5) / (D.avCollapse - 0.08)));
    const reach = R * a.r * e * (1 + 0.035 * Math.max(0, since)) * (1 - c);
    let [x, y, z] = [a.dir[0] * reach, a.dir[1] * reach * STRETCH_Y, a.dir[2] * reach];
    [x, z] = [x * cyw + z * syw, -x * syw + z * cyw];
    [y, z] = [y * cp - z * sp, y * sp + z * cp];
    y += Math.sin(t * 0.8 + a.phase) * a.bob * e * (1 - c);
    const s = FOCAL / (FOCAL - z);
    let sx = x * s;
    let sy = y * s;
    const px = BASE * a.size * s * (0.3 + 0.7 * e) * (1 - 0.55 * c);
    // Pushed out of the clearing: every point keeps at least the ellipse
    // (grown by its own radius) between it and the centre; far ones barely move.
    if (open > 0 && ax > 0) {
      const ex = ax + px * 0.5;
      const ey = ay + px * 0.5;
      const [qx, qy] = [sx - ecx, sy - ecy];
      const d = Math.hypot(qx / ex, qy / ey);
      const d2 = Math.sqrt(d * d + open * open);
      if (d > 1e-4) {
        sx = ecx + qx * (d2 / d);
        sy = ecy + qy * (d2 / d);
      } else {
        sx = ecx + Math.cos(a.phase) * ex * d2;
        sy = ecy + Math.sin(a.phase) * ey * d2;
      }
    }
    const depth = clamp01((z / R + 1) / 2);
    // Depth reads as dimmer and softer, not see-through, so overlaps stay clean.
    const o = clamp01(e * 4) * (1 - clamp01((c - 0.8) / 0.2));
    placed.push({ k, a, x: sx, y: sy, z, px, o, depth });
  }
  placed.sort((p, q) => p.z - q.z);

  // The point: it appears, swells and bursts; at the end everything falls
  // back into it and it winks out.
  const pIn = easeOutBack(clamp01((t - AV_POINT) / 0.35));
  const pBurst = clamp01((t - AV_BURST) / 0.45);
  const pBack = clamp01((t - (AV_GONE - 0.3)) / 0.3);
  const pOut = easeInCubic(clamp01((t - AV_GONE) / (AV_END - AV_GONE)));
  const swell = t < AV_BURST ? lerp(1, 1.5, clamp01((t - AV_POINT - 0.2) / (AV_BURST - AV_POINT - 0.2))) : 1;
  const pointO = t < AV_GONE - 0.3 ? pIn * (1 - pBurst) : pBack * (1 - pOut);
  const pointS = (t < AV_GONE - 0.3 ? 16 * pIn * swell * (1 + pBurst * 1.5) : 18 * (1 + 0.6 * (1 - pBack))) * (1 - pOut);
  const ring = clamp01((t - AV_BURST) / 0.8);

  const n = countAt(AV_TYPE_TIMES, t);
  const typing = n > 0 && n < AV_TEXT.length;
  const caretOn = t >= AV_TYPE_TIMES[0] - 0.4 && (typing || Math.floor((t - AV_TYPE_TIMES[0]) * 1.9) % 2 === 0);
  const textScale = shrink;
  const textO = 1 - easeInCubic(clamp01((t - AV_COLLAPSE - 0.2) / (D.avCollapse - 0.2)));

  const face = (p: Placed) => (
    <div
      key={p.k}
      className="absolute"
      style={{
        left: 0,
        top: 0,
        transform: `translate(${p.x - p.px / 2}px, ${p.y - p.px / 2}px)`,
        opacity: p.o,
        filter: `brightness(${(0.32 + 0.68 * p.depth).toFixed(3)})${p.depth < 0.45 ? ` blur(${((0.45 - p.depth) * 6).toFixed(2)}px)` : ''}`,
      }}
    >
      <Face a={p.a} px={p.px} />
    </div>
  );
  const behind = placed.filter((p) => p.z <= 0);
  const front = placed.filter((p) => p.z > 0);

  return (
    <div className="absolute" style={{ left: cx, top: cy, width: 0, height: 0 }}>
      {behind.map(face)}
      {/* The typed line, centred, with its caret. */}
      {t >= AV_TYPE_TIMES[0] - 0.4 && textO > 0 && (
        <div
          className="absolute"
          style={{
            ...AV_TEXT_STYLE,
            left: 0,
            top: 0,
            transform: `translate(-50%, -50%) scale(${textScale})`,
            color: '#fff',
            opacity: textO,
            textShadow: '0 2px 24px rgba(0,0,0,0.6)',
          }}
        >
          {AV_TEXT.slice(0, n)}
          {/* The caret takes no room, so the line never shifts under it. */}
          <span style={{ position: 'relative', display: 'inline-block', width: 0, height: '1em', verticalAlign: '-0.12em' }}>
            <span style={{ position: 'absolute', left: 3, top: '0.05em', width: 5, height: '0.9em', background: ACCENT, borderRadius: 2, opacity: caretOn ? 1 : 0 }} />
          </span>
          <span style={{ color: 'transparent', textShadow: 'none' }}>{AV_TEXT.slice(n)}</span>
        </div>
      )}
      {front.map(face)}
      {/* The burst's shock ring and the point itself. */}
      {ring > 0 && ring < 1 && (
        <div
          className="absolute rounded-full"
          style={{
            left: 0,
            top: 0,
            width: easeOutCubic(ring) * 1100,
            height: easeOutCubic(ring) * 1100,
            transform: 'translate(-50%, -50%)',
            border: `${3 * (1 - ring) + 1}px solid rgba(160,190,255,0.9)`,
            boxShadow: '0 0 40px rgba(110,150,255,0.35), inset 0 0 40px rgba(110,150,255,0.25)',
            opacity: (1 - ring) * 0.7,
          }}
        />
      )}
      {pointO > 0 && pointS > 0.5 && (
        <div
          className="absolute rounded-full"
          style={{
            left: 0,
            top: 0,
            width: pointS,
            height: pointS,
            transform: 'translate(-50%, -50%)',
            background: '#fff',
            boxShadow: `0 0 ${pointS * 1.6}px ${pointS * 0.6}px rgba(127,162,255,0.85), 0 0 ${pointS * 5}px ${pointS * 2}px rgba(80,120,255,0.35)`,
            opacity: pointO,
          }}
        />
      )}
    </div>
  );
}

// ── The text block ──

const BLOCK_ACCENT = ['learn more from each text', 'contextual translations, synonyms, and a study guide'];

export function TextBlock({ t }: { t: number }) {
  if (t < BLOCK_AT[0] - 0.05 || t > BLOCK_OUT + D.titleOut) return null;
  const last = BLOCK_LINES.length - 1;
  const re = new RegExp(`(${BLOCK_ACCENT.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`);
  return (
    <>
      {BLOCK_LINES.map((line, i) => {
        // Each card comes in on its own and leaves before the next arrives.
        const k = span(t, BLOCK_AT[i], BLOCK_AT[i] + 0.6, easeOutCubic);
        const out = i < last ? span(t, BLOCK_AT[i + 1] - BLOCK_FADE - 0.1, BLOCK_AT[i + 1] - 0.1, (x) => x) : span(t, BLOCK_OUT, BLOCK_OUT + D.titleOut, (x) => x);
        if (k <= 0 || out >= 1) return null;
        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: STAGE.cx - STAGE.w / 2,
              width: STAGE.w,
              top: PORTRAIT ? STAGE.cy : FRAME.h / 2,
              transform: `translateY(calc(-50% + ${(1 - k) * 24 - out * 30}px))`,
              opacity: k * (1 - out),
              filter: k < 1 ? `blur(${(1 - k) * 10}px)` : undefined,
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: 72,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              textWrap: 'balance',
              color: '#fff',
            }}
          >
            {line.split(re).map((x, j) => {
              // Hyphenated words never break at the hyphen.
              const body = x.split(/(\S+-\S+)/).map((y, m) => (/-/.test(y) ? <span key={m} style={{ whiteSpace: 'nowrap' }}>{y}</span> : y));
              return BLOCK_ACCENT.includes(x) ? <span key={j} style={{ color: ACCENT }}>{body}</span> : <span key={j}>{body}</span>;
            })}
          </div>
        );
      })}
    </>
  );
}
