import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AttendanceTableSkeletonProps {
  rows?: number;
  showActions?: boolean;
}

export function AttendanceTableSkeleton({ 
  rows = 5, 
  showActions = true 
}: AttendanceTableSkeletonProps) {
  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">
              <Skeleton className="h-4 w-16" />
            </TableHead>
            <TableHead className="whitespace-nowrap">
              <Skeleton className="h-4 w-24" />
            </TableHead>
            <TableHead className="whitespace-nowrap">
              <Skeleton className="h-4 w-16" />
            </TableHead>
            <TableHead className="whitespace-nowrap">
              <Skeleton className="h-4 w-16" />
            </TableHead>
            <TableHead className="whitespace-nowrap">
              <Skeleton className="h-4 w-14" />
            </TableHead>
            {showActions && (
              <TableHead className="whitespace-nowrap">
                <Skeleton className="h-4 w-14" />
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i} className="animate-pulse">
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-8 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-8 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-16 rounded-full" />
              </TableCell>
              {showActions && (
                <TableCell>
                  <Skeleton className="h-8 w-28" />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default AttendanceTableSkeleton;
