/**
 * Three generic messaging-app look-alikes for Arcatext 03's keyboard hop, in
 * their dark appearances: one green (WhatsApp-like), one black with a
 * gradient (Instagram-like), one blue (Telegram-like). No logos or names,
 * only each app's familiar colours and layout, so they read as three
 * different apps at a glance.
 *
 * `dock` (0..1) is how far the keyboard has landed in the app: the input bar
 * rides up with it. `typed` is the reply in the field.
 */
import { ArrowUp, Camera, ChevronLeft, Image as ImageIcon, Mic, Paperclip, Phone, Plus, SendHorizontal, Smile, Video } from 'lucide-react';
import { lerp } from '../../ease';
import { StatusBar } from './Device';

export const KB_DOCK_H = 339; // the Arcatext keyboard (keys 270 + globe row 69)
const HOME = 34;

type Look = {
  bg: string;
  header: string;
  headerBorder: string;
  ink: string;
  sub: string;
  inBubble: string;
  inInk: string;
  outBubble: string;
  bar: string;
  field: string;
  fieldBorder: string;
  accent: string;
  pattern?: string;
};

const LOOK: Record<'whatsapp' | 'instagram' | 'telegram', Look> = {
  whatsapp: {
    bg: '#0B141A',
    header: '#1F2C34',
    headerBorder: 'rgba(255,255,255,0.06)',
    ink: '#E9EDEF',
    sub: '#8696A0',
    inBubble: '#1F2C34',
    inInk: '#E9EDEF',
    outBubble: '#005C4B',
    bar: '#1F2C34',
    field: '#2A3942',
    fieldBorder: 'transparent',
    accent: '#00A884',
    pattern: 'radial-gradient(rgba(255,255,255,0.035) 1.3px, transparent 1.4px)',
  },
  instagram: {
    bg: '#000000',
    header: '#000000',
    headerBorder: 'rgba(255,255,255,0.10)',
    ink: '#F5F5F5',
    sub: '#A8A8A8',
    inBubble: '#262626',
    inInk: '#F5F5F5',
    outBubble: 'linear-gradient(160deg,#9D3BFF 0%,#5B51F7 55%,#3797F0 100%)',
    bar: '#000000',
    field: '#000000',
    fieldBorder: '#363636',
    accent: '#3797F0',
  },
  telegram: {
    bg: 'linear-gradient(160deg,#16293a 0%,#0e1621 55%,#122330 100%)',
    header: '#17212B',
    headerBorder: 'rgba(0,0,0,0.4)',
    ink: '#F5F5F5',
    sub: '#6C7883',
    inBubble: '#182533',
    inInk: '#F5F5F5',
    outBubble: '#2B5278',
    bar: '#17212B',
    field: '#242F3D',
    fieldBorder: 'transparent',
    accent: '#5288C1',
    pattern: 'radial-gradient(rgba(120,170,220,0.07) 1.5px, transparent 1.6px)',
  },
};

export type ChatScript = { contact: string; initials: string; avatar: string; received: string[]; sent: string[] };

export const HOP_CHATS: Record<'whatsapp' | 'instagram' | 'telegram', ChatScript> = {
  whatsapp: {
    contact: 'Lucía',
    initials: 'L',
    avatar: 'linear-gradient(160deg,#f6b26b,#e8835a)',
    received: ['¡Hola! ¿Qué haces esta noche?', 'Hay una peli nueva en el cine'],
    sent: [],
  },
  instagram: {
    contact: 'mateo.rv',
    initials: 'M',
    avatar: 'linear-gradient(160deg,#feda75,#fa7e1e 35%,#d62976 65%,#962fbf)',
    received: ['Mira mi viaje a Oaxaca'],
    sent: [],
  },
  telegram: {
    contact: 'Sofía',
    initials: 'S',
    avatar: 'linear-gradient(160deg,#72d5fd,#2a9ef1)',
    received: ['¿A qué hora quedamos?', 'Yo puedo después de las 5'],
    sent: [],
  },
};

function Cursor({ on, color }: { on: boolean; color: string }) {
  return <span className="ml-[1px] inline-block h-[18px] w-[2px] translate-y-[3px] rounded-full" style={{ background: color, opacity: on ? 1 : 0 }} />;
}

export function MessagingApp({ app, dock, typed, t, sent, sentK = 0 }: { app: 'whatsapp' | 'instagram' | 'telegram'; dock: number; typed: string; t: number; sent?: string; sentK?: number }) {
  const look = LOOK[app];
  const chat = HOP_CHATS[app];
  const barBottom = lerp(HOME, KB_DOCK_H, dock);
  const cursor = <Cursor on={dock > 0.5 && Math.floor(t * 2) % 2 === 0} color={look.accent} />;
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: look.bg, fontFamily: "Inter, 'SF Pro Text', system-ui, sans-serif" }}>
      {look.pattern && <div className="absolute inset-0" style={{ backgroundImage: look.pattern, backgroundSize: '20px 20px' }} />}
      {/* Header */}
      <div className="absolute inset-x-0 top-0" style={{ background: look.header, borderBottom: `1px solid ${look.headerBorder}` }}>
        <StatusBar ink={look.ink} />
        {app === 'telegram' ? (
          <div className="flex items-center px-2 pb-2 pt-1">
            <div className="flex w-[90px] items-center text-[17px]" style={{ color: look.accent }}>
              <ChevronLeft className="h-7 w-7" strokeWidth={2.2} />
              Chats
            </div>
            <div className="flex-1 text-center leading-tight">
              <div className="text-[16px] font-semibold" style={{ color: look.ink }}>{chat.contact}</div>
              <div className="text-[13px]" style={{ color: look.sub }}>online</div>
            </div>
            <div className="flex w-[90px] justify-end pr-1">
              <div className="grid h-9 w-9 place-items-center rounded-full text-[15px] font-semibold text-white" style={{ background: chat.avatar }}>{chat.initials}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-2 pb-2 pt-1">
            <ChevronLeft className="h-7 w-7" style={{ color: app === 'whatsapp' ? look.ink : look.ink }} strokeWidth={2.2} />
            <div
              className="grid h-9 w-9 place-items-center rounded-full text-[15px] font-semibold text-white"
              style={{ background: chat.avatar, boxShadow: app === 'instagram' ? `0 0 0 2px ${look.bg}, 0 0 0 3.5px #d62976` : undefined }}
            >
              {chat.initials}
            </div>
            <div className="flex-1 leading-tight">
              <div className="text-[16px] font-semibold" style={{ color: look.ink }}>{chat.contact}</div>
              <div className="text-[12px]" style={{ color: look.sub }}>{app === 'whatsapp' ? 'online' : 'Active now'}</div>
            </div>
            {app === 'whatsapp' ? (
              <>
                <Video className="h-6 w-6" style={{ color: look.ink }} strokeWidth={1.8} />
                <Phone className="ml-4 mr-2 h-[21px] w-[21px]" style={{ color: look.ink }} strokeWidth={1.8} />
              </>
            ) : (
              <>
                <Phone className="h-[22px] w-[22px]" style={{ color: look.ink }} strokeWidth={1.8} />
                <Video className="ml-4 mr-2 h-6 w-6" style={{ color: look.ink }} strokeWidth={1.8} />
              </>
            )}
          </div>
        )}
      </div>

      {/* Messages, stacked up from the input bar */}
      <div className="absolute inset-x-0 flex flex-col justify-end gap-1.5 px-3" style={{ top: 110, bottom: barBottom + 56 }}>
        {app !== 'instagram' && (
          <div className="mb-1 self-center rounded-[8px] px-2.5 py-0.5 text-[12px] font-medium" style={{ background: app === 'whatsapp' ? '#182229' : 'rgba(0,0,0,0.3)', color: look.sub }}>
            Today
          </div>
        )}
        {chat.received.map((m, i) => (
          <div key={i} className="flex items-end gap-2">
            {app === 'instagram' && (
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold text-white" style={{ background: chat.avatar, opacity: i === chat.received.length - 1 ? 1 : 0 }}>
                {chat.initials}
              </div>
            )}
            <div
              className={`max-w-[78%] px-3 py-1.5 text-[16px] ${app === 'instagram' ? 'rounded-[20px]' : 'rounded-[14px] rounded-bl-[4px]'}`}
              style={{ background: look.inBubble, color: look.inInk }}
            >
              {m}
              {app !== 'instagram' && <span className="ml-2 inline-block translate-y-[3px] text-[11px]" style={{ color: look.sub }}>9:38</span>}
            </div>
          </div>
        ))}
        {sent && sentK > 0 && (
          <div style={{ display: 'grid', gridTemplateRows: `${Math.min(1, sentK * 1.6)}fr` }}>
            <div className="flex min-h-0 justify-end" style={{ opacity: sentK, transform: `translateY(${(1 - sentK) * 14}px)` }}>
              <div
                className={`max-w-[78%] px-3 py-1.5 text-[16px] text-white ${app === 'instagram' ? 'rounded-[20px]' : 'rounded-[14px] rounded-br-[4px]'}`}
                style={{ background: look.outBubble }}
              >
                {sent}
                {app !== 'instagram' && <span className="ml-2 inline-block translate-y-[3px] text-[11px] text-white/60">9:41</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input bar, riding up on the keyboard */}
      <div className="absolute inset-x-0 flex items-end gap-2 px-2 pb-2 pt-1.5" style={{ bottom: barBottom, background: look.bar }}>
        {app === 'instagram' ? (
          <div className="flex min-h-[44px] flex-1 items-center gap-2 rounded-full border py-1 pl-1 pr-3" style={{ borderColor: look.fieldBorder }}>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: look.accent }}>
              <Camera className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <span className="min-w-0 flex-1 truncate text-[15px]" style={{ color: typed ? look.ink : look.sub }}>
              {typed || 'Message...'}
              {typed && cursor}
            </span>
            {typed ? (
              <span className="text-[16px] font-semibold" style={{ color: look.accent }}>Send</span>
            ) : (
              <>
                <Mic className="h-5 w-5" style={{ color: look.ink }} strokeWidth={1.9} />
                <ImageIcon className="h-5 w-5" style={{ color: look.ink }} strokeWidth={1.9} />
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid h-9 w-8 shrink-0 place-items-center">
              {app === 'whatsapp' ? <Plus className="h-6 w-6" style={{ color: look.sub }} strokeWidth={2} /> : <Paperclip className="h-6 w-6" style={{ color: look.sub }} strokeWidth={1.9} />}
            </div>
            <div className="flex min-h-9 min-w-0 flex-1 items-end rounded-[18px] py-[7px] pl-3.5 pr-2" style={{ background: look.field, border: `1px solid ${look.fieldBorder}` }}>
              <span className="min-w-0 flex-1 truncate text-[15px] leading-5" style={{ color: typed ? look.ink : look.sub }}>
                {typed || 'Message'}
                {typed && cursor}
              </span>
              <Smile className="h-5 w-5 shrink-0" style={{ color: look.sub }} strokeWidth={1.9} />
            </div>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: typed ? look.accent : 'transparent' }}>
              {typed ? (
                app === 'whatsapp' ? <SendHorizontal className="h-[18px] w-[18px] translate-x-[1px] text-white" strokeWidth={2.4} /> : <ArrowUp className="h-5 w-5 text-white" strokeWidth={2.8} />
              ) : (
                <Mic className="h-5 w-5" style={{ color: look.sub }} strokeWidth={1.9} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
