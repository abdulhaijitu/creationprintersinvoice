import { useOwnershipTransfer } from '@/hooks/useOwnershipTransfer';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { History, Crown, ArrowRight, UserCheck, XCircle, Shield, Clock } from 'lucide-react';
import { format } from 'date-fns';

const getActionInfo = (actionType: string) => {
  switch (actionType) {
    case 'initial_assignment':
      return { label: 'Initial Owner', icon: Crown, variant: 'default' as const };
    case 'transfer_requested':
      return { label: 'Transfer Requested', icon: Clock, variant: 'secondary' as const };
    case 'transfer_approved':
      return { label: 'Transfer Approved', icon: UserCheck, variant: 'default' as const };
    case 'transfer_rejected':
      return { label: 'Transfer Rejected', icon: XCircle, variant: 'destructive' as const };
    case 'super_admin_reassignment':
      return { label: 'Admin Reassignment', icon: Shield, variant: 'outline' as const };
    default:
      return { label: actionType, icon: History, variant: 'outline' as const };
  }
};

export const OwnershipHistory = () => {
  const { isOrgOwner } = useOrganization();
  const { ownershipHistory, loadingHistory } = useOwnershipTransfer();

  if (!isOrgOwner) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Ownership History
        </CardTitle>
        <CardDescription>
          Complete timeline of ownership changes for this organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loadingHistory ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : ownershipHistory && ownershipHistory.length > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            
            <div className="space-y-6">
              {ownershipHistory.map((entry, index) => {
                const actionInfo = getActionInfo(entry.action_type);
                const Icon = actionInfo.icon;
                
                return (
                  <div key={entry.id} className="relative flex items-start gap-4 pl-8">
                    {/* Timeline dot */}
                    <div className="absolute left-0 flex items-center justify-center w-8 h-8 rounded-full bg-background border-2 border-border">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={actionInfo.variant}>{actionInfo.label}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm')}
                        </span>
                      </div>
                      
                      <div className="mt-2 text-sm text-muted-foreground">
                        {entry.action_type === 'initial_assignment' && (
                          <span>Organization created with owner assigned</span>
                        )}
                        {entry.action_type === 'transfer_requested' && (
                          <span className="flex items-center gap-1">
                            Owner requested transfer
                            {entry.new_owner_id && (
                              <>
                                <ArrowRight className="h-3 w-3" />
                                to new owner
                              </>
                            )}
                          </span>
                        )}
                        {entry.action_type === 'transfer_approved' && (
                          <span>Transfer request approved by administrator</span>
                        )}
                        {entry.action_type === 'transfer_rejected' && (
                          <span>Transfer request rejected by administrator</span>
                        )}
                        {entry.action_type === 'super_admin_reassignment' && (
                          <span>Ownership reassigned by platform administrator</span>
                        )}
                      </div>
                      
                      {entry.note && (
                        <p className="mt-1 text-sm italic text-muted-foreground">
                          "{entry.note}"
                        </p>
                      )}
                      
                      <div className="mt-1 text-xs text-muted-foreground">
                        by {entry.actor_type === 'super_admin' ? 'Platform Admin' : 'Owner'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No ownership changes recorded</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
