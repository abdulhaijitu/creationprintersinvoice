import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Search, Filter, X, CalendarIcon, Download, Upload, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface FilterOption {
  value: string;
  label: string;
}

interface DateRange {
  from?: Date;
  to?: Date;
}

interface TableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  
  // Filter options
  filterOptions?: FilterOption[];
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterLabel?: string;
  
  // Date filter
  showDateFilter?: boolean;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  
  // Actions
  onExport?: () => void;
  onImport?: () => void;
  onAdd?: () => void;
  addLabel?: string;
  addDisabled?: boolean;
  
  // Active filters
  activeFilterCount?: number;
  onClearFilters?: () => void;
  
  className?: string;
}

export function TableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filterOptions,
  filterValue,
  onFilterChange,
  filterLabel = 'Filter',
  showDateFilter = false,
  dateRange,
  onDateRangeChange,
  onExport,
  onImport,
  onAdd,
  addLabel = 'Add New',
  addDisabled = false,
  activeFilterCount = 0,
  onClearFilters,
  className,
}: TableToolbarProps) {
  const [isDateOpen, setIsDateOpen] = useState(false);

  return (
    <div className={cn(
      'bg-card rounded-xl shadow-sm border border-border/50',
      className
    )}>
      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-background/50 border-border/50 h-10"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => onSearchChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Status/Type Filter */}
          {filterOptions && onFilterChange && (
            <Select value={filterValue || 'all'} onValueChange={onFilterChange}>
              <SelectTrigger className="w-[130px] h-10 bg-background/50 border-border/50">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder={filterLabel} />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Date Range Filter */}
          {showDateFilter && onDateRangeChange && (
            <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'h-10 gap-2 border-border/50 bg-background/50',
                    dateRange?.from && 'text-foreground'
                  )}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <span className="text-xs">
                        {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}
                      </span>
                    ) : (
                      <span className="text-xs">{format(dateRange.from, 'MMM d')}</span>
                    )
                  ) : (
                    <span className="hidden sm:inline">Date Range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  selected={dateRange?.from ? { from: dateRange.from, to: dateRange.to } : undefined}
                  onSelect={(range) => {
                    onDateRangeChange(range as DateRange | undefined);
                    if (range?.to) setIsDateOpen(false);
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Clear Filters */}
          {activeFilterCount > 0 && onClearFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 gap-1.5 text-muted-foreground"
              onClick={onClearFilters}
            >
              <X className="h-4 w-4" />
              Clear
              <Badge variant="secondary" className="ml-1 px-1.5">
                {activeFilterCount}
              </Badge>
            </Button>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:ml-auto">
            {onExport && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-10 gap-2 border-border/50"
                onClick={onExport}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            )}
            
            {onImport && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-10 gap-2 border-border/50"
                onClick={onImport}
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </Button>
            )}

            {onAdd && (
              <Button 
                size="sm" 
                className="h-10 gap-2 shadow-sm"
                onClick={onAdd}
                disabled={addDisabled}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{addLabel}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
