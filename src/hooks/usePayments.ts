import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isPast, isToday, startOfMonth, endOfMonth, parseISO, format } from 'date-fns';
import { STALE_TIMES } from './useQueryConfig';

export interface Payment {
  id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  organization_id: string | null;
  invoice: {
    id: string;
    invoice_number: string;
    total: number;
    paid_amount: number;
    due_date: string | null;
    customers: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export interface PaymentStats {
  totalReceivedThisMonth: number;
  pendingDue: number;
  overdueAmount: number;
  todayCollections: number;
}

async function fetchPaymentsData(orgId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('invoice_payments')
    .select(`
      id,
      invoice_id,
      payment_date,
      amount,
      payment_method,
      reference,
      notes,
      created_at,
      created_by,
      organization_id,
      invoice:invoices(
        id,
        invoice_number,
        total,
        paid_amount,
        due_date,
        customers(id, name)
      )
    `)
    .eq('organization_id', orgId)
    .order('payment_date', { ascending: false });

  if (error) throw error;

  return (data || []).map((p: any) => ({
    ...p,
    invoice: p.invoice ? {
      ...p.invoice,
      customers: p.invoice.customers || null,
    } : null,
  }));
}

function calculateStats(paymentData: Payment[]): PaymentStats {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const todayStr = format(now, 'yyyy-MM-dd');

  const totalReceivedThisMonth = paymentData
    .filter(p => {
      const paymentDate = parseISO(p.payment_date);
      return paymentDate >= monthStart && paymentDate <= monthEnd;
    })
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const todayCollections = paymentData
    .filter(p => p.payment_date === todayStr)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const seenInvoices = new Map<string, { total: number; paid_amount: number; due_date: string | null }>();
  for (const p of paymentData) {
    if (p.invoice && !seenInvoices.has(p.invoice.id)) {
      seenInvoices.set(p.invoice.id, {
        total: Number(p.invoice.total),
        paid_amount: Number(p.invoice.paid_amount || 0),
        due_date: p.invoice.due_date,
      });
    }
  }

  let pendingDue = 0;
  let overdueAmount = 0;

  seenInvoices.forEach((inv) => {
    const due = inv.total - inv.paid_amount;
    if (due > 0) {
      pendingDue += due;
      if (inv.due_date && isPast(parseISO(inv.due_date)) && !isToday(parseISO(inv.due_date))) {
        overdueAmount += due;
      }
    }
  });

  return { totalReceivedThisMonth, pendingDue, overdueAmount, todayCollections };
}

export function usePayments() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', orgId],
    queryFn: () => fetchPaymentsData(orgId!),
    enabled: !!orgId,
    staleTime: STALE_TIMES.LIST_DATA,
  });

  const stats = useMemo(() => calculateStats(payments), [payments]);

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['payments', orgId] });
  };

  return {
    payments,
    stats,
    loading: isLoading,
    refetch,
  };
}
