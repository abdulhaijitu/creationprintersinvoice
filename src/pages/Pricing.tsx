import { useState } from 'react';
import { Check, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/contexts/OrganizationContext';
import { PageHeader } from '@/components/shared';
import { useOrgUpgradeRequest } from '@/hooks/useUpgradeRequests';

const plans = [
  {
    name: 'Free Trial',
    price: '৳0',
    period: '7 days',
    description: 'Try all features free for 7 days',
    features: [
      'Up to 1 user',
      'Unlimited invoices',
      'Basic reports',
      'Email support',
    ],
    current: 'free',
    buttonText: 'Current Plan',
    disabled: true,
  },
  {
    name: 'Basic',
    price: '৳999',
    period: '/month',
    description: 'Perfect for small businesses',
    features: [
      'Up to 2 users',
      '100 clients',
      '500 invoices',
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
      'Up to 5 users',
      '200 clients',
      '1000 invoices',
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
  const { subscription, organization } = useOrganization();
  const currentPlan = subscription?.plan || 'free';
  const { pendingRequest, requestUpgrade, loading } = useOrgUpgradeRequest(organization?.id || null);
  const [requestingPlan, setRequestingPlan] = useState<string | null>(null);

  const handleUpgrade = async (planName: string) => {
    if (planName === 'enterprise') {
      window.location.href = 'mailto:support@creationtechbd.com?subject=Enterprise Plan Inquiry';
      return;
    }
    
    setRequestingPlan(planName);
    await requestUpgrade(planName);
    setRequestingPlan(null);
  };

  const getButtonContent = (plan: typeof plans[0]) => {
    if (currentPlan === plan.current) {
      return 'Current Plan';
    }
    
    if (pendingRequest && pendingRequest.requested_plan === plan.current) {
      return (
        <>
          <Clock className="h-4 w-4 mr-2" />
          Request Pending
        </>
      );
    }
    
    if (requestingPlan === plan.current) {
      return 'Requesting...';
    }
    
    return (
      <>
        <Zap className="h-4 w-4 mr-2" />
        {plan.buttonText}
      </>
    );
  };

  const isButtonDisabled = (plan: typeof plans[0]) => {
    return (
      currentPlan === plan.current || 
      plan.disabled || 
      loading ||
      requestingPlan !== null ||
      (pendingRequest && pendingRequest.requested_plan === plan.current)
    );
  };

  return (
    <div className="container max-w-6xl py-8">
      <PageHeader 
        title="Choose Your Plan" 
        description="Select the plan that best fits your business needs"
      />

      {pendingRequest && (
        <div className="bg-muted/50 border rounded-lg p-4 mb-6 flex items-center gap-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">Upgrade request pending</p>
            <p className="text-sm text-muted-foreground">
              Your request to upgrade to <strong>{pendingRequest.requested_plan}</strong> is being reviewed.
            </p>
          </div>
        </div>
      )}

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
                disabled={isButtonDisabled(plan)}
                onClick={() => handleUpgrade(plan.current)}
              >
                {getButtonContent(plan)}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center text-muted-foreground">
        <p>All plans include 24/7 uptime monitoring.</p>
        <p className="mt-2">Need help choosing? Contact us at <strong>support@creationtechbd.com</strong></p>
      </div>
    </div>
  );
};

export default Pricing;
