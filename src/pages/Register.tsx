import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, Lock, User, Phone, ArrowRight, Loader2 } from 'lucide-react';
import { APP_CONFIG } from '@/lib/appConfig';
import appLogo from '@/assets/app-logo.jpg';
import { motion } from 'framer-motion';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const appName = APP_CONFIG.name;
  const appTagline = APP_CONFIG.tagline;
  const logoUrl = appLogo;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signUp(email, password, fullName, phone);
      if (error) {
        toast.error('Registration failed', {
          description: error.message
        });
      } else {
        toast.success('Successfully registered');
        navigate('/');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const fieldDelay = (i: number) => ({ duration: 0.4, delay: 0.25 + i * 0.08 });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)',
        backgroundSize: '32px 32px',
      }} />
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-primary/3 blur-3xl" />

      <motion.div 
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-card shadow-lg border border-border/50 mb-5 overflow-hidden">
            <img src={logoUrl} alt={appName} className="h-full w-full object-cover" />
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
              <CardTitle className="text-xl text-center font-semibold">Create an account</CardTitle>
              <CardDescription className="text-center text-sm">
                Enter your details to get started
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {[
                  { id: 'fullName', label: 'Full Name', icon: User, type: 'text', placeholder: 'Your name', value: fullName, onChange: setFullName, required: true },
                  { id: 'phone', label: 'Phone Number', icon: Phone, type: 'tel', placeholder: '01XXXXXXXXX', value: phone, onChange: setPhone, required: false },
                  { id: 'email', label: 'Email', icon: Mail, type: 'email', placeholder: 'you@example.com', value: email, onChange: setEmail, required: true },
                  { id: 'password', label: 'Password', icon: Lock, type: 'password', placeholder: '••••••••', value: password, onChange: setPassword, required: true, minLength: 6 },
                ].map((field, i) => (
                  <motion.div 
                    key={field.id}
                    className="space-y-2"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={fieldDelay(i)}
                  >
                    <Label htmlFor={field.id} className="text-sm font-medium">{field.label}</Label>
                    <div className="relative group">
                      <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input 
                        id={field.id} 
                        type={field.type} 
                        placeholder={field.placeholder} 
                        value={field.value} 
                        onChange={e => field.onChange(e.target.value)} 
                        className="pl-10 h-11 transition-shadow focus:shadow-md focus:shadow-primary/5" 
                        required={field.required}
                        minLength={(field as any).minLength}
                      />
                    </div>
                  </motion.div>
                ))}
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-2">
                <motion.div
                  className="w-full"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                >
                  <Button 
                    type="submit" 
                    className="w-full h-11 gap-2 text-sm font-medium transition-all" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Register
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </motion.div>
                <p className="text-sm text-muted-foreground text-center">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary font-medium hover:underline underline-offset-4 transition-colors">
                    Login
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </motion.div>

        <motion.p 
          className="text-center text-xs text-muted-foreground/60 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          &copy; {new Date().getFullYear()} {appName}. All rights reserved.
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Register;
