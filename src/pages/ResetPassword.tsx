import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthPageBranding } from '@/hooks/useAuthPageBranding';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
  { label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { appName, logoUrl } = useAuthPageBranding();

  // Check if user needs password reset
  useEffect(() => {
    const checkResetStatus = async () => {
      if (authLoading) return;
      
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('must_reset_password')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error checking reset status:', error);
          setCheckingStatus(false);
          return;
        }

        // If user doesn't need to reset, redirect to dashboard
        if (!data?.must_reset_password) {
          navigate('/', { replace: true });
          return;
        }

        setCheckingStatus(false);
      } catch (error) {
        console.error('Error:', error);
        setCheckingStatus(false);
      }
    };

    checkResetStatus();
  }, [user, authLoading, navigate]);

  const isPasswordValid = passwordRequirements.every((req) => req.test(newPassword));
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      toast.error('Password does not meet requirements');
      return;
    }

    if (!passwordsMatch) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Update password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error('Failed to update password', {
          description: updateError.message,
        });
        setLoading(false);
        return;
      }

      // Get organization ID for audit log
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();

      // Clear the must_reset_password flag
      const { error: flagError } = await supabase
        .from('user_roles')
        .update({
          must_reset_password: false,
          password_reset_at: new Date().toISOString(),
        })
        .eq('user_id', user?.id);

      if (flagError) {
        console.error('Error clearing reset flag:', flagError);
      }

      // Log the password reset event
      if (memberData?.organization_id && user?.id) {
        await supabase.rpc('log_password_reset_event', {
          p_user_id: user.id,
          p_organization_id: memberData.organization_id,
          p_action_type: 'update',
          p_source: 'password_reset_page',
        });
      }

      toast.success('Password updated successfully', {
        description: 'You can now access your dashboard.',
      });

      // Navigate to dashboard
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Checking status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <img
            src={logoUrl}
            alt={appName}
            className="h-16 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-foreground">{appName}</h1>
        </div>

        <Card className="shadow-soft">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-2">
              <div className="p-3 rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Set New Password</CardTitle>
            <CardDescription className="text-center">
              For security reasons, you must set a new password before accessing your account.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium text-muted-foreground">Password requirements:</p>
                <ul className="space-y-1">
                  {passwordRequirements.map((req, index) => {
                    const passed = req.test(newPassword);
                    return (
                      <li
                        key={index}
                        className={cn(
                          'flex items-center gap-2 text-sm transition-colors',
                          passed ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                        )}
                      >
                        {passed ? (
                          <CheckCircle className="h-3.5 w-3.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        {req.label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={cn(
                      'pl-10 pr-10',
                      confirmPassword.length > 0 && !passwordsMatch && 'border-destructive'
                    )}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-sm text-destructive">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !isPasswordValid || !passwordsMatch}
              >
                {loading ? 'Updating Password...' : 'Set Password & Continue'}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                This step is required for your security. You cannot skip this.
              </p>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
