import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Building2, Search, Shield, Calendar, RotateCcw, Eye, Ban, CheckCircle, LogOut } from 'lucide-react';
import { format, addDays, startOfMonth } from 'date-fns';
import { useAdminAudit } from '@/hooks/useAdminAudit';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import AdminDashboardWidgets from '@/components/admin/AdminDashboardWidgets';
import OrganizationDetailsDrawer from '@/components/admin/OrganizationDetailsDrawer';
import AuditLogsTable from '@/components/admin/AuditLogsTable';

interface OrganizationWithStats {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  owner_id: string | null;
  owner_email: string | null;
  created_at: string;
  subscription?: {
    plan: string;
    status: string;
    trial_ends_at: string | null;
  };
  member_count?: number;
  owner_name?: string;
}

const PlatformAdmin = () => {
  const { isSuperAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<OrganizationWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithStats | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
    variant: 'default' | 'destructive';
  }>({ open: false, title: '', description: '', action: () => {}, variant: 'default' });
  
  const { logAction } = useAdminAudit();

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      navigate('/admin/login');
      return;
    }
    
    if (isSuperAdmin) {
      fetchOrganizations();
    }
  }, [isSuperAdmin, authLoading]);

  const fetchOrganizations = async () => {
    try {
      // Fetch organizations with subscriptions
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select(`
          *,
          subscriptions (plan, status, trial_ends_at)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get member counts and owner info for each organization
      const orgsWithStats = await Promise.all(
        (orgs || []).map(async (org) => {
          const { count } = await supabase
            .from('organization_members')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          // Get owner profile
          let ownerName = 'Unknown';
          if (org.owner_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', org.owner_id)
              .single();
            ownerName = profile?.full_name || 'Unknown';
          }

          return {
            ...org,
            subscription: org.subscriptions?.[0],
            member_count: count || 0,
            owner_name: ownerName,
          };
        })
      );

      setOrganizations(orgsWithStats);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const updateSubscriptionStatus = async (orgId: string, newStatus: 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired', orgName: string) => {
    const actionMap: Record<string, string> = {
      suspended: 'suspend_organization',
      active: 'activate_organization',
    };

    setConfirmAction({
      open: true,
      title: `Change Status to ${newStatus}`,
      description: `Are you sure you want to change ${orgName}'s status to ${newStatus}? This action will be logged.`,
      variant: newStatus === 'suspended' ? 'destructive' : 'default',
      action: async () => {
        try {
          const { error } = await supabase
            .from('subscriptions')
            .update({ status: newStatus })
            .eq('organization_id', orgId);

          if (error) throw error;

          await logAction(
            (actionMap[newStatus] || 'change_status') as 'suspend_organization' | 'activate_organization' | 'change_status',
            'organization',
            orgId,
            { new_status: newStatus, org_name: orgName }
          );

          toast.success('Subscription status updated');
          fetchOrganizations();
        } catch (error) {
          console.error('Error updating subscription:', error);
          toast.error('Failed to update subscription');
        }
      },
    });
  };

  const changePlan = async (orgId: string, newPlan: 'free' | 'basic' | 'pro' | 'enterprise', orgName: string) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ plan: newPlan })
        .eq('organization_id', orgId);

      if (error) throw error;

      await logAction('change_plan', 'organization', orgId, { new_plan: newPlan, org_name: orgName });
      toast.success(`Plan changed to ${newPlan}`);
      fetchOrganizations();
    } catch (error) {
      console.error('Error changing plan:', error);
      toast.error('Failed to change plan');
    }
  };

  const extendTrial = async (orgId: string, days: number = 7, orgName: string) => {
    try {
      const newTrialEnd = addDays(new Date(), days).toISOString();
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          trial_ends_at: newTrialEnd,
          status: 'trial' 
        })
        .eq('organization_id', orgId);

      if (error) throw error;

      await logAction('extend_trial', 'organization', orgId, { days, new_trial_end: newTrialEnd, org_name: orgName });
      toast.success(`Trial extended by ${days} days`);
      fetchOrganizations();
    } catch (error) {
      console.error('Error extending trial:', error);
      toast.error('Failed to extend trial');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      trial: 'secondary',
      active: 'default',
      suspended: 'destructive',
      cancelled: 'outline',
      expired: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      free: 'bg-muted text-muted-foreground',
      basic: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      pro: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
      enterprise: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
    };
    return (
      <Badge className={colors[plan] || 'bg-muted'}>
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </Badge>
    );
  };

  const filteredOrgs = organizations.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (org.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (org.owner_email?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesStatus =
      statusFilter === 'all' || org.subscription?.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const monthStart = startOfMonth(new Date());
  const stats = {
    totalOrgs: organizations.length,
    activeOrgs: organizations.filter((o) => o.subscription?.status === 'active').length,
    trialOrgs: organizations.filter((o) => o.subscription?.status === 'trial').length,
    expiredOrgs: organizations.filter((o) => o.subscription?.status === 'expired').length,
    totalUsers: organizations.reduce((sum, o) => sum + (o.member_count || 0), 0),
    monthlySignups: organizations.filter((o) => new Date(o.created_at) >= monthStart).length,
  };

  const handleViewDetails = (org: OrganizationWithStats) => {
    setSelectedOrg(org);
    setDetailsOpen(true);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Platform Admin</h1>
              <p className="text-sm text-muted-foreground">Super Administrator Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate('/')}>
              View App
            </Button>
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Dashboard Widgets */}
        <AdminDashboardWidgets stats={stats} />

        {/* Main Content Tabs */}
        <Tabs defaultValue="organizations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="organizations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Organizations
                </CardTitle>
                <CardDescription>View and manage all registered organizations</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, owner, or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Table */}
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Organization</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Trial Ends</TableHead>
                          <TableHead>Members</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrgs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                              No organizations found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredOrgs.map((org) => (
                            <TableRow key={org.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{org.name}</div>
                                  <div className="text-sm text-muted-foreground">{org.slug}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{org.owner_name}</div>
                                  <div className="text-sm text-muted-foreground">{org.owner_email || org.email || '-'}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={org.subscription?.plan || 'free'}
                                  onValueChange={(value: 'free' | 'basic' | 'pro' | 'enterprise') => 
                                    changePlan(org.id, value, org.name)
                                  }
                                >
                                  <SelectTrigger className="w-[110px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="free">Free</SelectItem>
                                    <SelectItem value="basic">Basic</SelectItem>
                                    <SelectItem value="pro">Pro</SelectItem>
                                    <SelectItem value="enterprise">Enterprise</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(org.subscription?.status || 'trial')}
                              </TableCell>
                              <TableCell>
                                {org.subscription?.trial_ends_at ? (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(org.subscription.trial_ends_at), 'MMM d, yyyy')}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>{org.member_count}</TableCell>
                              <TableCell>
                                {format(new Date(org.created_at), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewDetails(org)}
                                    title="View Details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => extendTrial(org.id, 7, org.name)}
                                    title="Extend trial by 7 days"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                  {org.subscription?.status === 'suspended' ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-green-600 hover:text-green-700"
                                      onClick={() => updateSubscriptionStatus(org.id, 'active', org.name)}
                                      title="Activate"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => updateSubscriptionStatus(org.id, 'suspended', org.name)}
                                      title="Suspend"
                                    >
                                      <Ban className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
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
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogsTable />
          </TabsContent>
        </Tabs>
      </div>

      {/* Organization Details Drawer */}
      <OrganizationDetailsDrawer
        organization={selectedOrg}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onRefresh={fetchOrganizations}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmAction.open}
        onOpenChange={(open) => setConfirmAction(prev => ({ ...prev, open }))}
        title={confirmAction.title}
        description={confirmAction.description}
        confirmLabel="Confirm"
        variant={confirmAction.variant}
        onConfirm={confirmAction.action}
      />
    </div>
  );
};

export default PlatformAdmin;
