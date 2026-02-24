import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCostingPermissions } from '@/hooks/useCostingPermissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
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
import { Plus, Trash2, ArrowLeft, Save, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { CustomerSelect } from '@/components/shared/CustomerSelect';
import { ItemWiseCostingSection, CostingItem, InvoiceLineItem } from '@/components/invoice/ItemWiseCostingSection';
import { formatCurrency } from '@/lib/formatters';

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

// Mobile item card component
const InvoiceItemCard = ({
  item,
  index,
  updateItem,
  removeItem,
  canRemove,
}: {
  item: InvoiceItem;
  index: number;
  updateItem: (id: string, field: keyof InvoiceItem, value: string | number) => void;
  removeItem: (id: string) => void;
  canRemove: boolean;
}) => (
  <Card className="relative">
    <CardContent className="pt-4 pb-3 px-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">Item #{index + 1}</span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeItem(item.id)}
            className="h-7 w-7 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Input
          value={item.description}
          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
          placeholder="Item description"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Qty</Label>
          <CurrencyInput
            value={item.quantity}
            onChange={(val) => updateItem(item.id, 'quantity', val)}
            decimals={0}
            formatOnBlur={false}
            className="text-center"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Unit</Label>
          <Input
            value={item.unit}
            onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
            placeholder="pcs"
            className="text-center"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Price</Label>
          <CurrencyInput
            value={item.unit_price}
            onChange={(val) => updateItem(item.id, 'unit_price', val)}
          />
        </div>
      </div>
      <div className="flex justify-between items-center pt-2 border-t">
        <span className="text-xs text-muted-foreground">Line Total</span>
        <span className="font-semibold">{formatCurrency(item.total)}</span>
      </div>
    </CardContent>
  </Card>
);

const InvoiceForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organization } = useOrganization();
  const isEditing = Boolean(id);
  const isMobile = useIsMobile();
  
  const costingPermissions = useCostingPermissions();
  
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
  
  const [notesFromDefault, setNotesFromDefault] = useState(false);
  const [termsFromDefault, setTermsFromDefault] = useState(false);

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [costingItems, setCostingItems] = useState<CostingItem[]>([]);

  useEffect(() => {
    fetchCustomers();
    if (isEditing) {
      fetchInvoice();
    } else {
      setItems([
        { id: crypto.randomUUID(), description: '', quantity: 1, unit: '', unit_price: 0, total: 0 },
      ]);
      setCostingItems([]);
    }
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
  
  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    
    setFormData(prev => {
      const updates: typeof prev = { ...prev, customer_id: customerId };
      
      if (customer?.default_notes && (!prev.notes || notesFromDefault)) {
        updates.notes = customer.default_notes;
        setNotesFromDefault(true);
      }
      
      if (customer?.default_terms && (!prev.terms || termsFromDefault)) {
        updates.terms = customer.default_terms;
        setTermsFromDefault(true);
      }
      
      return updates;
    });
  };
  
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
      
      if (costingPermissions.canView) {
        const { data: costingData } = await supabase
          .from('invoice_costing_items' as any)
          .select('*')
          .eq('invoice_id', id)
          .order('sort_order');
          
        if (costingData && (costingData as any[]).length > 0) {
          setCostingItems((costingData as any[]).map((item: any) => ({
            id: item.id,
            invoice_item_id: item.invoice_item_id || null,
            item_no: item.item_no || null,
            item_type: item.item_type,
            description: item.description || '',
            quantity: Number(item.quantity),
            price: Number(item.price),
            line_total: Number(item.line_total),
          })));
        } else {
          setCostingItems([]);
        }
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to load invoice');
    } finally {
      setFetching(false);
    }
  };

  const updateItem = useCallback((id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          const qty = Number(updated.quantity) || 0;
          const price = Number(updated.unit_price) || 0;
          updated.total = qty * price;
        }
        return updated;
      })
    );
  }, []);

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

        const { data: existingItems } = await supabase
          .from('invoice_items')
          .select('id')
          .eq('invoice_id', id)
          .order('created_at');
        
        const existingItemIds = existingItems?.map(i => i.id) || [];
        
        const itemsToInsert: InvoiceItem[] = [];
        const itemsToUpdate: { id: string; item: InvoiceItem }[] = [];
        
        items.forEach((item) => {
          if (existingItemIds.includes(item.id)) {
            itemsToUpdate.push({ id: item.id, item });
          } else {
            itemsToInsert.push(item);
          }
        });
        
        const currentItemIds = items.map(i => i.id);
        const itemsToDelete = existingItemIds.filter(existingId => !currentItemIds.includes(existingId));
        
        if (itemsToDelete.length > 0) {
          for (const itemId of itemsToDelete) {
            await supabase.from('invoice_costing_items' as any).delete().eq('invoice_item_id', itemId);
          }
          await supabase.from('invoice_items').delete().in('id', itemsToDelete);
        }
        
        for (const { id: itemId, item } of itemsToUpdate) {
          await supabase.from('invoice_items').update({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit || null,
            unit_price: item.unit_price,
            discount: 0,
            total: item.total,
          }).eq('id', itemId);
        }
        
        if (itemsToInsert.length > 0) {
          const newInvoiceItems = itemsToInsert.map((item) => ({
            id: item.id,
            invoice_id: id,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit || null,
            unit_price: item.unit_price,
            discount: 0,
            total: item.total,
            organization_id: organization?.id,
          }));

          const { error: itemsError } = await supabase.from('invoice_items').insert(newInvoiceItems);
          if (itemsError) throw itemsError;
        }

        toast.success('Invoice updated');
        navigate(`/invoices/${id}`);
      } else {
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
        
        if (costingPermissions.canSave && costingItems.length > 0) {
          const validCostingItems = costingItems.filter(item => item.item_type && item.invoice_item_id);
          if (validCostingItems.length > 0) {
            const costingData = validCostingItems.map((item, index) => ({
              invoice_id: invoice.id,
              invoice_item_id: item.invoice_item_id,
              item_no: item.item_no,
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

  if (fetching) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-muted rounded" />
        <div className="h-96 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">{isEditing ? 'Edit Invoice' : 'New Invoice'}</h1>
          <p className="text-sm text-muted-foreground truncate">
            {isEditing ? `Invoice No: ${invoiceNumber}` : 'Invoice number will be generated on save'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Customer, Date & Subject — merged into one card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Customer *</Label>
                    <CustomerSelect
                      value={formData.customer_id}
                      onValueChange={handleCustomerChange}
                      customers={customers}
                      onCustomerAdded={fetchCustomers}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Invoice Date</Label>
                    <Input
                      type="date"
                      value={formData.invoice_date}
                      onChange={(e) =>
                        setFormData({ ...formData, invoice_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Due Date</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) =>
                        setFormData({ ...formData, due_date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Subject <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value.slice(0, 255) })}
                    placeholder="e.g., Stall design & printing work for Dhaka Fair 2026"
                    maxLength={255}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Items</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Item
                </Button>
              </CardHeader>
              <CardContent>
                {isMobile ? (
                  /* Mobile: Card-based layout */
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <InvoiceItemCard
                        key={item.id}
                        item={item}
                        index={index}
                        updateItem={updateItem}
                        removeItem={removeItem}
                        canRemove={items.length > 1}
                      />
                    ))}
                  </div>
                ) : (
                  /* Desktop: Table layout */
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10 text-center">#</TableHead>
                          <TableHead className="min-w-[240px]">Description</TableHead>
                          <TableHead className="text-center w-[80px]">Qty</TableHead>
                          <TableHead className="text-center w-[80px]">Unit</TableHead>
                          <TableHead className="text-right w-[120px]">Price</TableHead>
                          <TableHead className="text-right w-[120px]">Total</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-center text-muted-foreground text-sm font-medium">
                              {index + 1}
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.description}
                                onChange={(e) =>
                                  updateItem(item.id, 'description', e.target.value)
                                }
                                placeholder="Item description"
                                className="border-0 shadow-none px-0 focus-visible:ring-0 h-auto py-1"
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
                                className="text-center w-full border-0 shadow-none focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.unit}
                                onChange={(e) =>
                                  updateItem(item.id, 'unit', e.target.value)
                                }
                                placeholder="pcs"
                                className="text-center w-full border-0 shadow-none focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <CurrencyInput
                                value={item.unit_price}
                                onChange={(val) =>
                                  updateItem(item.id, 'unit_price', val)
                                }
                                className="w-full border-0 shadow-none focus-visible:ring-0 text-right"
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {formatCurrency(item.total)}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(item.id)}
                                disabled={items.length === 1}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Item-wise Costing Section — AFTER Items (logical order) */}
            {costingPermissions.canView && (
              <ItemWiseCostingSection
                invoiceItems={items}
                costingItems={costingItems}
                onCostingItemsChange={setCostingItems}
                permissions={costingPermissions}
                invoiceTotal={calculateTotal()}
                invoiceId={id}
                isNewInvoice={!isEditing}
              />
            )}

            {/* Notes & Terms */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Notes & Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Notes</Label>
                    {notesFromDefault && formData.customer_id && (
                      <span className="text-[10px] text-muted-foreground">
                        From customer default
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
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Terms & Conditions</Label>
                    {termsFromDefault && formData.customer_id && (
                      <span className="text-[10px] text-muted-foreground">
                        From customer default
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

          {/* Summary — sticky sidebar */}
          <div className="space-y-4 sm:space-y-6">
            <Card className="lg:sticky lg:top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums">{formatCurrency(calculateSubtotal())}</span>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Discount</Label>
                  <CurrencyInput
                    value={formData.discount}
                    onChange={(val) =>
                      setFormData({ ...formData, discount: val })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tax/VAT</Label>
                  <CurrencyInput
                    value={formData.tax}
                    onChange={(val) =>
                      setFormData({ ...formData, tax: val })
                    }
                  />
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary tabular-nums">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
                <Button type="submit" className="w-full gap-2 mt-2" disabled={loading}>
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
