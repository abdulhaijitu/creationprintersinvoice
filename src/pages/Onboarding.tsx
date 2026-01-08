import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Building2, ArrowRight, Sparkles } from 'lucide-react';

const Onboarding = () => {
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const { createOrganization } = useOrganization();
  const navigate = useNavigate();

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!businessName.trim()) {
      toast.error('Please enter your business name');
      return;
    }

    setLoading(true);
    
    try {
      const slug = generateSlug(businessName);
      const { error, organization } = await createOrganization(businessName, slug);
      
      if (error) {
        if (error.message.includes('duplicate')) {
          toast.error('A business with this name already exists. Please choose a different name.');
        } else {
          toast.error('Failed to create organization');
        }
        return;
      }

      toast.success('Welcome to PrintoSaas!', {
        description: `${organization?.name} has been created successfully.`
      });
      
      navigate('/');
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome to PrintoSaas</h1>
          <p className="text-muted-foreground mt-2">
            Printing Business Accounting - Let's set up your business in just a few seconds
          </p>
        </div>

        <Card className="shadow-xl border-primary/20">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Create Your Organization
            </CardTitle>
            <CardDescription>
              This will be your workspace for managing invoices, customers, and more
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-sm font-medium">
                  Business Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="businessName"
                  type="text"
                  placeholder="e.g., Acme Printing Press"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="h-12 text-base"
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  This will be displayed on your invoices and documents
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium text-foreground">Your free trial includes:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Unlimited invoices & quotations
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Customer & expense management
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Up to 5 team members
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    7-day free trial
                  </li>
                </ul>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-medium"
                disabled={loading}
              >
                {loading ? (
                  'Creating your workspace...'
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Onboarding;
