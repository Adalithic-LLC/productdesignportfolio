import { lazy, Suspense, useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import ArcatextKeyboard from '@/components/ArcatextKeyboard';
import { ArcatextScreen } from '@/components/ArcatextScreen';

/* The prototype is only fetched when someone opens it. */
const ArcatextPrototype = lazy(() => import('./ArcatextPrototype'));

const ES = 'Conocí a tus amigos en el banco la semana pasada.';
/** The mini phone on the trigger: the keyboard, mid-reply. */
const MINI = { sent: [ES], received: '¿Oh, de verdad?', text: 'I can meet you there.' };

/** Phone sizes the modal fits: the bezelled phone (desktop), the bare screen (mobile). */
const PHONE = { w: 426, h: 898 };
const SCREEN = { w: 402, h: 874 };
const NAV_H = 56;

/** The tap point: a solid dot with a ring pulsing out of it. */
function TapPoint() {
  return (
    <span className="pointer-events-none absolute left-1/2 top-[72%] -translate-x-1/2 -translate-y-1/2">
      <span className="absolute -inset-2 animate-ping rounded-full bg-primary/50" />
      <span className="relative block h-3 w-3 rounded-full bg-primary shadow-[0_0_12px_4px_hsl(var(--primary)/0.65)] ring-2 ring-white/90" />
    </span>
  );
}

function useViewport() {
  const read = () => ({ w: window.innerWidth, h: window.innerHeight });
  const [vp, setVp] = useState(read);
  useEffect(() => {
    const on = () => setVp(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
}

/**
 * "Try it out!": a phone with a glowing tap point that opens the interactive
 * prototype -- in a dialog on desktop, and full screen on a phone, with × and
 * the light/dark switch in a top bar.
 *
 * Two sizes. `phone` is the demo row's first card: the same bezelled phone as
 * the ones playing beside it, at the same scale, so the one you can actually
 * use reads as one of them rather than as an advert for them. `mini` is the
 * small one it used to be beside the page title, kept for anywhere that wants
 * a trigger rather than a card.
 */
export function TryItOut({
  variant = 'mini',
  width,
  phoneScale,
}: {
  variant?: 'mini' | 'phone';
  /** `phone` only: the card's width, matching the row's other phones. */
  width?: number;
  /** `phone` only: the scale its neighbours are drawn at. */
  phoneScale?: number;
}) {
  const [open, setOpen] = useState(false);
  const vp = useViewport();
  const mobile = vp.w < 768;

  const scale = mobile
    ? Math.min(vp.w / SCREEN.w, (vp.h - NAV_H) / SCREEN.h)
    : Math.min(1, (vp.h - 120) / PHONE.h, (vp.w - 64) / PHONE.w);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {/* A div with a button's role: the mini phone inside it is a drawn
          screen with buttons of its own, and buttons cannot nest. */}
      <Dialog.Trigger asChild>
        {/* A div with a button's role: the phone inside it is a drawn screen
            with buttons of its own, and buttons cannot nest. */}
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setOpen(true);
            }
          }}
          className={
            variant === 'phone'
              ? 'group flex shrink-0 cursor-pointer flex-col items-center rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              : 'group flex shrink-0 cursor-pointer flex-col items-center gap-2 rounded-2xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          }
          style={variant === 'phone' && width ? { width } : undefined}
          aria-label="Try it out! Open the interactive Arcatext keyboard"
        >
          {variant === 'phone' ? (
            <span className="relative block transition-transform duration-300 group-hover:-translate-y-1">
              {/* The same renderer, the same scale and the same bezel as the
                  phones playing beside it -- without their Restart row, since
                  this phone's control is the phone. */}
              <ArcatextKeyboard still={MINI} scale={phoneScale} controls={false} />
              <TapPoint />
            </span>
          ) : (
            <span className="relative block h-[96px] w-[44px] overflow-hidden rounded-[9px] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.45)] ring-1 ring-black/10 transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105 dark:ring-white/15 sm:h-[118px] sm:w-[54px] sm:rounded-[11px]">
              <ArcatextScreen still={MINI} />
              <TapPoint />
            </span>
          )}
          <span
            className={
              variant === 'phone'
                ? 'mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-shadow group-hover:shadow-[0_0_18px_4px_hsl(var(--primary)/0.35)]'
                : 'whitespace-nowrap text-xs font-semibold text-primary sm:text-sm'
            }
          >
            Try it out!
          </span>
        </div>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className={`fixed z-[95] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 ${
            mobile
              ? 'inset-0 flex flex-col bg-background'
              : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 data-[state=open]:zoom-in-95'
          }`}
        >
          <Dialog.Title className="sr-only">Arcatext keyboard prototype</Dialog.Title>
          {mobile ? (
            <>
              {/* The top bar: name, the theme switch, ×. */}
              <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-4" style={{ height: NAV_H }}>
                <span className="text-sm font-semibold">Arcatext</span>
                <div className="flex items-center gap-1">
                  <ThemeToggle />
                  <Dialog.Close aria-label="Close prototype" className="grid h-9 w-9 place-items-center rounded-full text-foreground/70 hover:bg-primary/10 hover:text-foreground">
                    <X className="h-5 w-5" />
                  </Dialog.Close>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 items-start justify-center overflow-hidden">
                <Suspense fallback={null}>
                  <ArcatextPrototype scale={scale} bezel={false} />
                </Suspense>
              </div>
            </>
          ) : (
            <div className="relative">
              <div className="absolute -top-12 right-0 flex items-center gap-1 rounded-full bg-background/90 p-1 shadow-lg backdrop-blur">
                <ThemeToggle />
                <Dialog.Close aria-label="Close prototype" className="grid h-9 w-9 place-items-center rounded-full text-foreground/70 hover:bg-primary/10 hover:text-foreground">
                  <X className="h-5 w-5" />
                </Dialog.Close>
              </div>
              <Suspense fallback={<div style={{ width: PHONE.w * scale, height: PHONE.h * scale }} />}>
                <ArcatextPrototype scale={scale} />
              </Suspense>
              <p className="mt-3 text-center text-xs text-white/75">
                Tap any key to type · Drag across the keys to glide · Long-press a message to copy it
              </p>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
