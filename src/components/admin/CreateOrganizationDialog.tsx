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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Building2, 
  Loader2, 
  UserPlus, 
  ExternalLink, 
  Mail, 
  KeyRound, 
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  Shield
} from 'lucide-react';

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  adminEmail?: string;
}

type PlanType = 'free' | 'basic' | 'pro' | 'enterprise';
type StatusType = 'trial' | 'active' | 'suspended';
type PasswordMethod = 'invite' | 'temporary';

// Generate a strong password
function generateStrongPassword(): string {
  const length = 16;
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = lowercase + uppercase + numbers + symbols;
  
  // Ensure at least one of each type
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Validate password strength
function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 12) {
    return { valid: false, message: 'Password must be at least 12 characters' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain a lowercase letter' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain an uppercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain a number' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    return { valid: false, message: 'Password must contain a special character' };
  }
  return { valid: true, message: 'Strong password' };
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
    ownerCreated: boolean;
    emailSent: boolean;
    emailError?: string;
    plan: string;
    status: string;
    passwordMethod: PasswordMethod;
  } | null>(null);

  // Form state
  const [organizationName, setOrganizationName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [plan, setPlan] = useState<PlanType>('basic');
  const [status, setStatus] = useState<StatusType>('trial');
  const [trialDays, setTrialDays] = useState(14);
  
  // Password setup options
  const [passwordMethod, setPasswordMethod] = useState<PasswordMethod>('invite');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const passwordValidation = useMemo(() => {
    if (passwordMethod !== 'temporary' || !temporaryPassword) {
      return { valid: true, message: '' };
    }
    return validatePassword(temporaryPassword);
  }, [passwordMethod, temporaryPassword]);

  const resetForm = () => {
    setOrganizationName('');
    setOwnerEmail('');
    setPlan('basic');
    setStatus('trial');
    setTrialDays(14);
    setPasswordMethod('invite');
    setTemporaryPassword('');
    setShowPassword(false);
    setCreatedOrg(null);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onOpenChange(false);
    }
  };

  const handleGeneratePassword = () => {
    const newPassword = generateStrongPassword();
    setTemporaryPassword(newPassword);
    setShowPassword(true); // Show it so admin can copy if needed
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organizationName.trim() || !ownerEmail.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate password if temporary method is selected
    if (passwordMethod === 'temporary') {
      if (!temporaryPassword) {
        toast.error('Please generate or enter a temporary password');
        return;
      }
      if (!passwordValidation.valid) {
        toast.error(passwordValidation.message);
        return;
      }
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
          passwordMethod,
          temporaryPassword: passwordMethod === 'temporary' ? temporaryPassword : undefined,
        },
      });

      const data = response.data;

      // Handle error responses from the edge function
      if (response.error || (data && data.error)) {
        const errorMessage = data?.error || response.error?.message || 'Failed to create organization';
        throw new Error(errorMessage);
      }

      if (!data?.success) {
        throw new Error('Failed to create organization');
      }

      setCreatedOrg({
        id: data.organization.id,
        name: data.organization.name,
        ownerCreated: data.owner.created,
        emailSent: data.email?.sent || false,
        emailError: data.email?.error,
        plan: data.subscription?.plan || plan,
        status: data.subscription?.status || status,
        passwordMethod,
      });

      const emailStatus = data.email?.sent 
        ? 'Email sent successfully.'
        : 'Organization created (email not sent).';

      toast.success('Organization created successfully', {
        description: data.owner.created 
          ? `New user created. ${emailStatus}`
          : `Linked to existing user. ${emailStatus}`,
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
            {/* Plan Info */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Building2 className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Plan: {createdOrg.plan.charAt(0).toUpperCase() + createdOrg.plan.slice(1)}</p>
                <p className="text-muted-foreground">
                  Status: {createdOrg.status.charAt(0).toUpperCase() + createdOrg.status.slice(1)}
                </p>
              </div>
            </div>

            {createdOrg.ownerCreated && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                <UserPlus className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">New user account created</p>
                  <p className="text-muted-foreground">
                    {createdOrg.passwordMethod === 'invite' ? (
                      createdOrg.emailSent 
                        ? 'A secure invite email has been sent with a link to set their password. The link expires in 24 hours.'
                        : createdOrg.emailError 
                          ? `Email failed: ${createdOrg.emailError}. The user will need to contact support.`
                          : 'No email was sent. The user will need to contact support for access.'
                    ) : (
                      createdOrg.emailSent
                        ? 'A credential email has been sent with login details and instructions to reset password on first login.'
                        : createdOrg.emailError
                          ? `Email failed: ${createdOrg.emailError}. Please share credentials securely.`
                          : 'Temporary password set. Please share credentials securely with the user.'
                    )}
                  </p>
                </div>
              </div>
            )}

            {!createdOrg.ownerCreated && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                <UserPlus className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Existing user linked</p>
                  <p className="text-muted-foreground">
                    {createdOrg.emailSent 
                      ? 'An access notification email has been sent. They can log in with their existing credentials.'
                      : 'User can access the organization with their existing credentials.'}
                  </p>
                </div>
              </div>
            )}

            {/* Security reminder for temporary password */}
            {createdOrg.ownerCreated && createdOrg.passwordMethod === 'temporary' && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">Password Reset Required</p>
                  <p className="text-amber-700 dark:text-amber-300">
                    The user will be required to change their password on first login.
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
          </div>

          {/* Password Setup Method */}
          <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
            <Label className="text-sm font-medium">Password Setup Method</Label>
            <RadioGroup 
              value={passwordMethod} 
              onValueChange={(v: PasswordMethod) => {
                setPasswordMethod(v);
                if (v === 'invite') {
                  setTemporaryPassword('');
                }
              }}
              disabled={loading}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="invite" id="invite" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="invite" className="flex items-center gap-2 cursor-pointer font-medium">
                    <Mail className="h-4 w-4 text-primary" />
                    Send Invite Email
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Recommended</span>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    User receives secure email to set their own password. Existing users receive access notification.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="temporary" id="temporary" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="temporary" className="flex items-center gap-2 cursor-pointer font-medium">
                    <KeyRound className="h-4 w-4 text-amber-600" />
                    Set Temporary Password
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">Advanced</span>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Set an initial password. User must change it on first login.
                  </p>
                </div>
              </div>
            </RadioGroup>

            {/* Temporary Password Section */}
            {passwordMethod === 'temporary' && (
              <div className="mt-4 space-y-3 pt-3 border-t">
                <div className="flex items-start gap-2 p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    User will be forced to change this password on first login. Never share passwords via insecure channels.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tempPassword">Temporary Password *</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="tempPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter or generate password"
                        value={temporaryPassword}
                        onChange={(e) => setTemporaryPassword(e.target.value)}
                        disabled={loading}
                        className="pr-10"
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
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleGeneratePassword}
                      disabled={loading}
                      title="Generate strong password"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  {temporaryPassword && (
                    <p className={`text-xs ${passwordValidation.valid ? 'text-green-600' : 'text-destructive'}`}>
                      {passwordValidation.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Requirements: 12+ characters, uppercase, lowercase, number, special character
                  </p>
                </div>
              </div>
            )}
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