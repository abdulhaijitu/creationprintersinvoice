import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useApprovalRequests, type ApprovalRequest } from '@/hooks/useApprovalRequests';
import { useOrganization } from '@/contexts/OrganizationContext';
import { CheckCircle2, XCircle, Clock, FileText, Wallet, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const typeConfig: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  expense: { icon: Wallet, label: 'Expense', color: 'bg-warning/10 text-warning' },
  quotation: { icon: FileText, label: 'Quotation', color: 'bg-info/10 text-info' },
  leave: { icon: CalendarDays, label: 'Leave', color: 'bg-success/10 text-success' },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: 'bg-warning/10 text-warning border-warning/20', label: 'Pending' },
  approved: { color: 'bg-success/10 text-success border-success/20', label: 'Approved' },
  rejected: { color: 'bg-destructive/10 text-destructive border-destructive/20', label: 'Rejected' },
};

interface ApprovalsPanelProps {
  compact?: boolean;
}

export function ApprovalsPanel({ compact = false }: ApprovalsPanelProps) {
  const { isOrgOwner } = useOrganization();
  const { requests, isLoading, pendingCount, approveRequest, rejectRequest } = useApprovalRequests();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleReject = async () => {
    if (!rejectingId) return;
    await rejectRequest(rejectingId, rejectReason);
    setRejectDialogOpen(false);
    setRejectingId(null);
    setRejectReason('');
  };

  const displayRequests = compact ? requests.filter(r => r.status === 'pending').slice(0, 5) : requests;

  if (compact && pendingCount === 0) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {compact ? 'Pending Approvals' : 'Approval Requests'}
              {pendingCount > 0 && (
                <Badge variant="destructive" className="text-xs h-5 px-1.5">
                  {pendingCount}
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : displayRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {compact ? 'No pending approvals' : 'No approval requests'}
            </p>
          ) : (
            <div className="space-y-2">
              {displayRequests.map((req) => {
                const type = typeConfig[req.request_type] || typeConfig.expense;
                const status = statusConfig[req.status] || statusConfig.pending;
                const Icon = type.icon;

                return (
                  <div key={req.id} className="flex items-center justify-between gap-3 p-3 rounded-md border bg-muted/20">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn('p-1.5 rounded', type.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {req.entity_name || `${type.label} #${req.entity_id.slice(0, 8)}`}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{req.requested_by_name || 'Unknown'}</span>
                          <span>·</span>
                          <span>{format(new Date(req.created_at), 'MMM d')}</span>
                          {req.amount != null && (
                            <>
                              <span>·</span>
                              <span className="font-medium">৳{req.amount.toLocaleString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {req.status === 'pending' && isOrgOwner ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success hover:text-success"
                            onClick={() => approveRequest(req.id)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setRejectingId(req.id);
                              setRejectDialogOpen(true);
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Badge variant="outline" className={cn('text-xs', status.color)}>
                          {status.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
