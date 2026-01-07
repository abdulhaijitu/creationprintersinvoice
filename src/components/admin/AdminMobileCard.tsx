import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AdminMobileCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const AdminMobileCard = ({ children, className, onClick }: AdminMobileCardProps) => {
  return (
    <Card 
      className={cn(
        'shadow-sm hover:shadow-md transition-shadow duration-200',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {children}
      </CardContent>
    </Card>
  );
};

interface CardRowProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export const CardRow = ({ label, children, className }: CardRowProps) => (
  <div className={cn('flex items-start justify-between gap-2 py-1.5', className)}>
    <span className="text-xs font-medium text-muted-foreground shrink-0">{label}</span>
    <div className="text-sm text-right">{children}</div>
  </div>
);

interface CardHeaderRowProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  icon?: ReactNode;
}

export const CardHeaderRow = ({ title, subtitle, badge, icon }: CardHeaderRowProps) => (
  <div className="flex items-start gap-3 pb-2 border-b mb-2">
    {icon && (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        {icon}
      </div>
    )}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm truncate">{title}</span>
        {badge}
      </div>
      {subtitle && (
        <span className="text-xs text-muted-foreground truncate block">{subtitle}</span>
      )}
    </div>
  </div>
);

interface CardActionsProps {
  children: ReactNode;
  className?: string;
}

export const CardActions = ({ children, className }: CardActionsProps) => (
  <div className={cn('flex items-center gap-2 pt-3 mt-2 border-t', className)}>
    {children}
  </div>
);
