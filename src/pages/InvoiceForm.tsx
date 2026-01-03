import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import { format } from 'date-fns';

interface Customer {
  id: string;
  name: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

const InvoiceForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const [formData, setFormData] = useState({
    customer_id: '',
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '',
    notes: '',
    discount: 0,
    tax: 0,
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, discount: 0, total: 0 },
  ]);

  useEffect(() => {
    fetchCustomers();
    generateInvoiceNumber();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const generateInvoiceNumber = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_invoice_number');
      if (error) throw error;
      setInvoiceNumber(data);
    } catch (error) {
      // Fallback
      const year = new Date().getFullYear();
      setInvoiceNumber(`${year}0001`);
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };
        
        // Recalculate total
        const qty = Number(updated.quantity) || 0;
        const price = Number(updated.unit_price) || 0;
        const discount = Number(updated.discount) || 0;
        updated.total = qty * price - discount;

        return updated;
      })
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, discount: 0, total: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = Number(formData.discount) || 0;
    const tax = Number(formData.tax) || 0;
    return subtotal - discount + tax;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_id) {
      toast.error('গ্রাহক নির্বাচন করুন');
      return;
    }

    if (items.some((item) => !item.description)) {
      toast.error('সকল আইটেমের বিবরণ দিন');
      return;
    }

    setLoading(true);

    try {
      const subtotal = calculateSubtotal();
      const total = calculateTotal();

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([
          {
            invoice_number: invoiceNumber,
            customer_id: formData.customer_id,
            invoice_date: formData.invoice_date,
            due_date: formData.due_date || null,
            subtotal,
            discount: formData.discount,
            tax: formData.tax,
            total,
            notes: formData.notes,
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const invoiceItems = items.map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      toast.success('ইনভয়েস তৈরি হয়েছে');
      navigate(`/invoices/${invoice.id}`);
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast.error(error.message || 'সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('bn-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">নতুন ইনভয়েস</h1>
          <p className="text-muted-foreground">ইনভয়েস নং: {invoiceNumber}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & Date */}
            <Card>
              <CardHeader>
                <CardTitle>মৌলিক তথ্য</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>গ্রাহক *</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, customer_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="গ্রাহক নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ইনভয়েস তারিখ</Label>
                  <Input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) =>
                      setFormData({ ...formData, invoice_date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>ডিউ তারিখ</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData({ ...formData, due_date: e.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>আইটেম</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  আইটেম যোগ করুন
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">বিবরণ</TableHead>
                        <TableHead className="text-center">পরিমাণ</TableHead>
                        <TableHead className="text-right">দাম</TableHead>
                        <TableHead className="text-right">ছাড়</TableHead>
                        <TableHead className="text-right">মোট</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Input
                              value={item.description}
                              onChange={(e) =>
                                updateItem(item.id, 'description', e.target.value)
                              }
                              placeholder="আইটেমের বিবরণ"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(item.id, 'quantity', Number(e.target.value))
                              }
                              className="text-center w-20"
                              min={1}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) =>
                                updateItem(item.id, 'unit_price', Number(e.target.value))
                              }
                              className="text-right w-28"
                              min={0}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.discount}
                              onChange={(e) =>
                                updateItem(item.id, 'discount', Number(e.target.value))
                              }
                              className="text-right w-24"
                              min={0}
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.total)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.id)}
                              disabled={items.length === 1}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>নোট</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="অতিরিক্ত তথ্য বা শর্তাবলী..."
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div className="space-y-6">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>সারাংশ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">সাবটোটাল</span>
                  <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                </div>
                <div className="space-y-2">
                  <Label>ছাড়</Label>
                  <Input
                    type="number"
                    value={formData.discount}
                    onChange={(e) =>
                      setFormData({ ...formData, discount: Number(e.target.value) })
                    }
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ট্যাক্স/ভ্যাট</Label>
                  <Input
                    type="number"
                    value={formData.tax}
                    onChange={(e) =>
                      setFormData({ ...formData, tax: Number(e.target.value) })
                    }
                    min={0}
                  />
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between text-lg font-bold">
                    <span>মোট</span>
                    <span className="text-primary">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
                <Button type="submit" className="w-full gap-2" disabled={loading}>
                  <Save className="h-4 w-4" />
                  {loading ? 'সংরক্ষণ হচ্ছে...' : 'ইনভয়েস সংরক্ষণ করুন'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default InvoiceForm;
