import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgScopedQuery } from "@/hooks/useOrgScopedQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, Check, X, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";
import { createNotification } from "@/hooks/useNotifications";
import { EmptyState } from "@/components/shared/EmptyState";

type LeaveType = Database["public"]["Enums"]["leave_type"];
type LeaveStatus = Database["public"]["Enums"]["leave_status"];

interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: LeaveStatus;
  rejection_reason: string | null;
  created_at: string;
  profile?: { full_name: string } | null;
}

interface LeaveBalance {
  casual_total: number;
  casual_used: number;
  sick_total: number;
  sick_used: number;
  annual_total: number;
  annual_used: number;
}

const leaveTypeLabels: Record<LeaveType, string> = {
  casual: "Casual",
  sick: "Sick",
  annual: "Annual",
  other: "Other",
};

const Leave = () => {
  const { isAdmin, user } = useAuth();
  const { organizationId, hasOrgContext } = useOrgScopedQuery();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    leave_type: "casual" as LeaveType,
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: format(new Date(), "yyyy-MM-dd"),
    reason: "",
  });

  useEffect(() => {
    if (hasOrgContext && organizationId) {
      fetchData();
    }
  }, [isAdmin, organizationId, hasOrgContext]);

  const fetchData = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from("leave_requests")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (!isAdmin) {
        query = query.eq("user_id", user?.id);
      }

      const { data: requestsData } = await query;

      if (requestsData) {
        const requestsWithProfiles = await Promise.all(
          requestsData.map(async (request) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", request.user_id)
              .single();

            return { ...request, profile };
          })
        );
        setLeaveRequests(requestsWithProfiles);
      }

      if (user?.id) {
        const currentYear = new Date().getFullYear();
        const { data: balanceData } = await supabase
          .from("leave_balances")
          .select("*")
          .eq("user_id", user.id)
          .eq("year", currentYear)
          .single();

        if (balanceData) {
          setLeaveBalance(balanceData);
        } else {
          const { data: newBalance } = await supabase
            .from("leave_balances")
            .insert({
              user_id: user.id,
              year: currentYear,
              organization_id: organizationId,
            })
            .select()
            .single();

          if (newBalance) {
            setLeaveBalance(newBalance);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching leave data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.start_date || !formData.end_date) {
      toast.error("Please enter dates");
      return;
    }

    try {
      const { error } = await supabase.from("leave_requests").insert({
        user_id: user?.id,
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason || null,
        status: "pending",
        organization_id: organizationId,
      });

      if (error) throw error;

      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins) {
        for (const admin of admins) {
          await createNotification(
            admin.user_id,
            "New Leave Request",
            `New ${leaveTypeLabels[formData.leave_type]} leave request received`,
            "leave_request"
          );
        }
      }

      toast.success("Leave request submitted");
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error submitting leave request:", error);
      toast.error("Failed to submit request");
    }
  };

  const resetForm = () => {
    setFormData({
      leave_type: "casual",
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: format(new Date(), "yyyy-MM-dd"),
      reason: "",
    });
  };

  const handleApprove = async (id: string, userId: string, leaveType: LeaveType, startDate: string, endDate: string) => {
    try {
      const days = differenceInDays(new Date(endDate), new Date(startDate)) + 1;

      const { error: requestError } = await supabase
        .from("leave_requests")
        .update({
          status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (requestError) throw requestError;

      const currentYear = new Date().getFullYear();
      const { data: balance } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("user_id", userId)
        .eq("year", currentYear)
        .single();

      if (balance) {
        const updateData: Record<string, number> = {};
        if (leaveType === "casual") {
          updateData.casual_used = (balance.casual_used || 0) + days;
        } else if (leaveType === "sick") {
          updateData.sick_used = (balance.sick_used || 0) + days;
        } else if (leaveType === "annual") {
          updateData.annual_used = (balance.annual_used || 0) + days;
        }

        await supabase
          .from("leave_balances")
          .update(updateData)
          .eq("id", balance.id);
      }

      await createNotification(
        userId,
        "Leave Approved",
        `Your ${leaveTypeLabels[leaveType]} leave has been approved (${days} days)`,
        "leave_approved",
        id,
        "leave_request"
      );

      toast.success("Leave approved");
      fetchData();
    } catch (error) {
      console.error("Error approving leave:", error);
      toast.error("Failed to approve");
    }
  };

  const handleReject = async (id: string, userId: string, leaveType: LeaveType) => {
    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: "rejected",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      await createNotification(
        userId,
        "Leave Rejected",
        `Your ${leaveTypeLabels[leaveType]} leave request has been rejected`,
        "leave_rejected",
        id,
        "leave_request"
      );

      toast.success("Leave rejected");
      fetchData();
    } catch (error) {
      console.error("Error rejecting leave:", error);
      toast.error("Failed to reject");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this leave request?')) return;
    
    try {
      const { error } = await supabase.from('leave_requests').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('Leave request deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting leave request:', error);
      toast.error('Failed to delete leave request');
    }
  };

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getDays = (start: string, end: string) => {
    return differenceInDays(new Date(end), new Date(start)) + 1;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Leave</h1>
          <p className="text-muted-foreground">Leave requests and balance</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Request Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Leave Request</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select
                  value={formData.leave_type}
                  onValueChange={(v) => setFormData({ ...formData, leave_type: v as LeaveType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  placeholder="Reason for leave"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Submit</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {leaveBalance && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Casual Leave
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {leaveBalance.casual_total - leaveBalance.casual_used}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  / {leaveBalance.casual_total}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Used: {leaveBalance.casual_used}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sick Leave
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {leaveBalance.sick_total - leaveBalance.sick_used}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  / {leaveBalance.sick_total}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Used: {leaveBalance.sick_used}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Annual Leave
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {leaveBalance.annual_total - leaveBalance.annual_used}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  / {leaveBalance.annual_total}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Used: {leaveBalance.annual_used}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && <TableHead>Employee</TableHead>}
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="text-center">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 5} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : leaveRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 5} className="py-0">
                  <EmptyState
                    icon={Calendar}
                    title="No leave requests"
                    description="No leave requests have been submitted yet"
                    action={{
                      label: "Request Leave",
                      onClick: () => setIsDialogOpen(true),
                      icon: Plus,
                    }}
                  />
                </TableCell>
              </TableRow>
            ) : (
              leaveRequests.map((request) => (
                <TableRow key={request.id}>
                  {isAdmin && (
                    <TableCell className="font-medium">{request.profile?.full_name || "-"}</TableCell>
                  )}
                  <TableCell>
                    <Badge variant="outline">{leaveTypeLabels[request.leave_type]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {format(new Date(request.start_date), "dd MMM")}
                      {request.start_date !== request.end_date && (
                        <> - {format(new Date(request.end_date), "dd MMM")}</>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getDays(request.start_date, request.end_date)} days</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {request.reason || "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {request.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-success hover:text-success"
                              onClick={() =>
                                handleApprove(
                                  request.id,
                                  request.user_id,
                                  request.leave_type,
                                  request.start_date,
                                  request.end_date
                                )
                              }
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleReject(request.id, request.user_id, request.leave_type)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(request.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Leave;
