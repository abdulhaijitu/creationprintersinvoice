/**
 * UI Hint Components
 * ==================
 * AI-assisted contextual hints for guiding users.
 * Non-blocking, dismissible, and subtle.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X, Lightbulb, Info, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
import { Button } from './button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './tooltip';

// ============================================
// TYPES
// ============================================

type HintVariant = 'info' | 'tip' | 'warning' | 'success';

interface UIHintProps {
  children: React.ReactNode;
  className?: string;
  variant?: HintVariant;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

interface InlineHintProps {
  children: React.ReactNode;
  className?: string;
}

interface TooltipHintProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

interface FieldHintProps {
  children: React.ReactNode;
  className?: string;
}

interface ContextualHintProps {
  title?: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  className?: string;
}

// ============================================
// VARIANT CONFIG
// ============================================

const variantConfig: Record<HintVariant, {
  icon: React.ComponentType<{ className?: string }>;
  containerClass: string;
  iconClass: string;
}> = {
  info: {
    icon: Info,
    containerClass: 'bg-info/5 border-info/20 text-info',
    iconClass: 'text-info',
  },
  tip: {
    icon: Lightbulb,
    containerClass: 'bg-warning/5 border-warning/20 text-warning',
    iconClass: 'text-warning',
  },
  warning: {
    icon: AlertCircle,
    containerClass: 'bg-destructive/5 border-destructive/20 text-destructive',
    iconClass: 'text-destructive',
  },
  success: {
    icon: CheckCircle,
    containerClass: 'bg-success/5 border-success/20 text-success',
    iconClass: 'text-success',
  },
};

// ============================================
// UI HINT (Block)
// Full-width contextual hint block
// ============================================

export function UIHint({
  children,
  className,
  variant = 'info',
  dismissible = true,
  onDismiss,
  icon,
}: UIHintProps) {
  const [dismissed, setDismissed] = React.useState(false);
  const config = variantConfig[variant];
  const Icon = config.icon;

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 rounded-lg border p-3 text-sm animate-fade-in',
        config.containerClass,
        className
      )}
      role="note"
    >
      <div className={cn('flex-shrink-0 mt-0.5', config.iconClass)}>
        {icon || <Icon className="h-4 w-4" />}
      </div>
      <div className="flex-1 text-foreground/80">{children}</div>
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-0.5 rounded hover:bg-foreground/10 transition-colors"
          aria-label="Dismiss hint"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

// ============================================
// INLINE HINT
// Small inline helper text
// ============================================

export function InlineHint({ children, className }: InlineHintProps) {
  return (
    <p className={cn('text-xs text-muted-foreground flex items-center gap-1', className)}>
      <Info className="h-3 w-3 flex-shrink-0" />
      <span>{children}</span>
    </p>
  );
}

// ============================================
// TOOLTIP HINT
// Hover tooltip with helpful info
// ============================================

export function TooltipHint({ content, children, side = 'top' }: TooltipHintProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center cursor-help">
          {children}
          <HelpCircle className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
        </span>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================
// FIELD HINT
// Helper text below form fields
// ============================================

export function FieldHint({ children, className }: FieldHintProps) {
  return (
    <p className={cn('text-xs text-muted-foreground mt-1.5', className)}>
      {children}
    </p>
  );
}

// ============================================
// CONTEXTUAL HINT CARD
// Floating hint with action button
// ============================================

export function ContextualHint({
  title,
  description,
  action,
  onDismiss,
  className,
}: ContextualHintProps) {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={cn(
        'relative rounded-lg border bg-card p-4 shadow-sm animate-slide-up',
        className
      )}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded hover:bg-muted transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      
      <div className="flex gap-3">
        <div className="flex-shrink-0 p-2 rounded-full bg-primary/10">
          <Lightbulb className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0 pr-4">
          {title && (
            <h4 className="text-sm font-medium mb-1">{title}</h4>
          )}
          <p className="text-sm text-muted-foreground">{description}</p>
          {action && (
            <Button
              variant="link"
              size="sm"
              onClick={action.onClick}
              className="px-0 h-auto mt-2"
            >
              {action.label} →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// EMPTY STATE HINT
// Guidance for empty states
// ============================================

interface EmptyStateHintProps {
  title: string;
  description: string;
  suggestion?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyStateHint({
  title,
  description,
  suggestion,
  action,
  className,
}: EmptyStateHintProps) {
  return (
    <div className={cn('text-center py-8 px-4', className)}>
      <div className="inline-flex p-3 rounded-full bg-muted/50 mb-4">
        <Lightbulb className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-2">
        {description}
      </p>
      {suggestion && (
        <p className="text-xs text-muted-foreground/70 italic mb-4">
          💡 {suggestion}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ============================================
// FIRST-TIME HINT
// Onboarding hints for first-time actions
// ============================================

interface FirstTimeHintProps {
  storageKey: string;
  children: React.ReactNode;
  className?: string;
}

export function FirstTimeHint({ storageKey, children, className }: FirstTimeHintProps) {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const dismissed = localStorage.getItem(`hint_dismissed_${storageKey}`);
    setShow(!dismissed);
  }, [storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(`hint_dismissed_${storageKey}`, 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <UIHint
      variant="tip"
      onDismiss={handleDismiss}
      className={className}
    >
      {children}
    </UIHint>
  );
}

// ============================================
// FORM VALIDATION HINT
// Contextual validation feedback
// ============================================

interface ValidationHintProps {
  type: 'error' | 'warning' | 'success';
  message: string;
  className?: string;
}

export function ValidationHint({ type, message, className }: ValidationHintProps) {
  const config = {
    error: { icon: AlertCircle, class: 'text-destructive' },
    warning: { icon: AlertCircle, class: 'text-warning' },
    success: { icon: CheckCircle, class: 'text-success' },
  };

  const { icon: Icon, class: colorClass } = config[type];

  return (
    <div className={cn('flex items-center gap-1.5 mt-1.5', colorClass, className)}>
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="text-xs">{message}</span>
    </div>
  );
}
