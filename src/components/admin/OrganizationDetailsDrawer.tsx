import { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { User, FileText, Receipt, Activity, Ban, Save, KeyRound, Loader2, AlertTriangle, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAudit } from '@/hooks/useAdminAudit';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useAuth } from '@/contexts/AuthContext';

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
    owner_email?: string | null;
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

type PlanType = 'free' | 'basic' | 'pro' | 'enterprise';
type StatusType = 'trial' | 'active' | 'suspended' | 'expired' | 'cancelled';

const OrganizationDetailsDrawer = ({ 
  organization, 
  open, 
  onClose,
  onRefresh 
}: OrganizationDetailsDrawerProps) => {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [usageStats, setUsageStats] = useState<OrgUsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [downgradeDialogOpen, setDowngradeDialogOpen] = useState(false);
  const [impersonateDialogOpen, setImpersonateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrganizationMember | null>(null);
  const { logAction } = useAdminAudit();
  const { isSuperAdmin } = useAuth();
  const { startImpersonation, canImpersonate, isImpersonating, isStarting } = useImpersonation();
  // Editable form state
  const [formData, setFormData] = useState({
    name: '',
    plan: '' as PlanType,
    status: '' as StatusType,
    trialEndsAt: '',
  });

  // Original values for dirty checking
  const [originalData, setOriginalData] = useState({
    name: '',
    plan: '' as PlanType,
    status: '' as StatusType,
    trialEndsAt: '',
  });

  const [pendingPlanChange, setPendingPlanChange] = useState<PlanType | null>(null);

  // Check if form has changes
  const isDirty = useMemo(() => {
    return (
      formData.name !== originalData.name ||
      formData.plan !== originalData.plan ||
      formData.status !== originalData.status ||
      formData.trialEndsAt !== originalData.trialEndsAt
    );
  }, [formData, originalData]);

  // Check if it's a plan downgrade
  const isDowngrade = useMemo(() => {
    const planOrder = ['free', 'basic', 'pro', 'enterprise'];
    const oldIndex = planOrder.indexOf(originalData.plan);
    const newIndex = planOrder.indexOf(formData.plan);
    return newIndex < oldIndex;
  }, [formData.plan, originalData.plan]);

  useEffect(() => {
    if (open && organization) {
      fetchOrgDetails();
      logAction('view_organization', 'organization', organization.id, { name: organization.name });
      
      // Initialize form data
      const initial = {
        name: organization.name,
        plan: (organization.subscription?.plan || 'free') as PlanType,
        status: (organization.subscription?.status || 'trial') as StatusType,
        trialEndsAt: organization.subscription?.trial_ends_at 
          ? format(new Date(organization.subscription.trial_ends_at), "yyyy-MM-dd'T'HH:mm")
          : '',
      };
      setFormData(initial);
      setOriginalData(initial);
    }
  }, [open, organization]);

  const fetchOrgDetails = async () => {
    if (!organization) return;
    setLoading(true);

    try {
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('id, user_id, role, created_at')
        .eq('organization_id', organization.id);

      if (memberError) throw memberError;

      const membersWithProfiles = await Promise.all(
        (memberData || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', member.user_id)
            .single();
          
          return { ...member, profile: profile || undefined };
        })
      );

      setMembers(membersWithProfiles);

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

  const handlePlanChange = (newPlan: PlanType) => {
    const planOrder = ['free', 'basic', 'pro', 'enterprise'];
    const oldIndex = planOrder.indexOf(originalData.plan);
    const newIndex = planOrder.indexOf(newPlan);
    
    if (newIndex < oldIndex) {
      setPendingPlanChange(newPlan);
      setDowngradeDialogOpen(true);
    } else {
      setFormData(prev => ({ ...prev, plan: newPlan }));
    }
  };

  const confirmDowngrade = () => {
    if (pendingPlanChange) {
      setFormData(prev => ({ ...prev, plan: pendingPlanChange }));
      setPendingPlanChange(null);
    }
    setDowngradeDialogOpen(false);
  };

  const handleSave = async () => {
    if (!organization || !isDirty) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-organization', {
        body: {
          organizationId: organization.id,
          updates: {
            name: formData.name !== originalData.name ? formData.name : undefined,
            plan: formData.plan !== originalData.plan ? formData.plan : undefined,
            status: formData.status !== originalData.status ? formData.status : undefined,
            trialEndsAt: formData.trialEndsAt !== originalData.trialEndsAt 
              ? (formData.trialEndsAt ? new Date(formData.trialEndsAt).toISOString() : null)
              : undefined,
          }
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Update form state from backend response (source of truth)
      const updatedPlan = (data.subscription?.plan || 'free') as PlanType;
      const updatedStatus = (data.subscription?.status || 'trial') as StatusType;
      const updatedTrialEndsAt = data.subscription?.trial_ends_at 
        ? format(new Date(data.subscription.trial_ends_at), "yyyy-MM-dd'T'HH:mm")
        : '';
      const updatedName = data.organization?.name || formData.name;

      const newFormData = {
        name: updatedName,
        plan: updatedPlan,
        status: updatedStatus,
        trialEndsAt: updatedTrialEndsAt,
      };

      setFormData(newFormData);
      setOriginalData(newFormData);

      toast.success('Organization updated successfully');
      onRefresh();
    } catch (error) {
      console.error('Error saving organization:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!organization?.owner_email) {
      toast.error('Owner email not found');
      return;
    }

    setResettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-owner-password', {
        body: {
          organizationId: organization.id,
          ownerEmail: organization.owner_email
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Password reset email sent to ${organization.owner_email}`);
      setResetDialogOpen(false);
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send reset email');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleDisableUser = (member: OrganizationMember) => {
    setSelectedUser(member);
    setDisableDialogOpen(true);
  };

  const confirmDisableUser = async () => {
    if (!selectedUser || !organization) return;

    try {
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

  const handleImpersonate = async () => {
    if (!organization) return;

    const target = {
      organizationId: organization.id,
      organizationName: organization.name,
      ownerId: organization.owner_id || '',
      ownerEmail: organization.owner_email || organization.email || '',
      subscriptionStatus: organization.subscription?.status,
    };

    const check = canImpersonate(target);
    if (!check.allowed) {
      toast.error(check.reason || 'Cannot impersonate this user');
      return;
    }

    // Confirm before impersonating
    setImpersonateDialogOpen(true);
  };

  const confirmImpersonate = async () => {
    if (!organization) return;

    const target = {
      organizationId: organization.id,
      organizationName: organization.name,
      ownerId: organization.owner_id || '',
      ownerEmail: organization.owner_email || organization.email || '',
      subscriptionStatus: organization.subscription?.status,
    };

    const success = await startImpersonation(target);
    if (success) {
      onClose();
    }
    setImpersonateDialogOpen(false);
  };

  const canImpersonateOrg = useMemo(() => {
    if (!organization || !isSuperAdmin || isImpersonating) return false;
    return !!organization.owner_id;
  }, [organization, isSuperAdmin, isImpersonating]);

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      owner: 'default',
      manager: 'secondary',
      accounts: 'outline',
      staff: 'outline',
    };
    return <Badge variant={variants[role] || 'outline'}>{role}</Badge>;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'trial': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'outline';
    }
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
              {/* Organization Details - Editable */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Organization Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input
                      id="org-name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Organization name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Slug</p>
                      <p className="font-medium">{organization.slug}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {format(new Date(organization.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Plan & Subscription - Editable */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Plan & Subscription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Plan</Label>
                      <Select 
                        value={formData.plan} 
                        onValueChange={(value: PlanType) => handlePlanChange(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select plan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select 
                        value={formData.status} 
                        onValueChange={(value: StatusType) => setFormData(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trial">Trial</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {(formData.status === 'trial' || originalData.status === 'trial') && (
                    <div className="space-y-2">
                      <Label htmlFor="trial-end">Trial End Date</Label>
                      <Input
                        id="trial-end"
                        type="datetime-local"
                        value={formData.trialEndsAt}
                        onChange={(e) => setFormData(prev => ({ ...prev, trialEndsAt: e.target.value }))}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant={getStatusBadgeVariant(originalData.status)}>
                      Current: {originalData.status}
                    </Badge>
                    <span>→</span>
                    <Badge variant={getStatusBadgeVariant(formData.status)}>
                      {formData.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Owner & Access - Read Only */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Owner & Access</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Owner Email</p>
                      <p className="font-medium">{organization.owner_email || organization.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Members</p>
                      <p className="font-medium">{members.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Security Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Impersonate Owner - Super Admin Only */}
                  {isSuperAdmin && (
                    <Button
                      variant="default"
                      onClick={handleImpersonate}
                      disabled={!canImpersonateOrg}
                      className="w-full"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Login as Organization Owner
                    </Button>
                  )}
                  {isSuperAdmin && !canImpersonateOrg && organization?.owner_id && (
                    <p className="text-xs text-muted-foreground">
                      {isImpersonating ? 'Already impersonating another user' : 'Owner account not available'}
                    </p>
                  )}
                  {isSuperAdmin && !organization?.owner_id && (
                    <p className="text-xs text-muted-foreground">
                      No owner assigned to this organization
                    </p>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => setResetDialogOpen(true)}
                    disabled={!organization.owner_email}
                    className="w-full"
                  >
                    <KeyRound className="h-4 w-4 mr-2" />
                    Reset Owner Password
                  </Button>
                  {!organization.owner_email && (
                    <p className="text-xs text-muted-foreground">
                      Owner email not available
                    </p>
                  )}
                </CardContent>
              </Card>

              <Separator />

              {/* Save Changes Button */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                  className="min-w-[120px]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>

              {isDirty && (
                <p className="text-xs text-muted-foreground text-center">
                  You have unsaved changes
                </p>
              )}
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

      {/* Disable User Dialog */}
      <ConfirmDialog
        open={disableDialogOpen}
        onOpenChange={setDisableDialogOpen}
        title="Disable User Access"
        description={`Are you sure you want to disable access for ${selectedUser?.profile?.full_name}? They will no longer be able to access this organization.`}
        confirmLabel="Disable Access"
        variant="destructive"
        onConfirm={confirmDisableUser}
      />

      {/* Reset Password Dialog */}
      <ConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title="Reset Owner Password"
        description={`This will send a password reset email to ${organization?.owner_email || organization?.email}. The owner will receive a secure link to set a new password.`}
        confirmLabel={resettingPassword ? 'Sending...' : 'Send Reset Email'}
        onConfirm={handleResetPassword}
      />

      {/* Downgrade Confirmation Dialog */}
      <ConfirmDialog
        open={downgradeDialogOpen}
        onOpenChange={(open) => {
          setDowngradeDialogOpen(open);
          if (!open) setPendingPlanChange(null);
        }}
        title="Confirm Plan Downgrade"
        description={
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">This is a plan downgrade</span>
            </div>
            <p>
              Downgrading from <strong>{originalData.plan}</strong> to{' '}
              <strong>{pendingPlanChange}</strong> may result in reduced features
              and user limits for this organization.
            </p>
          </div>
        }
        confirmLabel="Confirm Downgrade"
        variant="destructive"
        onConfirm={confirmDowngrade}
      />

      {/* Impersonation Confirmation Dialog */}
      <ConfirmDialog
        open={impersonateDialogOpen}
        onOpenChange={(open) => {
          if (!isStarting) {
            setImpersonateDialogOpen(open);
          }
        }}
        title="Login as Organization Owner"
        description={
          <div className="space-y-3">
            <p>
              You are about to impersonate the owner of{' '}
              <strong>{organization?.name}</strong>.
            </p>
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-800 dark:text-amber-200">Important:</p>
                  <ul className="list-disc list-inside text-amber-700 dark:text-amber-300 space-y-1">
                    <li>You will act as the organization owner</li>
                    <li>All actions will be logged for audit</li>
                    <li>A persistent banner will show your impersonation status</li>
                    {organization?.subscription?.status === 'suspended' && (
                      <li className="font-medium">This organization is suspended - you'll have read-only access</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        }
        confirmLabel={isStarting ? "Starting Impersonation..." : "Start Impersonation"}
        onConfirm={confirmImpersonate}
        loading={isStarting}
      />
    </>
  );
};

export default OrganizationDetailsDrawer;
