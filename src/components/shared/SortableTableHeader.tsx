import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

interface SortableTableHeaderProps {
  label: string;
  sortKey?: string;
  currentSortKey?: string | null;
  currentSortDirection?: SortDirection;
  onSort?: (key: string) => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function SortableTableHeader({
  label,
  sortKey,
  currentSortKey,
  currentSortDirection,
  onSort,
  className,
  align = 'left',
}: SortableTableHeaderProps) {
  const isSortable = !!sortKey && !!onSort;
  const isActive = sortKey === currentSortKey;

  const handleClick = () => {
    if (isSortable && sortKey) {
      onSort(sortKey);
    }
  };

  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1.5',
        alignmentClasses[align],
        isSortable && 'cursor-pointer select-none hover:text-foreground transition-colors duration-150',
        className
      )}
      onClick={handleClick}
      role={isSortable ? 'button' : undefined}
      tabIndex={isSortable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isSortable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <span className="text-xs font-semibold uppercase tracking-wide">
        {label}
      </span>
      {isSortable && (
        <span className={cn(
          'transition-all duration-150',
          isActive ? 'text-primary' : 'text-muted-foreground/50'
        )}>
          {isActive && currentSortDirection === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : isActive && currentSortDirection === 'desc' ? (
            <ArrowDown className="h-3.5 w-3.5" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5" />
          )}
        </span>
      )}
    </div>
  );
}

// Hook for managing sort state
export function useSortableTable<T>(initialKey?: string, initialDirection: SortDirection = null) {
  const [sortKey, setSortKey] = useState<string | null>(initialKey || null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      // Toggle direction or reset
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortKey(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortData = (data: T[]) => {
    if (!sortKey || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aValue = (a as Record<string, unknown>)[sortKey];
      const bValue = (b as Record<string, unknown>)[sortKey];

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

      // Compare
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Fallback to string comparison
      const comparison = String(aValue).localeCompare(String(bValue));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  return {
    sortKey,
    sortDirection,
    handleSort,
    sortData,
  };
}

// Need to import useState
import { useState } from 'react';
