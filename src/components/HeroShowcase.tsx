/**
 * The hero's imagery: one display zone, and a row of previews that drive it.
 *
 * Hovering a preview shows that cluster in the zone; leaving goes back to
 * whichever one is selected. Clicking selects. So the zone always holds exactly
 * one thing and the previews are the only control.
 *
 * Every cluster is mounted at once and cross-faded rather than swapped in and
 * out, for two reasons: the Arcatext deck keeps cycling instead of restarting
 * on every hover, and the analysis tool's iframe is not reloaded each time
 * someone looks at it.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { ArcatextCardStack, ArcatextKeyboardStill } from '@/components/ArcatextCardStack';
import { AdminToolTile } from '@/components/HeroWorkCollage';
import { requestProjectHighlight } from '@/lib/highlightProject';

const BASE = import.meta.env.BASE_URL;

/**
 * The zone's proportions, and the gap between screens as a share of its width.
 * Screens are sized from these rather than by hand -- see `rowHeight`.
 */
const ZONE_ASPECT = 5 / 4;
const GAP = 0.04;
/** No cluster fills the zone edge to edge; this is the most it may take. */
const MAX_HEIGHT = 0.94;

/**
 * `open` scrolls to the work card this screen belongs to and lights it.
 *
 * `name` travels with the screen rather than with its position, so the order
 * of a cluster -- or of the clusters -- can change without relabelling
 * anything.
 */
type Screen = { name: string; aspect: number; render: (open: () => void) => ReactNode };

type Cluster = {
  id: string;
  label: string;
  /** The work card this cluster belongs to. */
  project: string;
  screens: Screen[];
};

/**
 * The height, as a share of the zone's, at which a row of screens fits the
 * zone's width exactly -- or `MAX_HEIGHT` where it fits with room to spare.
 *
 * A row of screens at one common height is as wide as the sum of their aspect
 * ratios times that height, plus the gaps. Setting that equal to the zone's
 * width and solving for the height is what keeps four differently shaped
 * clusters inside one box without a hand-tuned number for each.
 */
function rowHeight(screens: Screen[]): number {
  const gaps = GAP * ZONE_ASPECT * (screens.length - 1);
  const spread = screens.reduce((total, screen) => total + screen.aspect, 0);
  return Math.min(MAX_HEIGHT, (ZONE_ASPECT - gaps) / spread);
}

function Shot({
  src,
  alt,
  w,
  h,
  open,
}: {
  src: string;
  alt: string;
  w: number;
  h: number;
  open: () => void;
}) {
  return (
    <button
      type="button"
      onClick={open}
      aria-label={`${alt} — see the projects`}
      className="group block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <img
        src={`${BASE}hero-tiles/${src}`}
        alt=""
        width={w}
        height={h}
        decoding="async"
        className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
        style={{ filter: 'drop-shadow(0 14px 34px rgba(0,0,0,0.28))' }}
      />
    </button>
  );
}

/**
 * The leader line and label that name a screen on hover.
 *
 * Drawn the way a part is called out on a spec drawing: a dot on the object, a
 * 45-degree leader away from it, a short shelf, and the name sitting under the
 * shelf. The line is fixed pixel geometry rather than a percentage viewBox, so
 * the diagonal stays at 45 degrees whether it sits on a phone or a dashboard
 * instead of skewing with the box.
 *
 * It lives inside the screen's own box and the label wraps to fit, because the
 * zone has no room to spare at the sides: a callout that reached past a screen
 * would reach past the page at the right-hand edge.
 */
function Callout({ name }: { name: string }) {
  return (
    <div
      data-callout
      /* Above the deck: its cards step their z-index up to 60 as they flick,
         so a callout without one of its own is painted under them. */
      className="pointer-events-none absolute bottom-[7%] left-[6%] z-[70] w-[88%] opacity-0 transition-opacity duration-300 group-hover/screen:opacity-100"
    >
      <svg width="104" height="60" viewBox="0 0 104 60" fill="none" className="block">
        <path
          d="M96 8 L 52 52 L 4 52"
          stroke="currentColor"
          strokeWidth="1.25"
          className="text-foreground/55"
        />
        <circle cx="96" cy="8" r="3.25" className="fill-primary" />
        <circle cx="96" cy="8" r="7" className="fill-primary/20" />
      </svg>
      <span className="mt-1 inline-block rounded bg-background/85 px-2 py-1 text-[11px] font-medium uppercase leading-tight tracking-[0.08em] text-foreground/90 ring-1 ring-border backdrop-blur-sm">
        {name}
      </span>
    </div>
  );
}

const CLUSTERS: Cluster[] = [
  {
    id: 'arcatext',
    label: 'Arcatext — the keyboard toolbar and everything it opens',
    project: 'Arcatext',
    screens: [
      {
        name: 'Arcatext Keyboard',
        aspect: 1206 / 2622,
        render: (open) => <ArcatextKeyboardStill onSelect={open} />,
      },
      {
        name: 'Arcatext Keyboard States',
        aspect: 1206 / 2622,
        render: (open) => <ArcatextCardStack onSelect={open} />,
      },
    ],
  },
  {
    id: 'arcatext-analysis',
    label: 'Arcatext — the typing performance tool',
    project: 'Arcatext',
    screens: [
      {
        name: 'Arcatext Typing Performance Analysis & Improvement',
        aspect: 1400 / 897,
        render: (open) => <AdminToolTile onSelect={open} />,
      },
    ],
  },
  {
    id: 'd2c',
    label: 'Design 2 Code — the Figma plugin',
    project: 'Design 2 Code',
    screens: [
      {
        name: 'Design 2 Code plugin',
        aspect: 700 / 746,
        render: (open) => (
          <Shot src="d2c.webp" alt="Design 2 Code — the plugin window" w={700} h={746} open={open} />
        ),
      },
    ],
  },
  {
    id: 'conversant',
    label: 'Conversant — the products panel and call controls',
    project: 'Conversant',
    screens: [
      {
        name: 'Conversant Products Panel',
        aspect: 640 / 1523,
        render: (open) => (
          <Shot src="d2c-products.webp" alt="Conversant — the products panel" w={640} h={1523} open={open} />
        ),
      },
      {
        name: 'Conversant Phone Tool',
        aspect: 800 / 798,
        render: (open) => (
          <Shot src="conversant-phone.webp" alt="Conversant — call controls" w={800} h={798} open={open} />
        ),
      },
    ],
  },
  {
    id: 'usaa',
    label: 'USAA — the member home page and app',
    project: 'USAA Member Home Page',
    screens: [
      {
        name: 'USAA Member Home',
        aspect: 1281 / 1371,
        render: (open) => (
          <Shot src="usaa-web.webp" alt="USAA — the member home page" w={1281} h={1371} open={open} />
        ),
      },
      {
        name: 'USAA Mobile App',
        aspect: 395 / 787,
        render: (open) => (
          <Shot src="usaa-home.webp" alt="USAA — the member home screen" w={395} h={787} open={open} />
        ),
      },
    ],
  },
];

/**
 * Takes the hero's copy as children, because the previews belong directly
 * under it in the left column while the zone they drive is the right one.
 * Owning both columns is what lets a single piece of state serve the two.
 */
export function HeroShowcase({
  onSelect,
  children,
}: {
  onSelect: () => void;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  const open = (project: string) => () => {
    onSelect();
    requestProjectHighlight(project);
  };

  const shown = hovered ?? selected;

  return (
    /* The copy column gives up a little width to the zone, and the previews
       give up more again inside it, so the screens on show grow twice over.
       The column gap is 32px rather than 48 for the same reason: what the
       gutter does not take, the two columns split by their fractions. */
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] lg:gap-8">
      <div className="max-w-2xl text-left">
        {children}

        {/* One row of five. The 85% cap the four previews carried is gone
            with it: spread across five, the full column width lands them at
            about the size four occupied at 85%. */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {CLUSTERS.map((cluster, i) => (
            <button
              key={cluster.id}
              type="button"
              aria-label={cluster.label}
              aria-pressed={i === selected}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered((at) => (at === i ? null : at))}
              /* Focus drives the zone too, so the previews work from the
                 keyboard the same way they do under a pointer. */
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered((at) => (at === i ? null : at))}
              onClick={() => setSelected(i)}
              className={`overflow-hidden rounded-[10px] ring-1 transition-shadow duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                i === selected
                  ? 'shadow-[0_0_18px_8px_rgba(13,95,254,0.25)] ring-primary/40'
                  : 'ring-black/5 hover:shadow-[0_0_18px_8px_rgba(13,95,254,0.12)]'
              }`}
            >
              <img
                src={`${BASE}hero-thumbs/${cluster.id}.webp`}
                alt=""
                width={640}
                height={436}
                decoding="async"
                className="block h-auto w-full"
              />
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full" style={{ aspectRatio: `${ZONE_ASPECT}` }}>
        {CLUSTERS.map((cluster, i) => {
          const height = rowHeight(cluster.screens);
          return (
            <div
              key={cluster.id}
              aria-hidden={i !== shown}
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
                i === shown ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
              style={{ gap: `${GAP * 100}%` }}
            >
              {cluster.screens.map((screen, s) => (
                <div
                  key={s}
                  className="group/screen relative flex-none"
                  style={{ height: `${height * 100}%`, aspectRatio: `${screen.aspect}` }}
                >
                  {screen.render(open(cluster.project))}
                  <Callout name={screen.name} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
