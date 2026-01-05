import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6', className)}>
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight truncate">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-0.5 md:mt-1 line-clamp-2">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap flex-shrink-0">{actions}</div>}
    </div>
  );
}
