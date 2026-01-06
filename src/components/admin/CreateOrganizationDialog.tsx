import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Building2, Loader2, UserPlus, ExternalLink, Settings } from 'lucide-react';

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  adminEmail?: string;
}

type PlanType = 'free' | 'basic' | 'pro' | 'enterprise';
type StatusType = 'trial' | 'active' | 'suspended';

export function CreateOrganizationDialog({
  open,
  onOpenChange,
  onSuccess,
  adminEmail,
}: CreateOrganizationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [createdOrg, setCreatedOrg] = useState<{
    id: string;
    name: string;
    ownerCreated: boolean;
    inviteSent: boolean;
  } | null>(null);

  // Form state
  const [organizationName, setOrganizationName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [plan, setPlan] = useState<PlanType>('basic');
  const [status, setStatus] = useState<StatusType>('trial');
  const [trialDays, setTrialDays] = useState(14);

  const resetForm = () => {
    setOrganizationName('');
    setOwnerEmail('');
    setPlan('basic');
    setStatus('trial');
    setTrialDays(14);
    setCreatedOrg(null);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onOpenChange(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organizationName.trim() || !ownerEmail.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('create-organization', {
        body: {
          organizationName: organizationName.trim(),
          ownerEmail: ownerEmail.trim().toLowerCase(),
          plan,
          status,
          trialDays: status === 'trial' ? trialDays : undefined,
          adminEmail,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create organization');
      }

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'Failed to create organization');
      }

      setCreatedOrg({
        id: data.organization.id,
        name: data.organization.name,
        ownerCreated: data.owner.created,
        inviteSent: data.owner.invite_sent,
      });

      toast.success('Organization created successfully', {
        description: data.owner.created 
          ? 'A new user account was created and invite sent.'
          : 'Organization linked to existing user.',
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating organization:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create organization';
      toast.error('Creation failed', { description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Success state - show next actions
  if (createdOrg) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Organization Created</DialogTitle>
                <DialogDescription>
                  {createdOrg.name} has been successfully created.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {createdOrg.ownerCreated && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                <UserPlus className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">New user account created</p>
                  <p className="text-muted-foreground">
                    {createdOrg.inviteSent 
                      ? 'A password reset email has been sent to the owner.'
                      : 'The owner will need to reset their password to access the account.'}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">What would you like to do next?</p>
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={handleClose}
                >
                  <ExternalLink className="h-4 w-4" />
                  View in Organizations List
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => {
                    resetForm();
                  }}
                >
                  <Building2 className="h-4 w-4" />
                  Create Another Organization
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create Organization
          </DialogTitle>
          <DialogDescription>
            Manually create a new organization with subscription settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name *</Label>
            <Input
              id="orgName"
              placeholder="Acme Corporation"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerEmail">Owner Email *</Label>
            <Input
              id="ownerEmail"
              type="email"
              placeholder="owner@example.com"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              disabled={loading}
              required
            />
            <p className="text-xs text-muted-foreground">
              If the user doesn't exist, an account will be created and an invite sent.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plan">Initial Plan</Label>
              <Select value={plan} onValueChange={(v: PlanType) => setPlan(v)} disabled={loading}>
                <SelectTrigger id="plan">
                  <SelectValue />
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
              <Label htmlFor="status">Initial Status</Label>
              <Select value={status} onValueChange={(v: StatusType) => setStatus(v)} disabled={loading}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="active">Active (Paid)</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {status === 'trial' && (
            <div className="space-y-2">
              <Label htmlFor="trialDays">Trial Duration (days)</Label>
              <Select 
                value={trialDays.toString()} 
                onValueChange={(v) => setTrialDays(parseInt(v))}
                disabled={loading}
              >
                <SelectTrigger id="trialDays">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Organization'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
