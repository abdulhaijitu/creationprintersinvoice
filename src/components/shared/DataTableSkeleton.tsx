import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface DataTableSkeletonProps {
  rows?: number;
  columns?: number;
  showToolbar?: boolean;
  showPagination?: boolean;
  className?: string;
}

/**
 * Production-grade skeleton loader for data tables
 * Matches the visual structure of actual tables for seamless loading states
 */
export function DataTableSkeleton({
  rows = 5,
  columns = 5,
  showToolbar = true,
  showPagination = true,
  className,
}: DataTableSkeletonProps) {
  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {/* Toolbar Skeleton */}
      {showToolbar && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b">
          <Skeleton className="h-10 w-full sm:w-64" />
          <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      )}

      {/* Table Skeleton */}
      <div className="overflow-hidden">
        {/* Header Row */}
        <div className="flex items-center gap-4 px-4 py-3 bg-muted/40 border-b">
          <Skeleton className="h-4 w-4 shrink-0" />
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton 
              key={i} 
              className={cn(
                'h-4',
                i === 0 ? 'w-28' : i === columns - 1 ? 'w-20' : 'flex-1 max-w-32'
              )} 
            />
          ))}
        </div>
        
        {/* Data Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div 
            key={rowIndex} 
            className="flex items-center gap-4 px-4 py-4 border-b last:border-b-0"
          >
            <Skeleton className="h-4 w-4 shrink-0" />
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton 
                key={colIndex}
                className={cn(
                  'h-4',
                  colIndex === 0 ? 'w-28' : 
                  colIndex === 1 ? 'w-40' : 
                  colIndex === columns - 1 ? 'w-20' : 'w-24'
                )}
                style={{ animationDelay: `${rowIndex * 50 + colIndex * 20}ms` }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Pagination Skeleton */}
      {showPagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      )}
    </div>
  );
}

interface CardGridSkeletonProps {
  count?: number;
  columns?: 2 | 3 | 4;
  className?: string;
}

/**
 * Skeleton loader for card grids (e.g., dashboard stats)
 */
export function CardGridSkeleton({ 
  count = 4, 
  columns = 4,
  className 
}: CardGridSkeletonProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="rounded-lg border bg-card p-4 space-y-3"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

interface DetailPageSkeletonProps {
  className?: string;
}

/**
 * Skeleton loader for detail/form pages
 */
export function DetailPageSkeleton({ className }: DetailPageSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Content Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-2/3" />
            </div>
          </div>
          
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <Skeleton className="h-6 w-28" />
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex justify-between pt-2 border-t">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-28" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}