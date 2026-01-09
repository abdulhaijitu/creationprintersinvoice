import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/permissions/hooks';
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
import { ArrowLeft, Save, FileText, Receipt, Trash2, ShieldAlert, Plus, X } from 'lucide-react';
import { format } from 'date-fns';

interface Customer {
  id: string;
  name: string;
}

interface CostLineItem {
  id: string;
  qty: number;
  unit: string;
  price: number;
}

type CategoryKey = 'design' | 'plate' | 'paper' | 'printing' | 'lamination' | 'die_cutting' | 'foil' | 'binding' | 'others';

interface CostCategory {
  label: string;
  key: CategoryKey;
  items: CostLineItem[];
}

const formatCurrencyStatic = (amount: number) => {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Stable component - defined OUTSIDE PriceCalculationForm to prevent re-creation
interface CostLineItemRowProps {
  label: string;
  item: CostLineItem;
  onQtyChange: (val: number) => void;
  onUnitChange: (val: string) => void;
  onPriceChange: (val: number) => void;
  onRemove?: () => void;
  showRemove?: boolean;
  showDivider?: boolean;
}

const CostLineItemRow = ({
  label,
  item,
  onQtyChange,
  onUnitChange,
  onPriceChange,
  onRemove,
  showRemove = false,
  showDivider = true,
}: CostLineItemRowProps) => {
  const total = item.qty * item.price;

  return (
    <div 
      className={`
        flex flex-wrap items-center gap-3 py-3 px-2 rounded-md
        transition-all duration-200 ease-out
        hover:bg-muted/50
        ${showDivider ? 'border-b border-muted/30' : ''}
      `}
    >
      {/* Label */}
      <div className="w-full sm:w-28 shrink-0 flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      
      {/* Quantity */}
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground sm:hidden">Qty</Label>
        <CurrencyInput
          value={item.qty}
          onChange={onQtyChange}
          decimals={0}
          formatOnBlur={false}
          placeholder="0"
          className="w-20 h-10 text-center transition-all duration-200 focus-visible:ring-1 focus-visible:ring-primary"
        />
      </div>
      
      {/* Unit */}
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground sm:hidden">Unit</Label>
        <Input
          value={item.unit}
          onChange={(e) => onUnitChange(e.target.value)}
          placeholder="Pcs"
          className="w-24 h-10 text-center transition-all duration-200 focus-visible:ring-1 focus-visible:ring-primary"
        />
      </div>
      
      {/* Price */}
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground sm:hidden">Price</Label>
        <CurrencyInput
          value={item.price}
          onChange={onPriceChange}
          className="w-28 h-10 transition-all duration-200 focus-visible:ring-1 focus-visible:ring-primary"
        />
      </div>
      
      {/* Line Total */}
      <div className="ml-auto text-right min-w-[90px] flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {formatCurrencyStatic(total)}
        </span>
        {showRemove && onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

// Category Group Component
interface CategoryGroupProps {
  category: CostCategory;
  onItemChange: (itemIndex: number, field: 'qty' | 'unit' | 'price', value: number | string) => void;
  onAddItem: () => void;
  onRemoveItem: (itemIndex: number) => void;
  isLast?: boolean;
}

const CategoryGroup = ({
  category,
  onItemChange,
  onAddItem,
  onRemoveItem,
  isLast = false,
}: CategoryGroupProps) => {
  const categoryTotal = category.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
  
  return (
    <div className={`${!isLast ? 'border-b border-muted/50 pb-4 mb-4' : ''}`}>
      {/* Category Header */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-foreground">{category.label}</h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Subtotal: {formatCurrencyStatic(categoryTotal)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={onAddItem}
          >
            <Plus className="h-3 w-3" />
            Add Row
          </Button>
        </div>
      </div>
      
      {/* Category Items */}
      <div className="space-y-1">
        {category.items.map((item, index) => (
          <CostLineItemRow
            key={item.id}
            label={category.items.length > 1 ? `${category.label}-${index + 1}` : category.label}
            item={item}
            onQtyChange={(v) => onItemChange(index, 'qty', v)}
            onUnitChange={(v) => onItemChange(index, 'unit', v)}
            onPriceChange={(v) => onItemChange(index, 'price', v)}
            onRemove={() => onRemoveItem(index)}
            showRemove={category.items.length > 1}
            showDivider={index < category.items.length - 1}
          />
        ))}
      </div>
    </div>
  );
};

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

const createEmptyItem = (): CostLineItem => ({
  id: generateId(),
  qty: 0,
  unit: 'Pcs',
  price: 0,
});

const defaultCategories: CostCategory[] = [
  { label: 'Design', key: 'design', items: [{ ...createEmptyItem(), qty: 1 }] },
  { label: 'Plate', key: 'plate', items: [createEmptyItem()] },
  { label: 'Paper', key: 'paper', items: [createEmptyItem()] },
  { label: 'Printing', key: 'printing', items: [createEmptyItem()] },
  { label: 'Lamination', key: 'lamination', items: [createEmptyItem()] },
  { label: 'Die Cutting', key: 'die_cutting', items: [createEmptyItem()] },
  { label: 'Foil', key: 'foil', items: [createEmptyItem()] },
  { label: 'Binding', key: 'binding', items: [createEmptyItem()] },
  { label: 'Others', key: 'others', items: [createEmptyItem()] },
];

interface FormData {
  job_description: string;
  quantity: number;
  customer_id: string;
  categories: CostCategory[];
  margin_percent: number;
}

const PriceCalculationForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canPerform, showCreate, showDelete } = usePermissions();
  const isEditing = Boolean(id);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertType, setConvertType] = useState<'quotation' | 'invoice'>('quotation');
  const [converting, setConverting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    job_description: '',
    quantity: 1,
    customer_id: '',
    categories: defaultCategories.map(cat => ({
      ...cat,
      items: cat.items.map(item => ({ ...item, id: generateId() }))
    })),
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

  // Helper to convert old flat structure to new category-based structure
  const convertLegacyData = (data: any): CostCategory[] => {
    const createItem = (qty: number, price: number): CostLineItem => ({
      id: generateId(),
      qty: qty || 0,
      unit: 'Pcs',
      price: price || 0,
    });

    return [
      { 
        label: 'Design', 
        key: 'design' as CategoryKey, 
        items: [createItem(data.design_qty || 1, data.design_price || 0)] 
      },
      { 
        label: 'Plate', 
        key: 'plate' as CategoryKey, 
        items: [
          createItem(data.plate_qty, data.plate_price),
          ...(data.plate2_qty || data.plate2_price ? [createItem(data.plate2_qty, data.plate2_price)] : []),
          ...(data.plate3_qty || data.plate3_price ? [createItem(data.plate3_qty, data.plate3_price)] : []),
        ].filter(item => item.qty > 0 || item.price > 0).length > 0 
          ? [
              createItem(data.plate_qty, data.plate_price),
              ...(data.plate2_qty || data.plate2_price ? [createItem(data.plate2_qty, data.plate2_price)] : []),
              ...(data.plate3_qty || data.plate3_price ? [createItem(data.plate3_qty, data.plate3_price)] : []),
            ]
          : [createEmptyItem()]
      },
      { 
        label: 'Paper', 
        key: 'paper' as CategoryKey, 
        items: [
          createItem(data.paper1_qty, data.paper1_price),
          ...(data.paper2_qty || data.paper2_price ? [createItem(data.paper2_qty, data.paper2_price)] : []),
          ...(data.paper3_qty || data.paper3_price ? [createItem(data.paper3_qty, data.paper3_price)] : []),
        ].filter(item => item.qty > 0 || item.price > 0).length > 0 
          ? [
              createItem(data.paper1_qty, data.paper1_price),
              ...(data.paper2_qty || data.paper2_price ? [createItem(data.paper2_qty, data.paper2_price)] : []),
              ...(data.paper3_qty || data.paper3_price ? [createItem(data.paper3_qty, data.paper3_price)] : []),
            ]
          : [createEmptyItem()]
      },
      { 
        label: 'Printing', 
        key: 'printing' as CategoryKey, 
        items: [
          createItem(data.print_qty, data.print_price),
          ...(data.print2_qty || data.print2_price ? [createItem(data.print2_qty, data.print2_price)] : []),
          ...(data.print3_qty || data.print3_price ? [createItem(data.print3_qty, data.print3_price)] : []),
        ].filter(item => item.qty > 0 || item.price > 0).length > 0 
          ? [
              createItem(data.print_qty, data.print_price),
              ...(data.print2_qty || data.print2_price ? [createItem(data.print2_qty, data.print2_price)] : []),
              ...(data.print3_qty || data.print3_price ? [createItem(data.print3_qty, data.print3_price)] : []),
            ]
          : [createEmptyItem()]
      },
      { 
        label: 'Lamination', 
        key: 'lamination' as CategoryKey, 
        items: [createItem(data.lamination_qty, data.lamination_price || data.lamination_cost)] 
      },
      { 
        label: 'Die Cutting', 
        key: 'die_cutting' as CategoryKey, 
        items: [createItem(data.die_cutting_qty, data.die_cutting_price || data.die_cutting_cost)] 
      },
      { 
        label: 'Foil', 
        key: 'foil' as CategoryKey, 
        items: [createItem(data.foil_printing_qty, data.foil_printing_price)] 
      },
      { 
        label: 'Binding', 
        key: 'binding' as CategoryKey, 
        items: [createItem(data.binding_qty, data.binding_price || data.binding_cost)] 
      },
      { 
        label: 'Others', 
        key: 'others' as CategoryKey, 
        items: [createItem(data.others_qty, data.others_price || data.others_cost)] 
      },
    ];
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
          categories: convertLegacyData(data),
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
  const costingTotal = formData.categories.reduce((total, category) => {
    return total + category.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
  }, 0);

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

  const handleCategoryItemChange = (
    categoryIndex: number,
    itemIndex: number,
    field: 'qty' | 'unit' | 'price',
    value: number | string
  ) => {
    setFormData(prev => {
      const newCategories = [...prev.categories];
      const newItems = [...newCategories[categoryIndex].items];
      newItems[itemIndex] = {
        ...newItems[itemIndex],
        [field]: value,
      };
      newCategories[categoryIndex] = {
        ...newCategories[categoryIndex],
        items: newItems,
      };
      return { ...prev, categories: newCategories };
    });
  };

  const handleAddItem = (categoryIndex: number) => {
    setFormData(prev => {
      const newCategories = [...prev.categories];
      newCategories[categoryIndex] = {
        ...newCategories[categoryIndex],
        items: [...newCategories[categoryIndex].items, createEmptyItem()],
      };
      return { ...prev, categories: newCategories };
    });
  };

  const handleRemoveItem = (categoryIndex: number, itemIndex: number) => {
    setFormData(prev => {
      const newCategories = [...prev.categories];
      const newItems = newCategories[categoryIndex].items.filter((_, i) => i !== itemIndex);
      // Ensure at least one item remains
      if (newItems.length === 0) {
        newItems.push(createEmptyItem());
      }
      newCategories[categoryIndex] = {
        ...newCategories[categoryIndex],
        items: newItems,
      };
      return { ...prev, categories: newCategories };
    });
  };

  const handleChange = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Helper to normalize unit value (empty → "Pcs")
  const normalizeUnit = (unit: string) => unit?.trim() || 'Pcs';

  // Helper to get category items by key
  const getCategoryItems = (key: CategoryKey): CostLineItem[] => {
    const category = formData.categories.find(c => c.key === key);
    return category?.items || [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.job_description.trim()) {
      toast.error('Please enter job description');
      return;
    }

    setSaving(true);

    try {
      // Get items for each category
      const design = getCategoryItems('design');
      const plate = getCategoryItems('plate');
      const paper = getCategoryItems('paper');
      const printing = getCategoryItems('printing');
      const lamination = getCategoryItems('lamination');
      const dieCutting = getCategoryItems('die_cutting');
      const foil = getCategoryItems('foil');
      const binding = getCategoryItems('binding');
      const others = getCategoryItems('others');

      // Calculate category totals
      const calcCategoryTotal = (items: CostLineItem[]) => 
        items.reduce((sum, item) => sum + (item.qty * item.price), 0);

      const dataToSave = {
        job_description: formData.job_description,
        quantity: formData.quantity,
        customer_id: formData.customer_id || null,
        // Design (first item)
        design_qty: design[0]?.qty || 0,
        design_price: design[0]?.price || 0,
        design_cost: calcCategoryTotal(design),
        // Plate (up to 3 items for backward compatibility)
        plate_qty: plate[0]?.qty || 0,
        plate_price: plate[0]?.price || 0,
        plate_total: (plate[0]?.qty || 0) * (plate[0]?.price || 0),
        plate2_qty: plate[1]?.qty || 0,
        plate2_price: plate[1]?.price || 0,
        plate2_total: (plate[1]?.qty || 0) * (plate[1]?.price || 0),
        plate3_qty: plate[2]?.qty || 0,
        plate3_price: plate[2]?.price || 0,
        plate3_total: (plate[2]?.qty || 0) * (plate[2]?.price || 0),
        // Paper (up to 3 items)
        paper1_qty: paper[0]?.qty || 0,
        paper1_price: paper[0]?.price || 0,
        paper1_total: (paper[0]?.qty || 0) * (paper[0]?.price || 0),
        paper2_qty: paper[1]?.qty || 0,
        paper2_price: paper[1]?.price || 0,
        paper2_total: (paper[1]?.qty || 0) * (paper[1]?.price || 0),
        paper3_qty: paper[2]?.qty || 0,
        paper3_price: paper[2]?.price || 0,
        paper3_total: (paper[2]?.qty || 0) * (paper[2]?.price || 0),
        // Print (up to 3 items)
        print_qty: printing[0]?.qty || 0,
        print_price: printing[0]?.price || 0,
        print_total: (printing[0]?.qty || 0) * (printing[0]?.price || 0),
        print2_qty: printing[1]?.qty || 0,
        print2_price: printing[1]?.price || 0,
        print2_total: (printing[1]?.qty || 0) * (printing[1]?.price || 0),
        print3_qty: printing[2]?.qty || 0,
        print3_price: printing[2]?.price || 0,
        print3_total: (printing[2]?.qty || 0) * (printing[2]?.price || 0),
        // Other categories (first item each)
        lamination_qty: lamination[0]?.qty || 0,
        lamination_price: lamination[0]?.price || 0,
        lamination_cost: calcCategoryTotal(lamination),
        die_cutting_qty: dieCutting[0]?.qty || 0,
        die_cutting_price: dieCutting[0]?.price || 0,
        die_cutting_cost: calcCategoryTotal(dieCutting),
        foil_printing_qty: foil[0]?.qty || 0,
        foil_printing_price: foil[0]?.price || 0,
        foil_printing_total: calcCategoryTotal(foil),
        binding_qty: binding[0]?.qty || 0,
        binding_price: binding[0]?.price || 0,
        binding_cost: calcCategoryTotal(binding),
        others_qty: others[0]?.qty || 0,
        others_price: others[0]?.price || 0,
        others_cost: calcCategoryTotal(others),
        // Totals
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

  // Check permission using resolved org role
  const viewPermission = canPerform('price_calculations', 'view');
  if (!viewPermission.hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">{viewPermission.reason || "You don't have permission to view this page."}</p>
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
          {showCreate('price_calculations') && !isEditing && (
            <Button variant="outline" onClick={() => navigate('/price-calculation/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Job
            </Button>
          )}
          {isEditing && showDelete('price_calculations') && (
            <Button variant="destructive" size="icon" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off">
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
                  <CurrencyInput
                    value={formData.quantity}
                    onChange={(val) => handleChange('quantity', val)}
                    decimals={0}
                    formatOnBlur={false}
                    placeholder="1"
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
              <CardHeader className="pb-2">
                <CardTitle>Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {/* Header Row - Desktop Only */}
                <div className="hidden sm:flex items-center gap-3 py-2 px-2 mb-4 text-[10px] uppercase tracking-wider text-muted-foreground font-medium border-b border-muted/50">
                  <div className="w-28 shrink-0">Item</div>
                  <div className="w-20 text-center">Qty</div>
                  <div className="w-24 text-center">Unit</div>
                  <div className="w-28 text-center">Price</div>
                  <div className="ml-auto text-right min-w-[90px]">Total</div>
                </div>
                
                <div className="space-y-2">
                  {formData.categories.map((category, categoryIndex) => (
                    <CategoryGroup
                      key={category.key}
                      category={category}
                      onItemChange={(itemIndex, field, value) => 
                        handleCategoryItemChange(categoryIndex, itemIndex, field, value)
                      }
                      onAddItem={() => handleAddItem(categoryIndex)}
                      onRemoveItem={(itemIndex) => handleRemoveItem(categoryIndex, itemIndex)}
                      isLast={categoryIndex === formData.categories.length - 1}
                    />
                  ))}
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
                <div className="flex justify-between text-lg">
                  <span className="text-muted-foreground">Total Costing</span>
                  <span className="font-bold">{formatCurrency(costingTotal)}</span>
                </div>

                <div className="space-y-2">
                  <Label>Margin/Profit (%)</Label>
                  <CurrencyInput
                    value={formData.margin_percent}
                    onChange={(val) => handleChange('margin_percent', val)}
                    decimals={2}
                    formatOnBlur={false}
                    placeholder="25"
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
