/**
 * The Arcatext app's screens for Arcatext 03, in dark mode, from the Swift
 * views on Arcatext's main: the word list (WordListView), a conversation
 * with a partner (PeerConversationView), the community list
 * (PeerCommunityList) and the Practice tab's word progress rings
 * (WordCategoriesCard). Sizes are iOS points; `local` is seconds since the
 * screen came on.
 */
import type { ReactNode } from 'react';
import { AudioLines, ChartNoAxesColumn, ChevronDown, ChevronLeft, ChevronRight, CircleEllipsis, CircleUserRound, Globe, House, Leaf, MessagesSquare, Search, Users, Volume2, X } from 'lucide-react';
import { clamp01, easeInOutCubic, easeOutBack, easeOutCubic, lerp } from '../../ease';
import { HomeBar, StatusBar } from './Device';
import { KB_DOCK_H } from './MessagingApps';

export const NOTO = "'Noto Sans', Inter, sans-serif";
const SF = "Inter, 'SF Pro Text', system-ui, sans-serif";
const ACCENT = '#7BA2FF';
const SECONDARY = 'rgba(235,235,245,0.6)';
const PLACEHOLDER = 'rgba(235,235,245,0.3)';
const PAGE = '#2B2B2B';
const CARD = '#3B3B3B';
const GROUPED = '#1C1C1E';
const GREEN = '#30D158';
const HAIR = 'rgba(84,84,88,0.6)';

// ── Shared chrome ──────────────────────────────────────────────────────────

/** ArcatextLogo: the I-beam, 15.5 x 25 pt. */
function Logo() {
  return (
    <svg width={15.5} height={25} viewBox="0 0 31 50" fill={ACCENT}>
      <rect x={0} y={0} width={12} height={5} />
      <rect x={19} y={0} width={12} height={5} />
      <rect x={12} y={5} width={7} height={40} />
      <rect x={0} y={45} width={12} height={5} />
      <rect x={19} y={45} width={12} height={5} />
    </svg>
  );
}

/** PageTitleBar: logo, centred title, and (on Chat) the profile button. */
function PageTitleBar({ title, profile }: { title: string; profile?: boolean }) {
  return (
    <div className="relative flex shrink-0 items-center justify-between px-5" style={{ height: 44, background: PAGE }}>
      <Logo />
      <div className="absolute inset-x-0 text-center" style={{ fontFamily: NOTO, fontWeight: 700, fontSize: 17, color: '#fff' }}>
        {title}
      </div>
      {profile && (
        <div className="relative grid place-items-center rounded-[16px]" style={{ width: 38, height: 38, background: CARD }}>
          <CircleUserRound size={17} color="#ABABAB" strokeWidth={2.2} />
        </div>
      )}
    </div>
  );
}

/** A native segmented control in dark mode. */
function Segmented({ items, sel }: { items: string[]; sel: number }) {
  return (
    <div className="relative flex rounded-[8px] p-[2px]" style={{ height: 36, background: '#49494C' }}>
      <div
        className="absolute rounded-[7px]"
        style={{ top: 2, bottom: 2, left: `calc(${(sel / items.length) * 100}% + 2px)`, width: `calc(${100 / items.length}% - 4px)`, background: '#636366', boxShadow: '0 3px 8px rgba(0,0,0,0.18)' }}
      />
      {items.map((x, i) => (
        <div key={x} className="relative flex flex-1 items-center justify-center" style={{ fontFamily: SF, fontSize: 13.5, fontWeight: i === Math.round(sel) ? 600 : 500, color: '#fff' }}>
          {x}
        </div>
      ))}
    </div>
  );
}

/** The tab bar: Chat, Practice, Study, Settings. */
function TabBar({ sel, badge }: { sel: number; badge?: string }) {
  const tabs: [string, ReactNode][] = [
    ['Chat', <MessagesSquare key="c" size={25} strokeWidth={2} />],
    ['Practice', <House key="p" size={25} strokeWidth={2} />],
    ['Study', <Leaf key="s" size={25} strokeWidth={2} />],
    ['Settings', <CircleUserRound key="u" size={25} strokeWidth={2} />],
  ];
  return (
    <div className="absolute inset-x-0 bottom-0 flex" style={{ height: 83, background: 'rgba(22,22,23,0.96)', borderTop: '0.5px solid rgba(255,255,255,0.15)' }}>
      {tabs.map(([label, icon], i) => (
        <div key={label} className="relative flex flex-1 flex-col items-center pt-[6px]" style={{ color: i === sel ? ACCENT : '#8E8E93' }}>
          <div className="relative">
            {icon}
            {i === 0 && badge && (
              <div className="absolute -right-[10px] -top-[4px] grid h-[18px] min-w-[18px] place-items-center rounded-full px-[5px] text-white" style={{ background: '#FF453A', fontFamily: SF, fontSize: 13, fontWeight: 500 }}>
                {badge}
              </div>
            )}
          </div>
          <div style={{ fontFamily: SF, fontSize: 10, fontWeight: 500, marginTop: 3 }}>{label}</div>
        </div>
      ))}
      <HomeBar />
    </div>
  );
}

function CheckFill({ size = 20, k = 1 }: { size?: number; k?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ transform: `scale(${k})`, opacity: Math.min(1, k * 2) }}>
      <circle cx={10} cy={10} r={10} fill={GREEN} />
      <path d="M5.6 10.3l3 3 5.8-6.4" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** "N of 1,000 words used" and its bar. */
function Tracker({ used, chevron }: { used: number; chevron?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div style={{ fontFamily: NOTO, fontSize: 15, color: '#fff' }}>
          <span style={{ fontWeight: 700 }}>{Math.round(used)}</span> of 1,000 words used
        </div>
        <div className="relative h-[4px] overflow-hidden rounded-full" style={{ background: 'rgba(235,235,245,0.14)' }}>
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(used / 1000) * 100}%`, background: ACCENT }} />
        </div>
      </div>
      {chevron && <ChevronRight size={16} color={SECONDARY} strokeWidth={2.6} />}
    </div>
  );
}

// ── 1. The word list ───────────────────────────────────────────────────────

const WORDS: [string, string, boolean][] = [
  ['el', 'the', true],
  ['de', 'of, from', true],
  ['que', 'that, which', true],
  ['y', 'and', true],
  ['a', 'to, at', true],
  ['en', 'in, on', true],
  ['un', 'a, an', true],
  ['ser', 'to be', true],
  ['se', 'oneself', false],
  ['no', 'no, not', true],
  ['haber', 'to have (auxiliary)', false],
  ['por', 'for, by, through', true],
  ['con', 'with', true],
  ['su', 'his, her, their', false],
  ['para', 'for, in order to', true],
  ['tener', 'to have', true],
  ['este', 'this', true],
  ['lo', 'it, him', false],
  ['como', 'like, as', true],
  ['estar', 'to be', true],
  ['hacer', 'to do, to make', false],
];
const ROW_H = 63;
/** How far the list has scrolled (pt). */
const listScroll = (l: number) => 420 * easeInOutCubic(clamp01((l - 0.9) / 3.6));
/** The unchecked rows that get their check, each as it passes the list's middle. */
const POPS = WORDS.map((w, i) => ({ i, used: w[2] }))
  .filter((x) => !x.used)
  .slice(0, 4)
  .map(({ i }) => {
    let l = 0;
    while (l < 4 && i * ROW_H + ROW_H / 2 - listScroll(l) > 300) l += 0.01;
    return { i, at: Math.max(0.5, l) };
  });

export function WordListScreen({ local }: { local: number }) {
  const scroll = listScroll(local);
  const popK = (i: number) => {
    const p = POPS.find((x) => x.i === i);
    return p ? easeOutBack(clamp01((local - p.at) / 0.3)) : 0;
  };
  const used = 222 + POPS.filter((p) => local >= p.at).length;
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: '#000', fontFamily: NOTO }}>
      <StatusBar />
      <div className="flex shrink-0 items-center gap-2 pl-1" style={{ height: 44 }}>
        <div className="grid h-11 w-11 place-items-center">
          <ChevronLeft size={24} color={ACCENT} strokeWidth={2.6} />
        </div>
        <div style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>Word progress</div>
        <div className="flex-1" />
        <div className="mr-2 grid h-11 w-11 place-items-center">
          <svg width={19} height={22} viewBox="0 0 15 17" fill="#fff">
            <path d="M7.83644 4.53786C8.28512 4.3242 8.39195 3.87553 8.22102 3.51231L6.87499 0.756159C6.6827 0.371579 6.25539 0.179289 5.84945 0.371579C5.4435 0.585234 5.29394 1.03391 5.48623 1.39713L6.83226 4.17465C7.00318 4.55923 7.47323 4.70878 7.83644 4.53786ZM1.12766 5.39248C0.721714 5.39248 0.379866 5.71296 0.379866 6.11891C0.379866 6.52486 0.721714 6.84534 1.12766 6.84534H3.07192C3.5847 9.02462 4.69571 11.0544 6.38358 12.785C4.73844 13.9814 3.07192 14.7292 0.914004 15.1993C0.486694 15.3061 0.294404 15.6907 0.379866 16.0966C0.486694 16.6308 1.0422 16.8017 1.6618 16.6521C3.75562 16.118 5.67852 15.2206 7.51596 13.7891C9.33203 15.2206 11.2549 16.118 13.306 16.6308C13.947 16.8017 14.5025 16.6521 14.6093 16.0966C14.7161 15.6907 14.5452 15.3061 14.0752 15.1993C11.9386 14.7292 10.2721 14.0028 8.62697 12.785C10.3148 11.0544 11.4259 9.02462 11.9386 6.84534H13.8615C14.2888 6.84534 14.6307 6.52486 14.6307 6.11891C14.6307 5.71296 14.2888 5.39248 13.8615 5.39248H1.12766ZM10.443 6.84534C9.95163 8.68278 8.92608 10.4347 7.51596 11.8662C6.08447 10.4347 5.05892 8.68278 4.56751 6.84534H10.443Z" />
          </svg>
        </div>
      </div>
      <div className="shrink-0" style={{ height: 0.5, background: HAIR }} />
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 pb-6 pt-3">
        <div style={{ fontWeight: 700, fontSize: 22, color: '#fff' }}>All</div>
        <div className="flex shrink-0 items-center gap-2 rounded-[10px] pl-3" style={{ height: 44, background: GROUPED }}>
          <Search size={18} color={SECONDARY} strokeWidth={2.4} />
          <span style={{ fontSize: 16, color: PLACEHOLDER }}>Search</span>
        </div>
        <div className="shrink-0 rounded-[12px] px-4 py-3" style={{ background: GROUPED }}>
          <Tracker used={used} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="min-w-0 flex-1">
            <Segmented items={['All', 'Used', 'New', 'Missed']} sel={0} />
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full px-3" style={{ height: 36, background: GROUPED, fontWeight: 500, fontSize: 14, color: '#fff' }}>
            Category <ChevronDown size={13} strokeWidth={2.8} />
          </div>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[12px]" style={{ background: GROUPED }}>
          <div style={{ transform: `translateY(${-scroll}px)` }}>
            {WORDS.map(([w, m, u], i) => {
              const k = u ? 1 : popK(i);
              return (
                <div key={w} className="relative flex items-center gap-3 px-3" style={{ height: ROW_H }}>
                  <div className="w-9 shrink-0 text-right" style={{ fontSize: 13, color: SECONDARY, fontVariantNumeric: 'tabular-nums' }}>
                    {i + 1}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <div style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>{w}</div>
                    <div className="truncate" style={{ fontSize: 14, color: SECONDARY }}>{m}</div>
                  </div>
                  <div className="grid w-6 place-items-center">{k > 0 && <CheckFill k={k} />}</div>
                  {i > 0 && <div className="absolute right-0 top-0" style={{ left: 60, height: 0.5, background: HAIR }} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <HomeBar />
    </div>
  );
}

// ── 2. A conversation with a partner ───────────────────────────────────────

type Msg = { me?: boolean; text: string; time: string; at: number; tr?: { at: number; text: string }; original?: boolean };
/** The thread; `at` is seconds into the Challenge shot (negative: already there). */
const THREAD: Msg[] = [
  { text: '¡Hola! ¿Qué tal tu semana?', time: '10:38 AM', at: -1 },
  { me: true, text: '¡Hola! Muy bien, gracias. Esta semana empecé a cocinar recetas mexicanas.', time: '10:39 AM', at: -1, original: true },
  { text: '¡Qué buena idea! ¿Cuál es tu plato favorito hasta ahora?', time: '10:41 AM', at: 0.45, tr: { at: 1.2, text: 'What a great idea! What’s your favourite dish so far?' } },
  { me: true, text: 'Los tacos al pastor, ¡sin duda!', time: '10:42 AM', at: 2.3 },
];
export const PARTNER_POPS = THREAD.filter((m) => m.at >= 0).map((m) => m.at);

function Bubble({ m, local }: { m: Msg; local: number }) {
  const k = easeOutCubic(clamp01((local - m.at) / 0.35));
  const tr = m.tr ? easeInOutCubic(clamp01((local - m.tr.at) / 0.4)) : 0;
  const foot = { fontFamily: NOTO, fontSize: 11, color: SECONDARY };
  return (
    <div style={{ display: 'grid', gridTemplateRows: `${Math.min(1, k * 1.4)}fr` }}>
      <div className={`flex min-h-0 flex-col gap-[2px] ${m.me ? 'items-end pl-12' : 'items-start pr-12'}`} style={{ opacity: k, transform: `translateY(${(1 - k) * 16}px)` }}>
        <div className="rounded-[16px] px-3 py-2" style={{ background: m.me ? ACCENT : CARD, color: '#fff', fontFamily: NOTO, fontSize: 16, lineHeight: '22px' }}>
          {m.text}
          {m.tr && (
            <div style={{ display: 'grid', gridTemplateRows: `${tr}fr`, opacity: tr }}>
              <div className="min-h-0 overflow-hidden">
                <div className="my-2" style={{ height: 1, background: 'rgba(235,235,245,0.18)' }} />
                <div className="flex items-center gap-[3px]" style={{ fontWeight: 500, fontSize: 12, color: ACCENT, minHeight: 24 }}>
                  <Globe size={12} strokeWidth={2.4} /> English - US <ChevronDown size={10} strokeWidth={3} />
                </div>
                <div style={{ fontSize: 15, lineHeight: '20px' }}>{m.tr.text}</div>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 px-1" style={{ ...foot, minHeight: 26 }}>
          {!m.me && (
            <span className="flex items-center gap-[3px]" style={{ fontWeight: 500, fontSize: 12, color: ACCENT }}>
              {tr > 0.5 ? 'Hide' : 'Translate'} <ChevronDown size={10} strokeWidth={3} style={{ transform: tr > 0.5 ? 'rotate(180deg)' : undefined }} />
            </span>
          )}
          <span>{m.time}</span>
          {m.original && (
            <span className="flex items-center gap-[3px]" style={{ fontWeight: 500, fontSize: 12, color: ACCENT }}>
              Original <ChevronDown size={10} strokeWidth={3} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** PeerConversationView. `dock` (0..1) lifts the composer onto the keyboard. */
export function PartnerScreen({ local, dock = 0 }: { local: number; dock?: number }) {
  const barBottom = lerp(0, KB_DOCK_H, dock);
  const safe = lerp(34, 0, dock);
  return (
    <div className="absolute inset-0" style={{ background: PAGE, fontFamily: NOTO }}>
      <div className="absolute inset-x-0 top-0 z-10" style={{ background: PAGE }}>
        <StatusBar />
        <div className="relative flex items-center justify-between px-4" style={{ height: 50 }}>
          <div className="grid place-items-center rounded-[16px]" style={{ width: 38, height: 38, background: CARD }}>
            <ChevronLeft size={19} color="#ABABAB" strokeWidth={2.6} />
          </div>
          <div className="absolute inset-x-0 flex flex-col items-center gap-[1px]">
            <div style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>Sunny Heron</div>
            <div className="flex items-center gap-[5px]" style={{ fontSize: 12, color: SECONDARY }}>
              <span className="h-2 w-2 rounded-full" style={{ background: GREEN }} />
              Online
            </div>
          </div>
          <CircleEllipsis size={24} color={ACCENT} strokeWidth={2} />
        </div>
      </div>
      <div className="absolute inset-x-0 flex flex-col justify-end gap-[6px] px-5 py-[10px]" style={{ top: 109, bottom: barBottom + 57 + safe }}>
        {THREAD.map((m, i) => (
          <Bubble key={i} m={m} local={local} />
        ))}
      </div>
      <div className="absolute inset-x-0 flex items-end gap-2 px-3 py-2" style={{ bottom: barBottom, paddingBottom: 8 + safe, background: '#161617' }}>
        <div className="flex min-w-0 flex-1 items-center rounded-[20px] px-[14px]" style={{ height: 41, background: CARD, fontSize: 16, color: PLACEHOLDER }}>
          Message
        </div>
        <div className="grid h-11 w-11 place-items-center">
          <svg width={32} height={32} viewBox="0 0 32 32">
            <circle cx={16} cy={16} r={16} fill="rgba(235,235,245,0.3)" />
            <path d="M16 23V10M10.5 15.5L16 10l5.5 5.5" stroke="#2B2B2B" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      {dock < 0.01 && <HomeBar />}
    </div>
  );
}

// ── 3. The community ───────────────────────────────────────────────────────

type Member = { name: string; online: boolean; seen: string; langs: string; pill: 'Open' | 'Request' | 'Requested' };
const MEMBERS: Member[] = [
  { name: 'Sunny Heron', online: true, seen: 'Online', langs: 'English Intermediate, Spanish Advanced', pill: 'Open' },
  { name: 'Curious Otter', online: true, seen: 'Online', langs: 'Spanish Beginner', pill: 'Request' },
  { name: 'Wise Falcon 42', online: false, seen: 'Last seen 5 min. ago', langs: 'French Beginner, Spanish Intermediate', pill: 'Requested' },
  { name: 'Bright Orchid', online: false, seen: 'Last seen 2 hr. ago', langs: 'Portuguese Advanced, Spanish Intermediate', pill: 'Request' },
  { name: 'Gentle Puffin', online: true, seen: 'Online', langs: 'Italian Intermediate, Spanish Beginner', pill: 'Request' },
];
const PILL = {
  Open: { fg: '#6FDB8A', bg: 'rgba(30,123,52,0.35)' },
  Request: { fg: '#8AB8FF', bg: 'rgba(11,87,201,0.35)' },
  Cancel: { fg: '#FF8A80', bg: 'rgba(179,38,30,0.35)' },
};

function Pill({ kind, pressed }: { kind: keyof typeof PILL | 'Open' | 'Request'; pressed?: boolean }) {
  return (
    <div className="relative flex items-center rounded-full px-[14px]" style={{ minHeight: 34, color: PILL[kind].fg, background: PILL[kind].bg, fontFamily: NOTO, fontWeight: 600, fontSize: 13, transform: pressed ? 'scale(0.94)' : undefined }}>
      {pressed && <span className="absolute -inset-2 rounded-full bg-white/25" />}
      {kind}
    </div>
  );
}

type Convo = { name: string; online: boolean; seen: string; unread?: number; sent: number; recv: number };
const CONVOS: Convo[] = [
  { name: 'Sunny Heron', online: true, seen: 'Online', unread: 2, sent: 14, recv: 11 },
  { name: 'Curious Otter', online: true, seen: 'Online', sent: 3, recv: 2 },
  { name: 'Bright Orchid', online: false, seen: 'Last seen 2 hr. ago', sent: 27, recv: 25 },
  { name: 'Wise Falcon 42', online: false, seen: 'Last seen 5 min. ago', sent: 8, recv: 9 },
];
/** The first chat card's centre on the Active page, in screen points (for the zoom). */
export const ACTIVE_CARD_CENTER = { x: 201, y: 314 };

function Notice() {
  return (
    <div className="flex items-start gap-2 rounded-[10px] px-3 py-2" style={{ background: 'rgba(107,83,0,0.45)', color: '#FFE7A3' }}>
      <Users size={14} strokeWidth={2.6} className="mt-[3px] shrink-0" />
      <div className="flex-1" style={{ fontWeight: 500, fontSize: 13, lineHeight: '19px' }}>
        These are anonymous chats with real people.
      </div>
      <X size={13} strokeWidth={3} className="mt-[3px]" />
    </div>
  );
}

function Presence({ online, seen }: { online: boolean; seen: string }) {
  return (
    <div className="flex items-center gap-[5px]" style={{ fontSize: 12, color: SECONDARY }}>
      <span className="h-2 w-2 rounded-full" style={{ background: online ? GREEN : '#48484A' }} />
      {seen}
    </div>
  );
}

/** Chat tab: starts on Find (or on Active when `activeAt` is negative), the Active segment is tapped at `activeAt`, and
    the first chat card is tapped at `cardTapAt` (seconds from `local` 0). */
export function CommunityScreen({ local, activeAt, cardTapAt }: { local: number; activeAt: number; cardTapAt: number }) {
  const page = easeInOutCubic(clamp01((local - activeAt - 0.05) / 0.35));
  const segPressed = local >= activeAt - 0.08 && local < activeAt + 0.1;
  const cardPressed = local >= cardTapAt - 0.08 && local < cardTapAt + 0.25;
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PAGE, fontFamily: NOTO }}>
      <StatusBar />
      <PageTitleBar title="Chat" profile />
      <div className="shrink-0" style={{ height: 24 }} />
      <div className="relative shrink-0 px-5 pb-3">
        <Segmented items={['Active', 'Find', 'Requests (1)']} sel={1 - page} />
        {segPressed && <span className="absolute rounded-full bg-white/25" style={{ left: 40, top: -6, width: 70, height: 48 }} />}
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Find */}
        <div className="absolute inset-0 flex flex-col gap-3 px-5" style={{ transform: `translateX(${page * 402}px)` }}>
          <div className="flex gap-2">
            {[
              [<Globe key="g" size={15} strokeWidth={2.2} />, 'Spanish'],
              [<ChartNoAxesColumn key="c" size={15} strokeWidth={2.6} />, 'Any level'],
            ].map(([icon, label], i) => (
              <div key={i} className="flex items-center gap-[6px] rounded-[18px] px-3" style={{ minHeight: 34, background: CARD, fontWeight: 500, fontSize: 14, color: '#fff' }}>
                {icon}
                {label}
                <ChevronDown size={13} strokeWidth={2.8} />
              </div>
            ))}
          </div>
          <Notice />
          {MEMBERS.map((m, i) => {
            const k = easeOutCubic(clamp01((local - 0.12 - i * 0.11) / 0.45));
            return (
              <div key={m.name} className="flex items-center gap-3 rounded-[14px] p-[14px]" style={{ background: CARD, opacity: k, transform: `translateY(${(1 - k) * 28}px)` }}>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>{m.name}</div>
                  <Presence online={m.online} seen={m.seen} />
                  <div className="flex items-start gap-[5px]" style={{ fontSize: 13, lineHeight: '18px', color: SECONDARY }}>
                    <Globe size={13} strokeWidth={2.2} className="mt-[2px] shrink-0" />
                    {m.langs}
                  </div>
                </div>
                {m.pill === 'Requested' ? (
                  <div className="flex flex-col items-end gap-2">
                    <div style={{ fontWeight: 500, fontSize: 13, color: SECONDARY }}>Requested</div>
                    <Pill kind="Cancel" />
                  </div>
                ) : (
                  <Pill kind={m.pill} />
                )}
              </div>
            );
          })}
        </div>
        {/* Active */}
        <div className="absolute inset-0 flex flex-col gap-3 px-5" style={{ transform: `translateX(${(page - 1) * 402}px)` }}>
          <div className="flex gap-2">
            {['All', 'Spanish'].map((x, i) => (
              <div key={x} className="flex items-center rounded-full px-[14px]" style={{ minHeight: 34, background: i === 0 ? ACCENT : CARD, fontWeight: 500, fontSize: 14, color: '#fff' }}>
                {x}
              </div>
            ))}
          </div>
          <Notice />
          {CONVOS.map((c, i) => (
            <div
              key={c.name}
              className="relative flex items-center gap-3 overflow-hidden rounded-[14px] p-[14px]"
              style={{
                background: CARD,
                opacity: activeAt < 0 ? easeOutCubic(clamp01((local - 0.12 - i * 0.11) / 0.45)) : 1,
                transform: `translateY(${activeAt < 0 ? (1 - easeOutCubic(clamp01((local - 0.12 - i * 0.11) / 0.45))) * 28 : 0}px)${i === 0 && cardPressed ? ' scale(0.98)' : ''}`,
              }}
            >
              {i === 0 && cardPressed && <div className="absolute inset-0 bg-white/10" />}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div style={{ fontWeight: c.unread ? 700 : 600, fontSize: 16, color: '#fff' }}>{c.name}</div>
                  {c.unread && (
                    <div className="grid h-5 min-w-5 place-items-center rounded-full px-[7px]" style={{ background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 12 }}>
                      {c.unread}
                    </div>
                  )}
                </div>
                <Presence online={c.online} seen={c.seen} />
                <div className="flex items-center gap-[5px]" style={{ fontSize: 13, lineHeight: '18px', color: SECONDARY }}>
                  <Globe size={13} strokeWidth={2.2} className="shrink-0" />
                  Spanish · {c.sent} sent · {c.recv} received
                </div>
              </div>
              <div className="px-1" style={{ fontWeight: 600, fontSize: 14, color: ACCENT }}>Chat</div>
            </div>
          ))}
        </div>
      </div>
      <TabBar sel={0} badge="1" />
    </div>
  );
}

// ── 4. Practice: the word progress rings ───────────────────────────────────

/** Each ring: its total, then the used count before and after the shot. */
const RINGS: [string, number, number, number][] = [
  ['Nouns', 420, 31, 71],
  ['Verbs', 280, 22, 58],
  ['Adj.', 142, 9, 26],
  ['Adverbs', 68, 7, 22],
  ['Pronouns', 23, 9, 16],
  ['Prep.', 18, 6, 13],
  ['Determ.', 21, 10, 18],
  ['Conj.', 12, 7, 12],
];
/** The hidden third row (Numbers, Interj.) still counts in the tracker. */
const HIDDEN: [number, number] = [3, 10];

function Ring({ label, total, used, pulse, textO = 1 }: { label: string; total: number; used: number; pulse: number; textO?: number }) {
  const n = Math.round(used);
  const done = n >= total;
  const r = 27;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, used / total);
  return (
    <div className="flex flex-col items-center gap-[6px]">
      <div className="relative" style={{ width: 54, height: 54, transform: `scale(${1 + 0.12 * pulse})` }}>
        <svg width={64} height={64} viewBox="-32 -32 64 64" className="absolute" style={{ left: -5, top: -5, overflow: 'visible' }}>
          <circle r={r} fill="none" stroke="rgba(235,235,245,0.18)" strokeWidth={5} />
          <circle r={r} fill="none" stroke={done ? GREEN : ACCENT} strokeWidth={5} strokeLinecap="round" strokeDasharray={`${c * frac} ${c}`} transform="rotate(-90)" />
        </svg>
        <div className="absolute inset-0 grid place-items-center" style={{ fontFamily: NOTO, fontWeight: 600, fontSize: 15, color: '#fff', fontVariantNumeric: 'tabular-nums', opacity: textO }}>
          {n}
        </div>
      </div>
      <div style={{ fontFamily: NOTO, fontSize: 12, color: SECONDARY, opacity: textO }}>{label}</div>
    </div>
  );
}

const CHATS: { title: string; level: string; pct: number }[] = [
  { title: 'Mom wants help with the dishes', level: 'A1', pct: 40 },
  { title: 'Ordering at a café', level: 'A2', pct: 100 },
  { title: 'Weekend plans with friends', level: 'A1', pct: 20 },
];

function Badge({ pct }: { pct: number }) {
  if (pct >= 100)
    return (
      <div className="flex items-center gap-1" style={{ color: GREEN, fontFamily: NOTO, fontWeight: 500, fontSize: 12 }}>
        <CheckFill size={15} /> 100%
      </div>
    );
  const r = 6.5;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-1" style={{ color: SECONDARY, fontFamily: NOTO, fontWeight: 500, fontSize: 12 }}>
      <svg width={16} height={16} viewBox="-8 -8 16 16">
        <circle r={r} fill="none" stroke="rgba(235,235,245,0.18)" strokeWidth={3} />
        <circle r={r} fill="none" stroke={ACCENT} strokeWidth={3} strokeLinecap="round" strokeDasharray={`${(c * pct) / 100} ${c}`} transform="rotate(-90)" />
      </svg>
      {pct}%
    </div>
  );
}

const ringK = (k: number, i: number) => easeInOutCubic(clamp01(k * (1 + 7 * 0.06) - i * 0.06));

/** Where the last ring (Conj., the one that completes) sits in the grid, in points. */
export const RINGS_GRID = { w: 321, h: 166.6, last: { x: 283.9, y: 117.3 } };

/** The rings and their labels alone, filling at `k`; each pops in at `appear`
    (0..1) a little after the last. As `zoom` (0..1) rises, everything but the
    last ring's circle fades. */
export function RingsGrid({ k, appear, zoom = 0 }: { k: number; appear: number; zoom?: number }) {
  const last = RINGS.length - 1;
  return (
    <div className="grid grid-cols-4 gap-x-2 gap-y-[14px]" style={{ width: 321 }}>
      {RINGS.map(([label, total, a, b], i) => {
        const v = lerp(a, b, ringK(k, i));
        const done = Math.round(v) >= total;
        const doneAt = done ? clamp01((ringK(k, i) - 0.97) / 0.03) : 0;
        const p = easeOutBack(clamp01(appear * 1.9 - i * 0.13));
        return (
          <div key={label} style={{ opacity: clamp01(p * 1.5) * (i === last ? 1 : 1 - clamp01(zoom * 3)), transform: `scale(${0.6 + 0.4 * p})` }}>
            <Ring label={label} total={total} used={v} pulse={done ? Math.sin(Math.PI * doneAt) : 0} textO={i === last ? 1 - clamp01(zoom * 4) : 1} />
          </div>
        );
      })}
    </div>
  );
}

/** The rings at `k` (0 = before, 1 = after), each starting a little after the last. */
export function PracticeScreen({ k }: { k: number }) {
  const vals = RINGS.map(([, , a, b], i) => lerp(a, b, ringK(k, i)));
  const used = vals.reduce((s, v) => s + Math.round(v), 0) + Math.round(lerp(HIDDEN[0], HIDDEN[1], k));
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PAGE, fontFamily: NOTO }}>
      <StatusBar />
      <PageTitleBar title="Practice" />
      <div className="shrink-0" style={{ height: 24 }} />
      <div className="flex flex-col gap-4">
        <div className="px-5 pt-2">
          <div className="flex flex-col gap-3 rounded-[16px] p-4" style={{ background: GROUPED }}>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>Word progress</div>
            <div className="py-1">
              <Tracker used={used} chevron />
            </div>
            <div className="grid grid-cols-4 gap-x-2 gap-y-[14px]">
              {RINGS.map(([label, total], i) => {
                const done = Math.round(vals[i]) >= total;
                // A pulse when a ring completes.
                const doneAt = done ? clamp01((ringK(k, i) - 0.97) / 0.03) : 0;
                return <Ring key={label} label={label} total={total} used={vals[i]} pulse={done ? Math.sin(Math.PI * doneAt) : 0} />;
              })}
            </div>
            <div className="flex items-center justify-center gap-1" style={{ height: 36, color: ACCENT, fontWeight: 500, fontSize: 14 }}>
              Show more <ChevronDown size={14} strokeWidth={2.6} />
            </div>
          </div>
        </div>
        <div className="px-5" style={{ fontWeight: 600, fontSize: 18, color: '#fff' }}>Recents</div>
        <div className="-mt-2 flex gap-3 overflow-hidden pl-5">
          {CHATS.map((c) => (
            <div key={c.title} className="flex shrink-0 flex-col gap-2 rounded-[12px] p-3" style={{ width: 160, minHeight: 120, background: CARD }}>
              <div style={{ fontWeight: 600, fontSize: 15, lineHeight: '20px', color: '#fff' }}>{c.title}</div>
              <div className="flex-1" />
              <div className="flex items-center gap-[6px]">
                <span className="rounded-[4px] px-[6px] py-[2px]" style={{ fontWeight: 500, fontSize: 11, color: ACCENT, background: 'rgba(123,162,255,0.12)' }}>{c.level}</span>
                <div className="flex-1" />
                <Badge pct={c.pct} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 px-5">
          {['Spanish', 'Topic', 'A1', 'A2', 'B1'].map((x, i) => (
            <div key={x} className="flex items-center gap-1 rounded-full px-3 py-[7px]" style={{ background: i === 0 ? '#2D63E6' : CARD, color: '#fff', fontWeight: 500, fontSize: 14 }}>
              {x}
              {i < 2 && <ChevronDown size={13} strokeWidth={2.8} />}
            </div>
          ))}
        </div>
      </div>
      <TabBar sel={1} />
    </div>
  );
}

// ── 5. Practice: a guided chat (ChatScreen) ────────────────────────────────

type ChatPlan = { reply: string; typeAt: number; per: number; sendAt: number; dotsAt: number; answerAt: number; cardsAt: number };

function Appear({ k, children }: { k: number; children: ReactNode }) {
  if (k <= 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateRows: `${Math.min(1, k * 1.4)}fr` }}>
      <div className="min-h-0" style={{ opacity: k, transform: `translateY(${(1 - k) * 14}px)` }}>
        {children}
      </div>
    </div>
  );
}

function BotRow({ text }: { text: string }) {
  return (
    <div className="flex items-start pr-10">
      <div className="flex items-start gap-2 rounded-[16px] p-[10px]" style={{ background: GROUPED, color: '#fff', fontSize: 16, lineHeight: '22px' }}>
        {text}
        <ChevronDown size={14} color={SECONDARY} strokeWidth={2.8} className="mt-[4px] shrink-0" />
      </div>
      <div className="grid h-11 w-11 shrink-0 place-items-center">
        <Volume2 size={19} color={ACCENT} strokeWidth={2.4} />
      </div>
    </div>
  );
}

function UserRow({ text }: { text: string }) {
  return (
    <div className="flex items-start justify-end pl-10">
      <div className="grid h-11 w-11 shrink-0 place-items-center">
        <Volume2 size={19} color={ACCENT} strokeWidth={2.4} />
      </div>
      <div className="flex items-start gap-2 rounded-[16px] p-[10px]" style={{ background: '#2D63E6', color: '#fff', fontSize: 16, lineHeight: '22px' }}>
        {text}
        <ChevronDown size={14} color="rgba(255,255,255,0.85)" strokeWidth={2.8} className="mt-[4px] shrink-0" />
      </div>
    </div>
  );
}

/** "Mom wants help with the dishes": the learner types one of the suggested
    replies and sends it, and Arcatext answers. `local` is seconds from the
    shot's start; the plan's times are from there too. */
export function GuidedChatScreen({ local, plan }: { local: number; plan: ChatPlan }) {
  const n = Math.max(0, Math.min(plan.reply.length, Math.floor((local - plan.typeAt) / plan.per) + 1));
  const sent = local >= plan.sendAt;
  const typed = sent ? '' : plan.reply.slice(0, n);
  const sentK = easeOutCubic(clamp01((local - plan.sendAt) / 0.35));
  const dots = local >= plan.dotsAt && local < plan.answerAt;
  const answerK = easeOutCubic(clamp01((local - plan.answerAt) / 0.35));
  const cards = easeInOutCubic(clamp01((local - plan.cardsAt) / 0.35));
  const pct = sent ? 40 : 20;
  const pressed = local >= plan.sendAt - 0.1 && local < plan.sendAt + 0.08;
  const card = (reply: string, meaning: string, o: number, x: number) => (
    <div className="absolute inset-0 rounded-[12px] p-3" style={{ background: CARD, opacity: o, transform: `translateX(${x}px)` }}>
      <div style={{ fontWeight: 500, fontSize: 15, color: ACCENT }}>{reply}</div>
      <div style={{ fontSize: 12, color: 'rgba(123,162,255,0.7)', marginTop: 2 }}>{meaning}</div>
    </div>
  );
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: '#000', fontFamily: NOTO }}>
      <StatusBar />
      <div className="flex shrink-0 items-center gap-2 pl-1" style={{ height: 50 }}>
        <div className="grid h-11 w-11 shrink-0 place-items-center">
          <ChevronLeft size={24} color={ACCENT} strokeWidth={2.6} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="truncate" style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>Mom wants help with the dishes</div>
          <div style={{ fontSize: 12, color: SECONDARY }}>A1</div>
        </div>
        <div className="grid h-11 w-9 shrink-0 place-items-center">
          <AudioLines size={20} color={ACCENT} strokeWidth={2.4} />
        </div>
        <div className="grid h-11 w-9 shrink-0 place-items-center">
          <ChartNoAxesColumn size={20} color={ACCENT} strokeWidth={2.6} />
        </div>
        <div className="mr-4 shrink-0">
          <Badge pct={pct} />
        </div>
      </div>
      <div className="shrink-0" style={{ height: 0.5, background: HAIR }} />
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 overflow-hidden p-3">
        <BotRow text="Hola, ¿dónde estás?" />
        <UserRow text="Estoy en mi cuarto." />
        <BotRow text="¿Me ayudas a lavar los platos?" />
        <Appear k={sentK}>
          <UserRow text={plan.reply} />
        </Appear>
        {dots && (
          <div className="self-start rounded-[16px] px-[14px] py-2" style={{ background: GROUPED, color: SECONDARY, fontFamily: SF, fontWeight: 700, fontSize: 18, lineHeight: '20px' }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ opacity: 0.35 + 0.65 * Math.max(0, Math.sin((local - plan.dotsAt) * 9 - i * 0.9)) }}>•</span>
            ))}
          </div>
        )}
        <Appear k={answerK}>
          <BotRow text="Genial, te espero en la cocina." />
        </Appear>
      </div>
      <div className="flex shrink-0 flex-col gap-2 px-3 pb-[42px] pt-2">
        <div className="flex items-center">
          <div className="grid h-11 w-9 place-items-center">
            <ChevronLeft size={20} color={ACCENT} strokeWidth={2.6} style={{ opacity: 0.35 }} />
          </div>
          <div className="relative min-w-0 flex-1 overflow-hidden" style={{ height: 62 }}>
            {card('Sí, voy ahora.', 'Yes, I’m coming now.', 1 - cards, -40 * cards)}
            {cards > 0 && card('Ya voy para allá.', 'I’m heading there now.', cards, 40 * (1 - cards))}
          </div>
          <div className="grid h-11 w-11 place-items-center">
            <Volume2 size={19} color={ACCENT} strokeWidth={2.4} />
          </div>
          <div className="grid h-11 w-9 place-items-center">
            <ChevronRight size={20} color={ACCENT} strokeWidth={2.6} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center rounded-full px-3" style={{ height: 38, background: GROUPED, fontSize: 16, color: typed ? '#fff' : PLACEHOLDER }}>
            {typed || 'Type a reply'}
            {typed && <span className="ml-[1px] inline-block h-[18px] w-[2px] rounded-full" style={{ background: ACCENT }} />}
          </div>
          <div className="relative grid h-11 w-11 place-items-center">
            {pressed && <span className="absolute inset-0 rounded-full bg-white/20" />}
            <svg width={30} height={30} viewBox="0 0 30 30" style={{ transform: pressed ? 'scale(0.9)' : undefined }}>
              <circle cx={15} cy={15} r={15} fill={typed ? ACCENT : 'rgba(235,235,245,0.3)'} />
              <path d="M15 22V9M9.8 14.2L15 9l5.2 5.2" stroke="#000" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
      <HomeBar />
    </div>
  );
}
