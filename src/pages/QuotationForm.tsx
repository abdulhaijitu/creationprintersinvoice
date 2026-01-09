import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { CustomerSelect } from '@/components/shared/CustomerSelect';

interface Customer {
  id: string;
  name: string;
}

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

const QuotationForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organization } = useOrganization();
  const isEditing = Boolean(id);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
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
    { id: crypto.randomUUID(), description: '', quantity: 1, unit: '', unit_price: 0, total: 0 },
  ]);

  useEffect(() => {
    fetchCustomers();
    if (isEditing) {
      fetchQuotation();
    } else {
      generateQuotationNumber();
    }
  }, [id]);

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

  const fetchQuotation = async () => {
    setFetching(true);
    try {
      const { data: quotation, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setQuotationNumber(quotation.quotation_number);
      setFormData({
        customer_id: quotation.customer_id || '',
        quotation_date: quotation.quotation_date,
        valid_until: quotation.valid_until || '',
        notes: quotation.notes || '',
        discount: Number(quotation.discount) || 0,
        tax: Number(quotation.tax) || 0,
      });

      // Fetch items
      const { data: quotationItems } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', id);

      if (quotationItems && quotationItems.length > 0) {
        setItems(quotationItems.map(item => ({
          id: item.id,
          description: item.description,
          quantity: Number(item.quantity),
          unit: item.unit || '',
          unit_price: Number(item.unit_price),
          total: Number(item.total),
        })));
      }
    } catch (error) {
      console.error('Error fetching quotation:', error);
      toast.error('Failed to load quotation');
    } finally {
      setFetching(false);
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
        updated.total = qty * price;

        return updated;
      })
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: '', quantity: 1, unit: '', unit_price: 0, total: 0 },
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
      toast.error('Please select a customer');
      return;
    }

    if (items.some((item) => !item.description)) {
      toast.error('Please provide description for all items');
      return;
    }

    setLoading(true);

    try {
      const subtotal = calculateSubtotal();
      const total = calculateTotal();

      if (isEditing) {
        // Update quotation
        const { error: quotationError } = await supabase
          .from('quotations')
          .update({
            customer_id: formData.customer_id,
            quotation_date: formData.quotation_date,
            valid_until: formData.valid_until || null,
            subtotal,
            discount: formData.discount,
            tax: formData.tax,
            total,
            notes: formData.notes,
          })
          .eq('id', id);

        if (quotationError) throw quotationError;

        // Delete existing items and re-insert
        await supabase.from('quotation_items').delete().eq('quotation_id', id);

        const quotationItems = items.map((item) => ({
          quotation_id: id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit || null,
          unit_price: item.unit_price,
          discount: 0,
          total: item.total,
          organization_id: organization?.id,
        }));

        const { error: itemsError } = await supabase.from('quotation_items').insert(quotationItems);
        if (itemsError) throw itemsError;

        toast.success('Quotation updated');
        navigate(`/quotations/${id}`);
      } else {
        // Create quotation
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
              organization_id: organization?.id,
            },
          ])
          .select()
          .single();

        if (quotationError) throw quotationError;

        const quotationItems = items.map((item) => ({
          quotation_id: quotation.id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit || null,
          unit_price: item.unit_price,
          discount: 0,
          total: item.total,
          organization_id: organization?.id,
        }));

        const { error: itemsError } = await supabase.from('quotation_items').insert(quotationItems);
        if (itemsError) throw itemsError;

        toast.success('Quotation created');
        navigate(`/quotations/${quotation.id}`);
      }
    } catch (error: any) {
      console.error('Error saving quotation:', error);
      toast.error(error.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (fetching) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-muted rounded" />
        <div className="h-96 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/quotations')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{isEditing ? 'Edit Quotation' : 'New Quotation'}</h1>
          <p className="text-muted-foreground">Quotation No: {quotationNumber}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <CustomerSelect
                    value={formData.customer_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, customer_id: value })
                    }
                    customers={customers}
                    onCustomerAdded={fetchCustomers}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quotation Date</Label>
                  <Input
                    type="date"
                    value={formData.quotation_date}
                    onChange={(e) =>
                      setFormData({ ...formData, quotation_date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valid Until</Label>
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
                <CardTitle>Items</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[280px] w-[50%]">Description</TableHead>
                        <TableHead className="text-center w-20">Qty</TableHead>
                        <TableHead className="text-center w-20">Unit</TableHead>
                        <TableHead className="text-right w-28">Price</TableHead>
                        <TableHead className="text-right w-28">Total</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="min-w-[280px]">
                            <Textarea
                              value={item.description}
                              onChange={(e) =>
                                updateItem(item.id, 'description', e.target.value)
                              }
                              placeholder="Item description"
                              rows={2}
                              className="min-h-[60px] resize-y overflow-hidden text-wrap break-words"
                            />
                          </TableCell>
                          <TableCell>
                            <CurrencyInput
                              value={item.quantity}
                              onChange={(val) =>
                                updateItem(item.id, 'quantity', val)
                              }
                              decimals={0}
                              formatOnBlur={false}
                              className="text-center w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.unit}
                              onChange={(e) =>
                                updateItem(item.id, 'unit', e.target.value)
                              }
                              placeholder="pcs"
                              className="text-center w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <CurrencyInput
                              value={item.unit_price}
                              onChange={(val) =>
                                updateItem(item.id, 'unit_price', val)
                              }
                              className="w-28"
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
                <CardTitle>Notes / Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional information or terms..."
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                </div>
                <div className="space-y-2">
                  <Label>Discount</Label>
                  <CurrencyInput
                    value={formData.discount}
                    onChange={(val) =>
                      setFormData({ ...formData, discount: val })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax/VAT</Label>
                  <CurrencyInput
                    value={formData.tax}
                    onChange={(val) =>
                      setFormData({ ...formData, tax: val })
                    }
                  />
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
                <Button type="submit" className="w-full gap-2" disabled={loading}>
                  <Save className="h-4 w-4" />
                  {loading ? 'Saving...' : (isEditing ? 'Update Quotation' : 'Create Quotation')}
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
