import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { processEdgeFunctionResponse } from '@/lib/edgeFunctionUtils';
import { toast } from 'sonner';

type PlanType = 'free' | 'basic' | 'pro' | 'enterprise';
type StatusType = 'trial' | 'active' | 'suspended' | 'expired' | 'cancelled';

interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_email?: string | null;
  subscription?: {
    plan: string;
    status: string;
    trial_ends_at: string | null;
  };
}

interface EditOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: Organization | null;
  onSuccess: () => void;
}

export const EditOrganizationDialog = ({
  open,
  onOpenChange,
  organization,
  onSuccess,
}: EditOrganizationDialogProps) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    plan: 'free' as PlanType,
    status: 'trial' as StatusType,
  });

  useEffect(() => {
    if (organization && open) {
      setFormData({
        name: organization.name,
        plan: (organization.subscription?.plan || 'free') as PlanType,
        status: (organization.subscription?.status || 'trial') as StatusType,
      });
      setError(null);
      setSuccess(false);
    }
  }, [organization, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      const response = await supabase.functions.invoke('update-organization', {
        body: {
          organizationId: organization.id,
          updates: {
            name: formData.name !== organization.name ? formData.name : undefined,
            plan: formData.plan !== organization.subscription?.plan ? formData.plan : undefined,
            status: formData.status !== organization.subscription?.status ? formData.status : undefined,
          }
        }
      });

      const result = await processEdgeFunctionResponse(response);

      if (!result.success || result.error) {
        throw new Error(result.error || 'Failed to update organization');
      }

      setSuccess(true);
      toast.success('Organization updated successfully');
      
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 500);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update organization';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!organization) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Organization</DialogTitle>
          <DialogDescription>
            Update organization details and subscription settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-success/30 bg-success/5">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                Organization updated successfully!
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Organization name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Owner Email</Label>
            <Input
              value={organization.owner_email || '-'}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Owner email cannot be changed</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select 
                value={formData.plan} 
                onValueChange={(value: PlanType) => setFormData(prev => ({ ...prev, plan: value }))}
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

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
