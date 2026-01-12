import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type AttendanceStatus = Database['public']['Enums']['attendance_status'];

export interface CorrectionRequest {
  id: string;
  organization_id: string;
  employee_id: string;
  attendance_id: string | null;
  attendance_date: string;
  original_check_in: string | null;
  original_check_out: string | null;
  original_status: string | null;
  requested_check_in: string | null;
  requested_check_out: string | null;
  reason: string;
  requested_by: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    full_name: string;
  };
}

export interface CreateCorrectionRequestInput {
  employee_id: string;
  attendance_id?: string;
  attendance_date: string;
  original_check_in?: string | null;
  original_check_out?: string | null;
  original_status?: string | null;
  requested_check_in?: string | null;
  requested_check_out?: string | null;
  reason: string;
}

export const useAttendanceCorrectionRequests = () => {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const { data: correctionRequests = [], isLoading } = useQuery({
    queryKey: ['attendance-correction-requests', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const { data, error } = await supabase
        .from('attendance_correction_requests')
        .select(`
          *,
          employee:employees(id, full_name)
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CorrectionRequest[];
    },
    enabled: !!orgId,
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['attendance-correction-requests-pending-count', orgId],
    queryFn: async () => {
      if (!orgId) return 0;
      
      const { count, error } = await supabase
        .from('attendance_correction_requests')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!orgId,
  });

  const createRequest = useMutation({
    mutationFn: async (input: CreateCorrectionRequestInput) => {
      if (!orgId || !user) throw new Error('Organization or user not found');

      const { data, error } = await supabase
        .from('attendance_correction_requests')
        .insert({
          organization_id: orgId,
          employee_id: input.employee_id,
          attendance_id: input.attendance_id || null,
          attendance_date: input.attendance_date,
          original_check_in: input.original_check_in,
          original_check_out: input.original_check_out,
          original_status: input.original_status,
          requested_check_in: input.requested_check_in,
          requested_check_out: input.requested_check_out,
          reason: input.reason,
          requested_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit
      await logAuditAction('correction_requested', input.employee_id, null, {
        attendance_date: input.attendance_date,
        reason: input.reason,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-correction-requests'] });
      toast.success('Correction request submitted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit correction request: ${error.message}`);
    },
  });

  const approveRequest = useMutation({
    mutationFn: async ({ requestId, reviewNote }: { requestId: string; reviewNote?: string }) => {
      if (!user) throw new Error('User not found');

      // Get the request first
      const { data: request, error: fetchError } = await supabase
        .from('attendance_correction_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      // Update the request status
      const { error: updateError } = await supabase
        .from('attendance_correction_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_note: reviewNote || null,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Update the attendance record
      const newStatus = calculateNewStatus(request.requested_check_in);
      
      if (request.attendance_id) {
        const { error: attendanceError } = await supabase
          .from('employee_attendance')
          .update({
            check_in: request.requested_check_in,
            check_out: request.requested_check_out,
            status: newStatus,
          })
          .eq('id', request.attendance_id);

        if (attendanceError) throw attendanceError;
      } else {
        // Create new attendance record
        const { error: createError } = await supabase
          .from('employee_attendance')
          .insert([{
            organization_id: request.organization_id,
            employee_id: request.employee_id,
            date: request.attendance_date,
            check_in: request.requested_check_in,
            check_out: request.requested_check_out,
            status: newStatus,
          }]);

        if (createError) throw createError;
      }

      // Log audit
      await logAuditAction('correction_approved', request.employee_id, requestId, {
        before: {
          check_in: request.original_check_in,
          check_out: request.original_check_out,
        },
        after: {
          check_in: request.requested_check_in,
          check_out: request.requested_check_out,
        },
      });

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-correction-requests'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['employee-attendance'] });
      toast.success('Correction request approved and attendance updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve correction: ${error.message}`);
    },
  });

  const rejectRequest = useMutation({
    mutationFn: async ({ requestId, reviewNote }: { requestId: string; reviewNote: string }) => {
      if (!user) throw new Error('User not found');

      const { data: request, error: fetchError } = await supabase
        .from('attendance_correction_requests')
        .select('employee_id')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('attendance_correction_requests')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_note: reviewNote,
        })
        .eq('id', requestId);

      if (error) throw error;

      // Log audit
      await logAuditAction('correction_rejected', request.employee_id, requestId, {
        rejection_reason: reviewNote,
      });

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-correction-requests'] });
      toast.success('Correction request rejected');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject correction: ${error.message}`);
    },
  });

  const logAuditAction = async (
    action: string,
    targetEmployeeId: string,
    correctionRequestId: string | null,
    metadata: Record<string, unknown>
  ) => {
    if (!orgId || !user) return;

    try {
      await supabase.from('attendance_audit_logs').insert([{
        organization_id: orgId,
        action,
        actor_id: user.id,
        actor_email: user.email,
        target_employee_id: targetEmployeeId,
        correction_request_id: correctionRequestId,
        metadata: metadata as any,
      }]);
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  };

  return {
    correctionRequests,
    pendingCount,
    isLoading,
    createRequest,
    approveRequest,
    rejectRequest,
  };
};

function calculateNewStatus(checkIn: string | null): AttendanceStatus {
  if (!checkIn) return 'absent';
  
  const [hours, minutes] = checkIn.split(':').map(Number);
  const checkInMinutes = hours * 60 + minutes;
  const thresholdMinutes = 9 * 60 + 15; // 9:15 AM

  if (checkInMinutes <= thresholdMinutes) {
    return 'present';
  }
  return 'late';
}
