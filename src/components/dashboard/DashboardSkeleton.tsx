import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DashboardSkeletonProps {
  showWelcome?: boolean;
  showStats?: boolean;
  showCharts?: boolean;
  showRecentActivity?: boolean;
}

export function DashboardSkeleton({
  showWelcome = true,
  showStats = true,
  showCharts = true,
  showRecentActivity = true,
}: DashboardSkeletonProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Skeleton */}
      {showWelcome && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      )}

      {/* Stats Cards Skeleton */}
      {showStats && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card 
              key={i} 
              className="p-4"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Charts Skeleton */}
      {showCharts && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-40" />
              <div className="flex items-center justify-center h-64">
                <Skeleton className="h-48 w-48 rounded-full" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Recent Activity Skeleton */}
      {showRecentActivity && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2">
            <div className="space-y-4">
              <Skeleton className="h-6 w-36" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-4 py-3"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
