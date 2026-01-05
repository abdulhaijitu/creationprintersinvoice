import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-8 md:py-12 px-4 text-center', className)}>
      {Icon && (
        <div className="mb-3 md:mb-4 p-2.5 md:p-3 rounded-full bg-muted/50">
          <Icon className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-base md:text-lg font-medium text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm max-w-sm mb-3 md:mb-4">{description}</p>
      )}
      {action && (
        <Button variant="outline" onClick={action.onClick} className="mt-1 md:mt-2">
          {action.icon && <action.icon className="h-4 w-4 mr-2" />}
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
}
