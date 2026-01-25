import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveTableWrapperProps {
  children: ReactNode;
  minWidth?: string;
  className?: string;
}

/**
 * ResponsiveTableWrapper - A reusable wrapper for tables that provides:
 * - Desktop (≥1280px): Full table display
 * - Tablet (640px–1279px): Horizontal scroll with preserved layout
 * - Mobile (<640px): Hidden (use mobileContent prop or conditional render)
 * 
 * BREAKPOINT STRATEGY:
 * - Mobile: < 640px (sm)
 * - Tablet: 640px – 1024px (sm to lg)
 * - Laptop: 1024px – 1280px (lg to xl)
 * - Desktop: ≥ 1280px (xl+)
 */
export const ResponsiveTableWrapper = ({
  children,
  minWidth = 'min-w-[800px]',
  className,
}: ResponsiveTableWrapperProps) => {
  return (
    <div className={cn(
      'relative w-full overflow-x-auto rounded-lg border',
      'scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent',
      className
    )}>
      <div className={cn('w-full', minWidth)}>
        {children}
      </div>
    </div>
  );
};

interface ResponsiveTableContainerProps {
  /** Desktop/Tablet table content */
  tableContent: ReactNode;
  /** Mobile card layout content */
  mobileContent: ReactNode;
  /** Minimum width for table (e.g., "min-w-[800px]") */
  minWidth?: string;
  /** Additional className for wrapper */
  className?: string;
  /** Show table on tablet (sm+) or only desktop (md+). Default: sm+ */
  tabletBreakpoint?: 'sm' | 'md';
}

/**
 * ResponsiveTableContainer - Full responsive solution with automatic
 * desktop/tablet table and mobile card switching
 * 
 * Mobile (<640px): Card layout
 * Tablet+ (≥640px): Table with horizontal scroll if needed
 */
export const ResponsiveTableContainer = ({
  tableContent,
  mobileContent,
  minWidth = 'min-w-[800px]',
  className,
  tabletBreakpoint = 'sm',
}: ResponsiveTableContainerProps) => {
  const hiddenClass = tabletBreakpoint === 'sm' ? 'hidden sm:block' : 'hidden md:block';
  const visibleClass = tabletBreakpoint === 'sm' ? 'block sm:hidden' : 'block md:hidden';

  return (
    <>
      {/* Tablet+: Table with horizontal scroll */}
      <div className={cn(hiddenClass, className)}>
        <div className={cn(
          'relative w-full overflow-x-auto rounded-lg border',
          'scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent'
        )}>
          <div className={cn('w-full', minWidth)}>
            {tableContent}
          </div>
        </div>
      </div>

      {/* Mobile: Card layout */}
      <div className={visibleClass}>
        {mobileContent}
      </div>
    </>
  );
};

interface StickyColumnTableProps {
  children: ReactNode;
  minWidth?: string;
  className?: string;
  /** Number of columns to make sticky from left */
  stickyColumns?: number;
}

/**
 * StickyColumnTable - Table wrapper with sticky first column support for tablets
 * First column stays fixed while rest scrolls horizontally
 */
export const StickyColumnTable = ({
  children,
  minWidth = 'min-w-[800px]',
  className,
  stickyColumns = 1,
}: StickyColumnTableProps) => {
  return (
    <div className={cn(
      'relative w-full overflow-x-auto rounded-lg border',
      'scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent',
      // Add CSS custom property for sticky columns
      stickyColumns > 0 && '[&_th:first-child]:sticky [&_th:first-child]:left-0 [&_th:first-child]:z-10 [&_th:first-child]:bg-card',
      stickyColumns > 0 && '[&_td:first-child]:sticky [&_td:first-child]:left-0 [&_td:first-child]:z-10 [&_td:first-child]:bg-card',
      className
    )}>
      <div className={cn('w-full', minWidth)}>
        {children}
      </div>
    </div>
  );
};

/**
 * MobileCardGrid - Responsive grid for mobile card layouts
 * Provides consistent spacing and touch-friendly sizing
 */
interface MobileCardGridProps {
  children: ReactNode;
  className?: string;
  /** Gap between cards */
  gap?: 'sm' | 'md' | 'lg';
}

export const MobileCardGrid = ({
  children,
  className,
  gap = 'md',
}: MobileCardGridProps) => {
  const gapClass = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
  }[gap];

  return (
    <div className={cn('flex flex-col', gapClass, className)}>
      {children}
    </div>
  );
};

export default ResponsiveTableWrapper;
