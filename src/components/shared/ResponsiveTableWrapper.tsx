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
 * - Tablet (768px–1279px): Horizontal scroll with preserved layout
 * - Mobile (<768px): Hidden (use mobileContent prop or conditional render)
 * 
 * Usage:
 * ```tsx
 * <ResponsiveTableWrapper minWidth="min-w-[900px]">
 *   <Table>...</Table>
 * </ResponsiveTableWrapper>
 * ```
 */
export const ResponsiveTableWrapper = ({
  children,
  minWidth = 'min-w-[900px]',
  className,
}: ResponsiveTableWrapperProps) => {
  return (
    <div className={cn('relative w-full overflow-x-auto rounded-lg border', className)}>
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
  /** Minimum width for table (e.g., "min-w-[900px]") */
  minWidth?: string;
  /** Additional className for wrapper */
  className?: string;
}

/**
 * ResponsiveTableContainer - Full responsive solution with automatic
 * desktop/tablet table and mobile card switching
 * 
 * Usage:
 * ```tsx
 * <ResponsiveTableContainer
 *   tableContent={<Table>...</Table>}
 *   mobileContent={<div>{items.map(item => <ItemCard />)}</div>}
 *   minWidth="min-w-[900px]"
 * />
 * ```
 */
export const ResponsiveTableContainer = ({
  tableContent,
  mobileContent,
  minWidth = 'min-w-[900px]',
  className,
}: ResponsiveTableContainerProps) => {
  return (
    <>
      {/* Desktop/Tablet: Table with horizontal scroll */}
      <div className={cn('hidden md:block', className)}>
        <div className="relative w-full overflow-x-auto rounded-lg border">
          <div className={cn('w-full', minWidth)}>
            {tableContent}
          </div>
        </div>
      </div>

      {/* Mobile: Card layout */}
      <div className="block md:hidden">
        {mobileContent}
      </div>
    </>
  );
};

interface StickyColumnTableProps {
  children: ReactNode;
  minWidth?: string;
  className?: string;
}

/**
 * StickyColumnTable - Table wrapper with sticky first column support for tablets
 */
export const StickyColumnTable = ({
  children,
  minWidth = 'min-w-[900px]',
  className,
}: StickyColumnTableProps) => {
  return (
    <div className={cn('relative w-full overflow-x-auto rounded-lg border', className)}>
      <div className={cn('w-full', minWidth)}>
        {children}
      </div>
    </div>
  );
};

export default ResponsiveTableWrapper;
