import { useState, useEffect, ReactNode } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreateChallanData, useDeliveryChallans } from '@/hooks/useDeliveryChallans';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  customers?: {
    name: string;
    address: string | null;
  } | null;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string | null;
}

interface ChallanItem {
  id: string;
  invoice_item_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  max_quantity: number;
}

interface CreateChallanDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit?: (data: CreateChallanData) => Promise<unknown>;
  preselectedInvoiceId?: string;
  trigger?: ReactNode;
}

export function CreateChallanDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSubmit: externalOnSubmit,
  preselectedInvoiceId,
  trigger,
}: CreateChallanDialogProps) {
  const { toast } = useToast();
  const { createChallan } = useDeliveryChallans();
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<string>('');
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [challanItems, setChallanItems] = useState<ChallanItem[]>([]);
  
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const onOpenChange = controlledOnOpenChange || setInternalOpen;
  const onSubmit = externalOnSubmit || createChallan;
  

  useEffect(() => {
    if (open) {
      fetchInvoices();
      if (preselectedInvoiceId) {
        setSelectedInvoice(preselectedInvoiceId);
      }
    }
  }, [open, preselectedInvoiceId]);

  useEffect(() => {
    if (selectedInvoice) {
      fetchInvoiceItems(selectedInvoice);
      const invoice = invoices.find((i) => i.id === selectedInvoice);
      if (invoice?.customers?.address) {
        setDeliveryAddress(invoice.customers.address);
      }
    }
  }, [selectedInvoice, invoices]);

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, customer_id, customers(name, address)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInvoices(data as unknown as Invoice[]);
    }
  };

  const fetchInvoiceItems = async (invoiceId: string) => {
    const { data, error } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId);

    if (!error && data) {
      setInvoiceItems(data as InvoiceItem[]);
      
      // Get already delivered quantities
      const { data: existingChallans } = await supabase
        .from('delivery_challans')
        .select('id')
        .eq('invoice_id', invoiceId)
        .neq('status', 'cancelled');

      let deliveredQty: Record<string, number> = {};
      
      if (existingChallans && existingChallans.length > 0) {
        const challanIds = existingChallans.map((c) => c.id);
        const { data: existingItems } = await supabase
          .from('delivery_challan_items')
          .select('invoice_item_id, quantity')
          .in('challan_id', challanIds);

        if (existingItems) {
          existingItems.forEach((item) => {
            if (item.invoice_item_id) {
              deliveredQty[item.invoice_item_id] = 
                (deliveredQty[item.invoice_item_id] || 0) + Number(item.quantity);
            }
          });
        }
      }

      // Set initial challan items with remaining quantities
      setChallanItems(
        data.map((item) => ({
          id: crypto.randomUUID(),
          invoice_item_id: item.id,
          description: item.description,
          quantity: Math.max(0, Number(item.quantity) - (deliveredQty[item.id] || 0)),
          unit: item.unit || 'pcs',
          max_quantity: Math.max(0, Number(item.quantity) - (deliveredQty[item.id] || 0)),
        }))
      );
    }
  };

  const handleItemQuantityChange = (id: string, quantity: number) => {
    setChallanItems((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.min(Math.max(0, quantity), item.max_quantity) }
          : item
      )
    );
  };

  const handleSubmit = async () => {
    if (!selectedInvoice) {
      toast({
        title: 'Please select an invoice',
        variant: 'destructive',
      });
      return;
    }

    const validItems = challanItems.filter((item) => item.quantity > 0);
    if (validItems.length === 0) {
      toast({
        title: 'Please add at least one item with quantity > 0',
        variant: 'destructive',
      });
      return;
    }

    const invoice = invoices.find((i) => i.id === selectedInvoice);

    setLoading(true);
    try {
      await onSubmit({
        invoice_id: selectedInvoice,
        customer_id: invoice?.customer_id,
        delivery_address: deliveryAddress,
        vehicle_info: vehicleInfo,
        driver_name: driverName,
        driver_phone: driverPhone,
        notes,
        items: validItems.map((item) => ({
          invoice_item_id: item.invoice_item_id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
        })),
      });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedInvoice('');
    setChallanItems([]);
    setDeliveryAddress('');
    setVehicleInfo('');
    setDriverName('');
    setDriverPhone('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Delivery Challan</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Invoice Selection */}
          <div className="space-y-2">
            <Label>Select Invoice *</Label>
            <Select value={selectedInvoice} onValueChange={setSelectedInvoice}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an invoice" />
              </SelectTrigger>
              <SelectContent>
                {invoices.map((invoice) => (
                  <SelectItem key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} - {invoice.customers?.name || 'No Customer'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Delivery Address */}
          <div className="space-y-2">
            <Label>Delivery Address</Label>
            <Textarea
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Enter delivery address..."
              rows={2}
            />
          </div>

          {/* Vehicle & Driver Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Vehicle Info</Label>
              <Input
                value={vehicleInfo}
                onChange={(e) => setVehicleInfo(e.target.value)}
                placeholder="e.g., Truck ABC-123"
              />
            </div>
            <div className="space-y-2">
              <Label>Driver Name</Label>
              <Input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Driver name"
              />
            </div>
            <div className="space-y-2">
              <Label>Driver Phone</Label>
              <Input
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="Phone number"
              />
            </div>
          </div>

          {/* Items */}
          {challanItems.length > 0 && (
            <div className="space-y-3">
              <Label>Items to Deliver</Label>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-center p-3 font-medium w-32">Available</th>
                      <th className="text-center p-3 font-medium w-32">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {challanItems.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3">{item.description}</td>
                        <td className="p-3 text-center text-muted-foreground">
                          {item.max_quantity} {item.unit}
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            min={0}
                            max={item.max_quantity}
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemQuantityChange(item.id, Number(e.target.value))
                            }
                            className="w-full text-center"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes / Remarks</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Challan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
