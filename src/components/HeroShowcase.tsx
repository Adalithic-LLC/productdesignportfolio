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
import { ArcatextCardStack } from '@/components/ArcatextCardStack';
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

/** `open` scrolls to the work card this screen belongs to and lights it. */
type Screen = { aspect: number; render: (open: () => void) => ReactNode };

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

const CLUSTERS: Cluster[] = [
  {
    id: 'arcatext',
    label: 'Arcatext — the keyboard and its tuning tool',
    project: 'Arcatext',
    screens: [
      { aspect: 1206 / 2622, render: (open) => <ArcatextCardStack onSelect={open} /> },
      { aspect: 1400 / 897, render: (open) => <AdminToolTile onSelect={open} /> },
    ],
  },
  {
    id: 'd2c',
    label: 'Design 2 Code — the Figma plugin',
    project: 'Design 2 Code',
    screens: [
      {
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
        aspect: 640 / 1523,
        render: (open) => (
          <Shot src="d2c-products.webp" alt="Conversant — the products panel" w={640} h={1523} open={open} />
        ),
      },
      {
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
        aspect: 1281 / 1371,
        render: (open) => (
          <Shot src="usaa-web.webp" alt="USAA — the member home page" w={1281} h={1371} open={open} />
        ),
      },
      {
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
       give up more again inside it, so the screens on show grow twice over. */
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] lg:gap-12">
      <div className="max-w-2xl text-left">
        {children}

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:max-w-[85%]">
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
                  className="flex-none"
                  style={{ height: `${height * 100}%`, aspectRatio: `${screen.aspect}` }}
                >
                  {screen.render(open(cluster.project))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
