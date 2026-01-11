/**
 * Accept Invite Page - Clean, focused invite acceptance flow
 * Works with organization_invites table
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  Shield, 
  AlertCircle, 
  Loader2,
  Building2,
  UserPlus,
  Mail,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthPageBranding } from '@/hooks/useAuthPageBranding';
import { ORG_ROLE_DISPLAY, OrgRole } from '@/lib/permissions/constants';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
  { label: 'One special character', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

type InviteStatus = 'loading' | 'valid' | 'expired' | 'used' | 'invalid' | 'processing' | 'success';
type Step = 'welcome' | 'password' | 'complete';

interface InviteData {
  id: string;
  email: string;
  role: OrgRole;
  organizationName: string;
  inviterName?: string;
  expiresAt: string;
}

const roleColors: Record<OrgRole, string> = {
  owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  accounts: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  sales_staff: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  designer: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200',
  employee: 'bg-muted text-muted-foreground',
};

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { appName, logoUrl } = useAuthPageBranding();
  
  const [status, setStatus] = useState<InviteStatus>('loading');
  const [step, setStep] = useState<Step>('welcome');
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('invalid');
        return;
      }

      try {
        // Find the invite by token
        const { data: invite, error } = await supabase
          .from('organization_invites')
          .select(`
            id,
            email,
            role,
            status,
            expires_at,
            invited_by,
            organization_id,
            organizations!inner(name)
          `)
          .eq('token', token)
          .maybeSingle();

        if (error || !invite) {
          console.error('Token lookup error:', error);
          setStatus('invalid');
          return;
        }

        // Check if already accepted
        if (invite.status === 'accepted') {
          setStatus('used');
          return;
        }

        // Check if cancelled
        if (invite.status === 'cancelled') {
          setStatus('invalid');
          return;
        }

        // Check if expired
        if (invite.expires_at) {
          const expiresAt = new Date(invite.expires_at);
          if (expiresAt < new Date()) {
            setStatus('expired');
            return;
          }
        }

        // Get inviter name if available
        let inviterName: string | undefined;
        if (invite.invited_by) {
          const { data: inviterProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', invite.invited_by)
            .maybeSingle();
          inviterName = inviterProfile?.full_name || undefined;
        }

        setInviteData({
          id: invite.id,
          email: invite.email,
          role: invite.role as OrgRole,
          organizationName: (invite.organizations as any)?.name || 'Your Organization',
          inviterName,
          expiresAt: invite.expires_at,
        });
        
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
  
  const passedRequirements = passwordRequirements.filter(req => req.test(newPassword)).length;
  const passwordStrength = Math.round((passedRequirements / passwordRequirements.length) * 100);

  const handleContinueToPassword = () => {
    setStep('password');
    setProgress(50);
  };

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

    if (!inviteData || !token) {
      toast.error('Invalid invite session');
      return;
    }

    setLoading(true);
    setStatus('processing');

    try {
      const response = await supabase.functions.invoke('accept-invite', {
        body: {
          token,
          newPassword,
        },
      });

      if (response.error || response.data?.error) {
        const errorMessage = response.data?.error || response.error?.message || 'Failed to accept invite';
        toast.error('Failed to join team', { description: errorMessage });
        setLoading(false);
        setStatus('valid');
        return;
      }

      setProgress(100);
      setStep('complete');
      setStatus('success');
      
      toast.success('Welcome to the team!', {
        description: 'Your account is ready. Redirecting to login...',
      });

      // Redirect to login after animation
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (error) {
      console.error('Error accepting invite:', error);
      toast.error('Something went wrong');
      setLoading(false);
      setStatus('valid');
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <div className="text-center animate-in fade-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 animate-ping opacity-20">
              <Shield className="h-12 w-12 mx-auto text-primary" />
            </div>
            <Shield className="h-12 w-12 mx-auto text-primary" />
          </div>
          <p className="mt-6 text-muted-foreground">Verifying your invite...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success' && step === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center mb-8">
            {logoUrl && (
              <img src={logoUrl} alt={appName} className="h-12 w-auto mx-auto mb-4" />
            )}
          </div>
          
          <Card className="shadow-lg border-green-200 dark:border-green-800/50 overflow-hidden">
            <div className="h-1 bg-green-500" />
            <CardContent className="pt-8 pb-8 text-center">
              <div className="relative inline-block">
                <div className="absolute inset-0 animate-ping">
                  <CheckCircle className="h-16 w-16 text-green-500 opacity-20" />
                </div>
                <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30 animate-in zoom-in duration-300">
                  <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold mt-6 mb-2">Welcome to the Team!</h2>
              <p className="text-muted-foreground mb-2">
                You've joined <strong>{inviteData?.organizationName}</strong>
              </p>
              <Badge className={cn('mt-2', roleColors[inviteData?.role || 'employee'])}>
                {ORG_ROLE_DISPLAY[inviteData?.role || 'employee']}
              </Badge>
              
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  <span>Redirecting you to login...</span>
                </div>
              </div>
              
              <Button 
                className="mt-4 w-full" 
                onClick={() => navigate('/login', { replace: true })}
              >
                Go to Login Now
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
        description: 'This invite link is invalid or has been cancelled. Please contact your administrator for a new invite.',
        icon: XCircle,
        color: 'text-destructive',
        bg: 'bg-destructive/10',
      },
      expired: {
        title: 'Invite Link Expired',
        description: 'This invite link has expired. Please contact your administrator to request a new invite.',
        icon: AlertCircle,
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-100 dark:bg-amber-900/30',
      },
      used: {
        title: 'Already Accepted',
        description: 'This invite has already been accepted. If you need to reset your password, use the forgot password option.',
        icon: CheckCircle,
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-900/30',
      },
    };

    const error = errorMessages[status];
    const Icon = error.icon;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-8">
            {logoUrl && (
              <img src={logoUrl} alt={appName} className="h-12 w-auto mx-auto mb-4" />
            )}
          </div>
          
          <Card className="shadow-lg">
            <CardContent className="pt-8 pb-6 text-center">
              <div className={cn('p-4 rounded-full w-fit mx-auto mb-4', error.bg)}>
                <Icon className={cn('h-10 w-10', error.color)} />
              </div>
              <h2 className="text-xl font-semibold mb-2">{error.title}</h2>
              <p className="text-muted-foreground text-sm mb-6">{error.description}</p>
              <div className="flex gap-3 justify-center">
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

  // Valid token - show invitation flow
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="text-center mb-6">
          {logoUrl && (
            <img src={logoUrl} alt={appName} className="h-12 w-auto mx-auto mb-3" />
          )}
          <h1 className="text-xl font-semibold text-foreground">{appName}</h1>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <Progress value={progress || 25} className="h-1" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span className={cn(step === 'welcome' && 'text-primary font-medium')}>Review</span>
            <span className={cn(step === 'password' && 'text-primary font-medium')}>Set Password</span>
            <span className={cn(step === 'complete' && 'text-primary font-medium')}>Complete</span>
          </div>
        </div>

        <Card className="shadow-lg overflow-hidden">
          {/* Welcome Step */}
          {step === 'welcome' && (
            <>
              <CardHeader className="space-y-4 text-center pb-4">
                <div className="mx-auto p-3 rounded-full bg-primary/10">
                  <UserPlus className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">You're Invited!</CardTitle>
                  <CardDescription className="mt-2">
                    {inviteData?.inviterName ? (
                      <><strong>{inviteData.inviterName}</strong> has invited you to join</>
                    ) : (
                      <>You've been invited to join</>
                    )}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Organization Card */}
                <div className="p-4 rounded-xl bg-muted/50 border space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background border">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{inviteData?.organizationName}</p>
                      <p className="text-sm text-muted-foreground">Organization</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{inviteData?.email}</span>
                    </div>
                    <Badge className={cn(roleColors[inviteData?.role || 'employee'])}>
                      {ORG_ROLE_DISPLAY[inviteData?.role || 'employee']}
                    </Badge>
                  </div>
                </div>

                {/* Welcome message */}
                <p className="text-sm text-muted-foreground text-center">
                  Set up your password to access your account and start collaborating with your team.
                </p>

                <Button 
                  className="w-full gap-2" 
                  size="lg"
                  onClick={handleContinueToPassword}
                >
                  Accept & Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </>
          )}

          {/* Password Step */}
          {step === 'password' && (
            <form onSubmit={handleSubmit}>
              <CardHeader className="space-y-1 pb-4">
                <div className="flex items-center justify-center mb-2">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-xl text-center">Create Your Password</CardTitle>
                <CardDescription className="text-center">
                  Set a strong password for <strong>{inviteData?.email}</strong>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Password Input */}
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
                      className="pl-10 pr-10 h-11"
                      required
                      autoComplete="new-password"
                      autoFocus
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength */}
                {newPassword.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Password strength</span>
                      <span className={cn(
                        passwordStrength < 40 ? 'text-destructive' :
                        passwordStrength < 80 ? 'text-amber-500' : 'text-green-500'
                      )}>
                        {passwordStrength < 40 ? 'Weak' : passwordStrength < 80 ? 'Medium' : 'Strong'}
                      </span>
                    </div>
                    <Progress 
                      value={passwordStrength} 
                      className={cn('h-1.5', 
                        passwordStrength < 40 ? '[&>div]:bg-destructive' :
                        passwordStrength < 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'
                      )} 
                    />
                  </div>
                )}

                {/* Requirements */}
                <div className="space-y-1.5 p-3 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Requirements:</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    {passwordRequirements.map((req, index) => {
                      const passed = req.test(newPassword);
                      return (
                        <div
                          key={index}
                          className={cn(
                            'flex items-center gap-1.5 text-xs transition-colors',
                            passed ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                          )}
                        >
                          {passed ? (
                            <CheckCircle className="h-3 w-3 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-3 w-3 flex-shrink-0" />
                          )}
                          <span>{req.label}</span>
                        </div>
                      );
                    })}
                  </div>
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
                        'pl-10 pr-10 h-11',
                        confirmPassword.length > 0 && !passwordsMatch && 'border-destructive focus-visible:ring-destructive'
                      )}
                      required
                      autoComplete="new-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Passwords do not match
                    </p>
                  )}
                  {passwordsMatch && (
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Passwords match
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2"
                  size="lg"
                  disabled={loading || !isPasswordValid || !passwordsMatch}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Joining Team...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Accept & Join Team
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By joining, you agree to our Terms of Service and Privacy Policy.
                </p>
              </CardContent>
            </form>
          )}
        </Card>
        
        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Need help? Contact your organization administrator.
        </p>
      </div>
    </div>
  );
};

export default AcceptInvite;