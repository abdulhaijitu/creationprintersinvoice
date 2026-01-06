import { useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, Settings, KeyRound, Mail, CheckCircle2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { processEdgeFunctionResponse } from '@/lib/edgeFunctionUtils';

const passwordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

const emailSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
});

interface ManageUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    full_name: string;
  } | null;
  onSuccess: () => void;
}

export const ManageUserDialog = ({
  open,
  onOpenChange,
  user,
  onSuccess,
}: ManageUserDialogProps) => {
  const [activeTab, setActiveTab] = useState('password');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [forcePasswordReset, setForcePasswordReset] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [resetCredentials, setResetCredentials] = useState<{ email: string; password: string } | null>(null);

  const resetForm = () => {
    setPassword('');
    setNewEmail('');
    setForcePasswordReset(true);
    setSendEmail(true);
    setErrors({});
    setSuccess(null);
    setEmailSent(false);
    setResetCredentials(null);
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

  const handleResetPassword = async () => {
    if (!user) return;
    setErrors({});

    try {
      passwordSchema.parse({ password });

      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Authentication required');
        return;
      }

      const response = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'update_password',
          userId: user.id,
          email: user.email,
          password,
          forcePasswordReset,
          sendEmail,
          loginUrl: window.location.origin + '/login',
        },
      });

      // Process response with proper error extraction
      const result = await processEdgeFunctionResponse(response);
      
      if (!result.success || result.error) {
        throw new Error(result.error || 'Failed to reset password');
      }

      setSuccess('password');
      setEmailSent(result.data?.emailSent === true);
      setResetCredentials({ email: user.email, password });
      
      if (result.data?.emailSent) {
        toast.success('Password reset and credentials sent via email');
      } else if (sendEmail && result.data?.emailError) {
        toast.warning(`Password reset but email failed: ${result.data.emailError}`);
      } else {
        toast.success('Password reset successfully');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        const msg = error instanceof Error ? error.message : 'Failed to reset password';
        setErrors({ password: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  const copyEmailTemplate = () => {
    if (!resetCredentials || !user) return;
    const template = `Subject: Password Reset – PrintoSaas Platform

Hello ${user.full_name},

Your password has been reset by an administrator.

Login URL: ${window.location.origin}/login

Email: ${resetCredentials.email}
New Password: ${resetCredentials.password}

For security reasons, please change your password immediately after login.

Regards,
Creation Tech Team`;
    
    navigator.clipboard.writeText(template);
    toast.success('Email template copied to clipboard');
  };

  const handleUpdateEmail = async () => {
    if (!user) return;
    setErrors({});

    try {
      emailSchema.parse({ email: newEmail });

      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Authentication required');
        return;
      }

      const response = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'update_email',
          userId: user.id,
          email: newEmail,
        },
      });

      // Process response with proper error extraction
      const result = await processEdgeFunctionResponse(response);
      
      if (!result.success || result.error) {
        throw new Error(result.error || 'Failed to update email');
      }

      setSuccess('email');
      toast.success('Email updated successfully');
      
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        resetForm();
      }, 1500);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        const msg = error instanceof Error ? error.message : 'Failed to update email';
        setErrors({ email: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    onSuccess();
    onOpenChange(false);
    resetForm();
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Manage User
          </DialogTitle>
          <DialogDescription>
            Update credentials for <span className="font-medium">{user.full_name || user.email}</span>
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4 py-4 animate-fade-in">
            <div className="flex flex-col items-center justify-center">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3 mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold mb-1">
                {success === 'password' ? 'Password Reset' : 'Email Updated'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Changes have been applied successfully.
              </p>
              {emailSent && success === 'password' && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  New credentials sent via email
                </p>
              )}
            </div>

            {/* Manual Email Template for Password Reset */}
            {success === 'password' && resetCredentials && !emailSent && (
              <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Copy-Paste Email Template</Label>
                  <Button variant="outline" size="sm" onClick={copyEmailTemplate}>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-background p-3 rounded border max-h-40 overflow-y-auto">
{`Subject: Password Reset – PrintoSaas Platform

Hello ${user.full_name},

Your password has been reset by an administrator.

Login URL: ${window.location.origin}/login

Email: ${resetCredentials.email}
New Password: ${resetCredentials.password}

For security reasons, please change your password immediately after login.

Regards,
Creation Tech Team`}
                </pre>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button onClick={handleDone}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password" className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Password
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
            </TabsList>

            <TabsContent value="password" className="space-y-4 mt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={generatePassword}
                    className="h-auto py-1 px-2 text-xs"
                  >
                    Generate
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className={cn('pr-10', errors.password ? 'border-destructive' : '')}
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
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="forceResetManage"
                  checked={forcePasswordReset}
                  onCheckedChange={(checked) => setForcePasswordReset(checked as boolean)}
                />
                <Label htmlFor="forceResetManage" className="text-sm cursor-pointer">
                  Force password change on next login
                </Label>
              </div>

              {/* Send Email */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <Checkbox
                  id="sendEmailReset"
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                />
                <div className="flex-1">
                  <Label htmlFor="sendEmailReset" className="text-sm cursor-pointer flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Send new credentials via email
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    User will receive an email with the new password
                  </p>
                </div>
              </div>

              <Button onClick={handleResetPassword} disabled={loading || !password} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>
            </TabsContent>

            <TabsContent value="email" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="currentEmail">Current Email</Label>
                <Input
                  id="currentEmail"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newEmail">New Email</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email"
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <Button onClick={handleUpdateEmail} disabled={loading || !newEmail} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Email
              </Button>
            </TabsContent>
          </Tabs>
        )}

        {!success && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
