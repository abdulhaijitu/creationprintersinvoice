import { X, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface BulkAction {
  id: string;
  label: string;
  icon: LucideIcon;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  onClick: () => void;
  disabled?: boolean;
}

interface EnhancedBulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: BulkAction[];
  className?: string;
}

export function EnhancedBulkActionsBar({
  selectedCount,
  onClearSelection,
  actions,
  className,
}: EnhancedBulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div 
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'animate-slide-up',
        className
      )}
    >
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl',
        'bg-card/95 backdrop-blur-lg shadow-lg border border-border/50',
        'ring-1 ring-black/5 dark:ring-white/5'
      )}>
        {/* Selection Count */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
            <span className="text-sm font-semibold text-primary">{selectedCount}</span>
          </div>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            item{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border/50" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant={action.variant || 'outline'}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn(
                  'h-9 gap-2 transition-all duration-200',
                  'hover:shadow-sm active:scale-[0.98]',
                  action.variant === 'destructive' && 'hover:bg-destructive/90'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{action.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Clear Selection */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearSelection}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
