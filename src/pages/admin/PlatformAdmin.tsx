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
import { toast } from 'sonner';
import { Building2, Search, Calendar, RotateCcw, Eye, Ban, CheckCircle } from 'lucide-react';
import { format, addDays, startOfMonth } from 'date-fns';
import { useAdminAudit } from '@/hooks/useAdminAudit';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import OrganizationDetailsDrawer from '@/components/admin/OrganizationDetailsDrawer';
import AuditLogsTable from '@/components/admin/AuditLogsTable';
import AdminBillingTable from '@/components/admin/AdminBillingTable';
import { AdminAnalyticsDashboard } from '@/components/admin/AdminAnalyticsDashboard';
import { AdminNotificationLogs } from '@/components/admin/AdminNotificationLogs';
import { AdminWhiteLabelManagement } from '@/components/admin/AdminWhiteLabelManagement';
import { InvestorDashboard } from '@/components/admin/InvestorDashboard';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminDashboardOverview } from '@/components/admin/AdminDashboardOverview';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

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

const sectionConfig: Record<string, { title: string; description: string }> = {
  dashboard: {
    title: 'Dashboard',
    description: 'Overview of platform metrics and performance',
  },
  organizations: {
    title: 'Organizations',
    description: 'View and manage all registered organizations',
  },
  analytics: {
    title: 'Analytics',
    description: 'Detailed platform analytics and investor metrics',
  },
  billing: {
    title: 'Billing',
    description: 'Manage invoices and payment tracking',
  },
  whitelabel: {
    title: 'White-Label',
    description: 'Manage white-label settings for organizations',
  },
  notifications: {
    title: 'Notifications',
    description: 'View notification logs and delivery status',
  },
  audit: {
    title: 'Audit Logs',
    description: 'Track all administrative actions',
  },
};

const PlatformAdmin = () => {
  const { isSuperAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
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
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select(`
          *,
          subscriptions (plan, status, trial_ends_at)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const orgsWithStats = await Promise.all(
        (orgs || []).map(async (org) => {
          const { count } = await supabase
            .from('organization_members')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

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

  const currentSection = sectionConfig[activeSection] || sectionConfig.dashboard;

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <AdminDashboardOverview stats={stats} />
            <InvestorDashboard />
          </div>
        );

      case 'organizations':
        return (
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
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
                        <TableHead className="font-semibold">Organization</TableHead>
                        <TableHead className="font-semibold">Owner</TableHead>
                        <TableHead className="font-semibold">Plan</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Trial Ends</TableHead>
                        <TableHead className="font-semibold text-center">Members</TableHead>
                        <TableHead className="font-semibold">Created</TableHead>
                        <TableHead className="font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrgs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                            No organizations found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrgs.map((org) => (
                          <TableRow key={org.id} className="group transition-colors duration-150 hover:bg-muted/50">
                            <TableCell>
                              <div>
                                <div className="font-medium text-foreground">{org.name}</div>
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
                                <SelectTrigger className="w-[110px] h-8">
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
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {format(new Date(org.subscription.trial_ends_at), 'MMM d, yyyy')}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-medium">{org.member_count}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(org.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleViewDetails(org)}
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => extendTrial(org.id, 7, org.name)}
                                  title="Extend trial by 7 days"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                                {org.subscription?.status === 'suspended' ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                                    onClick={() => updateSubscriptionStatus(org.id, 'active', org.name)}
                                    title="Activate"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
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
        );

      case 'analytics':
        return <AdminAnalyticsDashboard />;

      case 'billing':
        return <AdminBillingTable />;

      case 'whitelabel':
        return <AdminWhiteLabelManagement />;

      case 'notifications':
        return <AdminNotificationLogs />;

      case 'audit':
        return <AuditLogsTable />;

      default:
        return null;
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-muted/30">
        {/* Sidebar */}
        <AdminSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onSignOut={handleSignOut}
        />

        {/* Main Content */}
        <main className="pl-64">
          <div className="min-h-screen">
            {/* Page Header */}
            <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div className="px-6 py-4">
                <AdminPageHeader
                  title={currentSection.title}
                  description={currentSection.description}
                />
              </div>
            </header>

            {/* Page Content */}
            <div className="p-6">
              <div className="animate-fade-in">
                {renderContent()}
              </div>
            </div>
          </div>
        </main>

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
    </TooltipProvider>
  );
};

export default PlatformAdmin;
