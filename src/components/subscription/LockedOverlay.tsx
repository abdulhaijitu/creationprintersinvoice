import { Lock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface LockedOverlayProps {
  message?: string;
}

export const LockedOverlay = ({ message = 'This feature is locked' }: LockedOverlayProps) => {
  const navigate = useNavigate();

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="text-center p-6 max-w-sm">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Trial Expired</h3>
        <p className="text-muted-foreground mb-4">
          {message}. Upgrade your plan to unlock all features.
        </p>
        <Button onClick={() => navigate('/pricing')}>
          <Zap className="h-4 w-4 mr-2" />
          Upgrade Now
        </Button>
      </div>
    </div>
  );
};
