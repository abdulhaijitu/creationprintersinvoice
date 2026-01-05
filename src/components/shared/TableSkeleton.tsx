import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 5, className }: TableSkeletonProps) {
  return (
    <div className={cn('space-y-2 md:space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 md:gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton
              key={j}
              className={cn(
                'h-9 md:h-10',
                j === 0 ? 'w-24 md:w-32' : 'flex-1',
                j === columns - 1 && 'w-16 md:w-24'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface CardSkeletonProps {
  count?: number;
  className?: string;
}

export function CardSkeleton({ count = 4, className }: CardSkeletonProps) {
  return (
    <div className={cn('grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 md:h-32 rounded-xl" />
      ))}
    </div>
  );
}

interface ContentSkeletonProps {
  className?: string;
}

export function ContentSkeleton({ className }: ContentSkeletonProps) {
  return (
    <div className={cn('space-y-3 md:space-y-4', className)}>
      <Skeleton className="h-16 md:h-20 w-full" />
      <Skeleton className="h-24 md:h-32 w-full" />
      <Skeleton className="h-36 md:h-48 w-full" />
    </div>
  );
}
