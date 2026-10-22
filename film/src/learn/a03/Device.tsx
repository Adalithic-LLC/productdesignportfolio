/**
 * Arcatext 03's phone: a flat iPhone (402x874 pt screen in a 12 pt black
 * bezel and a thin titanium band) whose screen is in the app's dark
 * appearance, plus the shared iOS chrome the screens draw on.
 */
import type { CSSProperties, ReactNode } from 'react';
import { BEZEL, DESIGN_W, SCREEN_H } from '../../Phone';

export const OUTER_W = DESIGN_W + BEZEL * 2;
export const OUTER_H = SCREEN_H + BEZEL * 2;
const BAND = 4;

export function StatusBar({ ink = '#fff' }: { ink?: string }) {
  return (
    <div className="relative flex shrink-0 items-center justify-between px-8" style={{ height: 59, paddingTop: 6, color: ink }}>
      <span className="text-[17px] font-semibold" style={{ fontFamily: "Inter, 'SF Pro Text', system-ui, sans-serif" }}>9:41</span>
      <div className="absolute left-1/2 top-[11px] h-[37px] w-[124px] -translate-x-1/2 rounded-full bg-black" />
      <div className="flex items-center gap-1.5">
        <div className="flex items-end gap-[2px]">
          {[5, 8, 11, 14].map((h, i) => (
            <span key={i} className="w-[3px] rounded-[1px]" style={{ height: h, background: ink }} />
          ))}
        </div>
        <svg width="17" height="13" viewBox="0 0 17 13" fill="none">
          <path
            d="M8.5 2.2c2.5 0 4.8 1 6.5 2.6l-1.3 1.4A7.7 7.7 0 008.5 4.1 7.7 7.7 0 003.3 6.2L2 4.8A9.5 9.5 0 018.5 2.2zm0 3.6c1.5 0 2.9.6 3.9 1.6l-1.4 1.4a3.5 3.5 0 00-5 0L4.6 7.4A5.5 5.5 0 018.5 5.8zm0 3.5c.7 0 1.3.3 1.8.8L8.5 12 6.7 10.1c.5-.5 1.1-.8 1.8-.8z"
            fill="currentColor"
          />
        </svg>
        <div className="ml-[1px] flex h-[13px] w-[25px] items-center rounded-[4px] border p-[1.5px]" style={{ borderColor: ink, opacity: 0.9 }}>
          <div className="h-full w-[80%] rounded-[2px]" style={{ background: ink }} />
        </div>
      </div>
    </div>
  );
}

/** The home indicator, drawn over whatever is at the bottom of the screen. */
export function HomeBar({ ink = '#fff' }: { ink?: string }) {
  return <div className="pointer-events-none absolute bottom-[8px] left-1/2 h-[5px] w-[140px] -translate-x-1/2 rounded-full" style={{ background: ink, opacity: 0.9 }} />;
}

/** The phone, its top-left at (0,0); `children` fill the 402x874 screen. */
export function Device({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="absolute left-0 top-0" style={{ width: OUTER_W, height: OUTER_H, ...style }}>
      <div
        className="absolute"
        style={{
          left: -BAND,
          top: -BAND,
          width: OUTER_W + BAND * 2,
          height: OUTER_H + BAND * 2,
          borderRadius: 56 + BAND,
          background: 'linear-gradient(135deg,#8d8e94 0%,#45464b 22%,#a6a7ac 48%,#3c3d42 74%,#808187 100%)',
          boxShadow: '0 40px 90px rgba(0,0,0,0.55)',
        }}
      />
      <div className="absolute inset-0 bg-black" style={{ borderRadius: 56, padding: BEZEL }}>
        <div className="dark relative overflow-hidden" style={{ width: DESIGN_W, height: SCREEN_H, borderRadius: 56 - BEZEL, isolation: 'isolate' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
