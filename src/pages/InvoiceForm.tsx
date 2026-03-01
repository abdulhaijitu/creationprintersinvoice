import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCompanySettings } from '@/contexts/CompanySettingsContext';
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
import { Plus, Trash2, ArrowLeft, Save, FileText, CalendarDays, User, Package, Receipt, StickyNote } from 'lucide-react';
import { format } from 'date-fns';
import { CustomerSelect } from '@/components/shared/CustomerSelect';
import { ItemWiseCostingSection, CostingItem, InvoiceLineItem } from '@/components/invoice/ItemWiseCostingSection';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

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
  <div className="relative bg-card border border-border/60 rounded-xl p-4 space-y-3 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
          {index + 1}
        </span>
        <span className="text-xs font-medium text-muted-foreground">Item</span>
      </div>
      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => removeItem(item.id)}
          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">Description</Label>
      <RichTextEditor
        value={item.description}
        onChange={(val) => updateItem(item.id, 'description', val)}
        placeholder="Item description"
        minHeight="60px"
      />
    </div>
    <div className="grid grid-cols-3 gap-2">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Qty</Label>
        <CurrencyInput
          value={item.quantity}
          onChange={(val) => updateItem(item.id, 'quantity', val)}
          decimals={0}
          formatOnBlur={false}
          className="text-center"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Unit</Label>
        <Input
          value={item.unit}
          onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
          placeholder="pcs"
          className="text-center"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Price</Label>
        <CurrencyInput
          value={item.unit_price}
          onChange={(val) => updateItem(item.id, 'unit_price', val)}
        />
      </div>
    </div>
    <div className="flex justify-between items-center pt-3 border-t border-border/50">
      <span className="text-xs text-muted-foreground">Line Total</span>
      <span className="font-bold text-foreground">{formatCurrency(item.total)}</span>
    </div>
  </div>
);

const InvoiceForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { settings: companySettings } = useCompanySettings();
  const isEditing = Boolean(id);
  const isMobile = useIsMobile();
  
  const costingPermissions = useCostingPermissions();
  const [termsFromCompany, setTermsFromCompany] = useState(false);
  
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

  useEffect(() => {
    if (!isEditing && companySettings) {
      setFormData(prev => {
        const updates = { ...prev };
        if (companySettings.invoice_terms && !prev.terms) {
          updates.terms = companySettings.invoice_terms;
          setTermsFromCompany(true);
        }
        if (companySettings.invoice_footer && !prev.notes) {
          updates.notes = companySettings.invoice_footer;
          setNotesFromDefault(true);
        }
        return updates;
      });
    }
  }, [isEditing, companySettings]);

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
      if (customer?.default_terms && (!prev.terms || termsFromDefault || termsFromCompany)) {
        updates.terms = customer.default_terms;
        setTermsFromDefault(true);
        setTermsFromCompany(false);
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
      setTermsFromCompany(false);
    }
  };

  const resetTermsToCompanyDefault = () => {
    if (companySettings?.invoice_terms) {
      setFormData(prev => ({ ...prev, terms: companySettings.invoice_terms || '' }));
      setTermsFromCompany(true);
      setTermsFromDefault(false);
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

  const subtotal = calculateSubtotal();
  const total = calculateTotal();

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      {/* Enhanced Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')} className="shrink-0 rounded-xl hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="hidden sm:flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold truncate text-foreground">
                {isEditing ? 'Edit Invoice' : 'New Invoice'}
              </h1>
              {isEditing && (
                <Badge variant="secondary" className="hidden sm:inline-flex font-mono text-xs">
                  {invoiceNumber}
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {isEditing ? `Editing invoice ${invoiceNumber}` : 'Fill in details below — invoice number auto-generates on save'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="grid gap-5 sm:gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5 sm:space-y-6">
            
            {/* Invoice Details Card - Enhanced */}
            <Card className="overflow-hidden border-border/60">
              <CardHeader className="pb-3 bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Invoice Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Customer <span className="text-destructive">*</span></Label>
                    <CustomerSelect
                      value={formData.customer_id}
                      onValueChange={handleCustomerChange}
                      customers={customers}
                      onCustomerAdded={fetchCustomers}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Invoice Date</Label>
                    <Input
                      type="date"
                      value={formData.invoice_date}
                      onChange={(e) =>
                        setFormData({ ...formData, invoice_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Due Date</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) =>
                        setFormData({ ...formData, due_date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Subject <span className="text-muted-foreground/60 font-normal">(optional)</span>
                  </Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value.slice(0, 255) })}
                    placeholder="e.g., Stall design & printing work for Dhaka Fair 2026"
                    maxLength={255}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Items Card - Enhanced */}
            <Card className="overflow-hidden border-border/60">
              <CardHeader className="pb-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary">
                      <Package className="h-3.5 w-3.5" />
                    </div>
                    <CardTitle className="text-sm font-semibold">Line Items</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
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
                  /* Desktop: Enhanced Table layout */
                  <div className="rounded-xl border border-border/60 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead className="w-12 text-center font-semibold text-xs">#</TableHead>
                          <TableHead className="min-w-[240px] font-semibold text-xs">DESCRIPTION</TableHead>
                          <TableHead className="text-center w-[80px] font-semibold text-xs">QTY</TableHead>
                          <TableHead className="text-center w-[80px] font-semibold text-xs">UNIT</TableHead>
                          <TableHead className="text-right w-[120px] font-semibold text-xs">PRICE</TableHead>
                          <TableHead className="text-right w-[120px] font-semibold text-xs">TOTAL</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow key={item.id} className="group hover:bg-accent/30 transition-colors">
                            <TableCell className="text-center">
                              <span className="flex items-center justify-center w-6 h-6 mx-auto rounded-full bg-muted/50 text-muted-foreground text-xs font-medium">
                                {index + 1}
                              </span>
                            </TableCell>
                            <TableCell>
                              <RichTextEditor
                                value={item.description}
                                onChange={(val) => updateItem(item.id, 'description', val)}
                                placeholder="Item description"
                                minHeight="40px"
                                className="border-0 [&>div]:border-0 [&>div]:bg-transparent"
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
                            <TableCell className="text-right font-semibold tabular-nums text-sm">
                              {formatCurrency(item.total)}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(item.id)}
                                disabled={items.length === 1}
                                className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10"
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

                {/* Enhanced Add Item button */}
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/20 py-3 text-sm font-medium text-muted-foreground transition-all hover:border-primary/50 hover:text-primary hover:bg-primary/5"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </button>
              </CardContent>
            </Card>

            {/* Item-wise Costing Section */}
            {costingPermissions.canView && (
              <ItemWiseCostingSection
                invoiceItems={items}
                costingItems={costingItems}
                onCostingItemsChange={setCostingItems}
                permissions={costingPermissions}
                invoiceTotal={total}
                invoiceId={id}
                isNewInvoice={!isEditing}
              />
            )}

            {/* Notes & Terms Card - Enhanced */}
            <Card className="overflow-hidden border-border/60">
              <CardHeader className="pb-3 bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary">
                    <StickyNote className="h-3.5 w-3.5" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Notes & Terms</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
                    {notesFromDefault && formData.customer_id && (
                      <Badge variant="outline" className="text-[10px] h-5">
                        From customer default
                      </Badge>
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
                      className="text-xs h-auto py-1 px-2 text-muted-foreground hover:text-primary"
                      onClick={resetNotesToDefault}
                    >
                      Reset to customer default
                    </Button>
                  )}
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground">Terms & Conditions</Label>
                    {termsFromDefault && formData.customer_id && (
                      <Badge variant="outline" className="text-[10px] h-5">
                        From customer default
                      </Badge>
                    )}
                    {termsFromCompany && !termsFromDefault && (
                      <Badge variant="outline" className="text-[10px] h-5">
                        From company settings
                      </Badge>
                    )}
                  </div>
                  <RichTextEditor
                    value={formData.terms}
                    onChange={(val) => {
                      setFormData({ ...formData, terms: val });
                      setTermsFromDefault(false);
                      setTermsFromCompany(false);
                    }}
                    placeholder="Terms & conditions..."
                    minHeight="80px"
                  />
                  <div className="flex gap-1 flex-wrap">
                    {formData.customer_id && customers.find(c => c.id === formData.customer_id)?.default_terms && !termsFromDefault && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-auto py-1 px-2 text-muted-foreground hover:text-primary"
                        onClick={resetTermsToDefault}
                      >
                        Reset to customer default
                      </Button>
                    )}
                    {companySettings?.invoice_terms && !termsFromCompany && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-auto py-1 px-2 text-muted-foreground hover:text-primary"
                        onClick={resetTermsToCompanyDefault}
                      >
                        Reset to company default
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar - Enhanced */}
          <div className="space-y-5 sm:space-y-6">
            <Card className="lg:sticky lg:top-4 overflow-hidden border-border/60">
              <CardHeader className="pb-3 bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary">
                    <Receipt className="h-3.5 w-3.5" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Discount</Label>
                  <CurrencyInput
                    value={formData.discount}
                    onChange={(val) =>
                      setFormData({ ...formData, discount: val })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Tax/VAT</Label>
                  <CurrencyInput
                    value={formData.tax}
                    onChange={(val) =>
                      setFormData({ ...formData, tax: val })
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-foreground">Total</span>
                    <span className="text-xl font-bold text-primary tabular-nums">{formatCurrency(total)}</span>
                  </div>
                </div>
                
                <Button type="submit" className="w-full gap-2 h-11 text-sm font-semibold rounded-xl" disabled={loading}>
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
