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
import { CommunityScreen, PartnerScreen, PracticeScreen, WordListScreen } from './Screens';
import {
  APP_IN,
  APP_OUT,
  CARDS,
  CHALLENGE,
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
  PROGRESS_PUSH,
  REQUEST_TAP,
  RINGS_AT,
  RINGS_LEN,
  ROAD,
  YOUCAN,
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

function YouCan({ t }: { t: number }) {
  const a = span(t, YOUCAN.at + 0.2, YOUCAN.at + 0.75, easeOutCubic);
  const b = span(t, YOUCAN.at + 0.25 + 1.12, YOUCAN.at + 0.25 + 1.62, easeOutCubic);
  const out = span(t, END_AT - 0.45, END_AT - 0.05, (x) => x);
  if (a <= 0 || out >= 1) return null;
  const piece = (k: number) => ({ display: 'inline-block', opacity: k, transform: `translateY(${(1 - k) * 26}px)`, filter: k < 1 ? `blur(${(1 - k) * 12}px)` : undefined });
  return (
    <div className="absolute flex justify-center" style={{ left: 0, width: W, top: PORTRAIT ? STAGE.cy + 60 : H / 2, transform: `translateY(calc(-50% - ${out * 30}px))`, opacity: 1 - out }}>
      <div className="whitespace-nowrap" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: PORTRAIT ? 132 : 140, letterSpacing: '-0.03em', color: '#fff' }}>
        <span style={piece(a)}>Well…</span> <span style={{ ...piece(b), color: ACCENT }}>you can.</span>
      </div>
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
      <div className="absolute grid place-items-center" style={{ left: W / 2 - 300, width: 600, top: cy - 150, height: 300 }}>
        {t >= LOGO_AT && <SplashLogo s={t - LOGO_AT} scale={2.2} keepBlue />}
      </div>
      {lineOut < 1 && (
        <div className="absolute flex justify-center" style={{ left: 0, width: W, top: cy, transform: `translateY(calc(-50% + ${(1 - k) * 18}px))`, opacity: k * (1 - lineOut), filter: k < 1 ? `blur(${(1 - k) * 8}px)` : undefined }}>
          <div className="whitespace-nowrap" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: PORTRAIT ? 84 : 92, letterSpacing: '-0.025em', color: '#fff' }}>
            {accentParts(ROAD, '1000 words')}
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-black" style={{ opacity: fade }} />
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
const PHONES = [
  { in: APP_IN, rise: true, out: HOPS[0].push, drop: false },
  { in: HOPS[0].push, rise: false, out: HOPS[1].push, drop: false },
  { in: HOPS[1].push, rise: false, out: HOPS[2].push, drop: false },
  { in: HOPS[2].push, rise: false, out: PROGRESS_PUSH, drop: false },
  { in: PROGRESS_PUSH, rise: false, out: APP_OUT, drop: true },
];

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
  if (p.drop) {
    const k = clamp01((t - p.out) / 0.55);
    dy += k * k * 760;
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
      { at: APP_IN, how: 'push', draw: (l) => <WordListScreen local={l} /> },
      { at: CHALLENGE.at, how: 'push', draw: (l) => <PartnerScreen local={l} /> },
      { at: COMMUNITY.at, how: 'pop', draw: (l) => <CommunityScreen local={l} tapAt={REQUEST_TAP - COMMUNITY.at} /> },
      { at: FREEDOM_AT, how: 'push', draw: () => <PartnerScreen local={9} dock={dock} /> },
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
  if (i === 4) return <PracticeScreen k={clamp01((t - RINGS_AT) / RINGS_LEN)} />;
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
        if (t < p.in || t > p.out + (p.drop ? 0.55 : HOP.pushLen)) return null;
        const { dx, dy, s, o } = phonePose(i, t);
        const sc = PH.s * s;
        return (
          <div
            key={i}
            className="absolute left-0 top-0"
            style={{ transform: `translate(${PH.cx + dx - (OUTER_W / 2) * sc}px, ${PH.cy + dy - (OUTER_H / 2) * sc}px) scale(${sc})`, transformOrigin: '0 0', opacity: o, zIndex: i }}
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
    const allText = CARDS.map((c) => c.text).join('') + YOUCAN.text + ROAD;
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
      {avBox && t < AV_END && <AvatarOpener t={t} boxes={avBox} />}
      {CARDS.map((l) => (
        <Card key={l.key} l={l} t={t} />
      ))}
      <Phones t={t} />
      <FlyingKeyboard t={t} />
      <YouCan t={t} />
      {t >= END_AT - 0.1 && <Ending t={t} />}
    </div>
  );
}
