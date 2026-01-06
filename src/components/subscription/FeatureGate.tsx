import { ReactNode } from 'react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { PlanFeature } from '@/lib/planFeatures';
import { OrgModule, OrgAction } from '@/lib/orgPermissions';
import { Lock, Zap, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface FeatureGateProps {
  children: ReactNode;
  /** Plan feature required (e.g., 'analytics', 'reports') */
  feature?: PlanFeature;
  /** Organization module for permission check */
  module?: OrgModule;
  /** Action type for permission check */
  action?: OrgAction;
  /** Render nothing instead of blocked message */
  hideWhenBlocked?: boolean;
  /** Show inline message instead of overlay */
  inline?: boolean;
  /** Custom blocked message */
  blockedMessage?: string;
  /** Custom className for wrapper */
  className?: string;
  /** Fallback component when blocked */
  fallback?: ReactNode;
}

export const FeatureGate = ({
  children,
  feature,
  module,
  action = 'view',
  hideWhenBlocked = false,
  inline = false,
  blockedMessage,
  className,
  fallback,
}: FeatureGateProps) => {
  const navigate = useNavigate();
  const { checkAccess, isReadOnly } = useFeatureAccess();

  const result = checkAccess(feature ?? null, module ?? null, action);

  // If has access and not read-only (or action is view), render children
  if (result.hasAccess && (!isReadOnly || action === 'view')) {
    return <>{children}</>;
  }

  // Read-only mode blocks create/edit/delete
  if (isReadOnly && action !== 'view') {
    if (hideWhenBlocked) return null;
    if (fallback) return <>{fallback}</>;
    
    return (
      <BlockedContent
        inline={inline}
        className={className}
        icon={<Lock className="h-5 w-5" />}
        title="Read-only Mode"
        message={blockedMessage || "Your subscription has expired. Upgrade to make changes."}
        showUpgrade
        onUpgrade={() => navigate('/pricing')}
      />
    );
  }

  // Hide when blocked
  if (hideWhenBlocked) return null;

  // Custom fallback
  if (fallback) return <>{fallback}</>;

  // Show blocked by plan message
  if (result.blockedByPlan) {
    return (
      <BlockedContent
        inline={inline}
        className={className}
        icon={<Zap className="h-5 w-5" />}
        title="Upgrade Required"
        message={blockedMessage || result.message || "Upgrade your plan to access this feature."}
        showUpgrade
        requiredPlan={result.requiredPlan}
        onUpgrade={() => navigate('/pricing')}
      />
    );
  }

  // Show blocked by role message
  if (result.blockedByRole) {
    return (
      <BlockedContent
        inline={inline}
        className={className}
        icon={<ShieldAlert className="h-5 w-5" />}
        title="Access Restricted"
        message={blockedMessage || result.message || "You don't have permission for this action."}
        showUpgrade={false}
      />
    );
  }

  return <>{children}</>;
};

interface BlockedContentProps {
  inline: boolean;
  className?: string;
  icon: ReactNode;
  title: string;
  message: string;
  showUpgrade: boolean;
  requiredPlan?: string | null;
  onUpgrade?: () => void;
}

const BlockedContent = ({
  inline,
  className,
  icon,
  title,
  message,
  showUpgrade,
  requiredPlan,
  onUpgrade,
}: BlockedContentProps) => {
  if (inline) {
    return (
      <div className={cn(
        "flex items-center gap-2 text-muted-foreground text-sm py-2 px-3 bg-muted/50 rounded-md",
        className
      )}>
        {icon}
        <span>{message}</span>
        {showUpgrade && onUpgrade && (
          <Button variant="link" size="sm" className="h-auto p-0 ml-1" onClick={onUpgrade}>
            Upgrade
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 text-center bg-muted/30 rounded-lg border border-dashed",
      className
    )}>
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-4">{message}</p>
      {showUpgrade && onUpgrade && (
        <Button onClick={onUpgrade} size="sm">
          <Zap className="h-4 w-4 mr-2" />
          {requiredPlan ? `Upgrade to ${requiredPlan}` : 'Upgrade Now'}
        </Button>
      )}
    </div>
  );
};

// Higher-order component for wrapping entire pages
export const withFeatureGate = (
  WrappedComponent: React.ComponentType,
  feature?: PlanFeature,
  module?: OrgModule,
  action?: OrgAction
) => {
  return function GatedComponent(props: any) {
    return (
      <FeatureGate feature={feature} module={module} action={action}>
        <WrappedComponent {...props} />
      </FeatureGate>
    );
  };
};
