import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Users, 
  ShieldCheck, 
  ShieldAlert, 
  Loader2,
  UserCog,
  Save
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { bn } from "date-fns/locale";

interface UserWithRole {
  id: string;
  full_name: string;
  phone: string | null;
  designation: string | null;
  department: string | null;
  joining_date: string | null;
  role: "admin" | "employee";
  created_at: string;
}

const UserRoles = () => {
  const { isAdmin, user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingChanges, setPendingChanges] = useState<Record<string, "admin" | "employee">>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");

      if (profilesError) throw profilesError;

      if (profilesData) {
        const usersWithRoles = await Promise.all(
          profilesData.map(async (profile) => {
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", profile.id)
              .single();

            return {
              ...profile,
              role: (roleData?.role || "employee") as "admin" | "employee",
            };
          })
        );
        setUsers(usersWithRoles);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("ইউজার ডেটা লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (userId: string, newRole: "admin" | "employee") => {
    setPendingChanges((prev) => ({
      ...prev,
      [userId]: newRole,
    }));
  };

  const saveRoleChange = async (userId: string) => {
    const newRole = pendingChanges[userId];
    if (!newRole) return;

    // Prevent self-demotion
    if (userId === user?.id && newRole === "employee") {
      toast.error("আপনি নিজের এডমিন রোল সরাতে পারবেন না");
      setPendingChanges((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      return;
    }

    setSaving(userId);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) throw error;

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      // Clear pending change
      setPendingChanges((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });

      toast.success("ইউজার রোল আপডেট হয়েছে");
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("রোল আপডেট ব্যর্থ হয়েছে");
    } finally {
      setSaving(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone?.includes(searchTerm) ||
      u.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const adminCount = users.filter((u) => u.role === "admin").length;
  const employeeCount = users.filter((u) => u.role === "employee").length;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show access denied message for non-admin users
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">রোল ম্যানেজমেন্ট</h1>
          <p className="text-muted-foreground mt-1">
            ইউজার রোল পরিচালনা করুন
          </p>
        </div>
        
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center py-10 space-y-4">
              <div className="p-4 rounded-full bg-destructive/10">
                <ShieldAlert className="h-12 w-12 text-destructive" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">অ্যাক্সেস নেই</h2>
                <p className="text-muted-foreground max-w-md">
                  শুধুমাত্র অ্যাডমিন ব্যবহারকারীরা রোল ম্যানেজমেন্ট দেখতে পারেন। 
                  আপনার অ্যাডমিন অ্যাক্সেস প্রয়োজন হলে আপনার সিস্টেম অ্যাডমিনের সাথে যোগাযোগ করুন।
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserCog className="h-8 w-8" />
            রোল ম্যানেজমেন্ট
          </h1>
          <p className="text-muted-foreground">ইউজারদের রোল পরিচালনা করুন</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              মোট ইউজার
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{users.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              এডমিন
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{adminCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              কর্মচারী
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{employeeCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="ইউজার খুঁজুন..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ইউজার</TableHead>
              <TableHead>পদবি</TableHead>
              <TableHead>বিভাগ</TableHead>
              <TableHead>ফোন</TableHead>
              <TableHead>বর্তমান রোল</TableHead>
              <TableHead>নতুন রোল</TableHead>
              <TableHead className="text-center">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  কোনো ইউজার পাওয়া যায়নি
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((userItem) => {
                const isCurrentUser = userItem.id === user?.id;
                const hasPendingChange = pendingChanges[userItem.id] !== undefined;
                const displayRole = pendingChanges[userItem.id] || userItem.role;

                return (
                  <TableRow key={userItem.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(userItem.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {userItem.full_name}
                            {isCurrentUser && (
                              <span className="text-muted-foreground text-sm ml-2">(আপনি)</span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            যোগদান: {userItem.joining_date 
                              ? format(new Date(userItem.joining_date), "dd MMM yyyy", { locale: bn })
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{userItem.designation || "-"}</TableCell>
                    <TableCell>{userItem.department || "-"}</TableCell>
                    <TableCell>{userItem.phone || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={userItem.role === "admin" ? "default" : "secondary"}>
                        {userItem.role === "admin" ? "এডমিন" : "কর্মচারী"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={displayRole}
                        onValueChange={(value) => handleRoleChange(userItem.id, value as "admin" | "employee")}
                        disabled={isCurrentUser}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-primary" />
                              এডমিন
                            </div>
                          </SelectItem>
                          <SelectItem value="employee">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              কর্মচারী
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      {hasPendingChange && !isCurrentUser ? (
                        <Button
                          size="sm"
                          onClick={() => saveRoleChange(userItem.id)}
                          disabled={saving === userItem.id}
                        >
                          {saving === userItem.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-1" />
                              সংরক্ষণ
                            </>
                          )}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {isCurrentUser ? "পরিবর্তন অক্ষম" : "-"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default UserRoles;
