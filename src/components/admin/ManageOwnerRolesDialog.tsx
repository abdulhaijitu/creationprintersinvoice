import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertTriangle, Crown, Users, Shield, UserCog } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { processEdgeFunctionResponse } from '@/lib/edgeFunctionUtils';
import { toast } from 'sonner';
import { ORG_ROLE_DISPLAY } from '@/lib/permissions/constants';

interface OrganizationMember {
  id: string;
  user_id: string;
  role: string;
  profile?: {
    full_name: string;
  };
  email?: string;
}

interface ManageOwnerRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: {
    id: string;
    name: string;
    owner_id: string | null;
    owner_email?: string | null;
    member_count?: number;
  } | null;
  onSuccess: () => void;
}

export const ManageOwnerRolesDialog = ({
  open,
  onOpenChange,
  organization,
  onSuccess,
}: ManageOwnerRolesDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>('');
  const [confirmOwnerChange, setConfirmOwnerChange] = useState(false);
  const [memberRoleChanges, setMemberRoleChanges] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && organization) {
      fetchMembers();
      setError(null);
      setSelectedNewOwner('');
      setConfirmOwnerChange(false);
      setMemberRoleChanges({});
    }
  }, [open, organization]);

  const fetchMembers = async () => {
    if (!organization) return;
    setLoading(true);
    
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('id, user_id, role')
        .eq('organization_id', organization.id);

      if (memberError) throw memberError;

      // Fetch profiles for each member
      const membersWithProfiles = await Promise.all(
        (memberData || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', member.user_id)
            .single();
          
          // Get email from auth if this is the owner
          let email = '';
          if (member.user_id === organization.owner_id) {
            email = organization.owner_email || '';
          }
          
          return { 
            ...member, 
            profile: profile || undefined,
            email,
          };
        })
      );

      setMembers(membersWithProfiles);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError('Failed to load organization members');
    } finally {
      setLoading(false);
    }
  };

  const currentOwner = members.find(m => m.role === 'owner');
  const nonOwnerMembers = members.filter(m => m.role !== 'owner');

  const handleReassignOwner = async () => {
    if (!organization || !selectedNewOwner) return;

    setSaving(true);
    setError(null);

    try {
      const response = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'reassign_owner',
          organizationId: organization.id,
          userId: selectedNewOwner,
        }
      });

      const result = await processEdgeFunctionResponse(response);

      if (!result.success || result.error) {
        throw new Error(result.error || 'Failed to reassign owner');
      }

      toast.success('Organization owner reassigned successfully');
      setConfirmOwnerChange(false);
      setSelectedNewOwner('');
      onSuccess();
      fetchMembers();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reassign owner';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMemberRole = async (userId: string, newRole: string) => {
    if (!organization) return;

    // Track the change locally first
    setMemberRoleChanges(prev => ({ ...prev, [userId]: newRole }));

    try {
      const response = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'update_role',
          organizationId: organization.id,
          userId,
          role: newRole,
        }
      });

      const result = await processEdgeFunctionResponse(response);

      if (!result.success || result.error) {
        throw new Error(result.error || 'Failed to update role');
      }

      toast.success('Member role updated');
      fetchMembers();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update role';
      toast.error(message);
      // Revert local change
      setMemberRoleChanges(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    }
  };

  const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'outline' => {
    switch (role) {
      case 'owner': return 'default';
      case 'manager': return 'secondary';
      default: return 'outline';
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setError(null);
      setConfirmOwnerChange(false);
      setSelectedNewOwner('');
    }
    onOpenChange(isOpen);
  };

  if (!organization) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Manage Owner & Roles
          </DialogTitle>
          <DialogDescription>
            Manage ownership and member roles for <strong>{organization.name}</strong>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Current Owner Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                <Label className="text-sm font-medium">Current Owner</Label>
              </div>
              
              {currentOwner ? (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{currentOwner.profile?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{currentOwner.email || 'No email'}</p>
                    </div>
                    <Badge variant="default" className="flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      Owner
                    </Badge>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No owner assigned to this organization
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Separator />

            {/* Change Owner Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">Change Owner</Label>
              </div>

              {nonOwnerMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No other members to transfer ownership to
                </p>
              ) : (
                <div className="space-y-3">
                  <Select 
                    value={selectedNewOwner} 
                    onValueChange={setSelectedNewOwner}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select new owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {nonOwnerMembers.map(member => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          <div className="flex items-center gap-2">
                            <span>{member.profile?.full_name || 'Unknown'}</span>
                            <Badge variant="outline" className="text-xs">
                              {ORG_ROLE_DISPLAY[member.role as keyof typeof ORG_ROLE_DISPLAY] || member.role}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedNewOwner && !confirmOwnerChange && (
                    <Button 
                      variant="outline" 
                      onClick={() => setConfirmOwnerChange(true)}
                      className="w-full"
                    >
                      Transfer Ownership
                    </Button>
                  )}

                  {confirmOwnerChange && (
                    <Alert variant="destructive" className="border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <AlertDescription className="space-y-3">
                        <p className="font-medium">
                          Warning: Changing owner affects billing, permissions, and access
                        </p>
                        <p className="text-sm">
                          The current owner will be demoted to Manager. This action is logged and auditable.
                        </p>
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmOwnerChange(false)}
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleReassignOwner}
                            disabled={saving}
                          >
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Transfer
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Members Roles Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">
                  Member Roles ({members.length})
                </Label>
              </div>

              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No members found</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {members.map(member => (
                    <div 
                      key={member.id} 
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {member.profile?.full_name || 'Unknown'}
                        </p>
                        {member.email && (
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        )}
                      </div>
                      
                      {member.role === 'owner' ? (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          Owner
                        </Badge>
                      ) : (
                        <Select
                          value={memberRoleChanges[member.user_id] || member.role}
                          onValueChange={(value) => handleUpdateMemberRole(member.user_id, value)}
                        >
                          <SelectTrigger className="w-[110px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="accounts">Accounts</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
