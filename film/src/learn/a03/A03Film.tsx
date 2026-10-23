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
import { clamp01, easeInOutCubic, easeOutBack, easeOutCubic, lerp, span } from '../../ease';
import { AV_END, AV_TEXT, STAGE } from '../learnTimeline';
import { Device, OUTER_H, OUTER_W } from './Device';
import { KB_DOCK_H, MessagingApp } from './MessagingApps';
import { ACTIVE_CARD_CENTER, CommunityScreen, NOTO, PartnerScreen, RINGS_GRID, RingsGrid } from './Screens';
import {
  CARDS,
  FREEDOM_A,
  FREEDOM_B,
  CHALLENGE,
  COMMUNITY,
  DURATION,
  END_AT,
  FRAME,
  HOP,
  HOP_APPS,
  HOP_SENDS,
  HOP_TYPED,
  HOP_TYPE_TIMES,
  HOPS,
  LOGO_AT,
  LOGO_SPEED,
  ROAD_OUT,
  PORTRAIT,
  PHONE_AWAY,
  COWRITE,
  PARTNER,
  PHONE_IN,
  LIST_SCROLL,
  RINGS_AT,
  RINGS_LEN,
  ROAD,
  ROAD2,
  ROAD2_AT,
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
      {noHyphenBreak(text.slice(0, i))}
      <span style={{ color: ACCENT }}>{noHyphenBreak(accent)}</span>
      {noHyphenBreak(text.slice(i + accent.length))}
    </>
  );
}
/** Keeps hyphenated words ("co-writing") whole across line breaks. */
function noHyphenBreak(s: string) {
  return s.split(/(\S+-\S+)/).map((x, j) => (/\S-\S/.test(x) ? <span key={j} style={{ whiteSpace: 'nowrap' }}>{x}</span> : x));
}

/** In 9:16 the Freedom lines hang just under the top safe zone (TikTok,
    Reels and Shorts cover the top 7.8%) so the phone can rise and show
    more of the keyboard. */
const FREE_TOP = PORTRAIT ? 190 : null;
/** How far the phones rise for Freedom (9:16 only). */
const FREE_DY = PORTRAIT ? -110 : 0;
const CARD_PLACE = PORTRAIT ? { left: STAGE.cx - STAGE.w / 2, width: STAGE.w, top: STAGE.cy - 430 } : { left: 150, width: 720, top: FRAME.h / 2 };

function Card({ l, t }: { l: Line; t: number }) {
  const k = span(t, l.at, l.at + 0.55, easeOutCubic);
  const out = span(t, l.out - 0.45, l.out - 0.05, (x) => x);
  if (k <= 0 || out >= 1) return null;
  const free = FREE_TOP !== null && (l === FREEDOM_A || l === FREEDOM_B);
  return (
    <div className="absolute" style={{ ...CARD_PLACE, ...(free ? { top: FREE_TOP! } : {}), transform: `translateY(calc(${free ? '0%' : '-50%'} + ${(1 - k) * 22 - out * 30}px))`, opacity: k * (1 - out), filter: k < 1 ? `blur(${(1 - k) * 10}px)` : undefined }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: PORTRAIT ? 74 : 72, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#fff', textWrap: 'balance' }}>{accentParts(l.text, l.accent)}</div>
    </div>
  );
}

function Ending({ t }: { t: number }) {
  const local = t - END_AT;
  const k = span(local, 0.15, 0.75, easeOutCubic);
  const k2 = span(t, ROAD2_AT, ROAD2_AT + 0.5, easeOutCubic);
  const lineOut = span(t, ROAD_OUT, LOGO_AT, (x) => x);
  const fade = span(t, DURATION - 0.6, DURATION, (x) => x);
  const cy = PORTRAIT ? STAGE.cy + 60 : H / 2;
  return (
    <div className="absolute inset-0">
      <div className="absolute grid place-items-center" style={{ left: STAGE.cx - 300, width: 600, top: cy - 150, height: 300 }}>
        {t >= LOGO_AT && <SplashLogo s={(t - LOGO_AT) * LOGO_SPEED} scale={2.2} keepBlue />}
      </div>
      {lineOut < 1 && (
        <div className="absolute flex justify-center" style={{ left: STAGE.cx - 500, width: 1000, top: cy, transform: `translateY(calc(-50% + ${(1 - k) * 18}px))`, opacity: k * (1 - lineOut), filter: k < 1 ? `blur(${(1 - k) * 8}px)` : undefined }}>
          {/* Both lines are laid out from the start, so the first never moves when the second comes in. */}
          <div className="whitespace-nowrap text-center" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: PORTRAIT ? 62 : 76, lineHeight: 1.2, letterSpacing: '-0.02em', color: '#fff' }}>
            <div>{accentParts(ROAD, '1000 words')}</div>
            <div style={{ opacity: k2, transform: `translateY(${(1 - k2) * 14}px)`, filter: k2 < 1 ? `blur(${(1 - k2) * 8}px)` : undefined }}>{ROAD2}</div>
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-black" style={{ opacity: fade }} />
    </div>
  );
}

// ── Challenge: the co-written paragraph ──

/** The paragraph two people write together: each part typed in its writer's
    highlight, with a named cursor. The whole paragraph is laid out from the
    start (untyped letters invisible), so nothing moves as it types. */
const WRITERS = { me: { name: 'You', color: '#4F7FFF' }, them: { name: 'Sunny Heron', color: '#F5A524' } };
function CoWrite({ t }: { t: number }) {
  const l = t - CHALLENGE.at;
  if (l > PARTNER.out + 0.45) return null;
  const k = easeOutCubic(clamp01((l - COWRITE.cardAt) / 0.4));
  const fade = span(l, PARTNER.out, PARTNER.out + 0.4, (x) => x);
  if (l < COWRITE.cardAt) return null;
  const active = [...COWRITE.segs].reverse().find((s) => l >= s.at - 0.15);
  const box = PORTRAIT ? { cx: 540, w: 860, cy: 1000 } : { cx: 1390, w: 820, cy: 560 };
  return (
    <div className="absolute flex flex-col justify-center" style={{ left: box.cx - box.w / 2, width: box.w, top: box.cy - 400, height: 800 }}>
    <div
      style={{
        padding: PORTRAIT ? '34px 40px' : '30px 36px',
        borderRadius: 40,
        background: '#1C1C1E',
        boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
        fontFamily: NOTO,
        fontSize: PORTRAIT ? 44 : 40,
        lineHeight: 1.5,
        color: '#fff',
        opacity: k * (1 - fade),
        transform: `translateY(${(1 - k) * 30}px)`,
      }}
    >
      {COWRITE.segs.map((s, i) => {
        let n = 0;
        while (n < s.times.length && s.times[n] <= l) n++;
        const w = WRITERS[s.who];
        const cursor = active === s;
        return (
          <span key={i}>
            <span style={{ background: n > 0 ? `${w.color}40` : undefined, borderRadius: 8, boxShadow: n > 0 ? `0 0 0 4px ${w.color}40` : undefined }}>{s.text.slice(0, n)}</span>
            {cursor && (
              <span style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 1, top: '0.08em', width: 4, height: '1.2em', background: w.color, borderRadius: 2 }} />
                <span style={{ position: 'absolute', left: 1, bottom: '1.15em', whiteSpace: 'nowrap', padding: '2px 12px', borderRadius: 10, background: w.color, color: '#0B0B0D', fontSize: '0.5em', fontWeight: 600, lineHeight: 1.4 }}>{w.name}</span>
              </span>
            )}
            <span style={{ color: 'transparent' }}>{s.text.slice(n)}</span>
          </span>
        );
      })}
    </div>
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
    if (t < PARTNER.back) return 0;
    // Already up when the phone forms again for Freedom.
    const lift = easeOutCubic(clamp01((t - HOPS[0].lift) / HOP.liftLen));
    return 1 - lift;
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
  if (i === 0) return t >= PARTNER.back && t < HOPS[0].lift;
  if (i > 3) return false;
  return t >= HOPS[i - 1].land && (i === 3 || t < HOPS[i].lift);
}

function PhoneScreen({ i, t }: { i: number; t: number }) {
  const dock = kbIn(i, t);
  if (i === 0) {
    const nav: Nav = [
      {
        at: PHONE_IN,
        how: 'push',
        draw: (l) => {
          const local = l - (COMMUNITY.at - PHONE_IN);
          const scroll = LIST_SCROLL.by * easeInOutCubic(clamp01((local - LIST_SCROLL.from) / (LIST_SCROLL.to - LIST_SCROLL.from)));
          return <CommunityScreen local={local} activeAt={-1} cardTapAt={99} scroll={scroll} />;
        },
      },
      // While the phone is gone (the partner chat's bubbles), it changes to the
      // partner chat, which the keyboard comes up in for Freedom.
      { at: PARTNER.gone, how: 'push', draw: () => <PartnerScreen local={9} dock={dock} /> },
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
        // Every phone sits higher for Freedom; the first only once it is gone from the challenge.
        let y = PH.cy + dy + (i > 0 || t >= PARTNER.gone ? FREE_DY : 0) - (OUTER_H / 2) * sc;
        if (i === 0) {
          // Close in on the chat list from the start; back to normal while it's gone.
          const z = t < PARTNER.gone ? 1 : 0;
          if (z > 0) {
            const s1 = sc * ZOOM.k;
            x = lerp(x, ZOOM.x - (BEZEL + ACTIVE_CARD_CENTER.x) * s1 + dx, z);
            y = lerp(y, ZOOM.y - (BEZEL + ACTIVE_CARD_CENTER.y) * s1 + dy, z);
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
            {i <= 3 && <LauncherIcon app={HOP_APPS[i]} k={iconIn(i, t)} />}
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

/** When each phone's launcher icon pops in: the Arcatext app's as it forms
    again for Freedom, each messaging app's as it settles in the centre. */
function iconIn(i: number, t: number) {
  const at = i === 0 ? PARTNER.back + 0.2 : PHONES[i].in + HOP.pushLen - 0.1;
  return easeOutBack(clamp01((t - at) / 0.4));
}

/** An iOS home-screen icon in its dark appearance, to the phone's left. */
const ICON = 150;
function LauncherIcon({ app, k }: { app: (typeof HOP_APPS)[number]; k: number }) {
  if (k <= 0) return null;
  const size = ICON / PH.s;
  const glyph: Record<typeof app, ReactNode> = {
    arcatext: (
      <svg viewBox="0 0 31 50" width="38%" height="62%" fill="#7BA2FF">
        <rect x={0} y={0} width={12} height={5} />
        <rect x={19} y={0} width={12} height={5} />
        <rect x={12} y={5} width={7} height={40} />
        <rect x={0} y={45} width={12} height={5} />
        <rect x={19} y={45} width={12} height={5} />
      </svg>
    ),
    whatsapp: (
      <svg viewBox="0 0 100 100" width="66%" height="66%">
        <path d="M50 12a38 38 0 0 0-32.6 57.5L12 88l19.1-5.2A38 38 0 1 0 50 12z" fill="none" stroke="#25D366" strokeWidth={7} strokeLinejoin="round" />
        <path d="M37 32c-2 0-4 2-4.5 4.5-.8 5 2.5 12 8.5 18s13 9.3 18 8.5c2.5-.5 4.5-2.5 4.5-4.5l-.6-3.2c-.2-.9-1-1.5-1.9-1.6l-6.5-.9c-.8-.1-1.6.3-2 1l-1.5 2.4c-4.5-2-8.2-5.7-10.2-10.2l2.4-1.5c.7-.4 1.1-1.2 1-2l-.9-6.5c-.1-.9-.7-1.7-1.6-1.9L40.2 32.6c-1-.4-2.1-.6-3.2-.6z" fill="#25D366" />
      </svg>
    ),
    instagram: (
      <svg viewBox="0 0 100 100" width="64%" height="64%">
        <defs>
          <linearGradient id="igd" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#FEDA75" />
            <stop offset="0.3" stopColor="#FA7E1E" />
            <stop offset="0.6" stopColor="#D62976" />
            <stop offset="1" stopColor="#4F5BD5" />
          </linearGradient>
        </defs>
        <rect x={8} y={8} width={84} height={84} rx={24} fill="none" stroke="url(#igd)" strokeWidth={8} />
        <circle cx={50} cy={50} r={19} fill="none" stroke="url(#igd)" strokeWidth={8} />
        <circle cx={73} cy={27} r={5.5} fill="url(#igd)" />
      </svg>
    ),
    // "Any messaging app": an infinity sign rather than a third brand.
    telegram: (
      <svg viewBox="0 0 100 100" width="70%" height="70%">
        <defs>
          <linearGradient id="infd" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#7BA2FF" />
            <stop offset="1" stopColor="#B78CFF" />
          </linearGradient>
        </defs>
        <path d="M50 50c-8-10-14-16-22-16a16 16 0 0 0 0 32c8 0 14-6 22-16s14-16 22-16a16 16 0 0 1 0 32c-8 0-14-6-22-16z" fill="none" stroke="url(#infd)" strokeWidth={8.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  };
  return (
    <div
      className="absolute grid place-items-center"
      style={{
        left: -size - 26,
        top: OUTER_H / 2 - size / 2,
        width: size,
        height: size,
        borderRadius: size * 0.2237,
        background: 'linear-gradient(180deg,#2C2C2E 0%,#121214 100%)',
        boxShadow: '0 12px 30px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.08)',
        transform: `scale(${k})`,
        opacity: Math.min(1, k * 1.5),
      }}
    >
      {glyph[app]}
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
  const dockY = PH.cy + FREE_DY - (OUTER_H / 2) * s + 12 * s + (874 - KB_H / 2) * s;
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
    const allText = CARDS.map((c) => c.text).join('') + ROAD + ROAD2;
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
      <CoWrite t={t} />
      <Phones t={t} />
      <FlyingKeyboard t={t} />
      <Rings t={t} />
      {t >= END_AT - 0.1 && <Ending t={t} />}
    </div>
  );
}
