import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import { Plus, Calendar, Check, X } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { bn } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";
import { createNotification } from "@/hooks/useNotifications";

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
  casual: "ক্যাজুয়াল",
  sick: "অসুস্থতা",
  annual: "বার্ষিক",
  other: "অন্যান্য",
};

const Leave = () => {
  const { isAdmin, user } = useAuth();
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
    fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch leave requests
      let query = supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isAdmin) {
        query = query.eq("user_id", user?.id);
      }

      const { data: requestsData } = await query;

      if (requestsData) {
        // Fetch profile names
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

      // Fetch leave balance for current user
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
          // Create default balance if not exists
          const { data: newBalance } = await supabase
            .from("leave_balances")
            .insert({
              user_id: user.id,
              year: currentYear,
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
      toast.error("তারিখ দিন");
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
      });

      if (error) throw error;

      // Notify admins about new leave request
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins) {
        for (const admin of admins) {
          await createNotification(
            admin.user_id,
            "নতুন ছুটির আবেদন",
            `${leaveTypeLabels[formData.leave_type]} ছুটির জন্য নতুন আবেদন এসেছে`,
            "leave_request"
          );
        }
      }

      toast.success("ছুটির আবেদন জমা হয়েছে");
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error submitting leave request:", error);
      toast.error("আবেদন জমা ব্যর্থ হয়েছে");
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

      // Update leave request
      const { error: requestError } = await supabase
        .from("leave_requests")
        .update({
          status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (requestError) throw requestError;

      // Update leave balance
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

      // Notify the user
      await createNotification(
        userId,
        "ছুটি অনুমোদিত",
        `আপনার ${leaveTypeLabels[leaveType]} ছুটি অনুমোদিত হয়েছে (${days} দিন)`,
        "leave_approved",
        id,
        "leave_request"
      );

      toast.success("ছুটি অনুমোদিত হয়েছে");
      fetchData();
    } catch (error) {
      console.error("Error approving leave:", error);
      toast.error("অনুমোদন ব্যর্থ হয়েছে");
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

      // Notify the user
      await createNotification(
        userId,
        "ছুটি প্রত্যাখ্যাত",
        `আপনার ${leaveTypeLabels[leaveType]} ছুটির আবেদন প্রত্যাখ্যাত হয়েছে`,
        "leave_rejected",
        id,
        "leave_request"
      );

      toast.success("ছুটি প্রত্যাখ্যাত হয়েছে");
      fetchData();
    } catch (error) {
      console.error("Error rejecting leave:", error);
      toast.error("প্রত্যাখ্যান ব্যর্থ হয়েছে");
    }
  };

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success">অনুমোদিত</Badge>;
      case "rejected":
        return <Badge variant="destructive">প্রত্যাখ্যাত</Badge>;
      default:
        return <Badge variant="secondary">অপেক্ষমাণ</Badge>;
    }
  };

  const getDays = (start: string, end: string) => {
    return differenceInDays(new Date(end), new Date(start)) + 1;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">ছুটি</h1>
          <p className="text-muted-foreground">ছুটির আবেদন ও ব্যালেন্স</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              ছুটির আবেদন
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ছুটির আবেদন করুন</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>ছুটির ধরন</Label>
                <Select
                  value={formData.leave_type}
                  onValueChange={(v) => setFormData({ ...formData, leave_type: v as LeaveType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">ক্যাজুয়াল</SelectItem>
                    <SelectItem value="sick">অসুস্থতা</SelectItem>
                    <SelectItem value="annual">বার্ষিক</SelectItem>
                    <SelectItem value="other">অন্যান্য</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>শুরু তারিখ</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>শেষ তারিখ</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>কারণ</Label>
                <Textarea
                  placeholder="ছুটির কারণ লিখুন"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  বাতিল
                </Button>
                <Button type="submit">জমা দিন</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leave Balance Cards */}
      {leaveBalance && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                ক্যাজুয়াল ছুটি
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
                ব্যবহৃত: {leaveBalance.casual_used}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                অসুস্থতা ছুটি
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
                ব্যবহৃত: {leaveBalance.sick_used}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                বার্ষিক ছুটি
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
                ব্যবহৃত: {leaveBalance.annual_used}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leave Requests Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && <TableHead>কর্মচারী</TableHead>}
              <TableHead>ধরন</TableHead>
              <TableHead>তারিখ</TableHead>
              <TableHead>দিন</TableHead>
              <TableHead>কারণ</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              {isAdmin && <TableHead className="text-center">অ্যাকশন</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 5} className="text-center py-8">
                  লোড হচ্ছে...
                </TableCell>
              </TableRow>
            ) : leaveRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 5} className="text-center py-8 text-muted-foreground">
                  কোনো আবেদন নেই
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
                      {format(new Date(request.start_date), "dd MMM", { locale: bn })}
                      {request.start_date !== request.end_date && (
                        <> - {format(new Date(request.end_date), "dd MMM", { locale: bn })}</>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getDays(request.start_date, request.end_date)} দিন</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {request.reason || "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-center">
                      {request.status === "pending" && (
                        <div className="flex items-center justify-center gap-2">
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
                        </div>
                      )}
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
