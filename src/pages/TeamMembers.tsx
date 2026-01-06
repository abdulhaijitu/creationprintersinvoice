import { useState, useEffect } from 'react';
import { useOrganization, OrgRole } from '@/contexts/OrganizationContext';
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
import { toast } from 'sonner';
import { Users, UserPlus, Mail, Shield, Crown, Briefcase, Calculator } from 'lucide-react';
import { format } from 'date-fns';

interface TeamMember {
  id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
  profile?: {
    full_name: string;
    phone: string | null;
  };
  email?: string;
}

const roleIcons: Record<OrgRole, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  manager: <Shield className="h-3 w-3" />,
  accounts: <Calculator className="h-3 w-3" />,
  staff: <Briefcase className="h-3 w-3" />,
};

const roleColors: Record<OrgRole, string> = {
  owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
  manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  accounts: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  staff: 'bg-muted text-muted-foreground',
};

const TeamMembers = () => {
  const { organization, isOrgOwner, isOrgAdmin, subscription } = useOrganization();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('staff');
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (organization) {
      fetchMembers();
    }
  }, [organization]);

  const fetchMembers = async () => {
    if (!organization) return;

    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          role,
          created_at,
          profiles:user_id (full_name, phone)
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const membersWithProfiles = (data || []).map((member: any) => ({
        ...member,
        profile: member.profiles,
      }));

      setMembers(membersWithProfiles);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const updateMemberRole = async (memberId: string, newRole: OrgRole) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Role updated successfully');
      fetchMembers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const removeMember = async (memberId: string, memberRole: OrgRole) => {
    if (memberRole === 'owner') {
      toast.error('Cannot remove the organization owner');
      return;
    }

    if (!confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Team member removed');
      fetchMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove team member');
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    // Check user limit
    const userLimit = subscription?.user_limit || 5;
    if (members.length >= userLimit) {
      toast.error(`You've reached the maximum of ${userLimit} team members. Upgrade your plan to add more.`);
      return;
    }

    setIsInviting(true);
    
    // For now, just show a message since we don't have an invite system
    toast.info('Invite functionality coming soon!', {
      description: 'Team members will be able to join via email invitation.',
    });
    
    setInviteDialogOpen(false);
    setInviteEmail('');
    setInviteRole('staff');
    setIsInviting(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const userLimit = subscription?.user_limit || 5;
  const canInvite = members.length < userLimit;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Team Members
          </h1>
          <p className="text-muted-foreground">
            Manage your organization's team ({members.length}/{userLimit} members)
          </p>
        </div>
        {isOrgAdmin && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canInvite}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your organization
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as OrgRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="accounts">Accounts</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={isInviting}>
                  {isInviting ? 'Sending...' : 'Send Invitation'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
          <CardDescription>
            {organization?.name}'s team members and their roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    {isOrgAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>
                              {getInitials(member.profile?.full_name || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {member.profile?.full_name || 'Unknown User'}
                            </div>
                            {member.profile?.phone && (
                              <div className="text-sm text-muted-foreground">
                                {member.profile.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${roleColors[member.role]} gap-1`}>
                          {roleIcons[member.role]}
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(member.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      {isOrgAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {member.role !== 'owner' && (
                              <>
                                <Select
                                  value={member.role}
                                  onValueChange={(v) => updateMemberRole(member.id, v as OrgRole)}
                                  disabled={!isOrgOwner && member.role === 'manager'}
                                >
                                  <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {isOrgOwner && <SelectItem value="manager">Manager</SelectItem>}
                                    <SelectItem value="accounts">Accounts</SelectItem>
                                    <SelectItem value="staff">Staff</SelectItem>
                                  </SelectContent>
                                </Select>
                                {isOrgOwner && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => removeMember(member.id, member.role)}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
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

      {/* Plan Upgrade Prompt */}
      {!canInvite && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <h4 className="font-medium text-amber-800 dark:text-amber-200">
                Team limit reached
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Upgrade your plan to add more team members
              </p>
            </div>
            <Button variant="outline" className="border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900">
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeamMembers;
