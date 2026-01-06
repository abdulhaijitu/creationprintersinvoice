import { Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/contexts/OrganizationContext';
import { PageHeader } from '@/components/shared';

const plans = [
  {
    name: 'Free Trial',
    price: '৳0',
    period: '7 days',
    description: 'Try all features free for 7 days',
    features: [
      'Up to 5 team members',
      'Unlimited invoices',
      'Basic reports',
      'Email support',
    ],
    current: 'trial',
    buttonText: 'Current Plan',
    disabled: true,
  },
  {
    name: 'Basic',
    price: '৳999',
    period: '/month',
    description: 'Perfect for small businesses',
    features: [
      'Up to 10 team members',
      'Unlimited invoices',
      'Advanced reports',
      'Priority email support',
      'Custom branding',
    ],
    current: 'basic',
    buttonText: 'Upgrade to Basic',
    popular: false,
  },
  {
    name: 'Pro',
    price: '৳2,499',
    period: '/month',
    description: 'For growing businesses',
    features: [
      'Up to 25 team members',
      'Unlimited invoices',
      'Advanced analytics',
      'Phone & email support',
      'Custom branding',
      'API access',
      'Audit logs',
    ],
    current: 'pro',
    buttonText: 'Upgrade to Pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    features: [
      'Unlimited team members',
      'Unlimited everything',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'On-premise option',
    ],
    current: 'enterprise',
    buttonText: 'Contact Sales',
    popular: false,
  },
];

const Pricing = () => {
  const { subscription } = useOrganization();
  const currentPlan = subscription?.plan || 'free';

  const handleUpgrade = (planName: string) => {
    // TODO: Implement payment integration
    console.log('Upgrading to:', planName);
  };

  return (
    <div className="container max-w-6xl py-8">
      <PageHeader 
        title="Choose Your Plan" 
        description="Select the plan that best fits your business needs"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        {plans.map((plan) => (
          <Card 
            key={plan.name}
            className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Most Popular
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                variant={plan.popular ? 'default' : 'outline'}
                disabled={currentPlan === plan.current || plan.disabled}
                onClick={() => handleUpgrade(plan.current)}
              >
                {currentPlan === plan.current ? (
                  'Current Plan'
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    {plan.buttonText}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center text-muted-foreground">
        <p>All plans include 24/7 uptime monitoring and automatic backups.</p>
        <p className="mt-2">Need help choosing? Contact us at support@printosaas.com</p>
      </div>
    </div>
  );
};

export default Pricing;
