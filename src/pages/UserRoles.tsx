import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/lib/permissions/hooks";
import { OrgRole, ORG_ROLE_DISPLAY, ALL_ORG_ROLES } from "@/lib/permissions/constants";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Users, 
  ShieldAlert, 
  Loader2,
  UserCog,
  Save,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { EmptyState } from "@/components/shared/EmptyState";
import { EditablePermissionMatrix } from "@/components/permissions/EditablePermissionMatrix";

interface UserWithRole {
  id: string;
  full_name: string;
  phone: string | null;
  designation: string | null;
  department: string | null;
  joining_date: string | null;
  role: OrgRole;
  created_at: string;
}

const UserRoles = () => {
  const { user, loading: authLoading, isSuperAdmin } = useAuth();
  const { isOrgOwner } = usePermissions();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingChanges, setPendingChanges] = useState<Record<string, OrgRole>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const canManageRoles = isSuperAdmin || isOrgOwner;

  useEffect(() => {
    if (canManageRoles) {
      fetchUsers();
    }
  }, [canManageRoles]);

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
              role: (roleData?.role || "employee") as OrgRole,
            };
          })
        );
        setUsers(usersWithRoles);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (userId: string, newRole: OrgRole) => {
    setPendingChanges((prev) => ({
      ...prev,
      [userId]: newRole,
    }));
  };

  const saveRoleChange = async (userId: string) => {
    const newRole = pendingChanges[userId];
    if (!newRole) return;

    if (userId === user?.id) {
      toast.error("You cannot change your own role");
      setPendingChanges((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      return;
    }

    setSaving(userId);
    try {
      // Map frontend role to database role
      const dbRole = newRole === 'designer' ? 'graphic_designer' : newRole;
      
      const { error } = await supabase
        .from("user_roles")
        .update({ role: dbRole as any })
        .eq("user_id", userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      setPendingChanges((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });

      toast.success("User role updated");
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
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

  const getRoleBadgeVariant = (userRole: OrgRole): "default" | "secondary" | "outline" => {
    switch (userRole) {
      case 'owner':
        return 'default';
      case 'manager':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const roleStats = ALL_ORG_ROLES.map((r) => ({
    role: r,
    count: users.filter((u) => u.role === r).length,
  })).filter(stat => stat.count > 0);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManageRoles) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Role Management</h1>
          <p className="text-muted-foreground mt-1">Manage user roles</p>
        </div>
        
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center py-10 space-y-4">
              <div className="p-4 rounded-full bg-destructive/10">
                <ShieldAlert className="h-12 w-12 text-destructive" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
                <p className="text-muted-foreground max-w-md">
                  Only Super Admin/Owner users can view role management.
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
            Role Management
          </h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{users.length}</p>
          </CardContent>
        </Card>
        {roleStats.map((stat) => (
          <Card key={stat.role}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {ORG_ROLE_DISPLAY[stat.role]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="permissions">Permission Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>New Role</TableHead>
                  <TableHead className="text-center">Action</TableHead>
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
                    <TableCell colSpan={7} className="py-0">
                      <EmptyState
                        icon={Users}
                        title="No users found"
                        description={searchTerm 
                          ? "Try adjusting your search criteria" 
                          : "Users will appear here when they join your organization"}
                      />
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
                                  <span className="text-muted-foreground text-sm ml-2">(You)</span>
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Joined: {userItem.joining_date 
                                  ? format(new Date(userItem.joining_date), "dd MMM yyyy")
                                  : "N/A"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{userItem.designation || "-"}</TableCell>
                        <TableCell>{userItem.department || "-"}</TableCell>
                        <TableCell>{userItem.phone || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(userItem.role)}>
                            {ORG_ROLE_DISPLAY[userItem.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={displayRole}
                            onValueChange={(value) => handleRoleChange(userItem.id, value as OrgRole)}
                            disabled={isCurrentUser}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ALL_ORG_ROLES.map((r) => (
                                <SelectItem key={r} value={r}>
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    {ORG_ROLE_DISPLAY[r]}
                                  </div>
                                </SelectItem>
                              ))}
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
                                  Save
                                </>
                              )}
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              {isCurrentUser ? "Disabled" : "-"}
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
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <EditablePermissionMatrix />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserRoles;
