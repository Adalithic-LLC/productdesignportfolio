/** One brand mark by key. An unknown key renders nothing, so a typo in the
    card's icon list cannot break the card. */
import { Keyboard } from 'lucide-react';
import { BRAND } from '@/lib/brandMarks';

export function Mark({ name }: { name: string }) {
  /* Not a brand: the category as a whole, so a generic keyboard stands for it
     rather than any one app's logo. */
  if (name === 'keyboard') {
    return <Keyboard className="h-6 w-6 text-foreground/70" aria-label="Translator keyboard apps" />;
  }
  const brand = BRAND[name];
  if (!brand) return null;
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label={brand.title} className="h-6 w-6 fill-foreground/70">
      <title>{brand.title}</title>
      <path d={brand.path} />
    </svg>
  );
}
