/**
 * Simplified Team Members Page - Uses existing database role values
 */

import { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { OrgRole, ORG_ROLE_DISPLAY, ALL_ORG_ROLES } from '@/lib/permissions/constants';
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
import { Users, UserPlus, Mail, Shield, Crown, Briefcase, Calculator, ShieldAlert, Palette, UserCheck } from 'lucide-react';
import { format } from 'date-fns';

interface TeamMember {
  id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
  profile?: { full_name: string; phone: string | null };
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
  owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
  manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  accounts: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  sales_staff: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  designer: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100',
  employee: 'bg-muted text-muted-foreground',
};

const ASSIGNABLE_ROLES: OrgRole[] = ['manager', 'accounts', 'sales_staff', 'designer', 'employee'];

const TeamMembers = () => {
  const { organization, isOrgOwner, isOrgAdmin, subscription } = useOrganization();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('employee');

  useEffect(() => { if (organization) fetchMembers(); }, [organization]);

  const fetchMembers = async () => {
    if (!organization) return;
    try {
      const { data, error } = await supabase.from('organization_members')
        .select(`id, user_id, role, created_at, profiles:user_id (full_name, phone)`)
        .eq('organization_id', organization.id).order('created_at', { ascending: true });
      if (error) throw error;
      setMembers((data || []).map((m: any) => ({ ...m, profile: m.profiles })));
    } catch (error) { toast.error('Failed to load team members'); }
    finally { setLoading(false); }
  };

  const updateMemberRole = async (memberId: string, currentRole: OrgRole, newRole: OrgRole) => {
    if (currentRole === 'owner') {
      toast.error('Owner role cannot be changed. Contact super admin to reassign ownership.');
      return;
    }
    if (newRole === 'owner') {
      toast.error('Cannot assign owner role. Contact super admin to reassign ownership.');
      return;
    }
    
    const { error } = await supabase.from('organization_members').update({ role: newRole }).eq('id', memberId);
    if (error) toast.error('Failed to update role');
    else { toast.success('Role updated'); fetchMembers(); }
  };

  const removeMember = async (memberId: string, memberRole: OrgRole) => {
    if (memberRole === 'owner') { toast.error('Cannot remove owner'); return; }
    if (!confirm('Remove this member?')) return;
    const { error } = await supabase.from('organization_members').delete().eq('id', memberId);
    if (error) toast.error('Failed to remove'); else { toast.success('Removed'); fetchMembers(); }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  const userLimit = subscription?.user_limit || 5;
  const canManageTeam = isOrgOwner;

  if (!isOrgAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Team Members</h1>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Team Members</h1>
          <p className="text-muted-foreground">({members.length}/{userLimit} members)</p>
        </div>
        {canManageTeam && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild><Button disabled={members.length >= userLimit}><UserPlus className="h-4 w-4 mr-2" />Invite</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div><Label>Email</Label><Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} /></div>
                <div><Label>Role</Label>
                  <Select value={inviteRole} onValueChange={v => setInviteRole(v as OrgRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ASSIGNABLE_ROLES.map(r => <SelectItem key={r} value={r}>{ORG_ROLE_DISPLAY[r]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter><Button onClick={() => { toast.info('Coming soon!'); setInviteDialogOpen(false); }}>Send</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <Card>
        <CardHeader><CardTitle>Team</CardTitle><CardDescription>{organization?.name}'s members</CardDescription></CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Role</TableHead><TableHead>Joined</TableHead>{canManageTeam && <TableHead>Actions</TableHead>}</TableRow></TableHeader>
              <TableBody>
                {members.map(m => (
                  <TableRow key={m.id}>
                    <TableCell><div className="flex items-center gap-3"><Avatar className="h-9 w-9"><AvatarFallback>{getInitials(m.profile?.full_name || 'U')}</AvatarFallback></Avatar><span className="font-medium">{m.profile?.full_name || 'Unknown'}</span></div></TableCell>
                    <TableCell><Badge className={`${roleColors[m.role]} gap-1`}>{roleIcons[m.role]}{ORG_ROLE_DISPLAY[m.role]}</Badge></TableCell>
                    <TableCell>{format(new Date(m.created_at), 'MMM d, yyyy')}</TableCell>
                    {canManageTeam && <TableCell>
                      {m.role === 'owner' ? (
                        <span className="text-xs text-muted-foreground">Owner (protected)</span>
                      ) : (
                        <div className="flex gap-2">
                          <Select value={m.role} onValueChange={v => updateMemberRole(m.id, m.role, v as OrgRole)}>
                            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>{ASSIGNABLE_ROLES.map(r => <SelectItem key={r} value={r}>{ORG_ROLE_DISPLAY[r]}</SelectItem>)}</SelectContent>
                          </Select>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeMember(m.id, m.role)}>Remove</Button>
                        </div>
                      )}
                    </TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamMembers;
