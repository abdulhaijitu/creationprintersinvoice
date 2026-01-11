/**
 * Unified loading state components
 * Provides consistent loading, error, and empty state UI across the app
 */

import React from 'react';
import { AlertCircle, RefreshCw, Inbox, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ============================================================================
// Button Loading State
// ============================================================================

interface LoadingButtonProps extends React.ComponentPropsWithoutRef<typeof Button> {
  loading?: boolean;
  loadingText?: string;
}

export function LoadingButton({ 
  loading, 
  loadingText, 
  children, 
  disabled,
  ...props 
}: LoadingButtonProps) {
  return (
    <Button disabled={disabled || loading} {...props}>
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          {loadingText || children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

// ============================================================================
// Error State
// ============================================================================

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We couldn\'t load the data. Please check your connection and try again.',
  onRetry,
  isRetrying = false,
  compact = false,
  className,
}: ErrorStateProps) {
  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20', className)}>
        <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{message}</p>
        </div>
        {onRetry && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRetry} 
            disabled={isRetrying}
            className="shrink-0"
          >
            <RefreshCw className={cn('h-4 w-4', isRetrying && 'animate-spin')} />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center px-4', className)}>
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-sm">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" disabled={isRetrying} className="gap-2">
          <RefreshCw className={cn('h-4 w-4', isRetrying && 'animate-spin')} />
          {isRetrying ? 'Retrying...' : 'Try Again'}
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className="rounded-full bg-muted/50 p-4 mb-4">
        {icon || <Inbox className="h-10 w-10 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm mb-6 max-w-sm">{description}</p>
      )}
      {action}
    </div>
  );
}

// ============================================================================
// Inline Loading Spinner
// ============================================================================

interface InlineSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function InlineSpinner({ size = 'md', className }: InlineSpinnerProps) {
  const sizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return <Loader2 className={cn('animate-spin text-muted-foreground', sizes[size], className)} />;
}

// ============================================================================
// Row Loading State (for table rows)
// ============================================================================

interface RowLoadingProps {
  columns: number;
  className?: string;
}

export function RowLoading({ columns, className }: RowLoadingProps) {
  return (
    <tr className={cn('animate-pulse', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton 
            className={cn(
              'h-4',
              i === 0 ? 'w-6' : i === 1 ? 'w-32' : 'w-20'
            )} 
          />
        </td>
      ))}
    </tr>
  );
}

// ============================================================================
// Content Loading Wrapper
// ============================================================================

interface ContentLoaderProps {
  loading: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
  skeleton: React.ReactNode;
  emptyState?: React.ReactNode;
  errorTitle?: string;
  children: React.ReactNode;
}

export function ContentLoader({
  loading,
  error,
  isEmpty,
  onRetry,
  isRetrying,
  skeleton,
  emptyState,
  errorTitle,
  children,
}: ContentLoaderProps) {
  // Show skeleton only on initial load (no data yet)
  if (loading) {
    return <>{skeleton}</>;
  }

  // Show error state
  if (error) {
    return (
      <ErrorState
        title={errorTitle || 'Failed to load data'}
        message={error.message}
        onRetry={onRetry}
        isRetrying={isRetrying}
      />
    );
  }

  // Show empty state
  if (isEmpty && emptyState) {
    return <>{emptyState}</>;
  }

  // Render content
  return <>{children}</>;
}

// ============================================================================
// Page-Level Table Skeleton
// ============================================================================

interface PageTableSkeletonProps {
  /** Number of rows to show */
  rows?: number;
  /** Number of columns */
  columns?: number;
  /** Show the header section */
  showHeader?: boolean;
  /** Show stats cards */
  showStats?: boolean;
  /** Number of stat cards */
  statsCount?: number;
  /** Show toolbar (search, filters) */
  showToolbar?: boolean;
  className?: string;
}

export function PageTableSkeleton({
  rows = 5,
  columns = 5,
  showHeader = true,
  showStats = true,
  statsCount = 4,
  showToolbar = true,
  className,
}: PageTableSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      {showHeader && (
        <div className="flex flex-col gap-1">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      )}

      {/* Stats Cards */}
      {showStats && (
        <div className={cn(
          'grid gap-4',
          statsCount <= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
        )}>
          {Array.from({ length: statsCount }).map((_, i) => (
            <div 
              key={i} 
              className="bg-card rounded-xl p-4 border border-border/50"
            >
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Card with toolbar and table */}
      <div className="bg-card rounded-xl border border-border/50">
        {/* Toolbar */}
        {showToolbar && (
          <div className="p-4 flex flex-col sm:flex-row gap-3">
            <Skeleton className="h-10 w-full sm:w-64" />
            <div className="flex gap-2 sm:ml-auto">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        )}

        {/* Table */}
        <div className={cn('border-t border-border/50', !showToolbar && 'border-t-0')}>
          {/* Table header */}
          <div className="bg-muted/30 px-4 py-3 flex gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton 
                key={i} 
                className={cn(
                  'h-4',
                  i === 0 ? 'w-6' : i === 1 ? 'w-28' : 'w-20 flex-1'
                )} 
              />
            ))}
          </div>
          
          {/* Table rows */}
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div 
              key={rowIndex} 
              className="border-t border-border/30 px-4 py-4 flex gap-4 items-center"
            >
              <Skeleton className="h-4 w-4 shrink-0" />
              {Array.from({ length: columns - 1 }).map((_, colIndex) => (
                <Skeleton 
                  key={colIndex}
                  className={cn(
                    'h-4',
                    colIndex === 0 ? 'w-28' : colIndex === 1 ? 'w-32' : 'w-16 flex-1'
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Card Grid Skeleton
// ============================================================================

interface CardGridSkeletonProps {
  count?: number;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function CardGridSkeleton({ 
  count = 4, 
  columns = 4,
  className 
}: CardGridSkeletonProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="bg-card rounded-xl p-6 border border-border/50"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          </div>
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
