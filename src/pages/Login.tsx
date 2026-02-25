import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { APP_CONFIG } from '@/lib/appConfig';
import appLogo from '@/assets/app-logo.jpg';
import PWAInstallButton from '@/components/pwa/PWAInstallButton';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const appName = APP_CONFIG.name;
  const appTagline = APP_CONFIG.tagline;
  const logoUrl = appLogo;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    const audit = async (payload: Record<string, unknown>) => {
      try {
        await supabase.functions.invoke('audit-log', {
          body: payload,
        });
      } catch {
        // best-effort only
      }
    };

    try {
      const { error } = await signIn(normalizedEmail, password);

      if (error) {
        const msg = (error.message || '').toLowerCase();

        void audit({
          actor_email: normalizedEmail,
          actor_type: 'user',
          action_type: 'login_failed',
          action_label: 'Login failed',
          entity_type: 'session',
          source: 'ui',
          metadata: {
            reason: msg.includes('invalid login credentials') ? 'invalid_credentials' : 'auth_error',
          },
        });

        if (msg.includes('email not confirmed')) {
          toast.error('Please verify your email', {
            description: 'Check your inbox and confirm your email address to continue.',
          });
          return;
        }

        if (msg.includes('invalid login credentials')) {
          toast.error('Invalid email or password');
          return;
        }

        toast.error('Login failed', {
          description: error.message,
        });
        return;
      }

      // Give role/user bootstrap triggers a moment to complete
      await new Promise((r) => setTimeout(r, 150));

      const { data: userData } = await supabase.auth.getUser();
      const authedUser = userData.user;

      if (!authedUser) {
        toast.error('Login failed', {
          description: 'Could not load your session. Please try again.',
        });
        return;
      }

      const emailConfirmedAt = (authedUser as any).email_confirmed_at ?? (authedUser as any).confirmed_at;
      if (!emailConfirmedAt) {
        await supabase.auth.signOut();
        toast.error('Please verify your email', {
          description: 'Check your inbox and confirm your email address to continue.',
        });
        void audit({
          actor_id: authedUser.id,
          actor_email: authedUser.email,
          actor_type: 'user',
          action_type: 'access',
          action_label: 'Login blocked: email not verified',
          entity_type: 'auth_gate',
          entity_id: authedUser.id,
          source: 'ui',
        });
        return;
      }

      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role, must_reset_password')
        .eq('user_id', authedUser.id)
        .maybeSingle();

      const mustResetPassword = roleRow?.must_reset_password ?? false;

      const { data: memberships, error: membershipError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', authedUser.id);

      if (membershipError || !memberships || memberships.length === 0) {
        await supabase.auth.signOut();
        toast.error('No organization access', {
          description: 'Your account is not linked to an organization. Contact your administrator.',
        });
        void audit({
          actor_id: authedUser.id,
          actor_email: authedUser.email,
          actor_role: roleRow?.role,
          actor_type: 'user',
          action_type: 'access',
          action_label: 'Login blocked: no organization access',
          entity_type: 'organization_membership',
          entity_id: authedUser.id,
          source: 'ui',
        });
        return;
      }

      const orgId = memberships[0].organization_id;
      localStorage.setItem('printosaas_active_organization_id', orgId);

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (subscription?.status === 'suspended') {
        await supabase.auth.signOut();
        toast.error('Organization is suspended', {
          description: 'Please contact your administrator or support.',
        });
        void audit({
          actor_id: authedUser.id,
          actor_email: authedUser.email,
          actor_role: roleRow?.role,
          actor_type: 'user',
          action_type: 'access',
          action_label: 'Login blocked: organization suspended',
          entity_type: 'organization',
          organization_id: orgId,
          source: 'ui',
        });
        return;
      }

      if (mustResetPassword) {
        void audit({
          actor_id: authedUser.id,
          actor_email: authedUser.email,
          actor_role: roleRow?.role,
          actor_type: 'user',
          action_type: 'access',
          action_label: 'Login blocked: password setup required',
          entity_type: 'user_password',
          organization_id: orgId,
          source: 'ui',
        });

        toast.info('Please complete password setup');
        navigate('/reset-password', { replace: true });
        return;
      }

      void audit({
        actor_id: authedUser.id,
        actor_email: authedUser.email,
        actor_role: roleRow?.role,
        actor_type: 'user',
        action_type: 'login',
        action_label: 'Login successful',
        entity_type: 'session',
        organization_id: orgId,
        source: 'ui',
      });

      toast.success('Successfully logged in');
      navigate('/', { replace: true });
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)',
        backgroundSize: '32px 32px',
      }} />
      
      {/* Decorative gradient orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-primary/3 blur-3xl" />

      {/* PWA Install Button */}
      <div className="absolute top-4 right-4 z-10">
        <PWAInstallButton variant="outline" size="sm" alwaysShow />
      </div>
      
      <motion.div 
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo & branding */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-card shadow-lg border border-border/50 mb-5 overflow-hidden">
            <img 
              src={logoUrl} 
              alt={appName}
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{appName}</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">{appTagline}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="shadow-xl border-border/50 backdrop-blur-sm bg-card/95">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl text-center font-semibold">Welcome back</CardTitle>
              <CardDescription className="text-center text-sm">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="you@example.com" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      className="pl-10 h-11 transition-shadow focus:shadow-md focus:shadow-primary/5" 
                      required 
                    />
                  </div>
                </motion.div>
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      className="pl-10 h-11 transition-shadow focus:shadow-md focus:shadow-primary/5" 
                      required 
                    />
                  </div>
                </motion.div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-2">
                <motion.div
                  className="w-full"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                >
                  <Button 
                    type="submit" 
                    className="w-full h-11 gap-2 text-sm font-medium transition-all" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      <>
                        Login
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </motion.div>
                <p className="text-sm text-muted-foreground text-center">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-primary font-medium hover:underline underline-offset-4 transition-colors">
                    Register
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.p 
          className="text-center text-xs text-muted-foreground/60 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          &copy; {new Date().getFullYear()} {appName}. All rights reserved.
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Login;
