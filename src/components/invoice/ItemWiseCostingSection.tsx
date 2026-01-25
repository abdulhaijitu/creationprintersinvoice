import { useState, useCallback, useEffect, useMemo } from 'react';
import { Plus, Trash2, ChevronDown, Calculator, Save, RotateCcw, Loader2, Sparkles, RefreshCw, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ApplyItemTemplateDialog } from './ApplyItemTemplateDialog';
import { AddCostingItemDialog } from './AddCostingItemDialog';
import { useCostingItemTemplates, CostingItemTemplate, TemplateRow } from '@/hooks/useCostingItemTemplates';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

// Default costing step types
const COSTING_STEPS = [
  { value: 'design', label: 'Design' },
  { value: 'plate', label: 'Plate' },
  { value: 'paper', label: 'Paper' },
  { value: 'print', label: 'Print' },
  { value: 'lamination', label: 'Lamination' },
  { value: 'die_cutting', label: 'Die Cutting' },
  { value: 'foil', label: 'Foil' },
  { value: 'binding', label: 'Binding' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'others', label: 'Others' },
];

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

export interface CostingItem {
  id: string;
  invoice_item_id: string | null;
  item_no: number | null;
  item_type: string;
  description: string;
  quantity: number;
  price: number;
  line_total: number;
}

export interface CostingPermissions {
  canView: boolean;
  canEdit: boolean;
  canSave: boolean;
  canReset: boolean;
  canViewProfit: boolean;
}

interface ItemWiseCostingSectionProps {
  invoiceItems: InvoiceLineItem[];
  costingItems: CostingItem[];
  onCostingItemsChange: (items: CostingItem[]) => void;
  permissions: CostingPermissions;
  invoiceTotal?: number;
  invoiceId?: string;
  isNewInvoice?: boolean;
}

export function ItemWiseCostingSection({
  invoiceItems,
  costingItems,
  onCostingItemsChange,
  permissions,
  invoiceTotal = 0,
  invoiceId,
  isNewInvoice = false,
}: ItemWiseCostingSectionProps) {
  const { organization } = useOrganization();
  const { canView, canEdit, canSave, canReset, canViewProfit } = permissions;

  // Selected invoice item for costing
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [customStepTypes, setCustomStepTypes] = useState<{ value: string; label: string }[]>([]);
  
  // Add new step dialog state
  const [showAddStepDialog, setShowAddStepDialog] = useState(false);
  const [addStepQuery, setAddStepQuery] = useState('');
  const [pendingAddStepRowId, setPendingAddStepRowId] = useState<string | null>(null);
  
  // Template integration
  const { templates, getTemplateByItemName } = useCostingItemTemplates();
  const [showApplyTemplateDialog, setShowApplyTemplateDialog] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<CostingItemTemplate | null>(null);
  const [appliedTemplates, setAppliedTemplates] = useState<Map<string, Set<string>>>(new Map());
  
  // Save state - track dirty state per item
  const [isSaving, setIsSaving] = useState(false);
  const [dirtyItems, setDirtyItems] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingItemSwitch, setPendingItemSwitch] = useState<string | null>(null);
  
  // Track saved baseline per item for dirty detection
  const [savedItemCostings, setSavedItemCostings] = useState<Map<string, CostingItem[]>>(new Map());

  // Check if currently selected item has unsaved changes
  const isDirty = useMemo(() => {
    return selectedItemId ? dirtyItems.has(selectedItemId) : false;
  }, [selectedItemId, dirtyItems]);
  
  // Check costing status per item
  const getItemCostingStatus = useCallback((itemId: string): 'costed' | 'in-progress' | 'not-costed' => {
    const itemCostings = costingItems.filter(c => c.invoice_item_id === itemId);
    const hasValidCostings = itemCostings.some(c => c.item_type && c.line_total > 0);
    const isDirtyItem = dirtyItems.has(itemId);
    
    if (hasValidCostings && !isDirtyItem) return 'costed';
    if (itemCostings.length > 0 || isDirtyItem) return 'in-progress';
    return 'not-costed';
  }, [costingItems, dirtyItems]);

  // Build options list for costing steps
  const stepOptions = useMemo(() => [...COSTING_STEPS, ...customStepTypes], [customStepTypes]);
  const existingStepValues = stepOptions.map(opt => opt.value);

  // Get costing items for selected invoice item
  const selectedItemCostings = useMemo(() => {
    if (!selectedItemId) return [];
    return costingItems.filter(c => c.invoice_item_id === selectedItemId);
  }, [costingItems, selectedItemId]);

  // Get the selected invoice item details
  const selectedInvoiceItem = useMemo(() => {
    return invoiceItems.find(i => i.id === selectedItemId);
  }, [invoiceItems, selectedItemId]);

  // Calculate item number for display
  const getItemNumber = useCallback((itemId: string) => {
    const index = invoiceItems.findIndex(i => i.id === itemId);
    return index + 1;
  }, [invoiceItems]);

  // Group costing by invoice item for summary view
  const groupedCostings = useMemo(() => {
    const groups: Map<string, { item: InvoiceLineItem; costings: CostingItem[]; subtotal: number }> = new Map();
    
    invoiceItems.forEach(item => {
      const itemCostings = costingItems.filter(c => c.invoice_item_id === item.id);
      const subtotal = itemCostings.reduce((sum, c) => sum + c.line_total, 0);
      groups.set(item.id, { item, costings: itemCostings, subtotal });
    });
    
    return groups;
  }, [invoiceItems, costingItems]);

  // Auto-expand if costing data exists
  useEffect(() => {
    const hasValidData = costingItems.some(c => c.item_type && c.invoice_item_id);
    if (hasValidData) {
      setIsOpen(true);
    }
  }, [costingItems]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, []);

  const calculateGrandTotal = useCallback(() => {
    return costingItems.reduce((sum, item) => sum + item.line_total, 0);
  }, [costingItems]);

  const calculateProfitMargin = useCallback(() => {
    const costingTotal = calculateGrandTotal();
    if (costingTotal <= 0) return null;
    
    const profit = invoiceTotal - costingTotal;
    const marginPercent = (profit / costingTotal) * 100;
    
    return { costingTotal, profit, marginPercent, isPositive: profit >= 0 };
  }, [calculateGrandTotal, invoiceTotal]);

  // Handle invoice item selection
  const handleItemSelect = useCallback((itemId: string) => {
    if (selectedItemId && dirtyItems.has(selectedItemId)) {
      setPendingItemSwitch(itemId);
      setShowUnsavedWarning(true);
    } else {
      setSelectedItemId(itemId);
    }
  }, [selectedItemId, dirtyItems]);

  // Confirm switch without saving - discard changes for current item
  const handleConfirmSwitch = useCallback(() => {
    setShowUnsavedWarning(false);
    if (pendingItemSwitch && selectedItemId) {
      // Revert unsaved changes by restoring from saved baseline
      const savedData = savedItemCostings.get(selectedItemId);
      if (savedData) {
        // Remove current item's costings and restore saved
        const otherCostings = costingItems.filter(c => c.invoice_item_id !== selectedItemId);
        onCostingItemsChange([...otherCostings, ...savedData]);
      } else {
        // No saved data, just remove unsaved rows for this item
        const otherCostings = costingItems.filter(c => c.invoice_item_id !== selectedItemId);
        onCostingItemsChange(otherCostings);
      }
      
      // Clear dirty state for discarded item
      setDirtyItems(prev => {
        const next = new Set(prev);
        next.delete(selectedItemId);
        return next;
      });
      
      setSelectedItemId(pendingItemSwitch);
      setPendingItemSwitch(null);
    }
  }, [pendingItemSwitch, selectedItemId, savedItemCostings, costingItems, onCostingItemsChange]);

  // Mark item as dirty
  const markItemDirty = useCallback((itemId: string) => {
    setDirtyItems(prev => new Set(prev).add(itemId));
  }, []);

  // Update a costing item
  const updateCostingItem = useCallback((id: string, field: keyof CostingItem, value: string | number) => {
    const updated = costingItems.map(item => {
      if (item.id !== id) return item;
      
      const newItem = { ...item, [field]: value };
      if (field === 'quantity' || field === 'price') {
        const qty = Number(newItem.quantity) || 0;
        const price = Number(newItem.price) || 0;
        newItem.line_total = qty * price;
      }
      return newItem;
    });
    
    onCostingItemsChange(updated);
    
    // Mark the item as dirty
    const costingItem = costingItems.find(c => c.id === id);
    if (costingItem?.invoice_item_id) {
      markItemDirty(costingItem.invoice_item_id);
    }
  }, [costingItems, onCostingItemsChange, markItemDirty]);

  // Add new costing row for selected item
  const addCostingRow = useCallback(() => {
    if (!selectedItemId) {
      toast.error('Please select an invoice item first');
      return;
    }
    
    const newItem: CostingItem = {
      id: crypto.randomUUID(),
      invoice_item_id: selectedItemId,
      item_no: getItemNumber(selectedItemId),
      item_type: '',
      description: '',
      quantity: 1,
      price: 0,
      line_total: 0,
    };
    
    onCostingItemsChange([...costingItems, newItem]);
    markItemDirty(selectedItemId);
  }, [selectedItemId, getItemNumber, costingItems, onCostingItemsChange, markItemDirty]);

  // Remove costing row
  const removeCostingRow = useCallback((id: string) => {
    const removedItem = costingItems.find(item => item.id === id);
    onCostingItemsChange(costingItems.filter(item => item.id !== id));
    
    if (removedItem?.invoice_item_id) {
      markItemDirty(removedItem.invoice_item_id);
    }
  }, [costingItems, onCostingItemsChange, markItemDirty]);

  // Handle step type change with template check
  const handleStepTypeChange = useCallback((id: string, value: string) => {
    updateCostingItem(id, 'item_type', value);
    
    // Check for template
    if (canEdit && value && selectedItemId) {
      const appliedForItem = appliedTemplates.get(selectedItemId) || new Set();
      if (!appliedForItem.has(value)) {
        const template = getTemplateByItemName(value);
        if (template && template.rows.length > 0) {
          setPendingTemplate(template);
          setShowApplyTemplateDialog(true);
        }
      }
    }
  }, [updateCostingItem, canEdit, selectedItemId, appliedTemplates, getTemplateByItemName]);

  // Apply template
  const handleApplyTemplate = useCallback((rows: TemplateRow[]) => {
    if (!pendingTemplate || !selectedItemId) return;
    
    const templateKey = pendingTemplate.item_name.toLowerCase().replace(/\s+/g, '_');
    
    // Convert template rows to costing items
    const newItems: CostingItem[] = rows.map(row => ({
      id: crypto.randomUUID(),
      invoice_item_id: selectedItemId,
      item_no: getItemNumber(selectedItemId),
      item_type: templateKey,
      description: `${row.sub_item_name}${row.description ? ` - ${row.description}` : ''}`,
      quantity: row.default_qty,
      price: row.default_price,
      line_total: row.default_qty * row.default_price,
    }));
    
    // Remove existing empty rows for this item & type, then add new
    const filtered = costingItems.filter(item => 
      !(item.invoice_item_id === selectedItemId && item.item_type === templateKey && item.line_total === 0)
    );
    onCostingItemsChange([...filtered, ...newItems]);
    
    // Mark template as applied for this item
    setAppliedTemplates(prev => {
      const newMap = new Map(prev);
      const itemTemplates = new Set(prev.get(selectedItemId) || []);
      itemTemplates.add(templateKey);
      newMap.set(selectedItemId, itemTemplates);
      return newMap;
    });
    
    markItemDirty(selectedItemId);
    toast.success(`"${pendingTemplate.item_name}" template applied`);
  }, [pendingTemplate, selectedItemId, getItemNumber, costingItems, onCostingItemsChange, markItemDirty]);

  // Skip template
  const handleSkipTemplate = useCallback(() => {
    if (pendingTemplate && selectedItemId) {
      const templateKey = pendingTemplate.item_name.toLowerCase().replace(/\s+/g, '_');
      setAppliedTemplates(prev => {
        const newMap = new Map(prev);
        const itemTemplates = new Set(prev.get(selectedItemId) || []);
        itemTemplates.add(templateKey);
        newMap.set(selectedItemId, itemTemplates);
        return newMap;
      });
    }
  }, [pendingTemplate, selectedItemId]);

  // Save new custom step
  const handleSaveNewStep = useCallback((stepValue: string, stepLabel: string, description?: string) => {
    setCustomStepTypes(prev => [...prev, { value: stepValue, label: stepLabel }]);
    
    if (pendingAddStepRowId) {
      handleStepTypeChange(pendingAddStepRowId, stepValue);
      if (description) {
        updateCostingItem(pendingAddStepRowId, 'description', description);
      }
    }
    
    setPendingAddStepRowId(null);
    setAddStepQuery('');
  }, [pendingAddStepRowId, handleStepTypeChange, updateCostingItem]);

  // Save costing for ALL items (persists to database)
  const handleSaveCosting = useCallback(async () => {
    if (!invoiceId || isNewInvoice) {
      toast.error('Please save the invoice first');
      return;
    }
    
    const validItems = costingItems.filter(item => item.item_type && item.invoice_item_id);
    if (validItems.length === 0) {
      toast.error('Add at least one costing item');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Delete existing
      await supabase
        .from('invoice_costing_items' as any)
        .delete()
        .eq('invoice_id', invoiceId);
      
      // Insert new (line_total is auto-calculated by DB)
      const costingData = validItems.map((item, index) => ({
        invoice_id: invoiceId,
        invoice_item_id: item.invoice_item_id,
        item_no: item.item_no,
        organization_id: organization?.id,
        item_type: item.item_type,
        description: item.description || null,
        quantity: item.quantity,
        price: item.price,
        sort_order: index,
      }));
      
      const { error } = await supabase
        .from('invoice_costing_items' as any)
        .insert(costingData);
      
      if (error) throw error;
      
      // Update saved baseline for all items
      const newSavedMap = new Map<string, CostingItem[]>();
      invoiceItems.forEach(item => {
        const itemCostings = validItems.filter(c => c.invoice_item_id === item.id);
        if (itemCostings.length > 0) {
          newSavedMap.set(item.id, [...itemCostings]);
        }
      });
      setSavedItemCostings(newSavedMap);
      
      // Clear all dirty flags
      setDirtyItems(new Set());
      
      toast.success('Costing saved successfully');
    } catch (error: any) {
      console.error('Error saving costing:', error);
      toast.error(error.message || 'Failed to save costing');
    } finally {
      setIsSaving(false);
    }
  }, [invoiceId, isNewInvoice, costingItems, organization?.id, invoiceItems]);

  // Reset costing for selected item
  const handleResetSelectedItem = useCallback(() => {
    if (!selectedItemId) return;
    const filtered = costingItems.filter(c => c.invoice_item_id !== selectedItemId);
    onCostingItemsChange(filtered);
    markItemDirty(selectedItemId);
  }, [selectedItemId, costingItems, onCostingItemsChange, markItemDirty]);

  // Initialize saved baseline from loaded data
  useEffect(() => {
    if (!isNewInvoice && costingItems.length > 0 && savedItemCostings.size === 0) {
      const baseline = new Map<string, CostingItem[]>();
      invoiceItems.forEach(item => {
        const itemCostings = costingItems.filter(c => c.invoice_item_id === item.id && c.item_type);
        if (itemCostings.length > 0) {
          baseline.set(item.id, [...itemCostings]);
        }
      });
      if (baseline.size > 0) {
        setSavedItemCostings(baseline);
      }
    }
  }, [isNewInvoice, costingItems, invoiceItems, savedItemCostings.size]);

  if (!canView) return null;

  const hasInvoiceItems = invoiceItems.length > 0;

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-medium">
                  Item-wise Costing
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    (Internal Only)
                  </span>
                  {dirtyItems.size > 0 && canEdit && (
                    <span className="ml-2 text-xs font-normal text-warning">
                      • {dirtyItems.size} unsaved
                    </span>
                  )}
                </CardTitle>
              </div>
              <div className="flex items-center gap-3">
                {costingItems.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    Total: {formatCurrency(calculateGrandTotal())}
                  </span>
                )}
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180"
                  )} 
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-4">
            {!hasInvoiceItems ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Add invoice items first to enable costing</p>
              </div>
            ) : (
              <>
                {/* Invoice Item Selector - Always visible */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Select Invoice Item</label>
                    {dirtyItems.size > 0 && (
                      <Badge variant="outline" className="text-warning border-warning text-xs">
                        {dirtyItems.size} item(s) unsaved
                      </Badge>
                    )}
                  </div>
                  <Select value={selectedItemId || ''} onValueChange={handleItemSelect}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose an invoice item to add costing..." />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-popover">
                      {invoiceItems.map((item, index) => {
                        const status = getItemCostingStatus(item.id);
                        return (
                          <SelectItem key={item.id} value={item.id}>
                            <div className="flex items-center gap-2 w-full">
                              <Badge variant="outline" className="text-xs shrink-0">
                                Item-{index + 1}
                              </Badge>
                              <span className="truncate max-w-[200px]">
                                {item.description?.replace(/<[^>]*>/g, ' ').slice(0, 40) || 'Untitled Item'}
                              </span>
                              {status === 'costed' && (
                                <Badge variant="default" className="ml-auto text-xs bg-success text-success-foreground shrink-0">
                                  ✓ Costed
                                </Badge>
                              )}
                              {status === 'in-progress' && (
                                <Badge variant="secondary" className="ml-auto text-xs shrink-0">
                                  ⏳ In Progress
                                </Badge>
                              )}
                              {status === 'not-costed' && (
                                <Badge variant="outline" className="ml-auto text-xs text-muted-foreground shrink-0">
                                  Not Costed
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  
                  {/* Status Summary List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {invoiceItems.map((item, index) => {
                      const status = getItemCostingStatus(item.id);
                      const isSelected = selectedItemId === item.id;
                      const costData = groupedCostings.get(item.id);
                      
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleItemSelect(item.id)}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg border text-left transition-colors",
                            isSelected 
                              ? "border-primary bg-primary/10" 
                              : "border-border hover:bg-muted/50",
                            status === 'costed' && !isSelected && "border-success/30 bg-success/5"
                          )}
                        >
                          <Badge 
                            variant={isSelected ? "default" : "outline"} 
                            className="text-xs shrink-0"
                          >
                            {index + 1}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs truncate">
                              {item.description?.replace(/<[^>]*>/g, ' ').slice(0, 25) || 'Untitled'}
                            </p>
                            {costData && costData.costings.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(costData.subtotal)}
                              </p>
                            )}
                          </div>
                          <span className="text-sm shrink-0">
                            {status === 'costed' && '✓'}
                            {status === 'in-progress' && '⏳'}
                            {status === 'not-costed' && '○'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Item Costing Section */}
                {selectedItemId && selectedInvoiceItem && (
                  <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Item-{getItemNumber(selectedItemId)}</Badge>
                        <h4 className="font-medium">{selectedInvoiceItem.description || 'Untitled Item'}</h4>
                      </div>
                      {canEdit && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addCostingRow}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Costing Row
                        </Button>
                      )}
                    </div>

                    {/* Costing Table for Selected Item */}
                    <div className="rounded-lg border overflow-hidden bg-background">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="w-[180px]">Costing Step</TableHead>
                            <TableHead className="min-w-[180px]">Description</TableHead>
                            <TableHead className="text-center w-20">Qty</TableHead>
                            <TableHead className="text-right w-28">Price</TableHead>
                            <TableHead className="text-right w-28">Total</TableHead>
                            <TableHead className="w-16"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedItemCostings.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                                No costing rows for this item
                              </TableCell>
                            </TableRow>
                          ) : (
                            selectedItemCostings.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <SearchableSelect
                                    value={item.item_type}
                                    onValueChange={(val) => handleStepTypeChange(item.id, val)}
                                    options={stepOptions}
                                    placeholder="Select step"
                                    searchPlaceholder="Search steps..."
                                    disabled={!canEdit}
                                    className="w-full"
                                    allowCreate={canEdit}
                                    onCreateNew={(query) => {
                                      setAddStepQuery(query.trim());
                                      setPendingAddStepRowId(item.id);
                                      setShowAddStepDialog(true);
                                    }}
                                    createNewLabel="+ Add New Step"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={item.description}
                                    onChange={(e) => updateCostingItem(item.id, 'description', e.target.value)}
                                    placeholder="Description"
                                    disabled={!canEdit}
                                    className="min-w-[160px]"
                                  />
                                </TableCell>
                                <TableCell>
                                  <CurrencyInput
                                    value={item.quantity}
                                    onChange={(val) => updateCostingItem(item.id, 'quantity', val)}
                                    decimals={2}
                                    formatOnBlur={false}
                                    disabled={!canEdit}
                                    className="text-center w-20"
                                  />
                                </TableCell>
                                <TableCell>
                                  <CurrencyInput
                                    value={item.price}
                                    onChange={(val) => updateCostingItem(item.id, 'price', val)}
                                    disabled={!canEdit}
                                    className="w-28 text-right"
                                  />
                                </TableCell>
                                <TableCell className="text-right font-medium tabular-nums">
                                  {formatCurrency(item.line_total)}
                                </TableCell>
                                <TableCell>
                                  {canEdit && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeCostingRow(item.id)}
                                      className="text-destructive hover:text-destructive h-8 w-8"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Selected Item Subtotal */}
                    {selectedItemCostings.length > 0 && (
                      <div className="flex justify-end">
                        <div className="px-4 py-2 bg-muted rounded-lg">
                          <span className="text-sm text-muted-foreground mr-3">Subtotal (Item-{getItemNumber(selectedItemId)}):</span>
                          <span className="font-semibold tabular-nums">
                            {formatCurrency(selectedItemCostings.reduce((sum, c) => sum + c.line_total, 0))}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Summary View - All Items */}
                {costingItems.filter(c => c.invoice_item_id).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground">Costing Summary (All Items)</h4>
                      
                      <div className="space-y-2">
                        {Array.from(groupedCostings.entries()).map(([itemId, data]) => {
                          if (data.costings.length === 0) return null;
                          const itemNum = getItemNumber(itemId);
                          
                          return (
                            <div key={itemId} className="flex items-center justify-between py-2 px-3 border rounded-lg bg-muted/10">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">Item-{itemNum}</Badge>
                                <span className="text-sm truncate max-w-[200px]">
                                  {data.item.description || 'Untitled'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({data.costings.length} costs)
                                </span>
                              </div>
                              <span className="font-medium tabular-nums">
                                {formatCurrency(data.subtotal)}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Grand Total */}
                      <div className="flex items-center justify-between py-3 px-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <span className="font-semibold">Grand Total (All Costing):</span>
                        <span className="text-xl font-bold text-primary tabular-nums">
                          {formatCurrency(calculateGrandTotal())}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Profit Margin */}
                {canViewProfit && invoiceTotal > 0 && calculateGrandTotal() > 0 && (
                  <div className="border rounded-lg p-4 bg-gradient-to-r from-muted/30 to-muted/10">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          📊 Profit Margin Calculator
                        </h4>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Invoice Total</p>
                          <p className="font-semibold tabular-nums">{formatCurrency(invoiceTotal)}</p>
                        </div>
                        <span className="text-muted-foreground">−</span>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Costing Total</p>
                          <p className="font-semibold tabular-nums">{formatCurrency(calculateGrandTotal())}</p>
                        </div>
                        <span className="text-muted-foreground">=</span>
                        {(() => {
                          const margin = calculateProfitMargin();
                          if (!margin) return null;
                          return (
                            <>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground mb-1">Profit</p>
                                <p className={cn("font-semibold tabular-nums", margin.isPositive ? "text-success" : "text-destructive")}>
                                  {margin.isPositive ? '+' : ''}{formatCurrency(margin.profit)}
                                </p>
                              </div>
                              <div className={cn(
                                "px-3 py-2 rounded-lg text-center",
                                margin.isPositive ? "bg-success/10 border border-success/20" : "bg-destructive/10 border border-destructive/20"
                              )}>
                                <p className="text-xs text-muted-foreground mb-1">Margin</p>
                                <p className={cn("text-xl font-bold tabular-nums", margin.isPositive ? "text-success" : "text-destructive")}>
                                  {margin.isPositive ? '+' : ''}{margin.marginPercent.toFixed(1)}%
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Save/Reset Actions */}
                {!isNewInvoice && invoiceId && (canSave || canReset) && (
                  <div className="flex items-center justify-between gap-3 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      {canSave && (
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={handleSaveCosting}
                          disabled={dirtyItems.size === 0 || isSaving}
                          className="gap-2"
                        >
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Save All Costing
                        </Button>
                      )}
                      {canReset && selectedItemId && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleResetSelectedItem}
                          disabled={isSaving}
                          className="gap-2"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Reset Item-{getItemNumber(selectedItemId)}
                        </Button>
                      )}
                    </div>
                    {dirtyItems.size > 0 && canSave && (
                      <span className="text-xs text-warning">
                        {dirtyItems.size === 1 
                          ? `Unsaved changes in Item-${getItemNumber(Array.from(dirtyItems)[0])}`
                          : `${dirtyItems.size} items have unsaved changes`
                        }
                      </span>
                    )}
                  </div>
                )}

                <p className="text-xs text-muted-foreground italic">
                  ⚠️ Costing is for internal reference only. It does not affect invoice totals.
                </p>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Unsaved Warning Dialog */}
      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Costing Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes for <strong>Item-{selectedItemId ? getItemNumber(selectedItemId) : ''}</strong>. 
              Do you want to save before switching, or discard your changes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel onClick={() => {
              setShowUnsavedWarning(false);
              setPendingItemSwitch(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                handleSaveCosting().then(() => {
                  setShowUnsavedWarning(false);
                  if (pendingItemSwitch) {
                    setSelectedItemId(pendingItemSwitch);
                    setPendingItemSwitch(null);
                  }
                });
              }}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save & Switch
            </Button>
            <AlertDialogAction onClick={handleConfirmSwitch} className="bg-destructive hover:bg-destructive/90">
              Discard & Switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Apply Template Dialog */}
      <ApplyItemTemplateDialog
        open={showApplyTemplateDialog}
        onOpenChange={setShowApplyTemplateDialog}
        template={pendingTemplate}
        onApply={handleApplyTemplate}
        onSkip={handleSkipTemplate}
        hasExistingItems={selectedItemCostings.filter(i => i.item_type && i.line_total > 0).length > 0}
      />

      {/* Add New Step Dialog */}
      <AddCostingItemDialog
        open={showAddStepDialog}
        onOpenChange={(open) => {
          setShowAddStepDialog(open);
          if (!open) {
            setPendingAddStepRowId(null);
            setAddStepQuery('');
          }
        }}
        initialQuery={addStepQuery}
        existingItems={existingStepValues}
        onSave={handleSaveNewStep}
      />
    </Card>
  );
}
