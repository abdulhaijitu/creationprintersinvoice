import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft, User, Loader2 } from 'lucide-react';

const ImpersonationBanner = () => {
  const { isImpersonating, impersonationTarget, endImpersonation, isEnding } = useImpersonation();

  if (!isImpersonating || !impersonationTarget) {
    return null;
  }

  const isReadOnly = impersonationTarget.subscriptionStatus === 'suspended';

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 shadow-lg">
      <div className="container mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-amber-600/30 rounded-full px-3 py-1">
              <User className="h-4 w-4" />
              <span className="font-semibold text-sm">Impersonating</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="font-bold">{impersonationTarget.organizationName}</span>
              <span className="text-amber-800 text-sm">
                as Owner ({impersonationTarget.ownerEmail})
              </span>
            </div>
            {isReadOnly && (
              <div className="flex items-center gap-1 bg-amber-600/30 rounded px-2 py-0.5 text-xs font-medium">
                <AlertTriangle className="h-3 w-3" />
                Read-only (Suspended)
              </div>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={endImpersonation}
            disabled={isEnding}
            className="bg-card hover:bg-accent text-foreground shrink-0 font-medium shadow-sm"
          >
            {isEnding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Returning...
              </>
            ) : (
              <>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Super Admin
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
