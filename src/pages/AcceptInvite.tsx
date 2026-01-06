import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Shield, AlertCircle, Loader2 } from 'lucide-react';
import logo from '@/assets/logo.png';
import { cn } from '@/lib/utils';

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

type InviteStatus = 'loading' | 'valid' | 'expired' | 'used' | 'invalid' | 'success';

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<InviteStatus>('loading');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [organizationName, setOrganizationName] = useState<string>('');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('invalid');
        return;
      }

      try {
        // Find the user with this invite token
        const { data: userRole, error } = await supabase
          .from('user_roles')
          .select('user_id, invite_token, invite_token_expires_at, invite_used_at')
          .eq('invite_token', token)
          .maybeSingle();

        if (error || !userRole) {
          console.error('Token lookup error:', error);
          setStatus('invalid');
          return;
        }

        // Check if already used
        if (userRole.invite_used_at) {
          setStatus('used');
          return;
        }

        // Check if expired
        if (userRole.invite_token_expires_at) {
          const expiresAt = new Date(userRole.invite_token_expires_at);
          if (expiresAt < new Date()) {
            setStatus('expired');
            return;
          }
        }

        setUserId(userRole.user_id);

        // Get user email
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userRole.user_id)
          .maybeSingle();

        // Get organization name
        const { data: member } = await supabase
          .from('organization_members')
          .select('organization_id, organizations(name)')
          .eq('user_id', userRole.user_id)
          .maybeSingle();

        if (member?.organizations) {
          setOrganizationName((member.organizations as any).name || 'Your Organization');
        }

        // Get email from auth (need to call edge function or use other method)
        // For now, we'll show a generic message
        setUserEmail(profile?.full_name || 'your account');
        
        setStatus('valid');
      } catch (error) {
        console.error('Token verification error:', error);
        setStatus('invalid');
      }
    };

    verifyToken();
  }, [token]);

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

    if (!userId || !token) {
      toast.error('Invalid invite session');
      return;
    }

    setLoading(true);

    try {
      // We need to use the admin API to set the password
      // This requires an edge function since we don't have the user's session
      const response = await supabase.functions.invoke('accept-invite', {
        body: {
          token,
          newPassword,
        },
      });

      if (response.error || response.data?.error) {
        const errorMessage = response.data?.error || response.error?.message || 'Failed to set password';
        toast.error('Failed to set password', { description: errorMessage });
        setLoading(false);
        return;
      }

      setStatus('success');
      toast.success('Password set successfully!', {
        description: 'You can now log in with your new password.',
      });

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (error) {
      console.error('Error setting password:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Verifying invite link...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <img src={logo} alt="PrintoSaaS" className="h-16 w-auto mx-auto mb-4" />
          </div>
          
          <Card className="shadow-soft">
            <CardContent className="pt-6 text-center">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 w-fit mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Password Set Successfully!</h2>
              <p className="text-muted-foreground mb-4">
                Your account is ready. Redirecting you to the login page...
              </p>
              <Button onClick={() => navigate('/login', { replace: true })}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error states
  if (status === 'invalid' || status === 'expired' || status === 'used') {
    const errorMessages = {
      invalid: {
        title: 'Invalid Invite Link',
        description: 'This invite link is invalid or has been corrupted. Please contact your administrator for a new invite.',
      },
      expired: {
        title: 'Invite Link Expired',
        description: 'This invite link has expired. Please contact your administrator to request a new invite.',
      },
      used: {
        title: 'Invite Already Used',
        description: 'This invite link has already been used. If you need to reset your password, please use the forgot password option on the login page.',
      },
    };

    const error = errorMessages[status];

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <img src={logo} alt="PrintoSaaS" className="h-16 w-auto mx-auto mb-4" />
          </div>
          
          <Card className="shadow-soft">
            <CardContent className="pt-6 text-center">
              <div className="p-3 rounded-full bg-destructive/10 w-fit mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold mb-2">{error.title}</h2>
              <p className="text-muted-foreground mb-4">{error.description}</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => navigate('/login')}>
                  Go to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Valid token - show password setup form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <img src={logo} alt="PrintoSaaS" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">PrintoSaaS</h1>
        </div>

        <Card className="shadow-soft">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-2">
              <div className="p-3 rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Set Your Password</CardTitle>
            <CardDescription className="text-center">
              {organizationName ? (
                <>Welcome to <strong>{organizationName}</strong>! Please create a secure password to access your account.</>
              ) : (
                <>Please create a secure password to access your account.</>
              )}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
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
                    placeholder="Confirm your password"
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
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Setting Password...
                  </>
                ) : (
                  'Set Password & Continue'
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By setting your password, you agree to our Terms of Service and Privacy Policy.
              </p>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AcceptInvite;
