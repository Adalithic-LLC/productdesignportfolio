import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

/**
 * The site's light/dark switch, in every page's top bar.
 *
 * One tap flips the theme; the icon shows the theme it switches TO (a moon
 * while light, a sun while dark). Until the first tap the site follows the
 * system setting — useTheme starts on 'system' — but system is not offered as
 * a choice here.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-foreground/70 transition-colors hover:bg-primary/10 hover:text-foreground ${className}`}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
