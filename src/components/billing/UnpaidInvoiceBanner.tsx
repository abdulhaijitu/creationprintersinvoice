import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, CreditCard } from 'lucide-react';

export const UnpaidInvoiceBanner = () => {
  const { organization, orgRole } = useOrganization();
  const navigate = useNavigate();
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (organization && orgRole === 'owner') {
      fetchUnpaidInvoices();
    }
  }, [organization, orgRole]);

  const fetchUnpaidInvoices = async () => {
    if (!organization) return;
    try {
      const { count, error } = await supabase
        .from('billing_invoices')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .in('status', ['unpaid', 'overdue']);

      if (!error && count) {
        setUnpaidCount(count);
      }
    } catch (error) {
      console.error('Error fetching unpaid invoices:', error);
    }
  };

  if (unpaidCount === 0 || dismissed || orgRole !== 'owner') {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4 relative">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Unpaid Invoice{unpaidCount > 1 ? 's' : ''}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          You have {unpaidCount} unpaid billing invoice{unpaidCount > 1 ? 's' : ''}. 
          Please make payment to avoid service interruption.
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/billing')}
          className="ml-4 shrink-0"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          View Invoices
        </Button>
      </AlertDescription>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 hover:bg-background/20 rounded"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
};

export default UnpaidInvoiceBanner;
