import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface EnhancedTableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  showStats?: boolean;
  className?: string;
}

export function EnhancedTableSkeleton({
  rows = 5,
  columns = 5,
  showHeader = true,
  showStats = true,
  className,
}: EnhancedTableSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Skeleton */}
      {showHeader && (
        <div className="flex flex-col gap-1">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      )}

      {/* Stats Cards Skeleton */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div 
              key={i} 
              className="bg-card rounded-xl p-4 border border-border/50"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Table Controls Skeleton */}
      <div className="bg-card rounded-xl border border-border/50">
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 w-full sm:w-64" />
          <div className="flex gap-2 sm:ml-auto">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="overflow-hidden">
          {/* Table Header */}
          <div className="border-t border-border/50 bg-muted/30 px-4 py-3 flex gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton 
                key={i} 
                className={cn(
                  'h-4',
                  i === 0 ? 'w-6' : i === 1 ? 'w-28' : 'w-20'
                )} 
              />
            ))}
          </div>
          
          {/* Table Rows */}
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div 
              key={rowIndex} 
              className="border-t border-border/30 px-4 py-4 flex gap-4 items-center"
              style={{ animationDelay: `${rowIndex * 30}ms` }}
            >
              <Skeleton className="h-4 w-4 shrink-0" />
              {Array.from({ length: columns - 1 }).map((_, colIndex) => (
                <Skeleton 
                  key={colIndex}
                  className={cn(
                    'h-4',
                    colIndex === 0 ? 'w-28' : colIndex === 1 ? 'w-32' : 'w-16'
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
