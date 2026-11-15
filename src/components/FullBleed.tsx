import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useFullBleed } from '@/lib/useFullBleed';

/**
 * Widens its children from the column they sit in to the whole window.
 *
 * `active` false leaves the block exactly where it was, so a page can offer
 * the choice without two code paths.
 */
export function FullBleed({
  active = true,
  className,
  children,
}: {
  active?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const bleed = useFullBleed(active);
  return (
    <div
      ref={bleed.ref}
      style={bleed.style}
      className={cn(active && 'full-bleed px-4 sm:px-6 lg:px-8', className)}
    >
      {children}
    </div>
  );
}
