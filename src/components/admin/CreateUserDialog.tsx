import { useState, useEffect } from 'react';
import { z } from 'zod';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, UserPlus, CheckCircle2, Mail, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const userSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  role: z.enum(['admin', 'service', 'support']),
  forcePasswordReset: z.boolean().default(true),
});

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateUserDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateUserDialogProps) => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<string>('support');
  const [forcePasswordReset, setForcePasswordReset] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setEmail('');
    setFullName('');
    setPassword('');
    setRole('support');
    setForcePasswordReset(true);
    setSendEmail(true);
    setInlineError(null);
    setSuccess(false);
    setEmailSent(false);
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
    setShowPassword(true);
  };

  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async () => {
    setInlineError(null);
    
    try {
      const validatedData = userSchema.parse({
        email,
        fullName,
        password,
        role,
        forcePasswordReset,
      });

      setLoading(true);

      // Debug log in dev mode
      if (import.meta.env.DEV) {
        console.log('[CreateUser] Submitting:', { 
          email: validatedData.email, 
          fullName: validatedData.fullName,
          role: validatedData.role,
          sendEmail
        });
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setInlineError('Authentication required');
        return;
      }

      const response = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'create',
          email: validatedData.email,
          password: validatedData.password,
          fullName: validatedData.fullName,
          role: validatedData.role,
          forcePasswordReset: validatedData.forcePasswordReset,
          sendEmail,
          loginUrl: window.location.origin + '/login',
          isInternalUser: true, // Flag for internal platform users
        },
      });

      // Debug log in dev mode
      if (import.meta.env.DEV) {
        console.log('[CreateUser] Response:', response);
      }

      // Handle edge function errors
      if (response.error) {
        throw new Error(response.error.message || 'Failed to create user');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      if (!response.data?.success) {
        throw new Error('Failed to create user');
      }

      setSuccess(true);
      setEmailSent(response.data?.emailSent === true);
      
      if (response.data?.emailSent) {
        toast.success('User created and login credentials sent via email');
      } else if (sendEmail && response.data?.emailError) {
        toast.warning(`User created but email failed: ${response.data.emailError}`);
      } else {
        toast.success('User created successfully');
      }
      
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        setInlineError(firstError?.message || 'Validation error');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
        setInlineError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create Internal User
          </DialogTitle>
          <DialogDescription>
            Create a new platform user (Admin, Service, or Support role).
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 animate-fade-in">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold mb-1">User Created Successfully</h3>
            <p className="text-sm text-muted-foreground">
              {email} has been added to the system.
            </p>
            {emailSent && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                <Mail className="h-4 w-4" />
                Login credentials sent via email
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Inline Error */}
            {inlineError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">{inlineError}</p>
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={generatePassword}
                  className="h-auto py-1 px-2 text-xs"
                  disabled={loading}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Generate
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (min 8 chars)"
                  className="pr-10"
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
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
              {password && (
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={cn(
                        'h-1 flex-1 rounded-full transition-colors',
                        level <= passwordStrength
                          ? passwordStrength <= 2
                            ? 'bg-red-500'
                            : passwordStrength <= 3
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                          : 'bg-muted'
                      )}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Role - Internal roles only */}
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={role} onValueChange={setRole} disabled={loading}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Internal platform roles only. Use Organizations to manage client users.
              </p>
            </div>

            {/* Force Password Reset */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="forceReset"
                checked={forcePasswordReset}
                onCheckedChange={(checked) => setForcePasswordReset(checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="forceReset" className="text-sm cursor-pointer">
                Force password change on first login
              </Label>
            </div>

            {/* Send Email */}
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
                  Send login info via email
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Email will include credentials and login URL
                </p>
              </div>
            </div>
          </div>
        )}

        {!success && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
