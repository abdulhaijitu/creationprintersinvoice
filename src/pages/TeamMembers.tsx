/**
 * Team Members Page - Robust data fetching with proper loading states
 */

import { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { OrgRole, ORG_ROLE_DISPLAY } from '@/lib/permissions/constants';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Users, UserPlus, Mail, Shield, Crown, Briefcase, Calculator, ShieldAlert, Palette, UserCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

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
}

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

// Skeleton loader component matching table layout
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
        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        {canManageTeam && (
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-2">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-20" />
            </div>
          </TableCell>
        )}
      </TableRow>
    ))}
  </>
);

// Empty state component
const EmptyState = ({ onInvite, canInvite }: { onInvite: () => void; canInvite: boolean }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="rounded-full bg-muted p-4 mb-4">
      <Users className="h-10 w-10 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
    <p className="text-muted-foreground text-sm mb-6 max-w-sm">
      Your team is empty. Start building your team by inviting members to collaborate.
    </p>
    {canInvite && (
      <Button onClick={onInvite} className="transition-all hover:shadow-md active:scale-[0.98]">
        <UserPlus className="h-4 w-4 mr-2" />
        Invite Your First Member
      </Button>
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

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

const TeamMembers = () => {
  const { organization, isOrgOwner, isOrgAdmin } = useOrganization();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [isRetrying, setIsRetrying] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('employee');

  const fetchMembers = useCallback(async (isRetry = false) => {
    if (!organization) return;
    
    if (isRetry) {
      setIsRetrying(true);
    } else {
      setStatus('loading');
    }
    
    try {
      // Fetch organization members first
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('id, user_id, role, created_at')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: true });
      
      if (membersError) throw membersError;
      
      if (!membersData || membersData.length === 0) {
        setMembers([]);
        setStatus('success');
        setIsRetrying(false);
        return;
      }
      
      // Get unique user IDs
      const userIds = [...new Set(membersData.map(m => m.user_id))];
      
      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', userIds);
      
      if (profilesError) {
        console.warn('[TeamMembers] Failed to fetch profiles:', profilesError);
      }
      
      // Create a map of user_id to profile
      const profileMap = new Map<string, Profile>();
      if (profilesData) {
        profilesData.forEach(p => {
          profileMap.set(p.id, p);
        });
      }
      
      // Combine members with their profiles
      const combinedMembers: TeamMember[] = membersData.map(m => ({
        ...m,
        role: m.role as OrgRole,
        profile: profileMap.get(m.user_id) || null,
      }));
      
      setMembers(combinedMembers);
      setStatus('success');
    } catch (err) {
      console.error('[TeamMembers] Failed to load team members:', err);
      setStatus('error');
    } finally {
      setIsRetrying(false);
    }
  }, [organization]);

  useEffect(() => {
    if (organization) {
      fetchMembers();
    }
  }, [organization, fetchMembers]);

  const handleRetry = () => {
    fetchMembers(true);
  };

  const updateMemberRole = async (memberId: string, currentRole: OrgRole, newRole: OrgRole) => {
    if (currentRole === 'owner') {
      toast.error('Owner role cannot be changed.');
      return;
    }
    if (newRole === 'owner') {
      toast.error('Cannot assign owner role.');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);
      
      if (error) throw error;
      
      // Update local state immediately for better UX
      setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, role: newRole } : m
      ));
      toast.success('Role updated successfully');
    } catch (err) {
      console.error('[TeamMembers] Failed to update role:', err);
      toast.error('Failed to update role');
    }
  };

  const removeMember = async (memberId: string, memberRole: OrgRole) => {
    if (memberRole === 'owner') {
      toast.error('Cannot remove organization owner');
      return;
    }
    if (!confirm('Are you sure you want to remove this member?')) return;
    
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
      
      // Update local state immediately
      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success('Member removed successfully');
    } catch (err) {
      console.error('[TeamMembers] Failed to remove member:', err);
      toast.error('Failed to remove member');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const userLimit = 20;
  const canManageTeam = isOrgOwner;
  const isLoading = status === 'loading';
  const isError = status === 'error';
  const hasData = status === 'success' && members.length > 0;
  const isEmpty = status === 'success' && members.length === 0;

  // Access denied state
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
      {/* Header - Always visible with Invite button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Team Members
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLoading ? (
              <span className="inline-flex items-center gap-1.5">
                <Skeleton className="h-3 w-16 inline-block" />
              </span>
            ) : (
              `${members.length}/${userLimit} members`
            )}
          </p>
        </div>
        {canManageTeam && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                disabled={hasData && members.length >= userLimit} 
                className="transition-all duration-200 hover:shadow-md active:scale-[0.98]"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
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
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email"
                    type="email" 
                    placeholder="colleague@company.com"
                    value={inviteEmail} 
                    onChange={e => setInviteEmail(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={v => setInviteRole(v as OrgRole)}>
                    <SelectTrigger id="role" className="h-10">
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => { 
                    toast.info('Invite feature coming soon!'); 
                    setInviteDialogOpen(false); 
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Team Card */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/50">
          <CardTitle className="text-lg">Team</CardTitle>
          <CardDescription>{organization?.name}'s members</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Error State */}
          {isError && <ErrorState onRetry={handleRetry} isRetrying={isRetrying} />}
          
          {/* Empty State */}
          {isEmpty && (
            <EmptyState 
              onInvite={() => setInviteDialogOpen(true)} 
              canInvite={canManageTeam} 
            />
          )}
          
          {/* Loading State - Skeleton Table */}
          {isLoading && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-medium">Member</TableHead>
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
          
          {/* Data Table */}
          {hasData && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-medium">Member</TableHead>
                    <TableHead className="font-medium">Role</TableHead>
                    <TableHead className="font-medium">Joined</TableHead>
                    {canManageTeam && <TableHead className="font-medium text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map(m => (
                    <TableRow 
                      key={m.id} 
                      className="transition-colors duration-150 hover:bg-muted/50 group"
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border/50 transition-transform group-hover:scale-105">
                            <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                              {getInitials(m.profile?.full_name || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium block">
                              {m.profile?.full_name || 'Unknown User'}
                            </span>
                            {m.profile?.phone && (
                              <span className="text-xs text-muted-foreground">
                                {m.profile.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge 
                          className={`${roleColors[m.role]} gap-1.5 px-2.5 py-1 font-medium`}
                          variant="secondary"
                        >
                          {roleIcons[m.role]}
                          {ORG_ROLE_DISPLAY[m.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-muted-foreground">
                        {format(new Date(m.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      {canManageTeam && (
                        <TableCell className="py-4 text-right">
                          {m.role === 'owner' ? (
                            <span className="text-xs text-muted-foreground italic">
                              Owner (protected)
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                              <Select 
                                value={m.role} 
                                onValueChange={v => updateMemberRole(m.id, m.role, v as OrgRole)}
                              >
                                <SelectTrigger className="w-32 h-9 text-sm">
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
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => removeMember(m.id, m.role)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                Remove
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
    </div>
  );
};

export default TeamMembers;
