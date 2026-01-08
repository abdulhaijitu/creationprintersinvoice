import { useState } from 'react';
import { useOwnershipTransfer } from '@/hooks/useOwnershipTransfer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Crown, Check, X, Building2, User, ArrowRight, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface TransferRequest {
  id: string;
  organization_id: string;
  requester_id: string;
  target_user_id: string;
  note: string | null;
  status: string;
  created_at: string;
  organizations?: { id: string; name: string; slug: string };
  requester_name?: string;
  requester_email?: string;
  target_name?: string;
  target_email?: string;
}

export const OwnershipTransferRequestsPanel = () => {
  const { allPendingRequests, loadingAllRequests, refetchPendingRequests, reviewTransfer } = useOwnershipTransfer();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TransferRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = (request: TransferRequest) => {
    reviewTransfer.mutate({ requestId: request.id, decision: 'approved' });
  };

  const handleRejectClick = (request: TransferRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (selectedRequest) {
      reviewTransfer.mutate(
        { requestId: selectedRequest.id, decision: 'rejected', rejectionReason },
        { onSuccess: () => {
          setRejectDialogOpen(false);
          setSelectedRequest(null);
        }}
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Ownership Transfer Requests
            </CardTitle>
            <CardDescription>
              Review and approve ownership transfer requests from organization owners
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchPendingRequests()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loadingAllRequests ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
        ) : allPendingRequests && allPendingRequests.length > 0 ? (
          <div className="space-y-4">
            {allPendingRequests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{request.organizations?.name || 'Unknown Organization'}</span>
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Submitted {format(new Date(request.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{request.requester_name}</p>
                      <p className="text-xs text-muted-foreground">{request.requester_email}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">{request.target_name}</p>
                      <p className="text-xs text-muted-foreground">{request.target_email}</p>
                    </div>
                  </div>
                </div>

                {request.note && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Note: </span>
                    <span className="italic">"{request.note}"</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request)}
                    disabled={reviewTransfer.isPending}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRejectClick(request)}
                    disabled={reviewTransfer.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Crown className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No pending transfer requests</p>
          </div>
        )}
      </CardContent>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Reject Transfer Request
            </DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this ownership transfer request.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Organization: </span>
                <span className="font-medium">{selectedRequest.organizations?.name}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Rejection Reason</Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this request is being rejected..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={reviewTransfer.isPending}
            >
              {reviewTransfer.isPending ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
