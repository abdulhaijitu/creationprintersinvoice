import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
}

/**
 * PageHeader - Responsive page header with title, description, and actions
 * Mobile: Stacked layout, smaller text
 * Tablet+: Inline layout with proper spacing
 */
export function PageHeader({ title, description, actions, badge, className }: PageHeaderProps) {
  return (
    <div className={cn(
      'flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between',
      'mb-4 sm:mb-6 md:mb-8',
      className
    )}>
      <div className="min-w-0 space-y-0.5 sm:space-y-1">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

// Compact variant for inner sections
interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * SectionHeader - Compact header for page sections
 * Consistent with PageHeader but smaller scale
 */
export function SectionHeader({ title, description, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn(
      'flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between',
      'mb-3 sm:mb-4',
      className
    )}>
      <div className="min-w-0">
        <h2 className="text-base sm:text-lg font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 mt-1.5 sm:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
}
