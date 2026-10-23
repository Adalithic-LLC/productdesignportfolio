/**
 * Arcatext 03 (?film=learn&cut=a03): one frame as a pure function of time.
 * The avatar cloud asks its question; a phone rises with the app (the word
 * list, a partner, the community); the keyboard hops out of the app into
 * three messaging apps, each pushing the last aside; the Practice tab's rings
 * fill; "Well… you can."; the road line and the logo.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { Keyboard, GlobeRow } from '../../Phone';
import { Glow, syncAnimations } from '../../Film';
import SplashLogo from '../../SplashLogo';
import { AV_SIZE, AV_TEXT_STYLE, AvatarOpener, preloadAvatars, type Box } from '../Opener';
import { clamp01, easeInOutCubic, easeOutCubic, lerp, span } from '../../ease';
import { AV_END, AV_TEXT, STAGE } from '../learnTimeline';
import { Device, OUTER_H, OUTER_W } from './Device';
import { KB_DOCK_H, MessagingApp } from './MessagingApps';
import { ACTIVE_CARD_CENTER, CommunityScreen, NOTO, PartnerScreen, RINGS_GRID, RingsGrid } from './Screens';
import {
  CARD_TAP,
  CARDS,
  CHALLENGE,
  CHAT,
  COMMUNITY,
  DURATION,
  END_AT,
  FRAME,
  FREEDOM_AT,
  HOP,
  HOP_APPS,
  HOP_SENDS,
  HOP_TYPED,
  HOP_TYPE_TIMES,
  HOPS,
  LOGO_AT,
  PORTRAIT,
  PHONE_AWAY,
  PRACTICE,
  PARTNER,
  PHONE_IN,
  ZOOM_AT,
  RINGS_AT,
  RINGS_LEN,
  ROAD,
  cues,
  type Line,
} from './a03Timeline';

const W = FRAME.w;
const H = FRAME.h;
const DISPLAY = "'Inter Display', Inter, system-ui, sans-serif";
const ACCENT = '#7FA2FF';
/** Where the phone sits and how large: below the cards in 9:16, right of them in 16:9. */
const PH = PORTRAIT ? { cx: 540, cy: 1228, s: 1.42 } : { cx: 1390, cy: 548, s: 1.06 };
/** How far a phone travels in from the right, and out to the left. */
const ENTER_DX = PORTRAIT ? 900 : 800;
const EXIT_DX = PORTRAIT ? 780 : 520;
/** The close-up on the chat card: how much closer, and where the card lands in the frame. */
const ZOOM = PORTRAIT ? { k: 1.6, x: 540, y: 1250 } : { k: 1.6, x: 1390, y: 560 };
const BEZEL = 12;
/** How high the keyboard jumps out of an app (frame px). */
const LIFT = PORTRAIT ? 250 : 190;
const KB_H = KB_DOCK_H;

// ── Measuring the opener's typed line (as LearnFilm) ──

function measureAvBox(root: HTMLElement): Box[] {
  const av = document.createElement('div');
  Object.assign(av.style, { position: 'absolute', left: '-10000px', top: '0', visibility: 'hidden', ...AV_TEXT_STYLE, width: `${AV_TEXT_STYLE.width}px`, fontSize: `${AV_SIZE}px`, fontWeight: '700' });
  root.appendChild(av);
  av.textContent = AV_TEXT;
  const ab = av.getBoundingClientRect();
  const [mx, my] = [ab.left + ab.width / 2, ab.top + ab.height / 2];
  const charBox = (i: number) => {
    const r = document.createRange();
    r.setStart(av.firstChild!, i);
    r.setEnd(av.firstChild!, i + 1);
    const rects = r.getClientRects();
    const x = rects[rects.length - 1];
    return [x.left - mx, x.right - mx, x.top - my, x.bottom - my] as Box;
  };
  const first = charBox(0);
  const boxes: Box[] = [[first[0], first[0], first[2], first[3]]];
  for (let i = 0; i < AV_TEXT.length; i++) {
    const p = boxes[i];
    const c = charBox(i);
    boxes.push(AV_TEXT[i] === ' ' ? p : [Math.min(p[0], c[0]), Math.max(p[1], c[1]), Math.min(p[2], c[2]), Math.max(p[3], c[3])]);
  }
  av.remove();
  return boxes;
}

// ── Cards ──

function accentParts(text: string, accent: string) {
  const i = text.indexOf(accent);
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <span style={{ color: ACCENT }}>{accent}</span>
      {text.slice(i + accent.length)}
    </>
  );
}

const CARD_PLACE = PORTRAIT ? { left: STAGE.cx - STAGE.w / 2, width: STAGE.w, top: STAGE.cy - 430 } : { left: 150, width: 720, top: FRAME.h / 2 };

function Card({ l, t }: { l: Line; t: number }) {
  const k = span(t, l.at, l.at + 0.55, easeOutCubic);
  const out = span(t, l.out - 0.45, l.out - 0.05, (x) => x);
  if (k <= 0 || out >= 1) return null;
  return (
    <div className="absolute" style={{ ...CARD_PLACE, transform: `translateY(calc(-50% + ${(1 - k) * 22 - out * 30}px))`, opacity: k * (1 - out), filter: k < 1 ? `blur(${(1 - k) * 10}px)` : undefined }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: PORTRAIT ? 74 : 72, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#fff', textWrap: 'balance' }}>{accentParts(l.text, l.accent)}</div>
    </div>
  );
}

function Ending({ t }: { t: number }) {
  const local = t - END_AT;
  const k = span(local, 0.15, 0.75, easeOutCubic);
  const lineOut = span(t, LOGO_AT - 0.35, LOGO_AT + 0.15, (x) => x);
  const fade = span(t, DURATION - 0.6, DURATION, (x) => x);
  const cy = PORTRAIT ? STAGE.cy + 60 : H / 2;
  return (
    <div className="absolute inset-0">
      <div className="absolute grid place-items-center" style={{ left: STAGE.cx - 300, width: 600, top: cy - 150, height: 300 }}>
        {t >= LOGO_AT && <SplashLogo s={t - LOGO_AT} scale={2.2} keepBlue />}
      </div>
      {lineOut < 1 && (
        <div className="absolute flex justify-center" style={{ left: STAGE.cx - 500, width: 1000, top: cy, transform: `translateY(calc(-50% + ${(1 - k) * 18}px))`, opacity: k * (1 - lineOut), filter: k < 1 ? `blur(${(1 - k) * 8}px)` : undefined }}>
          <div className="whitespace-nowrap" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: PORTRAIT ? 62 : 76, letterSpacing: '-0.02em', color: '#fff' }}>
            {accentParts(ROAD, '1000 words')}
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-black" style={{ opacity: fade }} />
    </div>
  );
}

// ── Practice: the exchange as chat bubbles alone ──

const BUB = PORTRAIT ? { cx: 540, w: 860, bottom: 1560, font: 46, pad: '26px 36px', r: 48, gap: 22 } : { cx: 1390, w: 820, bottom: 820, font: 42, pad: '22px 32px', r: 44, gap: 18 };

function Bubble({ k, me, rise, fill, children }: { k: number; me?: boolean; rise?: boolean; fill?: string; children: ReactNode }) {
  if (k <= 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateRows: `${Math.min(1, k * 1.5)}fr` }}>
      <div className={`flex min-h-0 ${me ? 'justify-end' : 'justify-start'}`}>
        <div
          style={{
            maxWidth: '80%',
            padding: BUB.pad,
            borderRadius: BUB.r,
            background: me ? fill ?? '#2D63E6' : '#2C2C2E',
            color: '#fff',
            fontFamily: NOTO,
            fontSize: BUB.font,
            lineHeight: 1.3,
            opacity: Math.min(1, k * 1.6),
            transform: rise ? `translateY(${(1 - k) * 160}px) scale(${0.85 + 0.15 * k})` : `translateY(${(1 - k) * 30}px) scale(${0.9 + 0.1 * k})`,
            transformOrigin: me ? '100% 100%' : '0% 100%',
            boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

type Line3 = { me?: boolean; text: string; at: number };
/** Practice: the guided chat's exchange. Times from PRACTICE.at. */
const PRACTICE_CHAT: Line3[] = [
  { text: '¿Me ayudas a lavar los platos?', at: CHAT.askAt },
  { me: true, text: 'Sí, voy ahora.', at: CHAT.sendAt },
];
/** The partner chat, once the phone dissolves. Times from CHALLENGE.at. */
const PARTNER_CHAT: Line3[] = [
  { text: 'Reto de escritura: describe tu fin de semana.', at: PARTNER.lineAt[0] },
  { me: true, text: 'El sábado fui al mercado con mi hermana.', at: PARTNER.lineAt[1] },
];

/** A chat as bubbles alone. `dotsAt` shows the other side typing until the next line. */
function BubbleShot({ t, at, lines, out, mine, dotsAt, bottom = BUB.bottom }: { t: number; at: number; lines: Line3[]; out: number; mine: string; dotsAt?: number; bottom?: number }) {
  const l = t - at;
  if (l < lines[0].at || l > out + 0.45) return null;
  const k = (a: number, len = 0.4) => easeOutCubic(clamp01((l - a) / len));
  const fade = span(l, out, out + 0.4, (x) => x);
  const next = dotsAt !== undefined ? lines.find((x) => x.at > dotsAt) : undefined;
  const dots = next && l >= dotsAt! && l < next.at;
  return (
    <div className="absolute flex flex-col justify-end" style={{ left: BUB.cx - BUB.w / 2, width: BUB.w, bottom: H - bottom, gap: BUB.gap, opacity: 1 - fade, transform: `translateY(${-fade * 40}px)` }}>
      {lines.map((x, i) => {
        const before = dots && next === x;
        return (
          <Bubble key={i} k={before ? 0 : k(x.at, x.me ? 0.45 : 0.4)} me={x.me} rise={x.me} fill={x.me ? mine : undefined}>
            {x.text}
          </Bubble>
        );
      })}
      {dots && (
        <Bubble k={k(dotsAt!, 0.25)}>
          <span style={{ letterSpacing: '0.15em' }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ opacity: 0.35 + 0.65 * Math.max(0, Math.sin((l - dotsAt!) * 9 - i * 0.9)) }}>•</span>
            ))}
          </span>
        </Bubble>
      )}
    </div>
  );
}

// ── The phones ──

/** An app screen's navigation: each screen from its start, pushed in or popped back to. */
type Nav = { at: number; how: 'push' | 'pop'; draw: (local: number) => ReactNode }[];
function NavStack({ nav, t }: { nav: Nav; t: number }) {
  let i = 0;
  while (i + 1 < nav.length && t >= nav[i + 1].at) i++;
  const cur = nav[i];
  const k = i > 0 ? easeInOutCubic(clamp01((t - cur.at) / 0.42)) : 1;
  const prev = i > 0 && k < 1 ? nav[i - 1] : null;
  const layer = (n: Nav[number], x: number, dim: number, z: number) => (
    <div className="absolute inset-0 overflow-hidden" style={{ transform: `translateX(${x}px)`, zIndex: z, boxShadow: x !== 0 ? '0 0 24px rgba(0,0,0,0.4)' : undefined }}>
      {n.draw(t - n.at)}
      {dim > 0 && <div className="absolute inset-0 bg-black" style={{ opacity: dim }} />}
    </div>
  );
  return (
    <>
      {prev && (cur.how === 'push' ? layer(prev, -120 * k, 0.3 * k, 0) : layer(prev, 402 * k, 0, 2))}
      {cur.how === 'push' || !prev ? layer(cur, prev ? 402 * (1 - k) : 0, 0, 1) : layer(cur, -120 * (1 - k), 0.3 * (1 - k), 1)}
    </>
  );
}

/** The keyboard and its globe row, 402 x 339 pt. */
function Kb({ t, text, keyDown }: { t: number; text: string; keyDown: string | null }) {
  return (
    <div style={{ width: 402, height: KB_H, overflow: 'hidden' }}>
      <Keyboard s={{ t, text, keyDown, pressed: null, rewordLoading: false }} />
      <GlobeRow />
    </div>
  );
}

/** The key held down at t for a typed line, as the Keyboard names keys. */
function keyAt(text: string, times: number[], t: number) {
  for (let i = 0; i < times.length; i++) {
    if (t >= times[i] && t < times[i] + 0.09) {
      const c = text[i];
      if (c === ' ') return 'space';
      const base = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      return /^[a-z]$/.test(base) ? base : null;
    }
  }
  return null;
}
const typedAt = (text: string, times: number[], t: number) => {
  let n = 0;
  while (n < times.length && times[n] <= t) n++;
  return text.slice(0, n);
};

/** Each phone: when it comes in and how, and when it leaves. */
const PHONES: { in: number; rise: boolean; out: number; exit: 'push' | 'away' }[] = [
  { in: PHONE_IN, rise: true, out: HOPS[0].push, exit: 'push' },
  { in: HOPS[0].push, rise: false, out: HOPS[1].push, exit: 'push' },
  { in: HOPS[1].push, rise: false, out: HOPS[2].push, exit: 'push' },
  { in: HOPS[2].push, rise: false, out: PHONE_AWAY, exit: 'away' },
];
const AWAY_LEN = 0.55;

function phonePose(i: number, t: number) {
  const p = PHONES[i];
  let dx = 0;
  let dy = 0;
  let s = 1;
  let o = 1;
  if (p.rise) {
    const k = easeOutCubic(clamp01((t - p.in) / 0.75));
    dy += (1 - k) * 520;
    o *= k;
  } else {
    const k = easeInOutCubic(clamp01((t - p.in) / HOP.pushLen));
    dx += (1 - k) * ENTER_DX;
  }
  if (p.exit === 'away') {
    // Steps back into the glow, with no swipe, as the rings come up.
    const k = easeInOutCubic(clamp01((t - p.out) / AWAY_LEN));
    s *= 1 - 0.14 * k;
    o *= 1 - k;
  } else {
    const k = easeInOutCubic(clamp01((t - p.out) / HOP.pushLen));
    dx -= k * EXIT_DX;
    s *= 1 - 0.16 * k;
    o *= 1 - k * k;
  }
  // A little give when the keyboard lands in it.
  const hop = HOPS[i - 1];
  if (hop) dy += 10 * Math.sin(Math.PI * clamp01((t - hop.land) / 0.3));
  return { dx, dy, s, o };
}

/** The keyboard's state in phone i: docked (1), out (0), plus the app's dock level. */
function kbIn(i: number, t: number) {
  if (i === 0) {
    if (t < FREEDOM_AT) return 0;
    const up = easeOutCubic(clamp01((t - FREEDOM_AT - 0.1) / 0.4));
    const lift = easeOutCubic(clamp01((t - HOPS[0].lift) / HOP.liftLen));
    return up * (1 - lift);
  }
  if (i > 3) return 0;
  const land = HOPS[i - 1];
  const fall = clamp01((t - (land.land - HOP.fall)) / HOP.fall);
  const next = HOPS[i];
  const lift = next ? easeOutCubic(clamp01((t - next.lift) / HOP.liftLen)) : 0;
  return fall * fall * (1 - lift);
}

/** Is the keyboard drawn inside phone i (rather than flying)? */
function kbDocked(i: number, t: number) {
  if (i === 0) return t >= FREEDOM_AT && t < HOPS[0].lift;
  if (i > 3) return false;
  return t >= HOPS[i - 1].land && (i === 3 || t < HOPS[i].lift);
}

function PhoneScreen({ i, t }: { i: number; t: number }) {
  const dock = kbIn(i, t);
  if (i === 0) {
    const nav: Nav = [
      { at: PHONE_IN, how: 'push', draw: (l) => <CommunityScreen local={l - (COMMUNITY.at - PHONE_IN)} activeAt={-1} cardTapAt={CARD_TAP - COMMUNITY.at} /> },
      // The partner chat stays on through Freedom, when the keyboard comes up in it.
      { at: CHALLENGE.at, how: 'push', draw: (l) => <PartnerScreen local={l} dock={dock} /> },
    ];
    return (
      <>
        <NavStack nav={nav} t={t} />
        {kbDocked(0, t) && (
          <div className="absolute inset-x-0 bottom-0 z-10" style={{ transform: `translateY(${(1 - dock) * KB_H}px)` }}>
            <Kb t={t} text="" keyDown={null} />
          </div>
        )}
      </>
    );
  }
  const h = i - 1;
  const app = HOP_APPS[i] as 'whatsapp' | 'instagram' | 'telegram';
  const sentK = easeOutCubic(clamp01((t - HOP_SENDS[h]) / 0.3));
  const typed = t >= HOP_SENDS[h] ? '' : typedAt(HOP_TYPED[h], HOP_TYPE_TIMES[h], t);
  return (
    <>
      <MessagingApp app={app} dock={dock} typed={typed} t={t} sent={HOP_TYPED[h]} sentK={sentK} />
      {kbDocked(i, t) && (
        <div className="absolute inset-x-0 bottom-0 z-10">
          <Kb t={t} text={typed || 'x'} keyDown={keyAt(HOP_TYPED[h], HOP_TYPE_TIMES[h], t)} />
        </div>
      )}
    </>
  );
}

function Phones({ t }: { t: number }) {
  return (
    <>
      {PHONES.map((p, i) => {
        if (t < p.in || t > p.out + (p.exit === 'away' ? AWAY_LEN : HOP.pushLen)) return null;
        const { dx, dy, s, o: o0 } = phonePose(i, t);
        // The first phone dissolves into the partner chat's bubbles, and forms again for the keyboard.
        const o = i === 0 ? o0 * (1 - span(t, PARTNER.dissolve, PARTNER.gone, (x) => x) + span(t, PARTNER.back, PARTNER.back + 0.45, (x) => x)) : o0;
        let sc = PH.s * s;
        let x = PH.cx + dx - (OUTER_W / 2) * sc;
        let y = PH.cy + dy - (OUTER_H / 2) * sc;
        if (i === 0) {
          // Closes in on the chat card, and back out as the chat opens.
          const z = easeInOutCubic(clamp01((t - ZOOM_AT) / 0.7)) * (t < PARTNER.gone ? 1 : 0);
          if (z > 0) {
            const s1 = sc * ZOOM.k;
            x = lerp(x, ZOOM.x - (BEZEL + ACTIVE_CARD_CENTER.x) * s1, z);
            y = lerp(y, ZOOM.y - (BEZEL + ACTIVE_CARD_CENTER.y) * s1, z);
            sc = lerp(sc, s1, z);
          }
        }
        return (
          <div
            key={i}
            className="absolute left-0 top-0"
            style={{ transform: `translate(${x}px, ${y}px) scale(${sc})`, transformOrigin: '0 0', opacity: o, zIndex: i }}
          >
            <Device>
              <PhoneScreen i={i} t={t} />
            </Device>
          </div>
        );
      })}
    </>
  );
}

/** The progress rings on their own, where the phone was. */
const RINGS_SCALE = PORTRAIT ? 2.55 : 1.9;
const RINGS_C = PORTRAIT ? { x: 540, y: 880 } : { x: PH.cx, y: PH.cy };
/** After the rings fill, the camera closes in on the ring that completed and
    flies through it into "Well… you can." */
const RING_ZOOM = { from: RINGS_AT + RINGS_LEN + 0.3, to: END_AT + 0.4, k: 50 };
function Rings({ t }: { t: number }) {
  if (t < PHONE_AWAY + 0.15 || t > RING_ZOOM.to) return null;
  const appear = clamp01((t - PHONE_AWAY - 0.2) / 0.9);
  const u = clamp01((t - RING_ZOOM.from) / (RING_ZOOM.to - RING_ZOOM.from));
  const move = easeInOutCubic(clamp01(u / 0.45));
  const z = Math.exp(Math.log(RING_ZOOM.k) * u ** 3);
  const L = RINGS_GRID.last;
  // The last ring's centre in the frame: from its place in the grid to the frame's centre.
  const x0 = RINGS_C.x + (L.x - RINGS_GRID.w / 2) * RINGS_SCALE;
  const y0 = RINGS_C.y + (L.y - RINGS_GRID.h / 2) * RINGS_SCALE;
  const x = lerp(x0, W / 2, move);
  const y = lerp(y0, PORTRAIT ? 960 : H / 2, move);
  return (
    <div className="dark absolute left-0 top-0" style={{ width: RINGS_GRID.w, transformOrigin: `${L.x}px ${L.y}px`, transform: `translate(${x - L.x}px, ${y - L.y}px) scale(${RINGS_SCALE * z})` }}>
      <RingsGrid k={clamp01((t - RINGS_AT) / RINGS_LEN)} appear={appear} zoom={u} />
    </div>
  );
}

/** The keyboard in the air between two apps. */
function FlyingKeyboard({ t }: { t: number }) {
  const h = HOPS.findIndex((x) => t >= x.lift && t < x.land);
  if (h < 0) return null;
  const { lift, land } = HOPS[h];
  const s = PH.s;
  // The docked keyboard's centre on the centred phone.
  const dockY = PH.cy - (OUTER_H / 2) * s + 12 * s + (874 - KB_H / 2) * s;
  const up = easeOutCubic(clamp01((t - lift) / HOP.liftLen));
  const fall = clamp01((t - (land - HOP.fall)) / HOP.fall);
  const air = 1 - fall * fall;
  const bob = Math.sin((t - lift) * 5) * 8 * up * air;
  const y = dockY - LIFT * up * air + bob;
  const v = clamp01((t - lift) / (land - lift));
  const x = PH.cx + 80 * Math.sin(Math.PI * v);
  const rot = 5 * Math.sin(Math.PI * clamp01((v - 0.1) / 0.8));
  const grow = 1 + 0.07 * up * air;
  const r = lerp(0, 26, up * air);
  const rb = lerp(44, 26, up * air);
  return (
    <div
      className="dark absolute left-0 top-0 overflow-hidden"
      style={{
        width: 402,
        height: KB_H,
        transform: `translate(${x - 201}px, ${y - KB_H / 2}px) scale(${s * grow}) rotate(${rot}deg)`,
        transformOrigin: '201px 169.5px',
        borderRadius: `${r}px ${r}px ${rb}px ${rb}px`,
        boxShadow: `0 ${30 * up * air}px ${70 * up * air}px rgba(0,0,0,${0.55 * up * air}), 0 0 0 1px rgba(255,255,255,${0.08 * up * air})`,
        zIndex: 10,
      }}
    >
      <Kb t={t} text="x" keyDown={null} />
    </div>
  );
}

// ── The film ──

let resolveReady: () => void;
export const a03Ready = new Promise<void>((r) => (resolveReady = r));

export default function A03Film() {
  const params = new URLSearchParams(location.search);
  const still = params.get('t');
  const [t, setT] = useState(still ? parseFloat(still) : 0);
  const [avBox, setAvBox] = useState<Box[] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    let live = true;
    const interRegistered = new Promise<void>((resolve) => {
      const t0 = performance.now();
      const check = () =>
        [...document.fonts].some((f) => f.family.replace(/["']/g, '') === 'Inter') || performance.now() - t0 > 8000 ? resolve() : setTimeout(check, 50);
      check();
    });
    const allText = CARDS.map((c) => c.text).join('') + ROAD;
    interRegistered
      .then(() =>
        Promise.all([
          document.fonts.load(`700 ${AV_SIZE}px 'Inter Display'`, AV_TEXT + allText),
          document.fonts.load('17px Inter', HOP_TYPED.join('') + '9:41'),
          document.fonts.load('600 17px Inter', '9:41'),
          ...[400, 500, 600, 700].map((w) => document.fonts.load(`${w} 16px 'Noto Sans'`, 'Word progress Sunny Heron Arcatext 1,000')),
        ]),
      )
      .then(() => document.fonts.ready)
      .then(() => preloadAvatars())
      .then(() => {
        if (!live || !rootRef.current) return;
        const b = measureAvBox(rootRef.current);
        flushSync(() => setAvBox(b));
        resolveReady();
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    window.__cues = cues() as never;
    window.__seek = (ms: number) => {
      flushSync(() => setT(ms / 1000));
      syncAnimations(ms);
    };
    if (params.has('play')) {
      const t0 = performance.now();
      let raf = 0;
      const tick = (now: number) => {
        setT(((now - t0) / 1000) % DURATION);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="relative overflow-hidden bg-black" style={{ width: W, height: H }}>
      <Glow />
      {avBox && t < AV_END && <AvatarOpener t={t} boxes={avBox} caret={false} />}
      {CARDS.map((l) => (
        <Card key={l.key} l={l} t={t} />
      ))}
      <BubbleShot t={t} at={PRACTICE.at} lines={PRACTICE_CHAT} out={CHAT.out} mine="#2D63E6" bottom={PORTRAIT ? 1110 : 700} />
      <BubbleShot t={t} at={CHALLENGE.at} lines={PARTNER_CHAT} out={PARTNER.out} mine="#4F7FFF" bottom={PORTRAIT ? 1110 : 700} />
      <Phones t={t} />
      <FlyingKeyboard t={t} />
      <Rings t={t} />
      {t >= END_AT - 0.1 && <Ending t={t} />}
    </div>
  );
}
