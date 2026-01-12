import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TimeInput } from './TimeInput';
import { useAttendanceCorrectionRequests } from '@/hooks/useAttendanceCorrectionRequests';
import { format } from 'date-fns';
import { AlertTriangle, Clock, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AttendanceRecord {
  id?: string;
  employee_id: string;
  employee_name: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string | null;
}

interface RequestCorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendance: AttendanceRecord;
}

export const RequestCorrectionDialog: React.FC<RequestCorrectionDialogProps> = ({
  open,
  onOpenChange,
  attendance,
}) => {
  const { createRequest } = useAttendanceCorrectionRequests();
  
  const [requestedCheckIn, setRequestedCheckIn] = useState(attendance.check_in || '');
  const [requestedCheckOut, setRequestedCheckOut] = useState(attendance.check_out || '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!reason.trim()) {
      setError('Please provide a reason for the correction request');
      return;
    }

    if (!requestedCheckIn && !requestedCheckOut) {
      setError('Please provide at least one corrected time');
      return;
    }

    try {
      await createRequest.mutateAsync({
        employee_id: attendance.employee_id,
        attendance_id: attendance.id,
        attendance_date: attendance.date,
        original_check_in: attendance.check_in,
        original_check_out: attendance.check_out,
        original_status: attendance.status,
        requested_check_in: requestedCheckIn || null,
        requested_check_out: requestedCheckOut || null,
        reason: reason.trim(),
      });

      onOpenChange(false);
      resetForm();
    } catch (err) {
      setError('Failed to submit correction request');
    }
  };

  const resetForm = () => {
    setRequestedCheckIn(attendance.check_in || '');
    setRequestedCheckOut(attendance.check_out || '');
    setReason('');
    setError('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Request Attendance Correction
          </DialogTitle>
          <DialogDescription>
            Submit a correction request for review by your administrator.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Employee and Date Info */}
            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Employee:</span>
                <span>{attendance.employee_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(attendance.date), 'PPP')}</span>
              </div>
            </div>

            {/* Original Times */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                Original Times
              </Label>
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
                <div>
                  <span className="text-xs text-muted-foreground">Check-in</span>
                  <p className="font-medium">{attendance.check_in || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Check-out</span>
                  <p className="font-medium">{attendance.check_out || '—'}</p>
                </div>
              </div>
            </div>

            {/* Requested Correction */}
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wide">
                Corrected Times
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Check-in</Label>
                  <TimeInput
                    value={requestedCheckIn}
                    onChange={setRequestedCheckIn}
                    placeholder="HH:MM"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Check-out</Label>
                  <TimeInput
                    value={requestedCheckOut}
                    onChange={setRequestedCheckOut}
                    placeholder="HH:MM"
                  />
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label htmlFor="reason">
                Reason for Correction <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please explain why you need this correction..."
                rows={3}
                className="resize-none"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createRequest.isPending}
            >
              {createRequest.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
