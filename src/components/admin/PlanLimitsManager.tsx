import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, FileText, UserCheck, Crown, Star, Zap, Gift, Infinity } from 'lucide-react';
import { useAdminPlanLimits } from '@/hooks/usePlanLimits';
import { toast } from 'sonner';
import { useState } from 'react';

const PLAN_CONFIG = {
  free: { label: 'Free Trial', icon: Gift, color: 'text-muted-foreground', bg: 'bg-muted' },
  basic: { label: 'Basic', icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  pro: { label: 'Pro', icon: Star, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  enterprise: { label: 'Enterprise', icon: Crown, color: 'text-purple-500', bg: 'bg-purple-500/10' },
};

const LIMIT_FIELDS = [
  { key: 'user_limit', label: 'Max Users', icon: Users, description: 'Maximum team members' },
  { key: 'customer_limit', label: 'Max Clients', icon: UserCheck, description: 'Maximum customers' },
  { key: 'invoice_limit', label: 'Max Invoices', icon: FileText, description: 'Maximum invoices' },
] as const;

export const PlanLimitsManager = () => {
  const { planLimits, loading, saving, updateLimit } = useAdminPlanLimits();
  const [editingValues, setEditingValues] = useState<Record<string, Record<string, string>>>({});

  const handleValueChange = (planName: string, field: string, value: string) => {
    setEditingValues(prev => ({
      ...prev,
      [planName]: {
        ...prev[planName],
        [field]: value,
      },
    }));
  };

  const handleBlur = async (planName: string, field: string) => {
    const editedValue = editingValues[planName]?.[field];
    if (editedValue === undefined) return;

    const numValue = editedValue === '' ? 5000 : parseInt(editedValue, 10);
    
    if (isNaN(numValue) || numValue < 0) {
      toast.error('Please enter a valid number');
      // Reset to original value
      setEditingValues(prev => ({
        ...prev,
        [planName]: {
          ...prev[planName],
          [field]: undefined as any,
        },
      }));
      return;
    }

    const success = await updateLimit(planName, field as any, numValue);
    if (success) {
      toast.success(`${PLAN_CONFIG[planName as keyof typeof PLAN_CONFIG]?.label} ${field.replace('_', ' ')} updated`);
    } else {
      toast.error('Failed to update limit');
    }

    // Clear editing state
    setEditingValues(prev => ({
      ...prev,
      [planName]: {
        ...prev[planName],
        [field]: undefined as any,
      },
    }));
  };

  const getValue = (planName: string, field: string, originalValue: number): string => {
    const editedValue = editingValues[planName]?.[field];
    if (editedValue !== undefined) return editedValue;
    return originalValue >= 5000 ? '' : originalValue.toString();
  };

  const isUnlimited = (value: number) => value >= 5000;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-muted-foreground">Loading plan limits...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const planOrder = ['free', 'basic', 'pro', 'enterprise'];
  const sortedPlans = [...planLimits].sort(
    (a, b) => planOrder.indexOf(a.plan_name) - planOrder.indexOf(b.plan_name)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Plan Quantity Limits
          </CardTitle>
          <CardDescription>
            Configure maximum allowed users, clients, and invoices for each subscription plan.
            Leave empty or set to 5000+ for unlimited.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {sortedPlans.map((plan) => {
          const config = PLAN_CONFIG[plan.plan_name as keyof typeof PLAN_CONFIG];
          if (!config) return null;
          
          const Icon = config.icon;
          const isSaving = saving === plan.plan_name;

          return (
            <Card key={plan.plan_name} className={`relative ${isSaving ? 'opacity-75' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${config.bg}`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <CardTitle className="text-lg">{config.label}</CardTitle>
                  </div>
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {LIMIT_FIELDS.map(({ key, label, icon: FieldIcon, description }) => {
                  const value = plan[key as keyof typeof plan] as number;
                  const unlimited = isUnlimited(value);

                  return (
                    <div key={key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`${plan.plan_name}-${key}`} className="flex items-center gap-1.5 text-sm">
                          <FieldIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          {label}
                        </Label>
                        {unlimited && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Infinity className="h-3 w-3" />
                            Unlimited
                          </Badge>
                        )}
                      </div>
                      <Input
                        id={`${plan.plan_name}-${key}`}
                        type="number"
                        min="0"
                        placeholder="Unlimited"
                        value={getValue(plan.plan_name, key, value)}
                        onChange={(e) => handleValueChange(plan.plan_name, key, e.target.value)}
                        onBlur={() => handleBlur(plan.plan_name, key)}
                        disabled={isSaving}
                        className="h-9"
                      />
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <Users className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">How Limits Work</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Limits are enforced when creating new users, clients, or invoices</li>
                <li>• Existing data is preserved even if limits are reduced</li>
                <li>• Changes apply immediately to all organizations on that plan</li>
                <li>• Set value to 5000 or higher (or leave empty) for unlimited</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanLimitsManager;
