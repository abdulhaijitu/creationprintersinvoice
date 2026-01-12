import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  useAttendanceCorrectionRequests,
  CorrectionRequest,
} from '@/hooks/useAttendanceCorrectionRequests';
import { format } from 'date-fns';
import { Check, X, Clock, ArrowRight, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface CorrectionRequestsTableProps {
  filter?: 'pending' | 'approved' | 'rejected' | 'all';
}

export const CorrectionRequestsTable: React.FC<CorrectionRequestsTableProps> = ({
  filter = 'all',
}) => {
  const { correctionRequests, isLoading, approveRequest, rejectRequest } =
    useAttendanceCorrectionRequests();
  
  const [selectedRequest, setSelectedRequest] = useState<CorrectionRequest | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'view' | null>(null);

  const filteredRequests = correctionRequests.filter((request) => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    await approveRequest.mutateAsync({
      requestId: selectedRequest.id,
      reviewNote: reviewNote || undefined,
    });
    
    closeDialog();
  };

  const handleReject = async () => {
    if (!selectedRequest || !reviewNote.trim()) return;
    
    await rejectRequest.mutateAsync({
      requestId: selectedRequest.id,
      reviewNote: reviewNote.trim(),
    });
    
    closeDialog();
  };

  const closeDialog = () => {
    setSelectedRequest(null);
    setReviewNote('');
    setActionType(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (filteredRequests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No correction requests found</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Original Time</TableHead>
              <TableHead>Requested Time</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">
                  {request.employee?.full_name || 'Unknown'}
                </TableCell>
                <TableCell>
                  {format(new Date(request.attendance_date), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <span>{request.original_check_in || '—'}</span>
                    <span className="text-muted-foreground mx-1">-</span>
                    <span>{request.original_check_out || '—'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-primary font-medium">
                      {request.requested_check_in || '—'}
                    </span>
                    <span className="text-muted-foreground">-</span>
                    <span className="text-primary font-medium">
                      {request.requested_check_out || '—'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm line-clamp-2 max-w-[200px]">
                    {request.reason}
                  </span>
                </TableCell>
                <TableCell>{getStatusBadge(request.status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(request.created_at), 'MMM d, h:mm a')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedRequest(request);
                        setActionType('view');
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {request.status === 'pending' && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => {
                            setSelectedRequest(request);
                            setActionType('approve');
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setSelectedRequest(request);
                            setActionType('reject');
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={() => closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'view' && 'Correction Request Details'}
              {actionType === 'approve' && 'Approve Correction Request'}
              {actionType === 'reject' && 'Reject Correction Request'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' && 'This will update the attendance record.'}
              {actionType === 'reject' && 'Please provide a reason for rejection.'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Employee</span>
                  <p className="font-medium">{selectedRequest.employee?.full_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium">
                    {format(new Date(selectedRequest.attendance_date), 'PPP')}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground uppercase">Original</span>
                    <p className="font-medium">
                      {selectedRequest.original_check_in || '—'} - {selectedRequest.original_check_out || '—'}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground uppercase">Requested</span>
                    <p className="font-medium text-primary">
                      {selectedRequest.requested_check_in || '—'} - {selectedRequest.requested_check_out || '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Reason</span>
                <p className="mt-1 text-sm bg-muted/30 rounded-lg p-2">
                  {selectedRequest.reason}
                </p>
              </div>

              {selectedRequest.status !== 'pending' && selectedRequest.review_note && (
                <div>
                  <span className="text-sm text-muted-foreground">Review Note</span>
                  <p className="mt-1 text-sm bg-muted/30 rounded-lg p-2">
                    {selectedRequest.review_note}
                  </p>
                </div>
              )}

              {(actionType === 'approve' || actionType === 'reject') && (
                <div className="space-y-1.5">
                  <Label htmlFor="review-note">
                    {actionType === 'reject' ? (
                      <>Rejection Reason <span className="text-destructive">*</span></>
                    ) : (
                      'Note (optional)'
                    )}
                  </Label>
                  <Textarea
                    id="review-note"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder={
                      actionType === 'reject'
                        ? 'Please explain why this request is being rejected...'
                        : 'Add a note...'
                    }
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {actionType === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {actionType === 'approve' && (
              <Button
                onClick={handleApprove}
                disabled={approveRequest.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {approveRequest.isPending ? 'Approving...' : 'Approve & Update'}
              </Button>
            )}
            {actionType === 'reject' && (
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejectRequest.isPending || !reviewNote.trim()}
              >
                {rejectRequest.isPending ? 'Rejecting...' : 'Reject'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
