import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Infinity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsageLimitCardProps {
  label: string;
  icon: React.ReactNode;
  current: number;
  plan: string;
  type?: 'user_limit' | 'customer_limit' | 'invoice_limit';
}

export const UsageLimitCard = ({ 
  label, 
  icon, 
  current, 
  plan, 
  type = 'user_limit' 
}: UsageLimitCardProps) => {
  const [limit, setLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLimit = async () => {
      const { data, error } = await supabase
        .from('plan_limits')
        .select(type)
        .eq('plan_name', plan)
        .single();
      
      if (!error && data) {
        const limitValue = data[type] as number;
        setLimit(limitValue >= 5000 ? null : limitValue);
      }
      setLoading(false);
    };
    
    fetchLimit();
  }, [plan, type]);

  const isUnlimited = limit === null;
  const percentage = isUnlimited ? 0 : Math.min(Math.round((current / limit) * 100), 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {label}
        </div>
        {isUnlimited ? (
          <Badge variant="outline" className="gap-1">
            <Infinity className="h-3 w-3" />
            Unlimited
          </Badge>
        ) : isAtLimit ? (
          <Badge variant="destructive">At Limit</Badge>
        ) : isNearLimit ? (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">Near Limit</Badge>
        ) : null}
      </div>
      
      <div className="text-2xl font-bold">
        {current}
        {!isUnlimited && (
          <span className="text-sm font-normal text-muted-foreground ml-1">
            / {limit}
          </span>
        )}
      </div>

      {!isUnlimited && !loading && (
        <Progress 
          value={percentage} 
          className={cn(
            "h-2",
            isAtLimit && "[&>div]:bg-destructive",
            isNearLimit && !isAtLimit && "[&>div]:bg-amber-500"
          )}
        />
      )}
    </div>
  );
};

export default UsageLimitCard;
