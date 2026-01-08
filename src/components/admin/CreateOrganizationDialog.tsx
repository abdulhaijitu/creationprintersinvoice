import { useState, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Building2, 
  Loader2, 
  UserPlus, 
  ExternalLink, 
  Mail, 
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  CheckCircle2,
  Copy
} from 'lucide-react';
import { processEdgeFunctionResponse } from '@/lib/edgeFunctionUtils';

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  adminEmail?: string;
}

type PlanType = 'free' | 'basic' | 'pro' | 'enterprise';
type StatusType = 'trial' | 'active' | 'suspended';
type OwnerRoleType = 'owner' | 'manager';

// Generate a strong password
function generateStrongPassword(): string {
  const length = 16;
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = lowercase + uppercase + numbers + symbols;
  
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Validate password
function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  return { valid: true, message: 'Password meets requirements' };
}

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
    ownerEmail: string;
    ownerPassword: string;
    emailSent: boolean;
    emailError?: string;
    plan: string;
    status: string;
  } | null>(null);

  // Form state
  const [organizationName, setOrganizationName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [plan, setPlan] = useState<PlanType>('basic');
  const [status, setStatus] = useState<StatusType>('trial');
  const [trialDays, setTrialDays] = useState(14);
  const [ownerRole, setOwnerRole] = useState<OwnerRoleType>('owner');
  const [inlineError, setInlineError] = useState<string | null>(null);

  const passwordValidation = useMemo(() => {
    if (!ownerPassword) return { valid: false, message: '' };
    return validatePassword(ownerPassword);
  }, [ownerPassword]);

  const resetForm = () => {
    setOrganizationName('');
    setOwnerEmail('');
    setOwnerPassword('');
    setShowPassword(false);
    setSendEmail(true);
    setPlan('basic');
    setStatus('trial');
    setTrialDays(14);
    setOwnerRole('owner');
    setCreatedOrg(null);
    setInlineError(null);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onOpenChange(false);
    }
  };

  const handleGeneratePassword = () => {
    const newPassword = generateStrongPassword();
    setOwnerPassword(newPassword);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);
    
    if (!organizationName.trim()) {
      setInlineError('Organization name is required');
      return;
    }
    
    if (!ownerEmail.trim()) {
      setInlineError('Owner email is required');
      return;
    }

    if (!ownerPassword.trim()) {
      setInlineError('Owner password is required');
      return;
    }

    if (!passwordValidation.valid) {
      setInlineError(passwordValidation.message);
      return;
    }

    setLoading(true);
    try {
      // Debug log in dev mode
      if (import.meta.env.DEV) {
        console.log('[CreateOrg] Submitting:', { 
          organizationName: organizationName.trim(),
          ownerEmail: ownerEmail.trim().toLowerCase(),
          plan,
          status,
          sendEmail
        });
      }

      const response = await supabase.functions.invoke('create-organization', {
        body: {
          organizationName: organizationName.trim(),
          ownerEmail: ownerEmail.trim().toLowerCase(),
          ownerPassword,
          ownerRole,
          plan,
          status,
          trialDays: status === 'trial' ? trialDays : undefined,
          adminEmail,
          sendEmail,
        },
      });

      // Debug log in dev mode
      if (import.meta.env.DEV) {
        console.log('[CreateOrg] Response:', response);
      }

      // Process response with proper error extraction
      const result = await processEdgeFunctionResponse(response);
      
      if (!result.success || result.error) {
        throw new Error(result.error || 'Failed to create organization');
      }

      const data = result.data;

      setCreatedOrg({
        id: data.organization.id,
        name: data.organization.name,
        ownerEmail: ownerEmail.trim().toLowerCase(),
        ownerPassword: ownerPassword,
        emailSent: data.email?.sent || false,
        emailError: data.email?.error,
        plan: data.subscription?.plan || plan,
        status: data.subscription?.status || status,
      });

      toast.success('Organization created successfully', {
        description: data.email?.sent 
          ? 'Login credentials sent to owner via email.'
          : 'Owner can now log in immediately.',
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating organization:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create organization';
      setInlineError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyEmailTemplate = () => {
    if (!createdOrg) return;
    const template = `Subject: Your Account Access – ${createdOrg.name}

Hello,

Your account has been created successfully.

Organization: ${createdOrg.name}

Login URL: ${window.location.origin}/login

Email: ${createdOrg.ownerEmail}
Password: ${createdOrg.ownerPassword}

For security reasons, please change your password immediately after login.

Regards,
Creation Tech Team`;
    
    navigator.clipboard.writeText(template);
    toast.success('Email template copied to clipboard');
  };

  // Success state
  if (createdOrg) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
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
            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Building2 className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Plan: {createdOrg.plan.charAt(0).toUpperCase() + createdOrg.plan.slice(1)}</p>
                <p className="text-muted-foreground">
                  Status: {createdOrg.status.charAt(0).toUpperCase() + createdOrg.status.slice(1)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
              <UserPlus className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Owner: {createdOrg.ownerEmail}</p>
                <p className="text-muted-foreground">
                  {createdOrg.emailSent 
                    ? 'Login credentials have been sent via email.'
                    : 'Owner can log in with the password you provided.'}
                </p>
              </div>
            </div>

            {createdOrg.emailError && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">Email Notice</p>
                  <p className="text-amber-700 dark:text-amber-300">
                    {createdOrg.emailError}. Please share credentials securely with the owner.
                  </p>
                </div>
              </div>
            )}

            {/* Manual Email Template */}
            {!createdOrg.emailSent && (
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Copy-Paste Email Template</Label>
                  <Button variant="outline" size="sm" onClick={copyEmailTemplate}>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-background p-3 rounded border max-h-40 overflow-y-auto">
{`Subject: Your Account Access – ${createdOrg.name}

Hello,

Your account has been created successfully.

Organization: ${createdOrg.name}

Login URL: ${window.location.origin}/login

Email: ${createdOrg.ownerEmail}
Password: ${createdOrg.ownerPassword}

For security reasons, please change your password immediately after login.

Regards,
Creation Tech Team`}
                </pre>
              </div>
            )}

            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-200">Password Reset Required</p>
                <p className="text-blue-700 dark:text-blue-300">
                  The owner will be required to change their password on first login.
                </p>
              </div>
            </div>

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
                  onClick={resetForm}
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create Organization
          </DialogTitle>
          <DialogDescription>
            Create a new organization with owner credentials.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Inline Error */}
          {inlineError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{inlineError}</p>
            </div>
          )}

          {/* Organization Name */}
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

          {/* Owner Email */}
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
          </div>

          {/* Owner Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ownerPassword">Owner Password *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleGeneratePassword}
                disabled={loading}
                className="h-auto py-1 px-2 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Generate
              </Button>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="ownerPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password (min 8 chars)"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  disabled={loading}
                  className="pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            {ownerPassword && (
              <p className={`text-xs ${passwordValidation.valid ? 'text-green-600' : 'text-destructive'}`}>
                {passwordValidation.message}
              </p>
            )}
          </div>

          {/* Send Email Checkbox */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <Checkbox
              id="sendEmail"
              checked={sendEmail}
              onCheckedChange={(checked) => setSendEmail(checked as boolean)}
              disabled={loading}
            />
            <div className="flex-1">
              <Label htmlFor="sendEmail" className="text-sm cursor-pointer flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Send login credentials via email
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Email will include organization name, email, password, and login URL
              </p>
            </div>
          </div>

          {/* Owner Role */}
          <div className="space-y-2">
            <Label htmlFor="ownerRole">Owner Role *</Label>
            <Select value={ownerRole} onValueChange={(v: OwnerRoleType) => setOwnerRole(v)} disabled={loading}>
              <SelectTrigger id="ownerRole">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Owner (Recommended)</span>
                    <span className="text-xs text-muted-foreground">Full control, billing, team management</span>
                  </div>
                </SelectItem>
                <SelectItem value="manager">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Manager</span>
                    <span className="text-xs text-muted-foreground">Operations only, no ownership yet</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {ownerRole === 'manager' && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Organization will be created without an owner. You'll need to assign an owner later.
              </p>
            )}
          </div>

          {/* Plan and Status */}
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
