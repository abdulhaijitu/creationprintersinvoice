import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DeliveryChallan {
  id: string;
  challan_number: string;
  challan_date: string;
  invoice_id: string;
  customer_id: string | null;
  delivery_address: string | null;
  vehicle_info: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  notes: string | null;
  status: 'draft' | 'dispatched' | 'delivered' | 'cancelled';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  invoice?: {
    invoice_number: string;
    customer_id: string | null;
    customers?: {
      name: string;
      address: string | null;
    } | null;
  };
  customers?: {
    name: string;
    address: string | null;
  } | null;
}

export interface DeliveryChallanItem {
  id: string;
  challan_id: string;
  invoice_item_id: string | null;
  description: string;
  quantity: number;
  unit: string | null;
  created_at: string;
}

export interface CreateChallanData {
  invoice_id: string;
  customer_id?: string | null;
  delivery_address?: string;
  vehicle_info?: string;
  driver_name?: string;
  driver_phone?: string;
  notes?: string;
  items: {
    invoice_item_id?: string | null;
    description: string;
    quantity: number;
    unit?: string;
  }[];
}

export function useDeliveryChallans() {
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const { toast } = useToast();

  const fetchChallans = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_challans')
        .select(`
          *,
          invoice:invoices(invoice_number, customer_id, customers(name, address)),
          customers(name, address)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const typedData = (data as unknown as DeliveryChallan[]) || [];
      setChallans(typedData);
      
      // Calculate pending count
      const pending = typedData.filter(
        (c) => c.status === 'draft' || c.status === 'dispatched'
      ).length;
      setPendingCount(pending);
    } catch (error: any) {
      toast({
        title: 'Error fetching challans',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createChallan = async (data: CreateChallanData) => {
    try {
      // Generate challan number
      const { data: challanNumber, error: numError } = await supabase
        .rpc('generate_challan_number');
      
      if (numError) throw numError;

      const { data: challan, error } = await supabase
        .from('delivery_challans')
        .insert({
          challan_number: challanNumber,
          invoice_id: data.invoice_id,
          customer_id: data.customer_id,
          delivery_address: data.delivery_address,
          vehicle_info: data.vehicle_info,
          driver_name: data.driver_name,
          driver_phone: data.driver_phone,
          notes: data.notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert items
      if (data.items.length > 0) {
        const { error: itemsError } = await supabase
          .from('delivery_challan_items')
          .insert(
            data.items.map((item) => ({
              challan_id: challan.id,
              invoice_item_id: item.invoice_item_id,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
            }))
          );

        if (itemsError) throw itemsError;
      }

      toast({ title: 'Delivery Challan created successfully' });
      await fetchChallans();
      return challan;
    } catch (error: any) {
      toast({
        title: 'Error creating challan',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateChallanStatus = async (id: string, status: DeliveryChallan['status']) => {
    try {
      const { error } = await supabase
        .from('delivery_challans')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      toast({ title: `Challan status updated to ${status}` });
      await fetchChallans();
    } catch (error: any) {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteChallan = async (id: string) => {
    try {
      const { error } = await supabase
        .from('delivery_challans')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Delivery Challan deleted' });
      await fetchChallans();
    } catch (error: any) {
      toast({
        title: 'Error deleting challan',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getChallanById = async (id: string) => {
    const { data, error } = await supabase
      .from('delivery_challans')
      .select(`
        *,
        invoice:invoices(invoice_number, customer_id, customers(name, address)),
        customers(name, address)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as unknown as DeliveryChallan;
  };

  const getChallanItems = async (challanId: string) => {
    const { data, error } = await supabase
      .from('delivery_challan_items')
      .select('*')
      .eq('challan_id', challanId);

    if (error) throw error;
    return data as DeliveryChallanItem[];
  };

  // Real-time subscription
  useEffect(() => {
    fetchChallans();

    const channel = supabase
      .channel('delivery_challans_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_challans',
        },
        () => {
          fetchChallans();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    challans,
    loading,
    pendingCount,
    createChallan,
    updateChallanStatus,
    deleteChallan,
    getChallanById,
    getChallanItems,
    refetch: fetchChallans,
  };
}
