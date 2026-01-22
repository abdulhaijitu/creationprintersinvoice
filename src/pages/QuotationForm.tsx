import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
// Rich text for quotation item descriptions
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
  default_notes?: string | null;
  default_terms?: string | null;
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
  const [quotationStatus, setQuotationStatus] = useState<string>('draft');
  const [isConverted, setIsConverted] = useState(false);
  const [isGeneratingNumber, setIsGeneratingNumber] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: '',
    quotation_date: format(new Date(), 'yyyy-MM-dd'),
    valid_until: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
    subject: '',
    notes: '',
    terms: '',
    discount: 0,
    tax: 0,
  });
  
  // Track if notes/terms were loaded from customer defaults
  const [notesFromDefault, setNotesFromDefault] = useState(false);
  const [termsFromDefault, setTermsFromDefault] = useState(false);

  const [items, setItems] = useState<QuotationItem[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unit: '', unit_price: 0, total: 0 },
  ]);

  useEffect(() => {
    fetchCustomers();
    if (isEditing) {
      fetchQuotation();
    }
    // Note: For new quotations, number is generated server-side on save
  }, [id]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, default_notes, default_terms')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };
  
  // Handle customer selection - auto-fill defaults
  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    
    setFormData(prev => {
      const updates: typeof prev = { ...prev, customer_id: customerId };
      
      // Only auto-fill notes if empty or was from previous default
      if (customer?.default_notes && (!prev.notes || notesFromDefault)) {
        updates.notes = customer.default_notes;
        setNotesFromDefault(true);
      }
      
      // Only auto-fill terms if empty or was from previous default
      if (customer?.default_terms && (!prev.terms || termsFromDefault)) {
        updates.terms = customer.default_terms;
        setTermsFromDefault(true);
      }
      
      return updates;
    });
  };
  
  // Reset to customer default
  const resetNotesToDefault = () => {
    const customer = customers.find(c => c.id === formData.customer_id);
    if (customer?.default_notes) {
      setFormData(prev => ({ ...prev, notes: customer.default_notes || '' }));
      setNotesFromDefault(true);
    }
  };
  
  const resetTermsToDefault = () => {
    const customer = customers.find(c => c.id === formData.customer_id);
    if (customer?.default_terms) {
      setFormData(prev => ({ ...prev, terms: customer.default_terms || '' }));
      setTermsFromDefault(true);
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

      // All statuses are now editable - no status restriction
      setQuotationNumber(quotation.quotation_number);
      setQuotationStatus(quotation.status);
      setIsConverted(quotation.status === 'converted' || !!quotation.converted_to_invoice_id);
      
      setFormData({
        customer_id: quotation.customer_id || '',
        quotation_date: quotation.quotation_date,
        valid_until: quotation.valid_until || '',
        subject: (quotation as any).subject || '',
        notes: quotation.notes || '',
        terms: (quotation as any).terms || '',
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

  // Quotation number is now generated server-side atomically during insert
  // This prevents duplicate key errors from race conditions

  // Memoized update function to prevent cursor jumps
  // Uses functional update to avoid stale closures
  const updateItem = useCallback((id: string, field: keyof QuotationItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };
        
        // Recalculate total only for numeric fields
        if (field === 'quantity' || field === 'unit_price') {
          const qty = Number(updated.quantity) || 0;
          const price = Number(updated.unit_price) || 0;
          updated.total = qty * price;
        }

        return updated;
      })
    );
  }, []);

  // Memoized add/remove handlers
  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: '', quantity: 1, unit: '', unit_price: 0, total: 0 },
    ]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  }, []);

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
            subject: formData.subject || null,
            subtotal,
            discount: formData.discount,
            tax: formData.tax,
            total,
            notes: formData.notes,
            terms: formData.terms,
          } as any)
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
        // Create quotation with server-side generated number
        if (!organization?.id) {
          toast.error('Organization not found');
          return;
        }

        // Generate quotation number atomically server-side
        setIsGeneratingNumber(true);
        const { data: seqData, error: seqError } = await supabase
          .rpc('generate_org_quotation_number', { p_org_id: organization.id });
        
        if (seqError) throw seqError;
        if (!seqData || seqData.length === 0) throw new Error('Failed to generate quotation number');

        const generatedNumber = seqData[0].quotation_number;
        setIsGeneratingNumber(false);

        const { data: quotation, error: quotationError } = await supabase
          .from('quotations')
          .insert([
            {
              quotation_number: generatedNumber,
              customer_id: formData.customer_id,
              quotation_date: formData.quotation_date,
              valid_until: formData.valid_until || null,
              subject: formData.subject || null,
              subtotal,
              discount: formData.discount,
              tax: formData.tax,
              total,
              notes: formData.notes,
              terms: formData.terms,
              created_by: user?.id,
              organization_id: organization.id,
            } as any,
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
          organization_id: organization.id,
        }));

        const { error: itemsError } = await supabase.from('quotation_items').insert(quotationItems);
        if (itemsError) throw itemsError;

        toast.success('Quotation created');
        navigate(`/quotations/${quotation.id}`);
      }
    } catch (error: any) {
      console.error('Error saving quotation:', error);
      // User-friendly error message
      if (error.message?.includes('duplicate key') || error.code === '23505') {
        toast.error('Please try again - quotation number conflict detected');
      } else {
        toast.error(error.message || 'Error occurred');
      }
      setIsGeneratingNumber(false);
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
          <p className="text-muted-foreground">
            {isEditing 
              ? `Quotation No: ${quotationNumber}` 
              : 'Quotation number will be generated on save'}
          </p>
        </div>
      </div>

      {/* Warning for converted quotations */}
      {isConverted && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-start gap-3">
          <div className="h-5 w-5 text-warning flex-shrink-0 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <path d="M12 9v4"/>
              <path d="M12 17h.01"/>
            </svg>
          </div>
          <div>
            <p className="font-medium text-foreground">Converted Quotation</p>
            <p className="text-sm text-muted-foreground">
              This quotation has already been converted to an invoice. Changes made here will not affect the existing invoice.
            </p>
          </div>
        </div>
      )}

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
                    onValueChange={handleCustomerChange}
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

            {/* Subject Field */}
            <Card>
              <CardHeader>
                <CardTitle>Subject</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value.slice(0, 255) })}
                    placeholder="e.g., Stall design & printing work for Dhaka Fair 2026"
                    className="font-medium"
                    maxLength={255}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.subject.length}/255 characters • Optional short title for this quotation
                  </p>
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
                            <RichTextEditor
                              value={item.description}
                              onChange={(val) =>
                                updateItem(item.id, 'description', val)
                              }
                              placeholder="Item description"
                              minHeight="60px"
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
                <CardTitle>Notes & Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Notes Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Notes</Label>
                    {notesFromDefault && formData.customer_id && (
                      <span className="text-xs text-muted-foreground">
                        Loaded from customer default
                      </span>
                    )}
                  </div>
                  <RichTextEditor
                    value={formData.notes}
                    onChange={(val) => {
                      setFormData({ ...formData, notes: val });
                      setNotesFromDefault(false);
                    }}
                    placeholder="Additional notes..."
                    minHeight="80px"
                  />
                  {formData.customer_id && customers.find(c => c.id === formData.customer_id)?.default_notes && !notesFromDefault && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs h-auto py-1 px-2"
                      onClick={resetNotesToDefault}
                    >
                      Reset to customer default
                    </Button>
                  )}
                </div>
                
                {/* Terms Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Terms & Conditions</Label>
                    {termsFromDefault && formData.customer_id && (
                      <span className="text-xs text-muted-foreground">
                        Loaded from customer default
                      </span>
                    )}
                  </div>
                  <RichTextEditor
                    value={formData.terms}
                    onChange={(val) => {
                      setFormData({ ...formData, terms: val });
                      setTermsFromDefault(false);
                    }}
                    placeholder="Terms & conditions..."
                    minHeight="80px"
                  />
                  {formData.customer_id && customers.find(c => c.id === formData.customer_id)?.default_terms && !termsFromDefault && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs h-auto py-1 px-2"
                      onClick={resetTermsToDefault}
                    >
                      Reset to customer default
                    </Button>
                  )}
                </div>
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
