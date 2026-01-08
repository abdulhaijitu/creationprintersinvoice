import { LucideIcon, BarChart3, FileText, Users, Wallet, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardEmptyStateProps {
  type?: 'dashboard' | 'invoices' | 'customers' | 'expenses' | 'tasks';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const illustrations: Record<string, { icon: LucideIcon; bgColor: string; iconColor: string }> = {
  dashboard: { icon: BarChart3, bgColor: 'bg-primary/10', iconColor: 'text-primary' },
  invoices: { icon: FileText, bgColor: 'bg-success/10', iconColor: 'text-success' },
  customers: { icon: Users, bgColor: 'bg-info/10', iconColor: 'text-info' },
  expenses: { icon: Wallet, bgColor: 'bg-warning/10', iconColor: 'text-warning' },
  tasks: { icon: ClipboardList, bgColor: 'bg-primary/10', iconColor: 'text-primary' },
};

const defaultContent = {
  dashboard: {
    title: 'Welcome to your Dashboard',
    description: "You're all set! Start by creating your first invoice or adding a customer.",
    actionLabel: 'Create Invoice',
  },
  invoices: {
    title: 'No invoices yet',
    description: 'Create your first invoice to start tracking your sales.',
    actionLabel: 'Create Invoice',
  },
  customers: {
    title: 'No customers yet',
    description: 'Add your first customer to begin managing your business relationships.',
    actionLabel: 'Add Customer',
  },
  expenses: {
    title: 'No expenses recorded',
    description: 'Start tracking your business expenses for better financial insights.',
    actionLabel: 'Add Expense',
  },
  tasks: {
    title: 'No tasks yet',
    description: 'Create tasks to track your work and production progress.',
    actionLabel: 'Create Task',
  },
};

export function DashboardEmptyState({
  type = 'dashboard',
  title,
  description,
  actionLabel,
  onAction,
  className,
}: DashboardEmptyStateProps) {
  const illustration = illustrations[type];
  const content = defaultContent[type];
  const Icon = illustration.icon;

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 px-6 text-center',
      'animate-fade-in',
      className
    )}>
      {/* Illustration */}
      <div className={cn(
        'relative mb-6',
        'animate-scale-in'
      )}>
        <div className={cn(
          'w-24 h-24 rounded-2xl flex items-center justify-center',
          illustration.bgColor
        )}>
          <Icon className={cn('h-12 w-12', illustration.iconColor)} />
        </div>
        {/* Decorative elements */}
        <div className={cn(
          'absolute -top-2 -right-2 w-6 h-6 rounded-full',
          illustration.bgColor,
          'opacity-60'
        )} />
        <div className={cn(
          'absolute -bottom-1 -left-3 w-4 h-4 rounded-full',
          illustration.bgColor,
          'opacity-40'
        )} />
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title || content.title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {description || content.description}
      </p>

      {/* Action */}
      {onAction && (
        <Button 
          onClick={onAction}
          className="shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98]"
        >
          {actionLabel || content.actionLabel}
        </Button>
      )}
    </div>
  );
}
