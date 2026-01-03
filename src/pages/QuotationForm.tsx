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
import { format, addDays } from 'date-fns';

interface Customer {
  id: string;
  name: string;
}

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

const QuotationForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [quotationNumber, setQuotationNumber] = useState('');

  const [formData, setFormData] = useState({
    customer_id: '',
    quotation_date: format(new Date(), 'yyyy-MM-dd'),
    valid_until: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
    notes: '',
    discount: 0,
    tax: 0,
  });

  const [items, setItems] = useState<QuotationItem[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, discount: 0, total: 0 },
  ]);

  useEffect(() => {
    fetchCustomers();
    generateQuotationNumber();
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

  const generateQuotationNumber = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_quotation_number');
      if (error) throw error;
      setQuotationNumber(data);
    } catch (error) {
      const year = new Date().getFullYear();
      setQuotationNumber(`Q${year}0001`);
    }
  };

  const updateItem = (id: string, field: keyof QuotationItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };
        
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

      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .insert([
          {
            quotation_number: quotationNumber,
            customer_id: formData.customer_id,
            quotation_date: formData.quotation_date,
            valid_until: formData.valid_until || null,
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

      if (quotationError) throw quotationError;

      const quotationItems = items.map((item) => ({
        quotation_id: quotation.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(quotationItems);

      if (itemsError) throw itemsError;

      toast.success('কোটেশন তৈরি হয়েছে');
      navigate(`/quotations/${quotation.id}`);
    } catch (error: any) {
      console.error('Error creating quotation:', error);
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
        <Button variant="ghost" size="icon" onClick={() => navigate('/quotations')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">নতুন কোটেশন</h1>
          <p className="text-muted-foreground">কোটেশন নং: {quotationNumber}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
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
                  <Label>কোটেশন তারিখ</Label>
                  <Input
                    type="date"
                    value={formData.quotation_date}
                    onChange={(e) =>
                      setFormData({ ...formData, quotation_date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>মেয়াদ শেষ</Label>
                  <Input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) =>
                      setFormData({ ...formData, valid_until: e.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>

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

            <Card>
              <CardHeader>
                <CardTitle>নোট / শর্তাবলী</CardTitle>
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
                  {loading ? 'সংরক্ষণ হচ্ছে...' : 'কোটেশন সংরক্ষণ করুন'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default QuotationForm;
