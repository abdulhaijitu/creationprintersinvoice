import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, Lock } from 'lucide-react';
import logo from '@/assets/logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <img 
            src={logo} 
            alt="PrintoSaaS" 
            className="h-16 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-foreground">PrintoSaaS</h1>
          <p className="text-muted-foreground mt-2">Printing Business Accounting</p>
        </div>

        <Card className="shadow-soft">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Login</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" required />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary hover:underline">
                  Register
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
