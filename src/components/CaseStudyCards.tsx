/**
 * The cards inside a case study section: a row of logos over a paragraph.
 *
 * Used where a section enumerates several named things -- the competing
 * translation flows under Reword's "why it mattered" -- and a run of prose
 * paragraphs would bury which one each is about. The logos do the labelling,
 * so the copy does not have to open every paragraph with a product name.
 */
import { Keyboard } from 'lucide-react';
import { useContent } from '@/content/ContentContext';
import { Editable } from '@/content/Editable';

/**
 * Brand marks, inlined rather than pulled from an icon package: three paths
 * do not justify a dependency, and inline SVG inherits `currentColor` so the
 * marks follow the theme instead of shipping a light and a dark copy.
 *
 * Paths are from simple-icons, which publishes them under CC0. The marks
 * themselves remain their owners' trademarks and appear here as comparative
 * reference, which is what they are describing.
 */
const BRAND: Record<string, { title: string; path: string }> = {
  google: {
    title: 'Google',
    path: 'M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z',
  },
  apple: {
    title: 'Apple',
    path: 'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701',
  },
  deepl: {
    title: 'DeepL',
    path: 'M20.907 4.93953 12.68543.18573a1.3577 1.3577 0 0 0-1.3709 0L3.09298 4.9565a1.3766 1.3766 0 0 0-.68639 1.18233v9.52646a1.3766 1.3766 0 0 0 .68639 1.19363l8.22157 4.75946.06223.03583 4.04856 2.3458-.01131-2.06106.0075-1.1446.0038.01885v-.38467c0-.23006.1188-.43371.29605-.56005l.264-.15086.12633-.06977h-.0075l4.80283-2.7795a1.3803 1.3803 0 0 0 .68639-1.19551V6.13505a1.3803 1.3803 0 0 0-.68642-1.19552m-9.85269 9.68863a1.4275 1.4275 0 0 1-.39976 1.3841 1.4086 1.4086 0 0 1-1.97054 0 1.4199 1.4199 0 0 1 0-2.06294 1.4086 1.4086 0 0 1 2.0422.07543l3.32822-1.91585.6864.38656zm5.77019-2.41367a1.4086 1.4086 0 0 1-1.97054 0 1.4256 1.4256 0 0 1-.3696-1.47837l-.0132.0075-3.7525-2.1723-.05657.05656a1.4086 1.4086 0 0 1-1.97053 0 1.4199 1.4199 0 0 1 0-2.06293 1.4086 1.4086 0 0 1 1.97242 0c.3941.37713.52422.91832.39033 1.40672l3.7808 2.20059.01886-.01886a1.4086 1.4086 0 0 1 1.97242 0 1.42746 1.42746 0 0 1 0 2.06105z',
  },
};

function Mark({ name }: { name: string }) {
  /* Not a brand: the category as a whole, so a generic keyboard stands for it
     rather than any one app's logo. */
  if (name === 'keyboard') {
    return <Keyboard className="h-6 w-6 text-foreground/70" aria-label="Translator keyboard apps" />;
  }
  const brand = BRAND[name];
  if (!brand) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={brand.title}
      className="h-6 w-6 fill-foreground/70"
    >
      <title>{brand.title}</title>
      <path d={brand.path} />
    </svg>
  );
}

export function CaseStudyCards({ index }: { index: number }) {
  const { content, isAdmin } = useContent();
  const cards = content.arcatext.features[index]?.cards ?? [];
  if (!cards.length) return null;

  return (
    /* One column on a phone, three across once there is room. The cards stretch
       to a common height so the row reads as a set rather than as three
       paragraphs that happen to sit side by side.

       From lg the row breaks out past the prose column. The article is held to
       a reading measure, which is right for prose but leaves three columns at
       about 220px each -- narrow enough that the longest card runs to fourteen
       lines. The gutter either side of a centred `max-w-3xl` is far wider than
       the 96px taken back here, so the row still sits well inside the page. */
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:-mx-24">
      {cards.map((card, i) => (
        <div
          key={i}
          className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card/60 p-5"
        >
          <div className="flex items-center gap-3">
            {card.icons.map((name) => (
              <Mark key={name} name={name} />
            ))}
          </div>
          <Editable
            as="p"
            path={`arcatext.features.${index}.cards.${i}.body`}
            multiline
            className={`whitespace-pre-line text-sm leading-relaxed text-muted-foreground ${
              isAdmin ? 'min-h-6' : ''
            }`}
          />
        </div>
      ))}
    </div>
  );
}
