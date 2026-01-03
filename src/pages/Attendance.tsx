import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, UserCheck, UserX, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";

type AttendanceStatus = Database["public"]["Enums"]["attendance_status"];

interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: AttendanceStatus;
  notes: string | null;
  profile?: { full_name: string } | null;
}

interface Employee {
  id: string;
  full_name: string;
}

const Attendance = () => {
  const { isAdmin, user } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, [selectedDate, selectedEmployee, isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch employees if admin
      if (isAdmin) {
        const { data: employeesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .order("full_name");
        setEmployees(employeesData || []);
      }

      // Fetch attendance
      let query = supabase
        .from("attendance")
        .select("*")
        .eq("date", selectedDate)
        .order("created_at", { ascending: false });

      if (!isAdmin) {
        query = query.eq("user_id", user?.id);
      } else if (selectedEmployee !== "all") {
        query = query.eq("user_id", selectedEmployee);
      }

      const { data: attendanceData } = await query;

      if (attendanceData) {
        // Fetch profile names
        const attendanceWithProfiles = await Promise.all(
          attendanceData.map(async (record) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", record.user_id)
              .single();

            return {
              ...record,
              profile,
            };
          })
        );
        setAttendance(attendanceWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      // Check if already checked in today
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("user_id", user?.id)
        .eq("date", format(new Date(), "yyyy-MM-dd"))
        .single();

      if (existing) {
        toast.error("আজ আপনি ইতোমধ্যে চেক-ইন করেছেন");
        return;
      }

      const { error } = await supabase.from("attendance").insert({
        user_id: user?.id,
        date: format(new Date(), "yyyy-MM-dd"),
        check_in: new Date().toISOString(),
        status: "present",
      });

      if (error) throw error;

      toast.success("চেক-ইন সফল হয়েছে");
      fetchData();
    } catch (error) {
      console.error("Error checking in:", error);
      toast.error("চেক-ইন ব্যর্থ হয়েছে");
    }
  };

  const handleCheckOut = async () => {
    try {
      const { data: todayRecord } = await supabase
        .from("attendance")
        .select("id, check_out")
        .eq("user_id", user?.id)
        .eq("date", format(new Date(), "yyyy-MM-dd"))
        .single();

      if (!todayRecord) {
        toast.error("প্রথমে চেক-ইন করুন");
        return;
      }

      if (todayRecord.check_out) {
        toast.error("আজ আপনি ইতোমধ্যে চেক-আউট করেছেন");
        return;
      }

      const { error } = await supabase
        .from("attendance")
        .update({ check_out: new Date().toISOString() })
        .eq("id", todayRecord.id);

      if (error) throw error;

      toast.success("চেক-আউট সফল হয়েছে");
      fetchData();
    } catch (error) {
      console.error("Error checking out:", error);
      toast.error("চেক-আউট ব্যর্থ হয়েছে");
    }
  };

  const updateStatus = async (id: string, status: AttendanceStatus) => {
    try {
      const { error } = await supabase
        .from("attendance")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      toast.success("স্ট্যাটাস আপডেট হয়েছে");
      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("স্ট্যাটাস আপডেট ব্যর্থ হয়েছে");
    }
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case "present":
        return <Badge className="bg-success">উপস্থিত</Badge>;
      case "absent":
        return <Badge variant="destructive">অনুপস্থিত</Badge>;
      case "late":
        return <Badge variant="secondary">দেরি</Badge>;
      case "half_day":
        return <Badge variant="outline">অর্ধদিন</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "hh:mm a", { locale: bn });
  };

  // Stats
  const presentCount = attendance.filter((a) => a.status === "present").length;
  const absentCount = attendance.filter((a) => a.status === "absent").length;
  const lateCount = attendance.filter((a) => a.status === "late").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">উপস্থিতি</h1>
          <p className="text-muted-foreground">দৈনিক উপস্থিতি ট্র্যাকিং</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCheckIn} variant="outline">
            <Clock className="mr-2 h-4 w-4" />
            চেক-ইন
          </Button>
          <Button onClick={handleCheckOut}>
            <Clock className="mr-2 h-4 w-4" />
            চেক-আউট
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                মোট
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{attendance.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-success flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                উপস্থিত
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{presentCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
                <UserX className="h-4 w-4" />
                অনুপস্থিত
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{absentCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                দেরি
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{lateCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-[180px]"
          />
        </div>
        {isAdmin && (
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="কর্মচারী বাছুন" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সবাই</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Attendance Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>তারিখ</TableHead>
              {isAdmin && <TableHead>কর্মচারী</TableHead>}
              <TableHead>চেক-ইন</TableHead>
              <TableHead>চেক-আউট</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              {isAdmin && <TableHead>অ্যাকশন</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 4} className="text-center py-8">
                  লোড হচ্ছে...
                </TableCell>
              </TableRow>
            ) : attendance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 4} className="text-center py-8 text-muted-foreground">
                  কোনো রেকর্ড পাওয়া যায়নি
                </TableCell>
              </TableRow>
            ) : (
              attendance.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    {format(new Date(record.date), "dd MMM yyyy", { locale: bn })}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="font-medium">
                      {record.profile?.full_name || "-"}
                    </TableCell>
                  )}
                  <TableCell>{formatTime(record.check_in)}</TableCell>
                  <TableCell>{formatTime(record.check_out)}</TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Select
                        value={record.status}
                        onValueChange={(value) => updateStatus(record.id, value as AttendanceStatus)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">উপস্থিত</SelectItem>
                          <SelectItem value="absent">অনুপস্থিত</SelectItem>
                          <SelectItem value="late">দেরি</SelectItem>
                          <SelectItem value="half_day">অর্ধদিন</SelectItem>
                        </SelectContent>
                      </Select>
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

export default Attendance;
