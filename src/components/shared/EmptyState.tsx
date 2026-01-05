import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, FileText, Users, Wallet, Package, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';

type IllustrationType = 'invoice' | 'customer' | 'expense' | 'quotation' | 'task' | 'generic';

const illustrations: Record<IllustrationType, React.FC<{ className?: string }>> = {
  invoice: ({ className }) => (
    <div className={cn('relative', className)}>
      <div className="w-32 h-40 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-dashed border-primary/20 flex flex-col items-center justify-center">
        <FileText className="h-12 w-12 text-primary/40 mb-2" />
        <div className="space-y-1.5 w-20">
          <div className="h-2 bg-primary/20 rounded-full" />
          <div className="h-2 bg-primary/15 rounded-full w-3/4" />
          <div className="h-2 bg-primary/10 rounded-full w-1/2" />
        </div>
      </div>
    </div>
  ),
  customer: ({ className }) => (
    <div className={cn('relative', className)}>
      <div className="w-32 h-32 bg-gradient-to-br from-info/10 to-info/5 rounded-full border-2 border-dashed border-info/20 flex items-center justify-center">
        <Users className="h-14 w-14 text-info/40" />
      </div>
    </div>
  ),
  expense: ({ className }) => (
    <div className={cn('relative', className)}>
      <div className="w-32 h-32 bg-gradient-to-br from-warning/10 to-warning/5 rounded-xl border-2 border-dashed border-warning/20 flex items-center justify-center">
        <Wallet className="h-12 w-12 text-warning/40" />
      </div>
    </div>
  ),
  quotation: ({ className }) => (
    <div className={cn('relative', className)}>
      <div className="w-32 h-36 bg-gradient-to-br from-success/10 to-success/5 rounded-lg border-2 border-dashed border-success/20 flex flex-col items-center justify-center">
        <Package className="h-10 w-10 text-success/40 mb-2" />
        <div className="w-16 h-1.5 bg-success/20 rounded-full" />
      </div>
    </div>
  ),
  task: ({ className }) => (
    <div className={cn('relative', className)}>
      <div className="w-32 h-32 bg-gradient-to-br from-destructive/10 to-destructive/5 rounded-lg border-2 border-dashed border-destructive/20 flex items-center justify-center">
        <ClipboardList className="h-12 w-12 text-destructive/40" />
      </div>
    </div>
  ),
  generic: ({ className }) => (
    <div className={cn('relative', className)}>
      <div className="w-24 h-24 bg-gradient-to-br from-muted to-muted/50 rounded-full border-2 border-dashed border-border flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-muted-foreground/10" />
      </div>
    </div>
  ),
};

interface EmptyStateProps {
  icon?: LucideIcon;
  illustration?: IllustrationType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  action,
  secondaryAction,
  className,
  children,
}: EmptyStateProps) {
  const Illustration = illustration ? illustrations[illustration] : null;

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 md:py-16 px-4 text-center', className)}>
      {Illustration && (
        <div className="mb-6 animate-fade-in">
          <Illustration className="mx-auto" />
        </div>
      )}
      {!Illustration && Icon && (
        <div className="mb-4 p-3 rounded-full bg-muted/50">
          <Icon className="h-10 w-10 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm max-w-md mb-6">{description}</p>
      )}
      <div className="flex items-center gap-3">
        {action && (
          <Button onClick={action.onClick} className="gap-2">
            {action.icon && <action.icon className="h-4 w-4" />}
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="outline" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}
