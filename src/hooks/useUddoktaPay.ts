import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentInitiateParams {
  invoiceId: string;
  amount: number;
  fullName?: string;
  email?: string;
}

interface PaymentState {
  loading: boolean;
  error: string | null;
  paymentUrl: string | null;
}

export const useUddoktaPay = () => {
  const [state, setState] = useState<PaymentState>({
    loading: false,
    error: null,
    paymentUrl: null,
  });

  const initiatePayment = useCallback(async (params: PaymentInitiateParams) => {
    setState({ loading: true, error: null, paymentUrl: null });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please log in to make a payment');
      }

      const returnUrl = `${window.location.origin}/invoices?payment=success&invoice=${params.invoiceId}`;
      const cancelUrl = `${window.location.origin}/invoices?payment=cancelled&invoice=${params.invoiceId}`;

      const response = await supabase.functions.invoke('uddoktapay-initiate', {
        body: {
          invoice_id: params.invoiceId,
          amount: params.amount,
          full_name: params.fullName || 'Customer',
          email: params.email || session.user.email || 'customer@example.com',
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Payment initiation failed');
      }

      const { payment_url } = response.data;

      if (!payment_url) {
        throw new Error('No payment URL received');
      }

      setState({ loading: false, error: null, paymentUrl: payment_url });

      // Redirect to payment page
      window.location.href = payment_url;

      return { success: true, paymentUrl: payment_url };
    } catch (error: any) {
      const errorMessage = error.message || 'Payment initiation failed';
      setState({ loading: false, error: errorMessage, paymentUrl: null });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const verifyPayment = useCallback(async (uddoktapayInvoiceId: string) => {
    try {
      const response = await supabase.functions.invoke('uddoktapay-verify', {
        body: { invoice_id: uddoktapayInvoiceId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    } catch (error: any) {
      toast.error(error.message || 'Payment verification failed');
      return null;
    }
  }, []);

  return {
    ...state,
    initiatePayment,
    verifyPayment,
  };
};
