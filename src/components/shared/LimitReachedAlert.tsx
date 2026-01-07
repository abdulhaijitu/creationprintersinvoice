import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowUpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';

interface LimitReachedAlertProps {
  type: 'users' | 'clients' | 'invoices';
  current: number;
  limit: number;
}

const typeLabels = {
  users: 'team members',
  clients: 'customers',
  invoices: 'invoices',
};

export const LimitReachedAlert = ({ type, current, limit }: LimitReachedAlertProps) => {
  const navigate = useNavigate();
  const { subscription } = useOrganization();
  const isEnterprise = subscription?.plan === 'enterprise';

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Plan Limit Reached</AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-2">
        <span>
          You have reached your limit of {limit} {typeLabels[type]} ({current}/{limit}).
          {!isEnterprise && ' Upgrade your plan to add more.'}
        </span>
        {!isEnterprise && (
          <Button 
            variant="default" 
            size="sm"
            onClick={() => navigate('/pricing')}
          >
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Upgrade Plan
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default LimitReachedAlert;
