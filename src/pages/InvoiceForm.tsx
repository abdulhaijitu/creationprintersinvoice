import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrgRolePermissions } from '@/hooks/useOrgRolePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
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
import { format } from 'date-fns';
import { CustomerSelect } from '@/components/shared/CustomerSelect';
import { InvoiceCostingSection, CostingItem } from '@/components/invoice/InvoiceCostingSection';

interface Customer {
  id: string;
  name: string;
  default_notes?: string | null;
  default_terms?: string | null;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

const InvoiceForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { hasPermission } = useOrgRolePermissions();
  const isEditing = Boolean(id);
  
  // Check costing permissions
  const canViewCosting = hasPermission('invoices.costing.view');
  const canEditCosting = hasPermission('invoices.costing.edit');
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const [formData, setFormData] = useState({
    customer_id: '',
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '',
    subject: '',
    notes: '',
    terms: '',
    discount: 0,
    tax: 0,
  });
  
  // Track if notes/terms were loaded from customer defaults
  const [notesFromDefault, setNotesFromDefault] = useState(false);
  const [termsFromDefault, setTermsFromDefault] = useState(false);

  // Initialize with empty array - will be populated by fetchInvoice for edit mode
  // or a default item will be added in useEffect for create mode
  const [items, setItems] = useState<InvoiceItem[]>([]);
  
  // Costing items state
  const [costingItems, setCostingItems] = useState<CostingItem[]>([]);

  useEffect(() => {
    fetchCustomers();
    if (isEditing) {
      fetchInvoice();
    } else {
      // Only add default empty item for NEW invoices, not when editing
      setItems([
        { id: crypto.randomUUID(), description: '', quantity: 1, unit: '', unit_price: 0, total: 0 },
      ]);
      // Add default costing item for new invoices
      setCostingItems([
        { id: crypto.randomUUID(), item_type: '', description: '', quantity: 1, price: 0, line_total: 0 },
      ]);
    }
    // Invoice number is generated only on successful save, not on form open
  }, [id, isEditing]);

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

  const fetchInvoice = async () => {
    setFetching(true);
    try {
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setInvoiceNumber(invoice.invoice_number);
      setFormData({
        customer_id: invoice.customer_id || '',
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date || '',
        subject: (invoice as any).subject || '',
        notes: invoice.notes || '',
        terms: (invoice as any).terms || '',
        discount: Number(invoice.discount) || 0,
        tax: Number(invoice.tax) || 0,
      });

      // Fetch items
      const { data: invoiceItems } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id);

      if (invoiceItems && invoiceItems.length > 0) {
        setItems(invoiceItems.map(item => ({
          id: item.id,
          description: item.description,
          quantity: Number(item.quantity),
          unit: item.unit || '',
          unit_price: Number(item.unit_price),
          total: Number(item.total),
        })));
      }
      
      // Fetch costing items
      if (canViewCosting) {
        const { data: costingData } = await supabase
          .from('invoice_costing_items' as any)
          .select('*')
          .eq('invoice_id', id)
          .order('sort_order');
          
        if (costingData && (costingData as any[]).length > 0) {
          setCostingItems((costingData as any[]).map((item: any) => ({
            id: item.id,
            item_type: item.item_type,
            description: item.description || '',
            quantity: Number(item.quantity),
            price: Number(item.price),
            line_total: Number(item.line_total),
          })));
        } else {
          // Set default empty costing item if none exist
          setCostingItems([
            { id: crypto.randomUUID(), item_type: '', description: '', quantity: 1, price: 0, line_total: 0 },
          ]);
        }
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to load invoice');
    } finally {
      setFetching(false);
    }
  };

  // Invoice number generation moved to handleSubmit to prevent gaps

  // Memoized update function to prevent cursor jumps
  // Uses functional update to avoid stale closures
  const updateItem = useCallback((id: string, field: keyof InvoiceItem, value: string | number) => {
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
        // Update invoice
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({
            customer_id: formData.customer_id,
            invoice_date: formData.invoice_date,
            due_date: formData.due_date || null,
            subject: formData.subject || null,
            subtotal,
            discount: formData.discount,
            tax: formData.tax,
            total,
            notes: formData.notes,
            terms: formData.terms,
          } as any)
          .eq('id', id);

        if (invoiceError) throw invoiceError;

        // Delete existing items and re-insert
        await supabase.from('invoice_items').delete().eq('invoice_id', id);

        const invoiceItems = items.map((item) => ({
          invoice_id: id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit || null,
          unit_price: item.unit_price,
          discount: 0,
          total: item.total,
          organization_id: organization?.id,
        }));

        const { error: itemsError } = await supabase.from('invoice_items').insert(invoiceItems);
        if (itemsError) throw itemsError;
        
        // Save costing items
        if (canEditCosting && costingItems.length > 0) {
          // Delete existing costing items
          await supabase.from('invoice_costing_items' as any).delete().eq('invoice_id', id);
          
          // Filter out empty rows and insert
          const validCostingItems = costingItems.filter(item => item.item_type);
          if (validCostingItems.length > 0) {
            const costingData = validCostingItems.map((item, index) => ({
              invoice_id: id,
              organization_id: organization?.id,
              item_type: item.item_type,
              description: item.description || null,
              quantity: item.quantity,
              price: item.price,
              sort_order: index,
            }));
            
            await supabase.from('invoice_costing_items' as any).insert(costingData);
          }
        }

        toast.success('Invoice updated');
        navigate(`/invoices/${id}`);
      } else {
        // Generate invoice number only at save time using the new v2 function
        let newInvoiceNumber: string;
        let invoiceNoRaw: number | null = null;
        
        try {
          const { data, error } = await supabase.rpc('generate_org_invoice_number_v2', {
            p_org_id: organization?.id
          });
          if (error) throw error;
          if (data && data.length > 0) {
            newInvoiceNumber = data[0].invoice_number;
            invoiceNoRaw = data[0].invoice_no_raw;
          } else {
            throw new Error('No data returned');
          }
        } catch (error) {
          // Fallback to old method if org-based fails
          console.warn('Falling back to legacy invoice number generation:', error);
          const { data, error: oldError } = await supabase.rpc('generate_invoice_number');
          if (!oldError && data) {
            newInvoiceNumber = data;
          } else {
            const year = new Date().getFullYear();
            const timestamp = Date.now().toString().slice(-4);
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            newInvoiceNumber = `${year}${timestamp}${random}`;
          }
        }

        // Create invoice with generated number
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert([
            {
              invoice_number: newInvoiceNumber,
              invoice_no_raw: invoiceNoRaw,
              customer_id: formData.customer_id,
              invoice_date: formData.invoice_date,
              due_date: formData.due_date || null,
              subject: formData.subject || null,
              subtotal,
              discount: formData.discount,
              tax: formData.tax,
              total,
              notes: formData.notes,
              terms: formData.terms,
              created_by: user?.id,
              organization_id: organization?.id,
            } as any,
          ])
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        const invoiceItems = items.map((item) => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit || null,
          unit_price: item.unit_price,
          discount: 0,
          total: item.total,
          organization_id: organization?.id,
        }));

        const { error: itemsError } = await supabase.from('invoice_items').insert(invoiceItems);
        if (itemsError) throw itemsError;
        
        // Save costing items for new invoice
        if (canEditCosting && costingItems.length > 0) {
          const validCostingItems = costingItems.filter(item => item.item_type);
          if (validCostingItems.length > 0) {
            const costingData = validCostingItems.map((item, index) => ({
              invoice_id: invoice.id,
              organization_id: organization?.id,
              item_type: item.item_type,
              description: item.description || null,
              quantity: item.quantity,
              price: item.price,
              sort_order: index,
            }));
            
            await supabase.from('invoice_costing_items' as any).insert(costingData);
          }
        }

        toast.success('Invoice created');
        navigate(`/invoices/${invoice.id}`);
      }
    } catch (error: any) {
      console.error('Error saving invoice:', error);
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
        <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{isEditing ? 'Edit Invoice' : 'New Invoice'}</h1>
          <p className="text-muted-foreground">
            {isEditing ? `Invoice No: ${invoiceNumber}` : 'Invoice number will be generated on save'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & Date */}
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
                  <Label>Invoice Date</Label>
                  <Input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) =>
                      setFormData({ ...formData, invoice_date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
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
                    {formData.subject.length}/255 characters • Optional short title for this invoice
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Costing Section - Internal Only */}
            <InvoiceCostingSection
              items={costingItems}
              onItemsChange={setCostingItems}
              canView={canViewCosting}
              canEdit={canEditCosting}
              invoiceTotal={calculateTotal()}
              customerId={formData.customer_id}
              invoiceId={id}
              isNewInvoice={!isEditing}
            />

            {/* Items */}
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

            {/* Notes & Terms */}
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

          {/* Summary */}
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
                  {loading ? 'Saving...' : (isEditing ? 'Update Invoice' : 'Create Invoice')}
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
