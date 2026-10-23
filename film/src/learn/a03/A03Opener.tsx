/**
 * Arcatext 03's opener: Arcatext 02's avatar cloud (faces only) types its
 * question, clears it, and types "Arcatext makes the journey collaborative,
 * individual, and measurable." in three spoken parts. Each part is acted out
 * by ten foreground faces:
 *
 *   collaborative  the rest of the cloud blurs away; the ten pair up, snap
 *                  together and merge into five rounded pills
 *   individual     the pills dissolve and the faces drift gently apart while
 *                  the cloud comes back behind them
 *   measurable     the ten turn into the app's progress rings, each counting
 *                  to its own number and turning green with a check
 *
 * then everything collapses into the point. A pure function of t.
 */
import { clamp01, easeInOutCubic, easeOutBack, easeOutCubic, lerp } from '../../ease';
import { AV_BURST, AV_POINT, AV_TEXT, AV_TYPE_TIMES, D, FRAME, PORTRAIT, STAGE } from '../learnTimeline';
import { AV_TEXT_STYLE, FACE_FILES, mulberry32, type Box } from '../Opener';
import { FACE_BG } from './faceBg';
import { NOTO } from './Screens';
import {
  D_OP,
  LINE2,
  LINE2_TIMES,
  OP_COLLAPSE,
  OP_END,
  OP_GONE,
  PAIR_AT,
  PAIR_DELAY,
  PAIR_HIT,
  PAIR_SNAP,
  Q_OUT,
  Q_OUT_LEN,
  RING_AT,
  RING_FILL,
  RING_MAX,
  SPLIT_AT,
} from './a03Timeline';

const easeInCubic = (k: number) => k * k * k;
const easeInOutSine = (k: number) => 0.5 - 0.5 * Math.cos(Math.PI * k);
const RING_BLUE = '#7BA2FF';
const RING_GREEN = '#30D158';

// ── The cloud: faces only ──

type Av = { dir: [number, number, number]; r: number; size: number; delay: number; bob: number; phase: number; src: string; bg: string };

const N = PORTRAIT ? 140 : 160;
const CLOUD: Av[] = (() => {
  const rnd = mulberry32(20261018);
  const shuffle = <T,>(xs: T[]) => xs.map((x) => [x, rnd()] as const).sort((p, q) => p[1] - q[1]).map((p) => p[0]);
  // Faces dealt round-robin across the five skin-tone groups, so every shade
  // is equally present and neighbours on the spiral differ.
  const tones: { src: string; bg: string }[][] = [[], [], [], [], []];
  for (const [path, url] of FACE_FILES) {
    const name = path.split('/').pop()!;
    tones[Math.min(4, Math.max(0, +(/-t(\d)\.webp$/.exec(name)?.[1] ?? 3) - 1))].push({ src: url as string, bg: FACE_BG[name] ?? '#B0D7FF' });
  }
  const groups = tones.filter((g) => g.length).map((g) => shuffle(g));
  const used = groups.map(() => 0);
  const seq: { src: string; bg: string }[] = [];
  while (seq.length < N) {
    for (const gi of shuffle(groups.map((_, k) => k))) {
      seq.push(groups[gi][used[gi] % groups[gi].length]);
      used[gi]++;
    }
  }
  return seq.slice(0, N).map((f, i) => {
    const y = 1 - (2 * (i + 0.5)) / N + (rnd() - 0.5) * 0.04;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const phi = i * 2.399963 + rnd() * 0.5;
    return {
      dir: [ring * Math.cos(phi), y, ring * Math.sin(phi)] as [number, number, number],
      r: 0.5 + 0.5 * Math.pow(rnd(), 0.7),
      size: 0.72 + rnd() * 0.56,
      delay: rnd() * 0.16,
      bob: 4 + rnd() * 8,
      phase: rnd() * Math.PI * 2,
      ...f,
    };
  });
})();

/** The cloud's radius, its camera distance and the avatars' base size. */
const R = PORTRAIT ? 470 : 520;
const STRETCH_Y = PORTRAIT ? 1.5 : 1;
const FOCAL = 1500;
const BASE = PORTRAIT ? 92 : 88;
const PAD_X = 34;
const PAD_Y = 30;

const turn = (t: number) => {
  const cAll = clamp01((t - OP_COLLAPSE) / D_OP.collapse);
  const yaw = 0.2 * Math.max(0, t - AV_BURST) + 2.4 * cAll * cAll;
  const pitch = -0.3 + 0.06 * Math.sin(0.35 * t);
  return [Math.cos(yaw), Math.sin(yaw), Math.cos(pitch), Math.sin(pitch)];
};
/** An avatar's place in the turning cloud, before the clearing pushes it. */
function cloudAt(a: Av, t: number) {
  const since = t - AV_BURST;
  const [cyw, syw, cp, sp] = turn(t);
  const e = 1 - Math.pow(1 - clamp01((since - a.delay) / D.avBurst), 4);
  const c = easeInCubic(clamp01((t - OP_COLLAPSE - a.delay * 0.5) / (D_OP.collapse - 0.08)));
  // The outward drift is capped, so the long opener doesn't swell off the frame.
  const reach = R * a.r * e * (1 + Math.min(0.2, 0.035 * Math.max(0, since))) * (1 - c);
  let [x, y, z] = [a.dir[0] * reach, a.dir[1] * reach * STRETCH_Y, a.dir[2] * reach];
  [x, z] = [x * cyw + z * syw, -x * syw + z * cyw];
  [y, z] = [y * cp - z * sp, y * sp + z * cp];
  y += Math.sin(t * 0.8 + a.phase) * a.bob * e * (1 - c);
  const s = FOCAL / (FOCAL - z);
  return { x: x * s, y: y * s, z, px: BASE * a.size * s * (0.3 + 0.7 * e) * (1 - 0.55 * c), e, c };
}

// ── The ten: five pairs, then ten on their own, then ten rings ──

/** A face's size once it steps out of the cloud. */
const F = PORTRAIT ? 144 : 128;
/** Each pair's centre (from the cloud's centre), its tilt, and how far apart
    its two faces end up once they split. All clear of the typed line and of
    the platforms' safe zones. */
const PAIRS = PORTRAIT
  ? [
      { c: [-258, -548], a: 9 },
      { c: [192, -552], a: -8 },
      { c: [-34, -304], a: 6 },
      { c: [-224, 330], a: -9 },
      { c: [200, 512], a: 10 },
    ]
  : [
      { c: [-738, -236], a: 9 },
      { c: [-730, 226], a: -9 },
      { c: [738, -226], a: -9 },
      { c: [732, 236], a: 9 },
      { c: [0, -350], a: 4 },
    ];
const PRE = PORTRAIT ? 190 : 170; // half the gap as the two line up to snap
const CONTACT = (F + 6) / 2; // touching, inside the pill
const IND = PORTRAIT ? 140 : 116; // half the gap once they've drifted apart
const DRIFT = 4; // and how fast they keep drifting (px/s)
const PILL_PAD = 10;

/** The ten foreground faces: the ten nearest the camera as the pairs form,
    each a different face, matched to the slot nearest where it already is. */
const FEATURED: number[] = (() => {
  const byZ = CLOUD.map((a, k) => ({ k, ...cloudAt(a, PAIR_AT) })).sort((p, q) => q.z - p.z);
  const seen = new Set<string>();
  const pick: typeof byZ = [];
  for (const p of byZ) {
    if (seen.has(CLOUD[p.k].src)) continue;
    seen.add(CLOUD[p.k].src);
    pick.push(p);
    if (pick.length === 10) break;
  }
  const slots = Array.from({ length: 10 }, (_, j) => preAt(j, PAIR_AT));
  const out: number[] = new Array(10);
  const free = new Set(pick.map((_, i) => i));
  // Greedy: the slot with the closest remaining face goes first.
  for (let n = 0; n < 10; n++) {
    let best = [Infinity, 0, 0];
    for (let j = 0; j < 10; j++) {
      if (out[j] !== undefined) continue;
      for (const i of free) {
        const d = Math.hypot(pick[i].x - slots[j][0], pick[i].y - slots[j][1]);
        if (d < best[0]) best = [d, j, i];
      }
    }
    out[best[1]] = pick[best[2]].k;
    free.delete(best[2]);
  }
  return out;
})();

function pairFrame(p: number, t: number) {
  const P = PAIRS[p];
  // Each pair floats gently on its own.
  const cx = P.c[0] + Math.sin(t * 0.9 + p * 1.3) * 8;
  const cy = P.c[1] + Math.cos(t * 0.7 + p * 1.7) * 10;
  const r = (P.a * Math.PI) / 180;
  return { cx, cy, ux: Math.cos(r), uy: Math.sin(r), deg: P.a };
}
function preAt(j: number, t: number): [number, number] {
  const f = pairFrame(j >> 1, t);
  const sd = j % 2 ? 1 : -1;
  return [f.cx + sd * f.ux * PRE, f.cy + sd * f.uy * PRE];
}
/** Half the distance between pair p's two faces at t (once they've left the cloud). */
function halfGap(p: number, t: number) {
  const u = t - PAIR_AT - PAIR_DELAY[p];
  if (u < PAIR_SNAP) return PRE;
  if (u < PAIR_HIT) {
    // The snap: they accelerate into each other.
    const k = (u - PAIR_SNAP) / (PAIR_HIT - PAIR_SNAP);
    return lerp(PRE, CONTACT, k * k);
  }
  const v = t - SPLIT_AT - PAIR_DELAY[p] * 0.5;
  if (v < 0) {
    // On impact they squeeze a touch and settle.
    return CONTACT - 5 * Math.sin(Math.PI * clamp01((u - PAIR_HIT) / 0.2));
  }
  // The split: slow to start, slow to settle, then a lazy drift.
  const k = easeInOutSine(clamp01(v / 1.5));
  return lerp(CONTACT, IND, k) + DRIFT * Math.max(0, v - 0.6);
}

// ── Pieces ──

function Ring({ j, t, px }: { j: number; t: number; px: number }) {
  const f = RING_FILL[j];
  const k = easeInOutCubic(clamp01((t - f.at) / f.len));
  const n = Math.round(RING_MAX[j] * k);
  const g = clamp01((t - f.done) / 0.22);
  const done = t >= f.done;
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <svg width={px} height={px} viewBox="-50 -50 100 100" style={{ display: 'block', overflow: 'visible' }}>
      <circle r={48} fill="#1C1C1E" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />
      <circle r={r} fill="none" stroke="rgba(235,235,245,0.18)" strokeWidth={8} />
      {k > 0 && <circle r={r} fill="none" stroke={done ? RING_GREEN : RING_BLUE} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${c * k} ${c}`} transform="rotate(-90)" />}
      {g < 1 && (
        <text x={0} y={1} textAnchor="middle" dominantBaseline="central" fill="#fff" opacity={1 - g} style={{ fontFamily: NOTO, fontWeight: 600, fontSize: 34, fontVariantNumeric: 'tabular-nums' }}>
          {n}
        </text>
      )}
      {g > 0 && (
        <path
          d="M-15 1 L-4 12 L16 -11"
          fill="none"
          stroke={RING_GREEN}
          strokeWidth={8.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          transform={`scale(${Math.max(0, easeOutBack(g))})`}
          opacity={Math.min(1, g * 2)}
        />
      )}
    </svg>
  );
}

const countAt = (times: number[], t: number) => {
  let n = 0;
  while (n < times.length && times[n] <= t) n++;
  return n;
};

/** The second line's full box, and the question's box around each typed prefix. */
export function A03Opener({ t, boxes, boxes2 }: { t: number; boxes: Box[]; boxes2: Box[] }) {
  if (t >= OP_END) return null;
  const cx = STAGE.cx;
  const cy = PORTRAIT ? STAGE.cy : FRAME.h / 2;
  const cAll = clamp01((t - OP_COLLAPSE) / D_OP.collapse);
  const shrink = 1 - easeInCubic(cAll);

  // The clearing: around the question as it types, then (as it clears)
  // around the whole second line, which never moves once it starts.
  const b1 = [0, 0, 0, 0];
  for (let j = 0; j < 8; j++) {
    const b = boxes[countAt(AV_TYPE_TIMES, t + 0.1 - (0.24 * j) / 8)] ?? boxes[0];
    for (let q = 0; q < 4; q++) b1[q] += b[q] / 8;
  }
  const b2 = boxes2[boxes2.length - 1];
  const m = easeInOutCubic(clamp01((t - Q_OUT) / (LINE2_TIMES[0] - 0.1 - Q_OUT)));
  const box = b1.map((v, q) => lerp(v, b2[q], m));
  const open = easeOutCubic(clamp01((t - (AV_TYPE_TIMES[0] - 0.45)) / 0.5));
  const ecx = ((box[0] + box[1]) / 2) * shrink;
  const ecy = ((box[2] + box[3]) / 2) * shrink;
  const ax = ((box[1] - box[0]) / 2 + PAD_X) * shrink;
  const ay = ((box[3] - box[2]) / 2 + PAD_Y) * shrink;

  // The rest of the cloud: blurred almost away while the pairs show, then
  // back, a step behind the ten.
  const hideIn = easeInOutCubic(clamp01((t - PAIR_AT) / 0.55));
  const back = easeInOutCubic(clamp01((t - SPLIT_AT - 0.15) / 1.1)) * 0.85;
  const hide = hideIn * (1 - back);
  const recede = back;

  const featured = new Map(FEATURED.map((k, j) => [k, j]));
  type Placed = { k: number; a: Av; x: number; y: number; z: number; px: number; o: number; depth: number };
  const placed: Placed[] = [];
  const fromCloud = new Map<number, Placed>();
  for (const [k, a] of CLOUD.entries()) {
    const q = cloudAt(a, t);
    let [sx, sy] = [q.x, q.y];
    if (open > 0 && ax > 0) {
      const ex = ax + q.px * 0.5;
      const ey = ay + q.px * 0.5;
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
    const depth = clamp01((q.z / R + 1) / 2);
    const o = clamp01(q.e * 4) * (1 - clamp01((q.c - 0.8) / 0.2));
    const p = { k, a, x: sx, y: sy, z: q.z, px: q.px, o, depth };
    if (featured.has(k)) fromCloud.set(k, p);
    else placed.push(p);
  }
  placed.sort((p, q) => p.z - q.z);

  // The point.
  const pIn = easeOutBack(clamp01((t - AV_POINT) / 0.35));
  const pBurst = clamp01((t - AV_BURST) / 0.45);
  const pBack = clamp01((t - (OP_GONE - 0.3)) / 0.3);
  const pOut = easeInCubic(clamp01((t - OP_GONE) / (OP_END - OP_GONE)));
  const swell = t < AV_BURST ? lerp(1, 1.5, clamp01((t - AV_POINT - 0.2) / (AV_BURST - AV_POINT - 0.2))) : 1;
  const pointO = t < OP_GONE - 0.3 ? pIn * (1 - pBurst) : pBack * (1 - pOut);
  const pointS = (t < OP_GONE - 0.3 ? 16 * pIn * swell * (1 + pBurst * 1.5) : 18 * (1 + 0.6 * (1 - pBack))) * (1 - pOut);

  const face = (p: Placed) => {
    const blur = (p.depth < 0.45 ? (0.45 - p.depth) * 6 : 0) + 12 * hide + 3.5 * recede;
    return (
      <div
        key={p.k}
        className="absolute"
        style={{
          left: 0,
          top: 0,
          transform: `translate(${p.x - p.px / 2}px, ${p.y - p.px / 2}px)`,
          opacity: p.o * (1 - 0.86 * hide) * (1 - 0.2 * recede),
          filter: `brightness(${((0.32 + 0.68 * p.depth) * (1 - 0.45 * recede)).toFixed(3)})${blur > 0.05 ? ` blur(${blur.toFixed(2)}px)` : ''}`,
        }}
      >
        <img src={p.a.src} width={p.px} height={p.px} alt="" style={{ display: 'block', width: p.px, height: p.px, maxWidth: 'none', borderRadius: '50%' }} />
      </div>
    );
  };

  // The ten, out of the cloud.
  const ten = FEATURED.map((k, j) => {
    const p = j >> 1;
    const sd = j % 2 ? 1 : -1;
    const src = fromCloud.get(k)!;
    const w = easeInOutCubic(clamp01((t - PAIR_AT - PAIR_DELAY[p]) / PAIR_SNAP));
    const f = pairFrame(p, t);
    const h = halfGap(p, t);
    const c = easeInCubic(clamp01((t - OP_COLLAPSE - j * 0.015) / (D_OP.collapse - 0.08)));
    const x = lerp(src.x, f.cx + sd * f.ux * h, w) * (1 - c);
    const y = lerp(src.y, f.cy + sd * f.uy * h, w) * (1 - c);
    const px = lerp(src.px, F, w) * (1 - 0.55 * c);
    const o = w > 0 ? 1 - clamp01((c - 0.8) / 0.2) : src.o;
    return { k, j, p, x, y, px, o, w, a: CLOUD[k], src };
  });

  const pills = PAIRS.map((_, p) => {
    const u = t - PAIR_AT - PAIR_DELAY[p];
    const v = t - SPLIT_AT - PAIR_DELAY[p] * 0.5;
    const grow = clamp01((u - PAIR_HIT + 0.03) / 0.3);
    const fade = easeInOutCubic(clamp01(v / 0.55));
    const o = Math.min(1, grow * 3) * (1 - fade);
    if (o <= 0) return null;
    const [A, B] = [ten[2 * p], ten[2 * p + 1]];
    const f = pairFrame(p, t);
    const len = Math.hypot(B.x - A.x, B.y - A.y) + F + 2 * PILL_PAD;
    const hgt = F + 2 * PILL_PAD;
    const s = lerp(0.86, 1, easeOutBack(grow)) * lerp(1, 0.97, fade);
    const bg = A.a.bg;
    return (
      <div
        key={`pill${p}`}
        className="absolute"
        style={{
          left: 0,
          top: 0,
          width: len,
          height: hgt,
          borderRadius: hgt / 2,
          transform: `translate(${(A.x + B.x) / 2 - len / 2}px, ${(A.y + B.y) / 2 - hgt / 2}px) rotate(${f.deg}deg) scale(${s})`,
          background: `linear-gradient(180deg, color-mix(in srgb, ${bg} 70%, white), ${bg})`,
          boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
          opacity: o,
        }}
      />
    );
  });

  const ringIn = easeOutCubic(clamp01((t - RING_AT) / D_OP.ringsIn));
  const tenNodes = ten.map((n) => {
    const fill = RING_FILL[n.j];
    const pulse = Math.sin(Math.PI * clamp01((t - fill.done) / 0.32)) * (t >= fill.done ? 1 : 0);
    const ri = clamp01((t - RING_AT - n.j * 0.02) / D_OP.ringsIn);
    const faceO = 1 - easeOutCubic(ri);
    const ringS = ri > 0 ? lerp(0.55, 1, easeOutBack(ri)) * (1 + 0.1 * pulse) : 0;
    const shadow = n.w > 0 ? 'drop-shadow(0 12px 22px rgba(0,0,0,0.5))' : undefined;
    return (
      <div key={n.k} className="absolute" style={{ left: 0, top: 0, transform: `translate(${n.x - n.px / 2}px, ${n.y - n.px / 2}px)`, opacity: n.o, filter: shadow }}>
        {faceO > 0 && (
          <img
            src={n.a.src}
            width={n.px}
            height={n.px}
            alt=""
            style={{ display: 'block', width: n.px, height: n.px, maxWidth: 'none', borderRadius: '50%', opacity: faceO, transform: `scale(${1 - 0.25 * (1 - faceO)})` }}
          />
        )}
        {ringS > 0 && (
          <div className="absolute" style={{ left: 0, top: 0, transform: `scale(${ringS})`, opacity: Math.min(1, ringIn * 2) }}>
            <Ring j={n.j} t={t} px={n.px} />
          </div>
        )}
      </div>
    );
  });
  // Until the pairs form, the ten are ordinary members of the cloud.
  const pairing = t >= PAIR_AT;
  const cloudTen = pairing ? [] : ten.map((n) => n.src);
  const all = [...placed, ...cloudTen].sort((p, q) => p.z - q.z);
  const behind = all.filter((p) => p.z <= 0);
  const front = all.filter((p) => p.z > 0);

  // The two lines.
  const n1 = countAt(AV_TYPE_TIMES, t);
  const q1 = easeInOutCubic(clamp01((t - Q_OUT) / Q_OUT_LEN));
  const n2 = countAt(LINE2_TIMES, t);
  const textO = 1 - easeInCubic(clamp01((t - OP_COLLAPSE - 0.2) / (D_OP.collapse - 0.2)));
  const lineStyle = { ...AV_TEXT_STYLE, left: 0, top: 0, color: '#fff', textShadow: '0 2px 24px rgba(0,0,0,0.6)' };

  return (
    <div className="absolute" style={{ left: cx, top: cy, width: 0, height: 0 }}>
      {behind.map(face)}
      {t >= AV_TYPE_TIMES[0] - 0.4 && q1 < 1 && (
        <div
          className="absolute"
          style={{ ...lineStyle, transform: `translate(-50%, calc(-50% - ${q1 * 24}px))`, opacity: 1 - q1, filter: q1 > 0 ? `blur(${q1 * 10}px)` : undefined }}
        >
          {AV_TEXT.slice(0, n1)}
          <span style={{ color: 'transparent', textShadow: 'none' }}>{AV_TEXT.slice(n1)}</span>
        </div>
      )}
      {n2 > 0 && textO > 0 && (
        <div className="absolute" style={{ ...lineStyle, transform: `translate(-50%, -50%) scale(${shrink})`, opacity: textO }}>
          {LINE2.slice(0, n2)}
          <span style={{ color: 'transparent', textShadow: 'none' }}>{LINE2.slice(n2)}</span>
        </div>
      )}
      {front.map(face)}
      {pairing && pills}
      {pairing && tenNodes}
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
