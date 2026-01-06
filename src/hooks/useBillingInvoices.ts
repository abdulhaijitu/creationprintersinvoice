import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { addDays, addMonths, startOfMonth, endOfMonth, format } from 'date-fns';

export interface BillingInvoice {
  id: string;
  invoice_number: string;
  organization_id: string;
  business_name: string;
  owner_email: string | null;
  plan_name: string;
  billing_period_start: string;
  billing_period_end: string;
  amount: number;
  tax: number;
  total_payable: number;
  status: 'unpaid' | 'paid' | 'overdue';
  generated_date: string;
  due_date: string;
  payment_method: string | null;
  payment_reference: string | null;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
}

interface PlanPricing {
  [key: string]: number;
}

const PLAN_PRICES: PlanPricing = {
  free: 0,
  basic: 999,
  pro: 2499,
  enterprise: 4999,
};

export const useBillingInvoices = () => {
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { isSuperAdmin } = useAuth();

  const fetchInvoices = async (orgId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('billing_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInvoices((data || []) as BillingInvoice[]);
    } catch (error) {
      console.error('Error fetching billing invoices:', error);
      toast.error('Failed to load billing invoices');
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async (
    organizationId: string,
    businessName: string,
    ownerEmail: string | null,
    planName: string,
    billingPeriodStart: Date,
    billingPeriodEnd: Date
  ) => {
    try {
      // Generate invoice number
      const { data: invoiceNumber, error: numError } = await supabase.rpc('generate_billing_invoice_number');
      if (numError) throw numError;

      const amount = PLAN_PRICES[planName] || 0;
      const tax = amount * 0.05; // 5% tax
      const totalPayable = amount + tax;
      const dueDate = addDays(billingPeriodStart, 7);

      const { data, error } = await supabase
        .from('billing_invoices')
        .insert([{
          invoice_number: invoiceNumber,
          organization_id: organizationId,
          business_name: businessName,
          owner_email: ownerEmail,
          plan_name: planName,
          billing_period_start: format(billingPeriodStart, 'yyyy-MM-dd'),
          billing_period_end: format(billingPeriodEnd, 'yyyy-MM-dd'),
          amount,
          tax,
          total_payable: totalPayable,
          due_date: format(dueDate, 'yyyy-MM-dd'),
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Invoice already exists for this billing period');
          return null;
        }
        throw error;
      }

      toast.success('Billing invoice generated');
      return data;
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
      return null;
    }
  };

  const markAsPaid = async (
    invoiceId: string, 
    paymentMethod: string, 
    paymentReference: string
  ) => {
    try {
      const { error } = await supabase
        .from('billing_invoices')
        .update({
          status: 'paid',
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          paid_date: format(new Date(), 'yyyy-MM-dd'),
        })
        .eq('id', invoiceId);

      if (error) throw error;

      // Also activate the subscription for this org
      const invoice = invoices.find(i => i.id === invoiceId);
      if (invoice) {
        await supabase
          .from('subscriptions')
          .update({ 
            status: 'active',
            plan: invoice.plan_name as 'free' | 'basic' | 'pro' | 'enterprise',
          })
          .eq('organization_id', invoice.organization_id);
      }

      toast.success('Invoice marked as paid');
      fetchInvoices();
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      toast.error('Failed to update invoice');
    }
  };

  const checkAndMarkOverdue = async () => {
    try {
      await supabase.rpc('check_overdue_invoices');
    } catch (error) {
      console.error('Error checking overdue invoices:', error);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchInvoices();
      checkAndMarkOverdue();
    }
  }, [isSuperAdmin]);

  return {
    invoices,
    loading,
    fetchInvoices,
    generateInvoice,
    markAsPaid,
    checkAndMarkOverdue,
  };
};
