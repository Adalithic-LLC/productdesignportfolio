import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import studyUrl from "@/assets/keyboard/study.svg";
import studyDarkUrl from "@/assets/keyboard/study-dark.svg";
import pasteUrl from "@/assets/keyboard/paste.svg";
import pasteDarkUrl from "@/assets/keyboard/paste-dark.svg";
import checkUrl from "@/assets/keyboard/check.svg";
import checkDarkUrl from "@/assets/keyboard/check-dark.svg";
import shiftUrl from "@/assets/keyboard/shift.svg";
import shiftDarkUrl from "@/assets/keyboard/shift-dark.svg";
import backspaceUrl from "@/assets/keyboard/backspace.svg";
import backspaceDarkUrl from "@/assets/keyboard/backspace-dark.svg";
import localesUrl from "@/assets/keyboard/locales.svg";
import localesDarkUrl from "@/assets/keyboard/locales-dark.svg";
import { AX, AxIcon } from "@/lib/arcatextTheme";
import { Spinner } from "@/components/ArcatextViews";

/**
 * The prototype's keyboard: the toolbar and four rows of keys, drawn to the
 * same metrics as the demo phones (ArcatextKeyboard), but every key live.
 *
 * Keys fire on release, as iOS keys do, except backspace, which fires on
 * press and repeats while held. A press that travels more than a few points
 * becomes a glide instead: no key fires, and the finger leaves a trail that
 * fades behind it. The glide is only drawn -- there is no decoder here.
 */

export type KeyAction =
  | { kind: "char" }
  | { kind: "space" }
  | { kind: "backspace" }
  | { kind: "return" }
  | { kind: "shift" }
  | { kind: "layer" }
  | { kind: "locales" }
  | { kind: "localesHold" };

export type ToolAction = "study" | "paste" | "check" | "reword" | "options";

const ROW1 = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
const ROW2 = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
const ROW3 = ["z", "x", "c", "v", "b", "n", "m"];
const NUMS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const SYM2 = ["-", "/", ":", ";", "(", ")", "$", "&", "@"];
const SYM3 = [".", ",", "?", "!", "'"];

type Pt = { x: number; y: number; t: number };
/** How long a point of the glide trail lives, in ms. */
const TRAIL_MS = 650;

function Key({
  id,
  label,
  num,
  bg = AX.key,
  grow = 1,
  fontSize = 22,
  down,
  popup,
  onDown,
  children,
}: {
  id: string;
  label?: string;
  num?: string;
  bg?: string;
  grow?: number;
  fontSize?: number;
  down: boolean;
  /** Show the iOS key balloon while held (character keys). */
  popup?: boolean;
  onDown: (id: string, e: React.PointerEvent) => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      onPointerDown={(e) => onDown(id, e)}
      className="relative flex cursor-pointer select-none items-center justify-center rounded-[4.6px] transition-[filter] duration-75"
      style={{
        backgroundColor: bg,
        color: AX.keyText,
        height: 42,
        flexGrow: grow,
        flexBasis: 0,
        boxShadow: `0 1px 0 ${AX.keyShadow}`,
        fontSize,
        fontWeight: 400,
        touchAction: "none",
        filter: down && !popup ? "brightness(0.82)" : "none",
      }}
    >
      {num && (
        <span
          className="pointer-events-none absolute right-[5px] top-[3px]"
          style={{ fontSize: 9, color: AX.keyHint }}
        >
          {num}
        </span>
      )}
      {children ?? label}
      {down && popup && label && (
        <span
          className="pointer-events-none absolute bottom-[calc(100%-6px)] left-1/2 z-20 grid h-[58px] min-w-[50px] -translate-x-1/2 place-items-center rounded-[10px] px-2"
          style={{
            background: bg,
            color: AX.keyText,
            fontSize: 34,
            boxShadow: "0 4px 14px rgba(0,0,0,0.28)",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

function ToolButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      // Classes, not inline colors, so :active can darken it (ToolbarButtonPressedColor).
      className="grid shrink-0 place-items-center rounded-[12px] bg-[var(--ax-tool-btn)] transition-colors duration-100 active:bg-[var(--ax-tool-btn-pressed)]"
      style={{ width: 57, height: 50 }}
    >
      {children}
    </button>
  );
}

export function PrototypeKeyboard({
  upper,
  numbers,
  rewordLoading,
  onKey,
  onTool,
  keysOnly = false,
  spaceLabel = "space",
}: {
  /** Letters shown capitalised (auto-capitalisation or shift). */
  upper: boolean;
  /** The 123 layer is showing. */
  numbers: boolean;
  rewordLoading: boolean;
  onKey: (a: KeyAction) => void;
  onTool: (t: ToolAction) => void;
  /** Just the keys, no toolbar (Fix Words' own keyboard). */
  keysOnly?: boolean;
  /** What the space bar says: briefly the language after a locale switch. */
  spaceLabel?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [down, setDown] = useState<string | null>(null);
  const [trail, setTrail] = useState<Pt[]>([]);
  /** The frame time the trail is drawn at (render stays pure). */
  const [now, setNow] = useState(0);
  const press = useRef<{
    id: string;
    x: number;
    y: number;
    glide: boolean;
    held?: boolean;
  } | null>(null);
  const repeat = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const raf = useRef(0);
  const onKeyRef = useRef(onKey);
  useEffect(() => {
    onKeyRef.current = onKey;
  }, [onKey]);

  const actionFor = (id: string): KeyAction =>
    id === "space"
      ? { kind: "space" }
      : id === "backspace"
        ? { kind: "backspace" }
        : id === "return"
          ? { kind: "return" }
          : id === "shift"
            ? { kind: "shift" }
            : id === "layer"
              ? { kind: "layer" }
              : id === "locales"
                ? { kind: "locales" }
                : { kind: "char" };

  const local = (e: React.PointerEvent) => {
    const r = boxRef.current!.getBoundingClientRect();
    // The phone is drawn scaled; convert back to its own points.
    const k = r.width / boxRef.current!.offsetWidth || 1;
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  };

  /** Fade the trail out, frame by frame, once points stop arriving. */
  const fade = () => {
    cancelAnimationFrame(raf.current);
    const tick = () => {
      const t0 = performance.now();
      setNow(t0);
      setTrail((t) => {
        const kept = t.filter((p) => t0 - p.t < TRAIL_MS);
        if (kept.length) raf.current = requestAnimationFrame(tick);
        return kept;
      });
    };
    raf.current = requestAnimationFrame(tick);
  };

  const onDown = (id: string, e: React.PointerEvent) => {
    e.preventDefault();
    boxRef.current?.setPointerCapture(e.pointerId);
    const p = local(e);
    press.current = { id, x: p.x, y: p.y, glide: false };
    setDown(id);
    if (id === "locales") {
      // Held, the 文 key opens the locale popover instead of switching.
      repeat.current = setTimeout(() => {
        if (press.current) press.current.held = true;
        setDown(null);
        onKeyRef.current({ kind: "localesHold" });
      }, 450);
    }
    if (id === "backspace") {
      onKeyRef.current({ kind: "backspace" });
      // Held: repeat after a beat, then faster.
      let n = 0;
      const again = () => {
        onKeyRef.current({ kind: "backspace" });
        n += 1;
        repeat.current = setTimeout(again, n > 8 ? 45 : 95);
      };
      repeat.current = setTimeout(again, 420);
    }
  };

  const onMove = (e: React.PointerEvent) => {
    const pr = press.current;
    if (!pr || pr.id === "backspace") return;
    const p = local(e);
    if (!pr.glide && Math.hypot(p.x - pr.x, p.y - pr.y) > 14) {
      pr.glide = true;
      setDown(null);
      setTrail([{ x: pr.x, y: pr.y, t: performance.now() }]);
    }
    if (pr.glide) {
      setTrail((t) => [
        ...t.filter((q) => performance.now() - q.t < TRAIL_MS),
        { ...p, t: performance.now() },
      ]);
      fade();
    }
  };

  const onUp = () => {
    clearTimeout(repeat.current);
    const pr = press.current;
    press.current = null;
    setDown(null);
    if (!pr) return;
    if (pr.glide) {
      fade();
      return;
    }
    if (pr.id !== "backspace" && !pr.held) onKeyRef.current(actionFor(pr.id));
  };

  useEffect(
    () => () => {
      clearTimeout(repeat.current);
      cancelAnimationFrame(raf.current);
    },
    [],
  );

  const k = (id: string, label: string, num?: string) => (
    <Key
      key={id}
      id={id}
      label={label}
      num={num}
      down={down === id}
      popup
      onDown={onDown}
    />
  );
  const letters = (row: string[]) =>
    row.map((l) => k(`k-${l}`, upper ? l.toUpperCase() : l));

  return (
    <div
      style={{ backgroundColor: keysOnly ? undefined : AX.keyboardBg }}
      className="relative shrink-0 px-[5px] pb-1 pt-2"
    >
      {/* Toolbar: Study, Paste, Check, then the split Reword pill. */}
      {!keysOnly && (
        <div
          className="mb-2 flex items-center px-[3px]"
          style={{ height: 50, gap: 12 }}
        >
          <ToolButton onClick={() => onTool("study")} label="Open Study">
            <AxIcon
              light={studyUrl}
              dark={studyDarkUrl}
              width={20}
              height={17}
            />
          </ToolButton>
          <ToolButton onClick={() => onTool("paste")} label="Open Paste">
            <AxIcon
              light={pasteUrl}
              dark={pasteDarkUrl}
              width={16}
              height={20}
            />
          </ToolButton>
          <ToolButton onClick={() => onTool("check")} label="Open Check">
            <AxIcon
              light={checkUrl}
              dark={checkDarkUrl}
              width={20}
              height={20}
            />
          </ToolButton>
          <div className="flex-1" />
          <div
            className="relative flex items-stretch overflow-hidden rounded-[12px]"
            style={{ height: 50, backgroundColor: AX.item }}
          >
            <button
              onClick={() => onTool("reword")}
              className="relative flex items-center px-[14px] active:bg-black/20"
              aria-label="Reword"
            >
              <span
                className={`text-[16px] font-medium text-white ${rewordLoading ? "invisible" : ""}`}
              >
                Reword
              </span>
              {rewordLoading && (
                <span className="absolute inset-0 grid place-items-center">
                  <Spinner
                    size={20}
                    color="#fff"
                    track="rgba(255,255,255,0.4)"
                  />
                </span>
              )}
            </button>
            <div
              className="self-center"
              style={{
                width: 1,
                height: 20,
                backgroundColor: "rgba(255,255,255,0.5)",
              }}
            />
            <button
              onClick={() => onTool("options")}
              className="grid place-items-center active:bg-black/20"
              style={{ width: 40 }}
              aria-label="Reword options"
            >
              <ChevronDown className="h-4 w-4 text-white" strokeWidth={2.4} />
            </button>
          </div>
        </div>
      )}

      {/* The keys. One surface takes the pointer, so a glide can cross keys. */}
      <div
        ref={boxRef}
        className="relative"
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{ touchAction: "none" }}
      >
        <div className="mb-[8px] flex gap-[5px]">
          {numbers
            ? NUMS.map((n) => k(`n-${n}`, n))
            : ROW1.map((l, i) =>
                k(`k-${l}`, upper ? l.toUpperCase() : l, NUMS[i]),
              )}
        </div>
        <div
          className={`mb-[8px] flex gap-[5px] ${numbers ? "" : "px-[18px]"}`}
        >
          {numbers ? SYM2.map((s) => k(`s-${s}`, s)) : letters(ROW2)}
        </div>
        <div className="mb-[8px] flex gap-[5px]">
          <Key
            id="shift"
            bg={AX.actionKey}
            grow={1.5}
            fontSize={15}
            down={down === "shift"}
            onDown={onDown}
          >
            {numbers ? (
              "#+="
            ) : (
              <AxIcon
                light={shiftUrl}
                dark={shiftDarkUrl}
                width={19}
                height={17}
              />
            )}
          </Key>
          {numbers ? SYM3.map((s) => k(`s-${s}`, s)) : letters(ROW3)}
          <Key
            id="backspace"
            bg={AX.actionKey}
            grow={1.5}
            down={down === "backspace"}
            onDown={onDown}
          >
            <AxIcon
              light={backspaceUrl}
              dark={backspaceDarkUrl}
              width={23}
              height={17}
            />
          </Key>
        </div>
        <div className="mb-2 flex gap-[5px]">
          <Key
            id="layer"
            bg={AX.actionKey}
            grow={1.6}
            fontSize={15}
            down={down === "layer"}
            onDown={onDown}
          >
            {numbers ? "ABC" : "123"}
          </Key>
          <Key
            id="locales"
            bg={AX.actionKey}
            grow={1.2}
            down={down === "locales"}
            onDown={onDown}
          >
            <AxIcon
              light={localesUrl}
              dark={localesDarkUrl}
              width={14}
              height={17}
            />
          </Key>
          <Key
            id="space"
            grow={5}
            fontSize={15}
            down={down === "space"}
            onDown={onDown}
          >
            <span style={{ opacity: 0.85 }}>{spaceLabel}</span>
          </Key>
          <Key
            id="return"
            bg={AX.actionKey}
            grow={1.6}
            down={down === "return"}
            onDown={onDown}
          >
            <svg width="24" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 7v4a2 2 0 0 1-2 2H7"
                stroke={AX.glyph}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11 9l-4 4 4 4"
                stroke={AX.glyph}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Key>
        </div>

        {/* The glide trail: the newest points thick and opaque, thinning and
            fading toward the tail. */}
        {trail.length > 1 && (
          <svg className="pointer-events-none absolute inset-0 z-30 h-full w-full overflow-visible">
            {trail.slice(1).map((p, i) => {
              const q = trail[i];
              const age = (now - p.t) / TRAIL_MS;
              const life = Math.max(0, 1 - age);
              return (
                <line
                  key={`${p.t}-${i}`}
                  x1={q.x}
                  y1={q.y}
                  x2={p.x}
                  y2={p.y}
                  stroke={AX.accent}
                  strokeOpacity={0.85 * life}
                  strokeWidth={2 + 7 * life}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
