import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { User, FileText, Receipt, Activity, Ban, RotateCcw, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAudit } from '@/hooks/useAdminAudit';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface OrganizationMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile?: {
    full_name: string;
    phone: string | null;
  };
  email?: string;
}

interface OrgUsageStats {
  invoice_count: number;
  expense_total: number;
  last_activity: string | null;
}

interface OrganizationDetailsDrawerProps {
  organization: {
    id: string;
    name: string;
    slug: string;
    email: string | null;
    phone: string | null;
    owner_id: string | null;
    created_at: string;
    subscription?: {
      plan: string;
      status: string;
      trial_ends_at: string | null;
    };
  } | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const OrganizationDetailsDrawer = ({ 
  organization, 
  open, 
  onClose,
  onRefresh 
}: OrganizationDetailsDrawerProps) => {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [usageStats, setUsageStats] = useState<OrgUsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrganizationMember | null>(null);
  const { logAction } = useAdminAudit();

  useEffect(() => {
    if (open && organization) {
      fetchOrgDetails();
      logAction('view_organization', 'organization', organization.id, { name: organization.name });
    }
  }, [open, organization]);

  const fetchOrgDetails = async () => {
    if (!organization) return;
    setLoading(true);

    try {
      // Fetch members
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          role,
          created_at
        `)
        .eq('organization_id', organization.id);

      if (memberError) throw memberError;

      // Fetch profiles for members
      const membersWithProfiles = await Promise.all(
        (memberData || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', member.user_id)
            .single();
          
          return {
            ...member,
            profile: profile || undefined,
          };
        })
      );

      setMembers(membersWithProfiles);

      // Fetch usage stats using RPC
      const { data: stats, error: statsError } = await supabase.rpc('get_org_usage_stats', {
        _org_id: organization.id
      });

      if (!statsError && stats?.[0]) {
        setUsageStats(stats[0]);
      }
    } catch (error) {
      console.error('Error fetching org details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableUser = (member: OrganizationMember) => {
    setSelectedUser(member);
    setDisableDialogOpen(true);
  };

  const confirmDisableUser = async () => {
    if (!selectedUser || !organization) return;

    try {
      // In a real app, you'd call an admin API to disable the user
      // For now, we'll remove them from the organization
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', selectedUser.id);

      if (error) throw error;

      await logAction('disable_user', 'user', selectedUser.user_id, {
        organization_id: organization.id,
        user_name: selectedUser.profile?.full_name,
      });

      toast.success('User access disabled');
      fetchOrgDetails();
    } catch (error) {
      console.error('Error disabling user:', error);
      toast.error('Failed to disable user');
    } finally {
      setDisableDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      owner: 'default',
      manager: 'secondary',
      accounts: 'outline',
      staff: 'outline',
    };
    return <Badge variant={variants[role] || 'outline'}>{role}</Badge>;
  };

  if (!organization) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {organization.name}
            </SheetTitle>
            <SheetDescription>
              Organization ID: {organization.id}
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Organization Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Slug</p>
                      <p className="font-medium">{organization.slug}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{organization.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{organization.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {format(new Date(organization.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Subscription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Plan</p>
                      <Badge>{organization.subscription?.plan || 'free'}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={
                        organization.subscription?.status === 'active' ? 'default' :
                        organization.subscription?.status === 'trial' ? 'secondary' : 'destructive'
                      }>
                        {organization.subscription?.status || 'trial'}
                      </Badge>
                    </div>
                    {organization.subscription?.trial_ends_at && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">Trial Ends</p>
                        <p className="font-medium">
                          {format(new Date(organization.subscription.trial_ends_at), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Organization Members ({members.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="font-medium">
                                {member.profile?.full_name || 'Unknown'}
                              </div>
                            </TableCell>
                            <TableCell>{getRoleBadge(member.role)}</TableCell>
                            <TableCell>
                              {format(new Date(member.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDisableUser(member)}
                                disabled={member.role === 'owner'}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Disable
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="usage" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Total Invoices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {usageStats?.invoice_count || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Total Expenses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ৳{Number(usageStats?.expense_total || 0).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Last Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-medium">
                      {usageStats?.last_activity 
                        ? format(new Date(usageStats.last_activity), 'MMM d, yyyy')
                        : 'No activity'}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={disableDialogOpen}
        onOpenChange={setDisableDialogOpen}
        title="Disable User Access"
        description={`Are you sure you want to disable access for ${selectedUser?.profile?.full_name}? They will no longer be able to access this organization.`}
        confirmLabel="Disable Access"
        variant="destructive"
        onConfirm={confirmDisableUser}
      />
    </>
  );
};

export default OrganizationDetailsDrawer;
