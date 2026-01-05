import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerSelect } from '@/components/shared/CustomerSelect';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Save, FileText, Receipt, Trash2, ShieldAlert, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface Customer {
  id: string;
  name: string;
}

interface CostLineItem {
  qty: number;
  price: number;
}

interface CostingData {
  job_description: string;
  quantity: number;
  customer_id: string;
  design: CostLineItem;
  plate1: CostLineItem;
  plate2: CostLineItem;
  plate3: CostLineItem;
  paper1: CostLineItem;
  paper2: CostLineItem;
  paper3: CostLineItem;
  print1: CostLineItem;
  print2: CostLineItem;
  print3: CostLineItem;
  lamination: CostLineItem;
  die_cutting: CostLineItem;
  foil_printing: CostLineItem;
  binding: CostLineItem;
  others: CostLineItem;
  margin_percent: number;
}

const initialCostItem: CostLineItem = { qty: 0, price: 0 };

const PriceCalculationForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role, isAdmin } = useAuth();
  const isEditing = Boolean(id);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertType, setConvertType] = useState<'quotation' | 'invoice'>('quotation');
  const [converting, setConverting] = useState(false);

  const [formData, setFormData] = useState<CostingData>({
    job_description: '',
    quantity: 1,
    customer_id: '',
    design: { qty: 1, price: 0 },
    plate1: initialCostItem,
    plate2: initialCostItem,
    plate3: initialCostItem,
    paper1: initialCostItem,
    paper2: initialCostItem,
    paper3: initialCostItem,
    print1: initialCostItem,
    print2: initialCostItem,
    print3: initialCostItem,
    lamination: initialCostItem,
    die_cutting: initialCostItem,
    foil_printing: initialCostItem,
    binding: initialCostItem,
    others: initialCostItem,
    margin_percent: 25,
  });

  useEffect(() => {
    fetchCustomers();
    if (isEditing) {
      fetchCalculation();
    }
  }, [id]);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, name').order('name');
    setCustomers(data || []);
  };

  const fetchCalculation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('price_calculations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          job_description: data.job_description || '',
          quantity: Number(data.quantity) || 1,
          customer_id: data.customer_id || '',
          design: { qty: Number(data.design_qty) || 1, price: Number(data.design_price) || 0 },
          plate1: { qty: Number(data.plate_qty) || 0, price: Number(data.plate_price) || 0 },
          plate2: { qty: Number(data.plate2_qty) || 0, price: Number(data.plate2_price) || 0 },
          plate3: { qty: Number(data.plate3_qty) || 0, price: Number(data.plate3_price) || 0 },
          paper1: { qty: Number(data.paper1_qty) || 0, price: Number(data.paper1_price) || 0 },
          paper2: { qty: Number(data.paper2_qty) || 0, price: Number(data.paper2_price) || 0 },
          paper3: { qty: Number(data.paper3_qty) || 0, price: Number(data.paper3_price) || 0 },
          print1: { qty: Number(data.print_qty) || 0, price: Number(data.print_price) || 0 },
          print2: { qty: Number(data.print2_qty) || 0, price: Number(data.print2_price) || 0 },
          print3: { qty: Number(data.print3_qty) || 0, price: Number(data.print3_price) || 0 },
          lamination: { qty: Number(data.lamination_qty) || 0, price: Number(data.lamination_price) || Number(data.lamination_cost) || 0 },
          die_cutting: { qty: Number(data.die_cutting_qty) || 0, price: Number(data.die_cutting_price) || Number(data.die_cutting_cost) || 0 },
          foil_printing: { qty: Number(data.foil_printing_qty) || 0, price: Number(data.foil_printing_price) || 0 },
          binding: { qty: Number(data.binding_qty) || 0, price: Number(data.binding_price) || Number(data.binding_cost) || 0 },
          others: { qty: Number(data.others_qty) || 0, price: Number(data.others_price) || Number(data.others_cost) || 0 },
          margin_percent: Number(data.margin_percent) || 25,
        });
      }
    } catch (error) {
      console.error('Error fetching calculation:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const calcTotal = (item: CostLineItem) => item.qty * item.price;
  
  const designTotal = calcTotal(formData.design);
  const plate1Total = calcTotal(formData.plate1);
  const plate2Total = calcTotal(formData.plate2);
  const plate3Total = calcTotal(formData.plate3);
  const paper1Total = calcTotal(formData.paper1);
  const paper2Total = calcTotal(formData.paper2);
  const paper3Total = calcTotal(formData.paper3);
  const print1Total = calcTotal(formData.print1);
  const print2Total = calcTotal(formData.print2);
  const print3Total = calcTotal(formData.print3);
  const laminationTotal = calcTotal(formData.lamination);
  const dieCuttingTotal = calcTotal(formData.die_cutting);
  const foilPrintingTotal = calcTotal(formData.foil_printing);
  const bindingTotal = calcTotal(formData.binding);
  const othersTotal = calcTotal(formData.others);

  const costingTotal =
    designTotal +
    plate1Total + plate2Total + plate3Total +
    paper1Total + paper2Total + paper3Total +
    print1Total + print2Total + print3Total +
    laminationTotal + dieCuttingTotal + foilPrintingTotal +
    bindingTotal + othersTotal;

  const marginAmount = (costingTotal * formData.margin_percent) / 100;
  const quotedPrice = costingTotal + marginAmount;
  const pricePerPcs = formData.quantity > 0 ? quotedPrice / formData.quantity : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleItemChange = (
    field: keyof CostingData,
    subField: 'qty' | 'price',
    value: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: {
        ...(prev[field] as CostLineItem),
        [subField]: value,
      },
    }));
  };

  const handleChange = (field: keyof CostingData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.job_description.trim()) {
      toast.error('Please enter job description');
      return;
    }

    setSaving(true);

    try {
      const dataToSave = {
        job_description: formData.job_description,
        quantity: formData.quantity,
        customer_id: formData.customer_id || null,
        design_qty: formData.design.qty,
        design_price: formData.design.price,
        design_cost: designTotal,
        plate_qty: formData.plate1.qty,
        plate_price: formData.plate1.price,
        plate_total: plate1Total,
        plate2_qty: formData.plate2.qty,
        plate2_price: formData.plate2.price,
        plate2_total: plate2Total,
        plate3_qty: formData.plate3.qty,
        plate3_price: formData.plate3.price,
        plate3_total: plate3Total,
        paper1_qty: formData.paper1.qty,
        paper1_price: formData.paper1.price,
        paper1_total: paper1Total,
        paper2_qty: formData.paper2.qty,
        paper2_price: formData.paper2.price,
        paper2_total: paper2Total,
        paper3_qty: formData.paper3.qty,
        paper3_price: formData.paper3.price,
        paper3_total: paper3Total,
        print_qty: formData.print1.qty,
        print_price: formData.print1.price,
        print_total: print1Total,
        print2_qty: formData.print2.qty,
        print2_price: formData.print2.price,
        print2_total: print2Total,
        print3_qty: formData.print3.qty,
        print3_price: formData.print3.price,
        print3_total: print3Total,
        lamination_qty: formData.lamination.qty,
        lamination_price: formData.lamination.price,
        lamination_cost: laminationTotal,
        die_cutting_qty: formData.die_cutting.qty,
        die_cutting_price: formData.die_cutting.price,
        die_cutting_cost: dieCuttingTotal,
        foil_printing_qty: formData.foil_printing.qty,
        foil_printing_price: formData.foil_printing.price,
        foil_printing_total: foilPrintingTotal,
        binding_qty: formData.binding.qty,
        binding_price: formData.binding.price,
        binding_cost: bindingTotal,
        others_qty: formData.others.qty,
        others_price: formData.others.price,
        others_cost: othersTotal,
        costing_total: costingTotal,
        margin_percent: formData.margin_percent,
        margin_amount: marginAmount,
        final_price: quotedPrice,
        price_per_pcs: pricePerPcs,
        created_by: user?.id,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('price_calculations')
          .update(dataToSave)
          .eq('id', id);
        if (error) throw error;
        toast.success('Calculation updated');
      } else {
        const { data, error } = await supabase
          .from('price_calculations')
          .insert([dataToSave])
          .select()
          .single();
        if (error) throw error;
        toast.success('Calculation saved');
        navigate(`/price-calculation/${data.id}`);
      }
    } catch (error: any) {
      console.error('Error saving:', error);
      toast.error(error.message || 'Error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async () => {
    setConverting(true);

    try {
      if (convertType === 'quotation') {
        const { data: quotationNumber } = await supabase.rpc('generate_quotation_number');
        
        const { data: quotation, error: quotationError } = await supabase
          .from('quotations')
          .insert([{
            quotation_number: quotationNumber,
            customer_id: formData.customer_id || null,
            quotation_date: format(new Date(), 'yyyy-MM-dd'),
            subtotal: quotedPrice,
            total: quotedPrice,
            notes: `Job: ${formData.job_description}`,
            created_by: user?.id,
          }])
          .select()
          .single();

        if (quotationError) throw quotationError;

        await supabase.from('quotation_items').insert([{
          quotation_id: quotation.id,
          description: formData.job_description,
          quantity: formData.quantity,
          unit_price: pricePerPcs,
          total: quotedPrice,
        }]);

        if (isEditing) {
          await supabase
            .from('price_calculations')
            .update({ quotation_id: quotation.id })
            .eq('id', id);
        }

        toast.success('Quotation created');
        navigate(`/quotations/${quotation.id}`);
      } else {
        const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');
        
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert([{
            invoice_number: invoiceNumber,
            customer_id: formData.customer_id || null,
            invoice_date: format(new Date(), 'yyyy-MM-dd'),
            subtotal: quotedPrice,
            total: quotedPrice,
            notes: `Job: ${formData.job_description}`,
            created_by: user?.id,
          }])
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        await supabase.from('invoice_items').insert([{
          invoice_id: invoice.id,
          description: formData.job_description,
          quantity: formData.quantity,
          unit_price: pricePerPcs,
          total: quotedPrice,
        }]);

        if (isEditing) {
          await supabase
            .from('price_calculations')
            .update({ invoice_id: invoice.id })
            .eq('id', id);
        }

        toast.success('Invoice created');
        navigate(`/invoices/${invoice.id}`);
      }
    } catch (error: any) {
      console.error('Error converting:', error);
      toast.error(error.message || 'Error occurred');
    } finally {
      setConverting(false);
      setConvertDialogOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !window.confirm('Delete this calculation?')) return;

    try {
      const { error } = await supabase.from('price_calculations').delete().eq('id', id);
      if (error) throw error;
      toast.success('Calculation deleted');
      navigate('/price-calculation');
    } catch (error: any) {
      toast.error(error.message || 'Error occurred');
    }
  };

  // Check permission
  if (!hasPermission(role, 'price_calculations', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-muted rounded" />
        <div className="h-96 bg-muted rounded-xl" />
      </div>
    );
  }

  const CostLineItemRow = ({
    label,
    field,
    showDivider = true,
  }: {
    label: string;
    field: keyof CostingData;
    showDivider?: boolean;
  }) => {
    const item = formData[field] as CostLineItem;
    const total = calcTotal(item);
    
    return (
      <div className={`grid gap-4 sm:grid-cols-4 items-end ${showDivider ? 'pb-4 border-b' : ''}`}>
        <div>
          <Label className="text-base font-semibold">{label}</Label>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Quantity</Label>
          <Input
            type="number"
            defaultValue={item.qty === 0 ? '' : item.qty}
            key={`${field}-qty-${item.qty}`}
            onBlur={(e) => handleItemChange(field, 'qty', e.target.value === '' ? 0 : Number(e.target.value))}
            min={0}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Price</Label>
          <CurrencyInput
            value={item.price}
            onChange={(val) => handleItemChange(field, 'price', val)}
          />
        </div>
        <div className="text-right font-medium">
          {formatCurrency(total)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/price-calculation')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{isEditing ? 'Edit Calculation' : 'New Price Calculation'}</h1>
            <p className="text-muted-foreground">Printing job costing calculation</p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasPermission(role, 'price_calculations', 'create') && !isEditing && (
            <Button variant="outline" onClick={() => navigate('/price-calculation/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Job
            </Button>
          )}
          {isEditing && hasPermission(role, 'price_calculations', 'delete') && (
            <Button variant="destructive" size="icon" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Job Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Job Description *</Label>
                  <Textarea
                    value={formData.job_description}
                    onChange={(e) => handleChange('job_description', e.target.value)}
                    placeholder="e.g. Business Card 1000 pcs"
                    rows={2}
                    className="min-h-[60px] resize-y"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity (pcs)</Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => handleChange('quantity', Number(e.target.value))}
                    min={1}
                  />
                </div>
                <div className="space-y-2 sm:col-span-3">
                  <Label>Customer</Label>
                  <CustomerSelect
                    value={formData.customer_id}
                    onValueChange={(value) => handleChange('customer_id', value)}
                    customers={customers}
                    onCustomerAdded={fetchCustomers}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Costing Items */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <CostLineItemRow label="Design" field="design" />
                <CostLineItemRow label="Plate-01" field="plate1" />
                <CostLineItemRow label="Plate-02" field="plate2" />
                <CostLineItemRow label="Plate-03" field="plate3" />
                <CostLineItemRow label="Paper-1" field="paper1" />
                <CostLineItemRow label="Paper-2" field="paper2" />
                <CostLineItemRow label="Paper-3" field="paper3" />
                <CostLineItemRow label="Printing-1" field="print1" />
                <CostLineItemRow label="Printing-2" field="print2" />
                <CostLineItemRow label="Printing-3" field="print3" />
                <CostLineItemRow label="Lamination" field="lamination" />
                <CostLineItemRow label="Die Cutting" field="die_cutting" />
                <CostLineItemRow label="Foil Printing" field="foil_printing" />
                <CostLineItemRow label="Binding" field="binding" />
                <CostLineItemRow label="Others" field="others" showDivider={false} />
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
                <div className="flex justify-between text-lg">
                  <span className="text-muted-foreground">Total Costing</span>
                  <span className="font-bold">{formatCurrency(costingTotal)}</span>
                </div>

                <div className="space-y-2">
                  <Label>Margin/Profit (%)</Label>
                  <Input
                    type="number"
                    value={formData.margin_percent}
                    onChange={(e) => handleChange('margin_percent', Number(e.target.value))}
                    min={0}
                    max={100}
                  />
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Margin Amount</span>
                  <span className="font-medium text-success">+{formatCurrency(marginAmount)}</span>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-xl font-bold">
                    <span>Quoted Price</span>
                    <span className="text-primary">{formatCurrency(quotedPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Per Piece</span>
                    <span className="font-medium">{formatCurrency(pricePerPcs)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <Button type="submit" className="w-full gap-2" disabled={saving}>
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Calculation'}
                  </Button>

                  {isEditing && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => {
                          setConvertType('quotation');
                          setConvertDialogOpen(true);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                        Convert to Quotation
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => {
                          setConvertType('invoice');
                          setConvertDialogOpen(true);
                        }}
                      >
                        <Receipt className="h-4 w-4" />
                        Convert to Invoice
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Convert Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {convertType === 'quotation' ? 'Create Quotation' : 'Create Invoice'}
            </DialogTitle>
            <DialogDescription>
              A new {convertType === 'quotation' ? 'quotation' : 'invoice'} will be created from this calculation.
              <br />
              <strong>Job:</strong> {formData.job_description}
              <br />
              <strong>Price:</strong> {formatCurrency(quotedPrice)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConvert} disabled={converting}>
              {converting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PriceCalculationForm;
