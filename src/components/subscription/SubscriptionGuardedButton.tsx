import { ReactNode } from 'react';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { Button, ButtonProps } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SubscriptionGuardedButtonProps extends ButtonProps {
  children: ReactNode;
  actionDescription?: string;
  showLockIcon?: boolean;
}

export const SubscriptionGuardedButton = ({
  children,
  actionDescription = 'perform this action',
  showLockIcon = true,
  onClick,
  disabled,
  ...props
}: SubscriptionGuardedButtonProps) => {
  const { isLocked, checkAccess } = useSubscriptionGuard();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isLocked) {
      e.preventDefault();
      checkAccess(actionDescription);
      return;
    }
    onClick?.(e);
  };

  if (isLocked) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            {...props}
            disabled={disabled}
            onClick={handleClick}
            className={`${props.className || ''} opacity-75`}
          >
            {showLockIcon && <Lock className="h-4 w-4 mr-2" />}
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Trial expired - Upgrade to unlock</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button {...props} onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  );
};
