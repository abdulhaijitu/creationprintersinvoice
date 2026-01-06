import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Building2, User, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { UserOrgAssignmentDialog } from './UserOrgAssignmentDialog';

interface UserWithOrgs {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  organizations: {
    id: string;
    name: string;
    role: string;
  }[];
}

export const AdminUsersTable = () => {
  const [users, setUsers] = useState<UserWithOrgs[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    email: string;
    full_name: string;
  } | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // For each profile, fetch their organization memberships
      const usersWithOrgs = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Get user email from auth (we'll use the profile id to match)
          const { data: memberships } = await supabase
            .from('organization_members')
            .select(`
              role,
              organization:organizations(id, name)
            `)
            .eq('user_id', profile.id);

          // Try to get email from organizations where they are owner
          const { data: ownedOrg } = await supabase
            .from('organizations')
            .select('owner_email')
            .eq('owner_id', profile.id)
            .limit(1)
            .single();

          const orgs = (memberships || []).map((m: any) => ({
            id: m.organization?.id || '',
            name: m.organization?.name || 'Unknown',
            role: m.role,
          })).filter((o: any) => o.id);

          return {
            id: profile.id,
            email: ownedOrg?.owner_email || profile.full_name || 'No email',
            full_name: profile.full_name || 'Unknown',
            created_at: profile.created_at,
            organizations: orgs,
          };
        })
      );

      setUsers(usersWithOrgs);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignOrgs = (user: UserWithOrgs) => {
    setSelectedUser({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
    });
    setAssignDialogOpen(true);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.organizations.some((org) =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      owner: 'default',
      manager: 'secondary',
      accounts: 'outline',
      staff: 'outline',
    };
    return <Badge variant={variants[role] || 'outline'} className="text-xs">{role}</Badge>;
  };

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or organization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredUsers.length} users
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Organizations</TableHead>
                    <TableHead className="font-semibold">Joined</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id} className="group transition-colors duration-150 hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{user.full_name}</div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.organizations.length === 0 ? (
                            <span className="text-muted-foreground text-sm">No organizations</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 max-w-md">
                              {user.organizations.slice(0, 3).map((org) => (
                                <Badge
                                  key={org.id}
                                  variant="secondary"
                                  className="flex items-center gap-1"
                                >
                                  {org.name}
                                  {getRoleBadge(org.role)}
                                </Badge>
                              ))}
                              {user.organizations.length > 3 && (
                                <Badge variant="outline">
                                  +{user.organizations.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(user.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAssignOrgs(user)}
                          >
                            <Building2 className="h-4 w-4 mr-2" />
                            Manage Orgs
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <UserOrgAssignmentDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        user={selectedUser}
        onSuccess={fetchUsers}
      />
    </>
  );
};
