import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Save, FileText, Receipt, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Customer {
  id: string;
  name: string;
}

interface CostingData {
  job_description: string;
  customer_id: string;
  design_cost: number;
  plate_qty: number;
  plate_price: number;
  paper1_qty: number;
  paper1_price: number;
  paper2_qty: number;
  paper2_price: number;
  paper3_qty: number;
  paper3_price: number;
  print_qty: number;
  print_price: number;
  lamination_cost: number;
  die_cutting_cost: number;
  binding_cost: number;
  others_cost: number;
  margin_percent: number;
}

const PriceCalculationForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const isEditing = Boolean(id);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertType, setConvertType] = useState<'quotation' | 'invoice'>('quotation');
  const [converting, setConverting] = useState(false);

  const [formData, setFormData] = useState<CostingData>({
    job_description: '',
    customer_id: '',
    design_cost: 0,
    plate_qty: 0,
    plate_price: 0,
    paper1_qty: 0,
    paper1_price: 0,
    paper2_qty: 0,
    paper2_price: 0,
    paper3_qty: 0,
    paper3_price: 0,
    print_qty: 0,
    print_price: 0,
    lamination_cost: 0,
    die_cutting_cost: 0,
    binding_cost: 0,
    others_cost: 0,
    margin_percent: 20,
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
          customer_id: data.customer_id || '',
          design_cost: Number(data.design_cost) || 0,
          plate_qty: Number(data.plate_qty) || 0,
          plate_price: Number(data.plate_price) || 0,
          paper1_qty: Number(data.paper1_qty) || 0,
          paper1_price: Number(data.paper1_price) || 0,
          paper2_qty: Number(data.paper2_qty) || 0,
          paper2_price: Number(data.paper2_price) || 0,
          paper3_qty: Number(data.paper3_qty) || 0,
          paper3_price: Number(data.paper3_price) || 0,
          print_qty: Number(data.print_qty) || 0,
          print_price: Number(data.print_price) || 0,
          lamination_cost: Number(data.lamination_cost) || 0,
          die_cutting_cost: Number(data.die_cutting_cost) || 0,
          binding_cost: Number(data.binding_cost) || 0,
          others_cost: Number(data.others_cost) || 0,
          margin_percent: Number(data.margin_percent) || 20,
        });
      }
    } catch (error) {
      console.error('Error fetching calculation:', error);
      toast.error('ডেটা লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const plateTotal = formData.plate_qty * formData.plate_price;
  const paper1Total = formData.paper1_qty * formData.paper1_price;
  const paper2Total = formData.paper2_qty * formData.paper2_price;
  const paper3Total = formData.paper3_qty * formData.paper3_price;
  const printTotal = formData.print_qty * formData.print_price;

  const costingTotal =
    formData.design_cost +
    plateTotal +
    paper1Total +
    paper2Total +
    paper3Total +
    printTotal +
    formData.lamination_cost +
    formData.die_cutting_cost +
    formData.binding_cost +
    formData.others_cost;

  const marginAmount = (costingTotal * formData.margin_percent) / 100;
  const finalPrice = costingTotal + marginAmount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('bn-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleChange = (field: keyof CostingData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.job_description.trim()) {
      toast.error('জবের বিবরণ দিন');
      return;
    }

    setSaving(true);

    try {
      const dataToSave = {
        job_description: formData.job_description,
        customer_id: formData.customer_id || null,
        design_cost: formData.design_cost,
        plate_qty: formData.plate_qty,
        plate_price: formData.plate_price,
        plate_total: plateTotal,
        paper1_qty: formData.paper1_qty,
        paper1_price: formData.paper1_price,
        paper1_total: paper1Total,
        paper2_qty: formData.paper2_qty,
        paper2_price: formData.paper2_price,
        paper2_total: paper2Total,
        paper3_qty: formData.paper3_qty,
        paper3_price: formData.paper3_price,
        paper3_total: paper3Total,
        print_qty: formData.print_qty,
        print_price: formData.print_price,
        print_total: printTotal,
        lamination_cost: formData.lamination_cost,
        die_cutting_cost: formData.die_cutting_cost,
        binding_cost: formData.binding_cost,
        others_cost: formData.others_cost,
        costing_total: costingTotal,
        margin_percent: formData.margin_percent,
        margin_amount: marginAmount,
        final_price: finalPrice,
        created_by: user?.id,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('price_calculations')
          .update(dataToSave)
          .eq('id', id);
        if (error) throw error;
        toast.success('হিসাব আপডেট হয়েছে');
      } else {
        const { data, error } = await supabase
          .from('price_calculations')
          .insert([dataToSave])
          .select()
          .single();
        if (error) throw error;
        toast.success('হিসাব সংরক্ষণ হয়েছে');
        navigate(`/price-calculation/${data.id}`);
      }
    } catch (error: any) {
      console.error('Error saving:', error);
      toast.error(error.message || 'সমস্যা হয়েছে');
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
            subtotal: finalPrice,
            total: finalPrice,
            notes: `জব: ${formData.job_description}`,
            created_by: user?.id,
          }])
          .select()
          .single();

        if (quotationError) throw quotationError;

        // Create quotation item
        await supabase.from('quotation_items').insert([{
          quotation_id: quotation.id,
          description: formData.job_description,
          quantity: 1,
          unit_price: finalPrice,
          total: finalPrice,
        }]);

        // Link to price calculation
        if (isEditing) {
          await supabase
            .from('price_calculations')
            .update({ quotation_id: quotation.id })
            .eq('id', id);
        }

        toast.success('কোটেশন তৈরি হয়েছে');
        navigate(`/quotations/${quotation.id}`);
      } else {
        const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');
        
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert([{
            invoice_number: invoiceNumber,
            customer_id: formData.customer_id || null,
            invoice_date: format(new Date(), 'yyyy-MM-dd'),
            subtotal: finalPrice,
            total: finalPrice,
            notes: `জব: ${formData.job_description}`,
            created_by: user?.id,
          }])
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // Create invoice item
        await supabase.from('invoice_items').insert([{
          invoice_id: invoice.id,
          description: formData.job_description,
          quantity: 1,
          unit_price: finalPrice,
          total: finalPrice,
        }]);

        // Link to price calculation
        if (isEditing) {
          await supabase
            .from('price_calculations')
            .update({ invoice_id: invoice.id })
            .eq('id', id);
        }

        toast.success('ইনভয়েস তৈরি হয়েছে');
        navigate(`/invoices/${invoice.id}`);
      }
    } catch (error: any) {
      console.error('Error converting:', error);
      toast.error(error.message || 'সমস্যা হয়েছে');
    } finally {
      setConverting(false);
      setConvertDialogOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !window.confirm('এই হিসাব মুছে ফেলতে চান?')) return;

    try {
      const { error } = await supabase.from('price_calculations').delete().eq('id', id);
      if (error) throw error;
      toast.success('হিসাব মুছে ফেলা হয়েছে');
      navigate('/price-calculation');
    } catch (error: any) {
      toast.error(error.message || 'সমস্যা হয়েছে');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-muted rounded" />
        <div className="h-96 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/price-calculation')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{isEditing ? 'হিসাব সম্পাদনা' : 'নতুন মূল্য হিসাব'}</h1>
            <p className="text-muted-foreground">প্রিন্টিং জবের কস্টিং ক্যালকুলেশন</p>
          </div>
        </div>
        {isEditing && isAdmin && (
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>জবের তথ্য</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>জবের বিবরণ *</Label>
                  <Input
                    value={formData.job_description}
                    onChange={(e) => handleChange('job_description', e.target.value)}
                    placeholder="যেমন: বিজনেস কার্ড 1000 পিস"
                  />
                </div>
                <div className="space-y-2">
                  <Label>গ্রাহক</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) => handleChange('customer_id', value)}
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
              </CardContent>
            </Card>

            {/* Costing Items */}
            <Card>
              <CardHeader>
                <CardTitle>খরচের হিসাব</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Design */}
                <div className="grid gap-4 sm:grid-cols-4 items-end pb-4 border-b">
                  <div className="sm:col-span-2">
                    <Label className="text-base font-semibold">ডিজাইন</Label>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">খরচ</Label>
                    <Input
                      type="number"
                      value={formData.design_cost}
                      onChange={(e) => handleChange('design_cost', Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div className="text-right font-medium">
                    {formatCurrency(formData.design_cost)}
                  </div>
                </div>

                {/* Plate */}
                <div className="grid gap-4 sm:grid-cols-4 items-end pb-4 border-b">
                  <div>
                    <Label className="text-base font-semibold">প্লেট</Label>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">পরিমাণ</Label>
                    <Input
                      type="number"
                      value={formData.plate_qty}
                      onChange={(e) => handleChange('plate_qty', Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">দাম</Label>
                    <Input
                      type="number"
                      value={formData.plate_price}
                      onChange={(e) => handleChange('plate_price', Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div className="text-right font-medium">
                    {formatCurrency(plateTotal)}
                  </div>
                </div>

                {/* Paper 1 */}
                <div className="grid gap-4 sm:grid-cols-4 items-end pb-4 border-b">
                  <div>
                    <Label className="text-base font-semibold">কাগজ-১</Label>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">পরিমাণ</Label>
                    <Input
                      type="number"
                      value={formData.paper1_qty}
                      onChange={(e) => handleChange('paper1_qty', Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">দাম</Label>
                    <Input
                      type="number"
                      value={formData.paper1_price}
                      onChange={(e) => handleChange('paper1_price', Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div className="text-right font-medium">
                    {formatCurrency(paper1Total)}
                  </div>
                </div>

                {/* Paper 2 */}
                <div className="grid gap-4 sm:grid-cols-4 items-end pb-4 border-b">
                  <div>
                    <Label className="text-base font-semibold">কাগজ-২</Label>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">পরিমাণ</Label>
                    <Input
                      type="number"
                      value={formData.paper2_qty}
                      onChange={(e) => handleChange('paper2_qty', Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">দাম</Label>
                    <Input
                      type="number"
                      value={formData.paper2_price}
                      onChange={(e) => handleChange('paper2_price', Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div className="text-right font-medium">
                    {formatCurrency(paper2Total)}
                  </div>
                </div>

                {/* Paper 3 */}
                <div className="grid gap-4 sm:grid-cols-4 items-end pb-4 border-b">
                  <div>
                    <Label className="text-base font-semibold">কাগজ-৩</Label>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">পরিমাণ</Label>
                    <Input
                      type="number"
                      value={formData.paper3_qty}
                      onChange={(e) => handleChange('paper3_qty', Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">দাম</Label>
                    <Input
                      type="number"
                      value={formData.paper3_price}
                      onChange={(e) => handleChange('paper3_price', Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div className="text-right font-medium">
                    {formatCurrency(paper3Total)}
                  </div>
                </div>

                {/* Print */}
                <div className="grid gap-4 sm:grid-cols-4 items-end pb-4 border-b">
                  <div>
                    <Label className="text-base font-semibold">প্রিন্ট</Label>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">পরিমাণ</Label>
                    <Input
                      type="number"
                      value={formData.print_qty}
                      onChange={(e) => handleChange('print_qty', Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">দাম</Label>
                    <Input
                      type="number"
                      value={formData.print_price}
                      onChange={(e) => handleChange('print_price', Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div className="text-right font-medium">
                    {formatCurrency(printTotal)}
                  </div>
                </div>

                {/* Lamination */}
                <div className="grid gap-4 sm:grid-cols-4 items-end pb-4 border-b">
                  <div className="sm:col-span-2">
                    <Label className="text-base font-semibold">ল্যামিনেশন</Label>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">খরচ</Label>
                    <Input
                      type="number"
                      value={formData.lamination_cost}
                      onChange={(e) => handleChange('lamination_cost', Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div className="text-right font-medium">
                    {formatCurrency(formData.lamination_cost)}
                  </div>
                </div>

                {/* Die Cutting */}
                <div className="grid gap-4 sm:grid-cols-4 items-end pb-4 border-b">
                  <div className="sm:col-span-2">
                    <Label className="text-base font-semibold">ডাই কাটিং</Label>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">খরচ</Label>
                    <Input
                      type="number"
                      value={formData.die_cutting_cost}
                      onChange={(e) => handleChange('die_cutting_cost', Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div className="text-right font-medium">
                    {formatCurrency(formData.die_cutting_cost)}
                  </div>
                </div>

                {/* Binding */}
                <div className="grid gap-4 sm:grid-cols-4 items-end pb-4 border-b">
                  <div className="sm:col-span-2">
                    <Label className="text-base font-semibold">বাইন্ডিং</Label>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">খরচ</Label>
                    <Input
                      type="number"
                      value={formData.binding_cost}
                      onChange={(e) => handleChange('binding_cost', Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div className="text-right font-medium">
                    {formatCurrency(formData.binding_cost)}
                  </div>
                </div>

                {/* Others */}
                <div className="grid gap-4 sm:grid-cols-4 items-end">
                  <div className="sm:col-span-2">
                    <Label className="text-base font-semibold">অন্যান্য</Label>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">খরচ</Label>
                    <Input
                      type="number"
                      value={formData.others_cost}
                      onChange={(e) => handleChange('others_cost', Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div className="text-right font-medium">
                    {formatCurrency(formData.others_cost)}
                  </div>
                </div>
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
                <div className="flex justify-between text-lg">
                  <span className="text-muted-foreground">মোট কস্টিং</span>
                  <span className="font-bold">{formatCurrency(costingTotal)}</span>
                </div>

                <div className="space-y-2">
                  <Label>মার্জিন/প্রফিট (%)</Label>
                  <Input
                    type="number"
                    value={formData.margin_percent}
                    onChange={(e) => handleChange('margin_percent', Number(e.target.value))}
                    min={0}
                    max={100}
                  />
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">মার্জিন পরিমাণ</span>
                  <span className="font-medium text-success">+{formatCurrency(marginAmount)}</span>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between text-xl font-bold">
                    <span>ফাইনাল প্রাইস</span>
                    <span className="text-primary">{formatCurrency(finalPrice)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <Button type="submit" className="w-full gap-2" disabled={saving}>
                    <Save className="h-4 w-4" />
                    {saving ? 'সংরক্ষণ হচ্ছে...' : 'হিসাব সংরক্ষণ করুন'}
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
                        কোটেশন তৈরি করুন
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
                        ইনভয়েস তৈরি করুন
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
              {convertType === 'quotation' ? 'কোটেশন তৈরি করুন' : 'ইনভয়েস তৈরি করুন'}
            </DialogTitle>
            <DialogDescription>
              এই হিসাব থেকে একটি নতুন {convertType === 'quotation' ? 'কোটেশন' : 'ইনভয়েস'} তৈরি হবে।
              <br />
              <strong>জব:</strong> {formData.job_description}
              <br />
              <strong>মূল্য:</strong> {formatCurrency(finalPrice)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
              বাতিল
            </Button>
            <Button onClick={handleConvert} disabled={converting}>
              {converting ? 'তৈরি হচ্ছে...' : 'তৈরি করুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PriceCalculationForm;
