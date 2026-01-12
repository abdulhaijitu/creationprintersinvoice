import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  UserPlus, 
  Loader2, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  RefreshCw,
  AlertCircle,
  Shield,
  Calculator,
  UserCheck,
  Palette,
  Briefcase
} from 'lucide-react';
import { OrgRole, ORG_ROLE_DISPLAY } from '@/lib/permissions/constants';

interface AddTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess: (member: { id: string; email: string; fullName: string; role: OrgRole; isNewUser: boolean }) => void;
}

const ASSIGNABLE_ROLES: OrgRole[] = ['manager', 'accounts', 'sales_staff', 'designer', 'employee'];

const roleIcons: Record<string, React.ReactNode> = {
  manager: <Shield className="h-4 w-4" />,
  accounts: <Calculator className="h-4 w-4" />,
  sales_staff: <UserCheck className="h-4 w-4" />,
  designer: <Palette className="h-4 w-4" />,
  employee: <Briefcase className="h-4 w-4" />,
};

// Generate a random password
function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export const AddTeamMemberDialog: React.FC<AddTeamMemberDialogProps> = ({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<OrgRole>('employee');
  const [password, setPassword] = useState('');
  const [forcePasswordReset, setForcePasswordReset] = useState(true);
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Success state
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdUser, setCreatedUser] = useState<{ email: string; password: string; fullName: string } | null>(null);

  const resetForm = useCallback(() => {
    setFullName('');
    setEmail('');
    setPhone('');
    setRole('employee');
    setPassword('');
    setForcePasswordReset(true);
    setShowPassword(false);
    setError('');
    setShowSuccess(false);
    setCreatedUser(null);
    setCopied(false);
  }, []);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword(12);
    setPassword(newPassword);
    setShowPassword(true);
  };

  const copyCredentials = async () => {
    if (!createdUser) return;
    
    const text = `Login Credentials for ${createdUser.fullName}:\nEmail: ${createdUser.email}\nPassword: ${createdUser.password}\n\nPlease change your password after first login.`;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Credentials copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    setError('');
    
    // Validation
    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await supabase.functions.invoke('add-team-member', {
        body: {
          email: email.toLowerCase().trim(),
          fullName: fullName.trim(),
          phone: phone.trim() || null,
          role,
          password,
          organizationId,
          forcePasswordReset,
        },
      });
      
      if (response.error) {
        console.error('[AddTeamMemberDialog] Edge function error:', response.error);
        throw new Error(response.error.message || 'Failed to add team member');
      }
      
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to add team member');
      }
      
      // Store credentials for display
      setCreatedUser({
        email: email.toLowerCase().trim(),
        password,
        fullName: fullName.trim(),
      });
      setShowSuccess(true);
      
      // Notify parent
      onSuccess({
        id: result.user.id,
        email: result.user.email,
        fullName: fullName.trim(),
        role,
        isNewUser: result.user.isNewUser,
      });
      
      toast.success('Team member added successfully', {
        description: result.user.isNewUser 
          ? 'New user account created and added to the team.'
          : 'Existing user added to the team.',
      });
      
    } catch (err: any) {
      console.error('[AddTeamMemberDialog] Error:', err);
      const errorMessage = err?.message || 'Failed to add team member';
      setError(errorMessage);
      toast.error('Failed to add team member', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {!showSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Add Team Member
              </DialogTitle>
              <DialogDescription>
                Manually create a team member account. They can log in immediately with the credentials you set.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="member-name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="member-name"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="member-email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="member-email"
                  type="email"
                  placeholder="john@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  disabled={isSubmitting}
                />
              </div>
              
              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="member-phone">Phone (optional)</Label>
                <Input
                  id="member-phone"
                  type="tel"
                  placeholder="+880 1XXX-XXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              
              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="member-role">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as OrgRole)} disabled={isSubmitting}>
                  <SelectTrigger id="member-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_ROLES.map((r) => (
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
              
              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="member-password">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleGeneratePassword}
                    disabled={isSubmitting}
                    className="h-7 text-xs gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Generate
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="member-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Click "Generate" for a secure random password.
                </p>
              </div>
              
              {/* Force Password Reset */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="force-reset"
                  checked={forcePasswordReset}
                  onCheckedChange={(checked) => setForcePasswordReset(checked === true)}
                  disabled={isSubmitting}
                />
                <Label htmlFor="force-reset" className="text-sm font-normal cursor-pointer">
                  Require password change on first login
                </Label>
              </div>
              
              {/* Error */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="min-w-[120px]">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                Team Member Added
              </DialogTitle>
              <DialogDescription>
                The team member can now log in with the credentials below.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              {/* Credentials Display */}
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Name</span>
                  <p className="font-medium">{createdUser?.fullName}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Email</span>
                  <p className="font-medium font-mono">{createdUser?.email}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Password</span>
                  <p className="font-medium font-mono bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded inline-block">
                    {createdUser?.password}
                  </p>
                </div>
              </div>
              
              {/* Copy Button */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={copyCredentials}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Credentials
                  </>
                )}
              </Button>
              
              {/* Security Notice */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Important:</strong> Share these credentials securely with the team member. 
                  {forcePasswordReset && ' They will be prompted to change their password on first login.'}
                </AlertDescription>
              </Alert>
            </div>
            
            <DialogFooter>
              <Button onClick={handleDone} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddTeamMemberDialog;
