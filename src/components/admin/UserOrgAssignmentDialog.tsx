import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Building2, Loader2, X } from 'lucide-react';
import { useAdminAudit } from '@/hooks/useAdminAudit';

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface UserMembership {
  organization_id: string;
  role: string;
}

interface UserOrgAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    full_name: string;
  } | null;
  onSuccess: () => void;
}

type OrgRole = 'owner' | 'manager' | 'staff' | 'accounts';

export const UserOrgAssignmentDialog = ({
  open,
  onOpenChange,
  user,
  onSuccess,
}: UserOrgAssignmentDialogProps) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentMemberships, setCurrentMemberships] = useState<UserMembership[]>([]);
  const [selectedOrgs, setSelectedOrgs] = useState<Map<string, OrgRole>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { logAction } = useAdminAudit();

  useEffect(() => {
    if (open && user) {
      fetchData();
    }
  }, [open, user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch all organizations
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .order('name');

      if (orgsError) throw orgsError;
      setOrganizations(orgs || []);

      // Fetch user's current memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id);

      if (membershipsError) throw membershipsError;
      setCurrentMemberships(memberships || []);

      // Initialize selected orgs with current memberships
      const initialSelected = new Map<string, OrgRole>();
      (memberships || []).forEach((m) => {
        initialSelected.set(m.organization_id, m.role as OrgRole);
      });
      setSelectedOrgs(initialSelected);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOrgToggle = (orgId: string, checked: boolean) => {
    const newSelected = new Map(selectedOrgs);
    if (checked) {
      newSelected.set(orgId, 'staff');
    } else {
      newSelected.delete(orgId);
    }
    setSelectedOrgs(newSelected);
  };

  const handleRoleChange = (orgId: string, role: OrgRole) => {
    const newSelected = new Map(selectedOrgs);
    newSelected.set(orgId, role);
    setSelectedOrgs(newSelected);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const currentOrgIds = new Set(currentMemberships.map((m) => m.organization_id));
      const newOrgIds = new Set(selectedOrgs.keys());

      // Organizations to add
      const toAdd = [...newOrgIds].filter((id) => !currentOrgIds.has(id));
      
      // Organizations to remove
      const toRemove = [...currentOrgIds].filter((id) => !newOrgIds.has(id));
      
      // Organizations to update (role change)
      const toUpdate = [...newOrgIds].filter((id) => {
        if (!currentOrgIds.has(id)) return false;
        const currentRole = currentMemberships.find((m) => m.organization_id === id)?.role;
        return currentRole !== selectedOrgs.get(id);
      });

      // Process removals
      for (const orgId of toRemove) {
        const { error } = await supabase
          .from('organization_members')
          .delete()
          .eq('user_id', user.id)
          .eq('organization_id', orgId);

        if (error) throw error;
      }

      // Process additions
      for (const orgId of toAdd) {
        const role = selectedOrgs.get(orgId) || 'staff';
        const { error } = await supabase
          .from('organization_members')
          .insert({
            user_id: user.id,
            organization_id: orgId,
            role: role,
          });

        if (error) throw error;
      }

      // Process updates
      for (const orgId of toUpdate) {
        const role = selectedOrgs.get(orgId) || 'staff';
        const { error } = await supabase
          .from('organization_members')
          .update({ role: role })
          .eq('user_id', user.id)
          .eq('organization_id', orgId);

        if (error) throw error;
      }

      // Log the action
      await logAction('update_user_organizations', 'user', user.id, {
        user_email: user.email,
        added: toAdd.length,
        removed: toRemove.length,
        updated: toUpdate.length,
      });

      toast.success('Organization assignments updated');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast.error('Failed to save assignments');
    } finally {
      setSaving(false);
    }
  };

  const filteredOrgs = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasChanges = () => {
    const currentOrgIds = new Set(currentMemberships.map((m) => m.organization_id));
    const newOrgIds = new Set(selectedOrgs.keys());

    // Check for additions/removals
    if (currentOrgIds.size !== newOrgIds.size) return true;
    for (const id of newOrgIds) {
      if (!currentOrgIds.has(id)) return true;
    }

    // Check for role changes
    for (const membership of currentMemberships) {
      const newRole = selectedOrgs.get(membership.organization_id);
      if (newRole && newRole !== membership.role) return true;
    }

    return false;
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Manage Organization Access
          </DialogTitle>
          <DialogDescription>
            Assign <span className="font-medium">{user.full_name || user.email}</span> to one or more organizations.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Current assignments summary */}
            {selectedOrgs.size > 0 && (
              <div className="flex flex-wrap gap-2 pb-2">
                {[...selectedOrgs.entries()].map(([orgId, role]) => {
                  const org = organizations.find((o) => o.id === orgId);
                  if (!org) return null;
                  return (
                    <Badge
                      key={orgId}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {org.name}
                      <span className="text-muted-foreground">({role})</span>
                      <button
                        onClick={() => handleOrgToggle(orgId, false)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Organization list */}
            <ScrollArea className="flex-1 border rounded-lg max-h-[300px]">
              <div className="p-1">
                {filteredOrgs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No organizations found
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredOrgs.map((org) => {
                      const isSelected = selectedOrgs.has(org.id);
                      const currentRole = selectedOrgs.get(org.id);

                      return (
                        <div
                          key={org.id}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={org.id}
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                handleOrgToggle(org.id, checked as boolean)
                              }
                            />
                            <Label
                              htmlFor={org.id}
                              className="flex flex-col cursor-pointer"
                            >
                              <span className="font-medium">{org.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {org.slug}
                              </span>
                            </Label>
                          </div>

                          {isSelected && (
                            <Select
                              value={currentRole}
                              onValueChange={(value) =>
                                handleRoleChange(org.id, value as OrgRole)
                              }
                            >
                              <SelectTrigger className="w-[120px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="owner">Owner</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="accounts">Accounts</SelectItem>
                                <SelectItem value="staff">Staff</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges()}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
