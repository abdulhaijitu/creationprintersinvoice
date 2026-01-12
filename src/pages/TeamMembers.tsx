/**
 * Team Members Page - Enhanced with invite flow, inline role management, and permissions matrix
 * Uses module-level caching to prevent refetch on navigation (SPA standard)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { OrgRole, ORG_ROLE_DISPLAY } from '@/lib/permissions/constants';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Users, UserPlus, Mail, Shield, Crown, Briefcase, Calculator, ShieldAlert, Palette, UserCheck, RefreshCw, AlertCircle, Clock, RotateCw, X, Loader2, Check, ShieldCheck, UserCog } from 'lucide-react';
import { format } from 'date-fns';
import { StaffPermissionsMatrix } from '@/components/team/StaffPermissionsMatrix';
import { AddTeamMemberDialog } from '@/components/team/AddTeamMemberDialog';

interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
  profile?: Profile | null;
  status: 'active';
}

interface PendingInvite {
  id: string;
  email: string;
  role: OrgRole;
  note?: string | null;
  status: 'pending';
  created_at: string;
  expires_at: string;
}

type TeamListItem = TeamMember | PendingInvite;

const roleIcons: Record<OrgRole, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  manager: <Shield className="h-3 w-3" />,
  accounts: <Calculator className="h-3 w-3" />,
  sales_staff: <UserCheck className="h-3 w-3" />,
  designer: <Palette className="h-3 w-3" />,
  employee: <Briefcase className="h-3 w-3" />,
};

const roleColors: Record<OrgRole, string> = {
  owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  accounts: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  sales_staff: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  designer: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200',
  employee: 'bg-muted text-muted-foreground',
};

const ASSIGNABLE_ROLES: OrgRole[] = ['manager', 'accounts', 'sales_staff', 'designer', 'employee'];

// Type guards
const isActiveMember = (item: TeamListItem): item is TeamMember => item.status === 'active';
const isPendingInvite = (item: TeamListItem): item is PendingInvite => item.status === 'pending';

// Skeleton loader component
const TeamMemberSkeleton = ({ canManageTeam }: { canManageTeam: boolean }) => (
  <>
    {[1, 2, 3, 4, 5].map((i) => (
      <TableRow key={i} className="animate-pulse">
        <TableCell className="py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4" style={{ width: `${80 + (i * 15) % 60}px` }} />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </TableCell>
        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        {canManageTeam && (
          <TableCell className="text-right">
            <Skeleton className="h-9 w-24 ml-auto" />
          </TableCell>
        )}
      </TableRow>
    ))}
  </>
);

// Empty state component
const EmptyState = ({ onInvite, onAddManually, canInvite }: { onInvite: () => void; onAddManually: () => void; canInvite: boolean }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="rounded-full bg-muted p-4 mb-4">
      <Users className="h-10 w-10 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
    <p className="text-muted-foreground text-sm mb-6 max-w-sm">
      Your team is empty. Start building your team by adding members manually or sending invitations.
    </p>
    {canInvite && (
      <div className="flex gap-2">
        <Button variant="outline" onClick={onAddManually} className="transition-all hover:shadow-md active:scale-[0.98]">
          <UserCog className="h-4 w-4 mr-2" />
          Add Manually
        </Button>
        <Button onClick={onInvite} className="transition-all hover:shadow-md active:scale-[0.98]">
          <Mail className="h-4 w-4 mr-2" />
          Invite via Email
        </Button>
      </div>
    )}
  </div>
);

// Error state component
const ErrorState = ({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="rounded-full bg-destructive/10 p-4 mb-4">
      <AlertCircle className="h-10 w-10 text-destructive" />
    </div>
    <h3 className="text-lg font-semibold mb-2">Failed to load team members</h3>
    <p className="text-muted-foreground text-sm mb-6 max-w-sm">
      We couldn't load your team members. Please check your connection and try again.
    </p>
    <Button onClick={onRetry} variant="outline" disabled={isRetrying} className="gap-2">
      <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
      {isRetrying ? 'Retrying...' : 'Try Again'}
    </Button>
  </div>
);

// Status Badge component
const StatusBadge = ({ status }: { status: 'active' | 'pending' }) => {
  if (status === 'active') {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 gap-1">
        <Check className="h-3 w-3" />
        Active
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 gap-1">
      <Clock className="h-3 w-3" />
      Invited
    </Badge>
  );
};

// Inline Role Select with loading state
const InlineRoleSelect = ({
  currentRole,
  memberId,
  isOwner,
  isSelf,
  onRoleChange,
  disabled
}: {
  currentRole: OrgRole;
  memberId: string;
  isOwner: boolean;
  isSelf: boolean;
  onRoleChange: (memberId: string, currentRole: OrgRole, newRole: OrgRole) => Promise<void>;
  disabled?: boolean;
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingRole, setPendingRole] = useState<OrgRole | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const handleChange = async (newRole: OrgRole) => {
    if (newRole === currentRole) return;
    
    // Confirmation for demoting from manager
    if (currentRole === 'manager' && newRole !== 'manager') {
      setPendingRole(newRole);
      setShowConfirmDialog(true);
      return;
    }
    
    await performRoleChange(newRole);
  };
  
  const performRoleChange = async (newRole: OrgRole) => {
    setIsUpdating(true);
    try {
      await onRoleChange(memberId, currentRole, newRole);
    } finally {
      setIsUpdating(false);
      setPendingRole(null);
    }
  };
  
  const confirmDemotion = async () => {
    setShowConfirmDialog(false);
    if (pendingRole) {
      await performRoleChange(pendingRole);
    }
  };
  
  // Owner role is protected
  if (isOwner) {
    return (
      <span className="text-xs text-muted-foreground italic">Owner (protected)</span>
    );
  }
  
  // Self cannot change own role
  if (isSelf) {
    return (
      <Badge className={`${roleColors[currentRole]} gap-1.5 px-2.5 py-1 font-medium`} variant="secondary">
        {roleIcons[currentRole]}
        {ORG_ROLE_DISPLAY[currentRole]}
      </Badge>
    );
  }
  
  return (
    <>
      <div className="relative inline-flex items-center">
        <Select value={currentRole} onValueChange={v => handleChange(v as OrgRole)} disabled={disabled || isUpdating}>
          <SelectTrigger className="w-32 h-8 text-sm transition-all duration-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASSIGNABLE_ROLES.map(r => (
              <SelectItem key={r} value={r}>
                <div className="flex items-center gap-2">
                  {roleIcons[r]}
                  {ORG_ROLE_DISPLAY[r]}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isUpdating && (
          <div className="absolute -right-6 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will demote the user from Manager to {pendingRole ? ORG_ROLE_DISPLAY[pendingRole] : 'a lower role'}. 
              They will lose manager-level permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDemotion}>Confirm Change</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

// Module-level cache for team data to prevent refetching on navigation
const teamDataCache = new Map<string, {
  members: TeamMember[];
  invites: PendingInvite[];
  fetchedAt: number;
}>();

const CACHE_TTL = 30000; // 30 seconds

const TeamMembers = () => {
  const { organization, isOrgOwner, isOrgAdmin } = useOrganization();
  const { user } = useAuth();
  
  // Initialize from cache if available
  const cachedData = organization ? teamDataCache.get(organization.id) : null;
  const isCacheValid = cachedData && (Date.now() - cachedData.fetchedAt < CACHE_TTL);
  
  const [members, setMembers] = useState<TeamMember[]>(isCacheValid ? cachedData.members : []);
  const [invites, setInvites] = useState<PendingInvite[]>(isCacheValid ? cachedData.invites : []);
  const [status, setStatus] = useState<FetchStatus>(isCacheValid ? 'success' : 'idle');
  const [isRetrying, setIsRetrying] = useState(false);
  const hasFetchedRef = React.useRef(isCacheValid);
  
  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('employee');
  const [inviteNote, setInviteNote] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  
  // Resend/Cancel loading states
  const [loadingInviteId, setLoadingInviteId] = useState<string | null>(null);
  
  // Manual add dialog state
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);

  const fetchData = useCallback(async (isRetry = false, force = false) => {
    if (!organization) return;
    
    // Skip if we already have data and this isn't a forced refresh
    if (!force && hasFetchedRef.current && status === 'success') {
      return;
    }
    
    if (isRetry) {
      setIsRetrying(true);
    } else if (!hasFetchedRef.current) {
      // Only show loading if we don't have cached data
      setStatus('loading');
    }
    
    try {
      // Fetch members and invites in parallel
      const [membersResult, invitesResult] = await Promise.all([
        supabase
          .from('organization_members')
          .select('id, user_id, role, created_at')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('organization_invites')
          .select('id, email, role, note, status, created_at, expires_at')
          .eq('organization_id', organization.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
      ]);
      
      if (membersResult.error) throw membersResult.error;
      
      const membersData = membersResult.data || [];
      const invitesData = invitesResult.data || [];
      
      // Fetch profiles if we have members
      let profileMap = new Map<string, Profile>();
      if (membersData.length > 0) {
        const userIds = [...new Set(membersData.map(m => m.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .in('id', userIds);
        
        if (profilesData) {
          profilesData.forEach(p => profileMap.set(p.id, p));
        }
      }
      
      // Combine members with profiles
      const combinedMembers: TeamMember[] = membersData.map(m => ({
        ...m,
        role: m.role as OrgRole,
        profile: profileMap.get(m.user_id) || null,
        status: 'active' as const,
      }));
      
      const pendingInvites: PendingInvite[] = invitesData.map(i => ({
        ...i,
        role: i.role as OrgRole,
        status: 'pending' as const,
      }));
      
      // Update cache
      teamDataCache.set(organization.id, {
        members: combinedMembers,
        invites: pendingInvites,
        fetchedAt: Date.now(),
      });
      
      setMembers(combinedMembers);
      setInvites(pendingInvites);
      setStatus('success');
      hasFetchedRef.current = true;
    } catch (err) {
      console.error('[TeamMembers] Failed to load data:', err);
      setStatus('error');
    } finally {
      setIsRetrying(false);
    }
  }, [organization, status]);

  useEffect(() => {
    if (organization && !hasFetchedRef.current) {
      fetchData();
    }
  }, [organization?.id]);

  const handleRetry = () => fetchData(true, true);

  // Helper to update cache
  const updateCache = useCallback((newMembers: TeamMember[], newInvites: PendingInvite[]) => {
    if (organization) {
      teamDataCache.set(organization.id, {
        members: newMembers,
        invites: newInvites,
        fetchedAt: Date.now(),
      });
    }
  }, [organization]);
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Send invite via Edge Function
  const handleSendInvite = async () => {
    setInviteError('');
    
    // Validation
    if (!inviteEmail.trim()) {
      setInviteError('Email is required');
      return;
    }
    if (!validateEmail(inviteEmail)) {
      setInviteError('Please enter a valid email address');
      return;
    }
    
    // Check for duplicate - active member
    const existingMember = members.find(m => 
      m.profile?.full_name?.toLowerCase().includes(inviteEmail.toLowerCase())
    );
    if (existingMember) {
      setInviteError('This user is already a team member');
      return;
    }
    
    // Check for duplicate - pending invite
    const existingInvite = invites.find(i => 
      i.email.toLowerCase() === inviteEmail.toLowerCase()
    );
    if (existingInvite) {
      setInviteError('An invitation has already been sent to this email');
      return;
    }
    
    setIsSendingInvite(true);
    
    try {
      // Call edge function to send invite with email
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        setInviteError('Authentication required. Please log in again.');
        return;
      }

      const response = await supabase.functions.invoke('send-invite', {
        body: {
          email: inviteEmail.toLowerCase().trim(),
          role: inviteRole,
          note: inviteNote.trim() || null,
          organizationId: organization!.id,
        },
      });
      
      if (response.error) {
        console.error('[TeamMembers] Edge function error:', response.error);
        throw new Error(response.error.message || 'Failed to send invitation');
      }
      
      const result = response.data;
      
      if (!result.success) {
        // Handle specific error codes
        if (result.code === 'EMAIL_NOT_CONFIGURED') {
          setInviteError('Email service is not configured. Please contact your administrator.');
          toast.error('Email service not configured', {
            description: 'Invitation emails cannot be sent until email is configured.',
          });
          return;
        }
        if (result.code === 'EMAIL_SEND_FAILED') {
          setInviteError('Failed to send email. The invitation was not created.');
          toast.error('Email delivery failed', {
            description: result.details || 'Please check email configuration.',
          });
          return;
        }
        if (result.code === 'DOMAIN_NOT_VERIFIED') {
          setInviteError('Domain not verified. Please verify a domain at resend.com/domains to send emails to external recipients.');
          toast.error('Domain not verified', {
            description: 'Verify a domain at resend.com/domains to send emails to other recipients.',
            duration: 8000,
          });
          return;
        }
        throw new Error(result.error || 'Failed to send invitation');
      }
      
      // Success - add invite to UI
      const newInvite: PendingInvite = {
        id: result.invite.id,
        email: result.invite.email,
        role: result.invite.role as OrgRole,
        note: inviteNote.trim() || null,
        status: 'pending',
        created_at: result.invite.created_at,
        expires_at: result.invite.expires_at,
      };
      
      const newInvites = [newInvite, ...invites];
      setInvites(newInvites);
      updateCache(members, newInvites);
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('employee');
      setInviteNote('');
      toast.success('Invitation sent successfully', {
        description: `Email sent to ${newInvite.email}`,
      });
    } catch (err: any) {
      console.error('[TeamMembers] Failed to send invite:', err);
      const errorMessage = err?.message || 'Failed to send invitation. Please try again.';
      
      if (errorMessage.includes('already been sent') || errorMessage.includes('already pending')) {
        setInviteError('An invitation has already been sent to this email');
      } else if (errorMessage.includes('already a member')) {
        setInviteError('This user is already a member of the organization');
      } else {
        setInviteError(errorMessage);
      }
    } finally {
      setIsSendingInvite(false);
    }
  };

  // Resend invite via Edge Function
  const handleResendInvite = async (inviteId: string) => {
    setLoadingInviteId(inviteId);
    try {
      const response = await supabase.functions.invoke('send-invite', {
        body: {
          organizationId: organization!.id,
          resend: true,
          inviteId: inviteId,
        },
      });
      
      if (response.error) {
        console.error('[TeamMembers] Resend error:', response.error);
        throw new Error(response.error.message || 'Failed to resend invitation');
      }
      
      const result = response.data;
      
      if (!result.success) {
        if (result.code === 'EMAIL_NOT_CONFIGURED') {
          toast.error('Email service not configured', {
            description: 'Please configure email settings to resend invitations.',
          });
          return;
        }
        if (result.code === 'EMAIL_SEND_FAILED') {
          toast.error('Failed to send email', {
            description: result.details || 'Please check email configuration.',
          });
          return;
        }
        if (result.code === 'DOMAIN_NOT_VERIFIED') {
          toast.error('Domain not verified', {
            description: 'Verify a domain at resend.com/domains to send emails to other recipients.',
            duration: 8000,
          });
          return;
        }
        throw new Error(result.error || 'Failed to resend invitation');
      }
      
      // Update expires_at in local state
      const updatedInvites = invites.map(inv => 
        inv.id === inviteId 
          ? { ...inv, expires_at: result.invite.expires_at }
          : inv
      );
      setInvites(updatedInvites);
      updateCache(members, updatedInvites);
      
      toast.success('Invitation resent successfully', {
        description: `Email sent to ${result.invite.email}`,
      });
    } catch (err: any) {
      console.error('[TeamMembers] Failed to resend invite:', err);
      toast.error('Failed to resend invitation', {
        description: err?.message || 'Please try again.',
      });
    } finally {
      setLoadingInviteId(null);
    }
  };

  // Cancel invite
  const handleCancelInvite = async (inviteId: string) => {
    setLoadingInviteId(inviteId);
    try {
      const { error } = await supabase
        .from('organization_invites')
        .update({ status: 'cancelled' })
        .eq('id', inviteId);
      
      if (error) throw error;
      
      // Optimistic update
      const newInvites = invites.filter(i => i.id !== inviteId);
      setInvites(newInvites);
      updateCache(members, newInvites);
      toast.success('Invitation cancelled');
    } catch (err) {
      console.error('[TeamMembers] Failed to cancel invite:', err);
      toast.error('Failed to cancel invitation');
    } finally {
      setLoadingInviteId(null);
    }
  };

  // Update member role
  const updateMemberRole = async (memberId: string, currentRole: OrgRole, newRole: OrgRole): Promise<void> => {
    if (currentRole === 'owner' || newRole === 'owner') {
      toast.error('Owner role cannot be changed');
      return;
    }
    
    // Optimistic update
    const previousMembers = [...members];
    const newMembers = members.map(m => 
      m.id === memberId ? { ...m, role: newRole } : m
    );
    setMembers(newMembers);
    updateCache(newMembers, invites);
    
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);
      
      if (error) throw error;
      
      toast.success('Role updated successfully');
    } catch (err) {
      console.error('[TeamMembers] Failed to update role:', err);
      // Revert on failure
      setMembers(previousMembers);
      updateCache(previousMembers, invites);
      toast.error('Failed to update role');
    }
  };

  // Remove member
  const removeMember = async (memberId: string, memberRole: OrgRole) => {
    if (memberRole === 'owner') {
      toast.error('Cannot remove organization owner');
      return;
    }
    
    // Optimistic update
    const previousMembers = [...members];
    const newMembers = members.filter(m => m.id !== memberId);
    setMembers(newMembers);
    updateCache(newMembers, invites);
    
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
      
      toast.success('Member removed successfully');
    } catch (err) {
      console.error('[TeamMembers] Failed to remove member:', err);
      setMembers(previousMembers);
      updateCache(previousMembers, invites);
      toast.error('Failed to remove member');
    }
  };

  // Handle successful manual member addition
  const handleManualMemberAdded = useCallback((member: { id: string; email: string; fullName: string; role: OrgRole; isNewUser: boolean }) => {
    // Create a new TeamMember object
    const newMember: TeamMember = {
      id: crypto.randomUUID(), // Temporary ID, will be replaced on refetch
      user_id: member.id,
      role: member.role,
      created_at: new Date().toISOString(),
      profile: {
        id: member.id,
        full_name: member.fullName,
        phone: null,
      },
      status: 'active',
    };
    
    const newMembers = [...members, newMember];
    setMembers(newMembers);
    updateCache(newMembers, invites);
    
    // Force refresh to get accurate data
    setTimeout(() => fetchData(false, true), 500);
  }, [members, invites, updateCache, fetchData]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  // Combine members and invites for display
  const allItems: TeamListItem[] = [...members, ...invites];
  const userLimit = 20;
  const totalCount = members.length + invites.length;
  const canManageTeam = isOrgOwner;
  const isLoading = status === 'loading';
  const isError = status === 'error';
  const hasData = status === 'success' && allItems.length > 0;
  const isEmpty = status === 'success' && allItems.length === 0;

  // Access denied
  if (!isOrgAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> Team Members
        </h1>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 text-center py-10">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <p className="text-muted-foreground">Only owners and managers can view team members.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Team Members
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your team and permissions
          </p>
        </div>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            Members
            {!isLoading && <Badge variant="secondary" className="ml-1">{totalCount}</Badge>}
          </TabsTrigger>
          {isOrgOwner && (
            <TabsTrigger value="permissions" className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              Permissions
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          {/* Action Buttons */}
          {canManageTeam && (
            <div className="flex justify-end gap-2">
              {/* Add Member Manually Button */}
              <Button 
                variant="outline"
                disabled={totalCount >= userLimit}
                onClick={() => setAddMemberDialogOpen(true)}
                className="transition-all duration-200 hover:shadow-md active:scale-[0.98]"
              >
                <UserCog className="h-4 w-4 mr-2" />
                Add Manually
              </Button>
              
              {/* Invite via Email Button */}
              <Dialog open={inviteDialogOpen} onOpenChange={(open) => {
                setInviteDialogOpen(open);
                if (!open) {
                  setInviteEmail('');
                  setInviteRole('employee');
                  setInviteNote('');
                  setInviteError('');
                }
              }}>
                <DialogTrigger asChild>
                  <Button 
                    disabled={totalCount >= userLimit} 
                    className="transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Invite via Email
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      Invite Team Member
                    </DialogTitle>
                    <DialogDescription>
                      Send an invitation to join your organization.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email Address <span className="text-destructive">*</span></Label>
                      <Input 
                        id="invite-email"
                        type="email" 
                        placeholder="colleague@company.com"
                        value={inviteEmail} 
                        onChange={e => {
                          setInviteEmail(e.target.value);
                          setInviteError('');
                        }}
                        className={`h-10 ${inviteError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        disabled={isSendingInvite}
                      />
                      {inviteError && (
                        <p className="text-sm text-destructive flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                          <AlertCircle className="h-3 w-3" />
                          {inviteError}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Role</Label>
                      <Select value={inviteRole} onValueChange={v => setInviteRole(v as OrgRole)} disabled={isSendingInvite}>
                        <SelectTrigger id="invite-role" className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSIGNABLE_ROLES.map(r => (
                            <SelectItem key={r} value={r}>
                              <div className="flex items-center gap-2">
                                {roleIcons[r]}
                                {ORG_ROLE_DISPLAY[r]}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-note">Note (optional)</Label>
                      <Textarea 
                        id="invite-note"
                        placeholder="Add an internal note about this invitation..."
                        value={inviteNote}
                        onChange={e => setInviteNote(e.target.value)}
                        className="resize-none h-20"
                        disabled={isSendingInvite}
                      />
                      <p className="text-xs text-muted-foreground">This note is for internal reference only.</p>
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button 
                      variant="outline" 
                      onClick={() => setInviteDialogOpen(false)}
                      disabled={isSendingInvite}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSendInvite}
                      disabled={isSendingInvite}
                      className="min-w-[120px]"
                    >
                      {isSendingInvite ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Invite
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Team Card */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="text-lg">Team</CardTitle>
              <CardDescription>{organization?.name}'s members and pending invitations</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isError && <ErrorState onRetry={handleRetry} isRetrying={isRetrying} />}
              
              {isEmpty && (
                <EmptyState 
                  onInvite={() => setInviteDialogOpen(true)} 
                  onAddManually={() => setAddMemberDialogOpen(true)}
                  canInvite={canManageTeam} 
                />
              )}
              
              {isLoading && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="font-medium">Member</TableHead>
                        <TableHead className="font-medium">Status</TableHead>
                        <TableHead className="font-medium">Role</TableHead>
                        <TableHead className="font-medium">Joined</TableHead>
                        {canManageTeam && <TableHead className="font-medium text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TeamMemberSkeleton canManageTeam={canManageTeam} />
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {hasData && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="font-medium">Member</TableHead>
                        <TableHead className="font-medium">Status</TableHead>
                        <TableHead className="font-medium">Role</TableHead>
                        <TableHead className="font-medium">Joined</TableHead>
                        {canManageTeam && <TableHead className="font-medium text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allItems.map(item => (
                        <TableRow 
                          key={item.id} 
                          className="transition-colors duration-150 hover:bg-muted/50 group"
                        >
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border border-border/50 transition-transform group-hover:scale-105">
                                <AvatarFallback className={`text-xs font-medium ${
                                  isPendingInvite(item) 
                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : 'bg-primary/10 text-primary'
                                }`}>
                                  {isActiveMember(item) 
                                    ? getInitials(item.profile?.full_name || 'U')
                                    : <Mail className="h-4 w-4" />
                                  }
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-medium block">
                                  {isActiveMember(item) 
                                    ? item.profile?.full_name || 'Unknown User'
                                    : item.email
                                  }
                                </span>
                                {isActiveMember(item) && item.profile?.phone && (
                                  <span className="text-xs text-muted-foreground">{item.profile.phone}</span>
                                )}
                                {isPendingInvite(item) && item.note && (
                                  <span className="text-xs text-muted-foreground italic">Note: {item.note}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <StatusBadge status={item.status} />
                          </TableCell>
                          <TableCell className="py-4">
                            {isActiveMember(item) && canManageTeam ? (
                              <InlineRoleSelect
                                currentRole={item.role}
                                memberId={item.id}
                                isOwner={item.role === 'owner'}
                                isSelf={item.user_id === user?.id}
                                onRoleChange={updateMemberRole}
                              />
                            ) : (
                              <Badge className={`${roleColors[item.role]} gap-1.5 px-2.5 py-1 font-medium`} variant="secondary">
                                {roleIcons[item.role]}
                                {ORG_ROLE_DISPLAY[item.role]}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-4 text-muted-foreground">
                            {format(new Date(item.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          {canManageTeam && (
                            <TableCell className="py-4 text-right">
                              {isActiveMember(item) ? (
                                item.role !== 'owner' && item.user_id !== user?.id && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => removeMember(item.id, item.role)}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    Remove
                                  </Button>
                                )
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResendInvite(item.id)}
                                    disabled={loadingInviteId === item.id}
                                    className="gap-1"
                                  >
                                    {loadingInviteId === item.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <RotateCw className="h-3 w-3" />
                                    )}
                                    Resend
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancelInvite(item.id)}
                                    disabled={loadingInviteId === item.id}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        {isOrgOwner && (
          <TabsContent value="permissions">
            <StaffPermissionsMatrix />
          </TabsContent>
        )}
      </Tabs>
      
      {/* Add Team Member Dialog (Manual) */}
      {organization && (
        <AddTeamMemberDialog
          open={addMemberDialogOpen}
          onOpenChange={setAddMemberDialogOpen}
          organizationId={organization.id}
          onSuccess={handleManualMemberAdded}
        />
      )}
    </div>
  );
};

export default TeamMembers;
