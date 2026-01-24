import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, Trash2, ChevronDown, Calculator, Download, LayoutTemplate, Save, RotateCcw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
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
import { ImportPriceCalculationDialog } from './ImportPriceCalculationDialog';
import { CostingTemplateDialog } from './CostingTemplateDialog';

// Default costing item types
const DEFAULT_ITEM_TYPES = [
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

export interface CostingItem {
  id: string;
  item_type: string;
  description: string;
  quantity: number;
  price: number;
  line_total: number;
}

interface InvoiceCostingSectionProps {
  items: CostingItem[];
  onItemsChange: (items: CostingItem[]) => void;
  canEdit: boolean;
  canView: boolean;
  invoiceTotal?: number;
  customerId?: string;
  invoiceId?: string;
  isNewInvoice?: boolean;
}

export type LoadMode = 'replace' | 'append';

export function InvoiceCostingSection({
  items,
  onItemsChange,
  canEdit,
  canView,
  invoiceTotal = 0,
  customerId,
  invoiceId,
  isNewInvoice = false,
}: InvoiceCostingSectionProps) {
  const { organization } = useOrganization();
  const [customItemTypes, setCustomItemTypes] = useState<string[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  
  // Save state management
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [savedItems, setSavedItems] = useState<CostingItem[]>([]);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const pendingCloseRef = useRef(false);
  const initialLoadRef = useRef(true);
  
  // Auto-expand panel if costing items exist (has valid data with item_type set)
  const hasValidCostingData = items.some(item => item.item_type);
  const [isOpen, setIsOpen] = useState(hasValidCostingData);
  
  // Sync saved baseline when items change from parent (DB load)
  // This runs when invoice loads and passes costing items to this component
  useEffect(() => {
    if (initialLoadRef.current && items.length > 0) {
      // First load from DB - set saved baseline and auto-expand if valid data
      setSavedItems(JSON.parse(JSON.stringify(items)));
      setIsDirty(false);
      if (items.some(item => item.item_type)) {
        setIsOpen(true);
      }
      initialLoadRef.current = false;
    }
  }, [items]);
  
  // Reset state when switching invoices (invoiceId changes)
  useEffect(() => {
    if (invoiceId) {
      initialLoadRef.current = true;
      // Items will be passed from parent after fetch, so we wait for that
      setSavedItems([]);
      setIsDirty(false);
    }
  }, [invoiceId]);
  
  // Validate costing items
  const validateItems = useCallback(() => {
    const errors: string[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.item_type) {
        errors.push(`Row ${i + 1}: Item type is required`);
      }
      if (item.quantity <= 0) {
        errors.push(`Row ${i + 1}: Quantity must be greater than 0`);
      }
      if (item.price < 0) {
        errors.push(`Row ${i + 1}: Price cannot be negative`);
      }
    }
    
    return errors;
  }, [items]);
  
  // Save costing items independently
  const handleSaveCosting = useCallback(async () => {
    if (!invoiceId || isNewInvoice) {
      toast.error('Please save the invoice first before saving costing separately');
      return;
    }
    
    // Filter out completely empty rows (no item_type set)
    const validItems = items.filter(item => item.item_type);
    
    if (validItems.length === 0) {
      toast.error('Add at least one costing item with an item type');
      return;
    }
    
    // Validate
    const errors = validateItems();
    if (errors.length > 0) {
      toast.error(errors[0]); // Show first error
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Delete existing costing items for this invoice
      await supabase
        .from('invoice_costing_items' as any)
        .delete()
        .eq('invoice_id', invoiceId);
      
      // Insert new costing items (line_total is auto-calculated by DB)
      const costingData = validItems.map((item, index) => ({
        invoice_id: invoiceId,
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
      
      // Update saved baseline
      setSavedItems(JSON.parse(JSON.stringify(items)));
      setIsDirty(false);
      toast.success('Costing saved successfully');
    } catch (error: any) {
      console.error('Error saving costing:', error);
      toast.error(error.message || 'Failed to save costing');
    } finally {
      setIsSaving(false);
    }
  }, [invoiceId, isNewInvoice, items, organization?.id, validateItems]);
  
  // Reset - clears ALL costing rows completely
  // Per requirements: Reset must clear rows, clear profit, reset state - NOT reload saved data
  const handleReset = useCallback(() => {
    // Clear ALL costing rows - empty array means costing total = 0, profit recalculates
    onItemsChange([]);
    setIsDirty(false);
  }, [onItemsChange]);
  
  // Handle accordion open/close with unsaved warning
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open && isDirty && canEdit) {
      // Trying to close with unsaved changes
      pendingCloseRef.current = true;
      setShowUnsavedWarning(true);
    } else {
      setIsOpen(open);
    }
  }, [isDirty, canEdit]);
  
  // Confirm close without saving
  const handleConfirmClose = useCallback(() => {
    setShowUnsavedWarning(false);
    if (pendingCloseRef.current) {
      pendingCloseRef.current = false;
      setIsOpen(false);
    }
  }, []);
  
  // Save and close
  const handleSaveAndClose = useCallback(async () => {
    setShowUnsavedWarning(false);
    await handleSaveCosting();
    if (pendingCloseRef.current) {
      pendingCloseRef.current = false;
      setIsOpen(false);
    }
  }, [handleSaveCosting]);

  // Build options list including custom types
  const itemTypeOptions = [
    ...DEFAULT_ITEM_TYPES,
    ...customItemTypes.map(type => ({ 
      value: type, 
      label: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) 
    })),
  ];

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, []);

  const calculateGrandTotal = useCallback(() => {
    return items.reduce((sum, item) => sum + item.line_total, 0);
  }, [items]);

  // Calculate profit margin
  const calculateProfitMargin = useCallback(() => {
    const costingTotal = items.reduce((sum, item) => sum + item.line_total, 0);
    if (costingTotal <= 0) return null;
    
    const profit = invoiceTotal - costingTotal;
    const marginPercent = (profit / costingTotal) * 100;
    
    return {
      costingTotal,
      profit,
      marginPercent,
      isPositive: profit >= 0,
    };
  }, [items, invoiceTotal]);

  const updateItem = useCallback((id: string, field: keyof CostingItem, value: string | number) => {
    const updatedItems = items.map((item) => {
      if (item.id !== id) return item;

      const updated = { ...item, [field]: value };
      
      // Recalculate line total
      if (field === 'quantity' || field === 'price') {
        const qty = Number(updated.quantity) || 0;
        const price = Number(updated.price) || 0;
        updated.line_total = qty * price;
      }

      return updated;
    });
    onItemsChange(updatedItems);
    setIsDirty(true);
  }, [items, onItemsChange]);

  const addItem = useCallback(() => {
    // Note: line_total is computed (qty * price), initialized to 0 for display only
    const newItem: CostingItem = {
      id: crypto.randomUUID(),
      item_type: '',
      description: '',
      quantity: 1,
      price: 0,
      line_total: 0, // Display only - never sent to DB
    };
    onItemsChange([...items, newItem]);
    setIsDirty(true);
  }, [items, onItemsChange]);

  const removeItem = useCallback((id: string) => {
    // Allow removing even the last item (empty state is valid)
    onItemsChange(items.filter((item) => item.id !== id));
    setIsDirty(true);
  }, [items, onItemsChange]);

  const handleItemTypeChange = useCallback((id: string, value: string) => {
    // Check if this is a new custom type (not in existing options)
    const existingOption = itemTypeOptions.find(opt => opt.value === value);
    if (!existingOption && value && !customItemTypes.includes(value)) {
      setCustomItemTypes(prev => [...prev, value]);
    }
    updateItem(id, 'item_type', value);
  }, [itemTypeOptions, customItemTypes, updateItem]);

  // Don't render if user doesn't have view permission
  if (!canView) return null;

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-medium">
                  Costing
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    (Internal Only)
                  </span>
                  {isDirty && canEdit && (
                    <span className="ml-2 text-xs font-normal text-warning">
                      • Unsaved changes
                    </span>
                  )}
                </CardTitle>
              </div>
              <div className="flex items-center gap-3">
                {items.length > 0 && (
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
          <CardContent className="pt-0 pb-4">
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden md:block rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[160px]">Item</TableHead>
                      <TableHead className="min-w-[200px]">Description</TableHead>
                      <TableHead className="text-center w-20">Qty</TableHead>
                      <TableHead className="text-right w-28">Price</TableHead>
                      <TableHead className="text-right w-28">Total</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                          No costing items added
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <SearchableSelect
                              value={item.item_type}
                              onValueChange={(val) => handleItemTypeChange(item.id, val)}
                              options={itemTypeOptions}
                              placeholder="Select item"
                              searchPlaceholder="Search or type new..."
                              disabled={!canEdit}
                              className="w-full"
                              allowCreate={canEdit}
                              onCreateNew={(query) => {
                                const newValue = query.trim().toLowerCase().replace(/\s+/g, '_') || `custom_${Date.now()}`;
                                const newLabel = query.trim() || 'Custom Item';
                                if (!customItemTypes.includes(newValue)) {
                                  setCustomItemTypes(prev => [...prev, newValue]);
                                }
                                handleItemTypeChange(item.id, newValue);
                              }}
                              createNewLabel="Add new item"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                              placeholder="Description"
                              disabled={!canEdit}
                              className="min-w-[180px]"
                            />
                          </TableCell>
                          <TableCell>
                            <CurrencyInput
                              value={item.quantity}
                              onChange={(val) => updateItem(item.id, 'quantity', val)}
                              decimals={2}
                              formatOnBlur={false}
                              disabled={!canEdit}
                              className="text-center w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <CurrencyInput
                              value={item.price}
                              onChange={(val) => updateItem(item.id, 'price', val)}
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
                                onClick={() => removeItem(item.id)}
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

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {items.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6 border rounded-lg">
                    No costing items added
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          Item #{index + 1}
                        </span>
                        {canEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                            className="text-destructive hover:text-destructive h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="text-xs text-muted-foreground mb-1 block">Item Type</label>
                          <SearchableSelect
                            value={item.item_type}
                            onValueChange={(val) => handleItemTypeChange(item.id, val)}
                            options={itemTypeOptions}
                            placeholder="Select item"
                            disabled={!canEdit}
                            allowCreate={canEdit}
                            onCreateNew={(query) => {
                              const newValue = query.trim().toLowerCase().replace(/\s+/g, '_') || `custom_${Date.now()}`;
                              const newLabel = query.trim() || 'Custom Item';
                              if (!customItemTypes.includes(newValue)) {
                                setCustomItemTypes(prev => [...prev, newValue]);
                              }
                              handleItemTypeChange(item.id, newValue);
                            }}
                            createNewLabel="Add new item"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            placeholder="Description"
                            disabled={!canEdit}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
                          <CurrencyInput
                            value={item.quantity}
                            onChange={(val) => updateItem(item.id, 'quantity', val)}
                            decimals={2}
                            formatOnBlur={false}
                            disabled={!canEdit}
                            className="text-center"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Price</label>
                          <CurrencyInput
                            value={item.price}
                            onChange={(val) => updateItem(item.id, 'price', val)}
                            disabled={!canEdit}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-sm text-muted-foreground">Line Total</span>
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(item.line_total)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Row Button & Totals */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  {canEdit && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={addItem}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Row
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowImportDialog(true)}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Import from</span> Price Calc
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowTemplateDialog(true)}
                        className="gap-2"
                      >
                        <LayoutTemplate className="h-4 w-4" />
                        Templates
                      </Button>
                    </div>
                  )}
                  
                  {items.length > 0 && (
                    <div className="flex items-center gap-3 ml-auto px-3 py-2 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">Costing Total:</span>
                      <span className="text-lg font-bold tabular-nums text-primary">
                        {formatCurrency(calculateGrandTotal())}
                      </span>
                    </div>
                  )}
                </div>

                {/* Profit Margin Calculator */}
                {invoiceTotal > 0 && items.length > 0 && calculateGrandTotal() > 0 && (
                  <div className="border rounded-lg p-4 bg-gradient-to-r from-muted/30 to-muted/10">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          📊 Profit Margin Calculator
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Invoice Total vs Costing Total তুলনা
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4">
                        {/* Invoice Total */}
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Invoice Total</p>
                          <p className="font-semibold tabular-nums">{formatCurrency(invoiceTotal)}</p>
                        </div>
                        
                        <span className="text-muted-foreground">−</span>
                        
                        {/* Costing Total */}
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Costing Total</p>
                          <p className="font-semibold tabular-nums">{formatCurrency(calculateGrandTotal())}</p>
                        </div>
                        
                        <span className="text-muted-foreground">=</span>
                        
                        {/* Profit */}
                        {(() => {
                          const margin = calculateProfitMargin();
                          if (!margin) return null;
                          return (
                            <>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground mb-1">Profit</p>
                                <p className={cn(
                                  "font-semibold tabular-nums",
                                  margin.isPositive ? "text-success" : "text-destructive"
                                )}>
                                  {margin.isPositive ? '+' : ''}{formatCurrency(margin.profit)}
                                </p>
                              </div>
                              
                              {/* Margin Percentage Badge */}
                              <div className={cn(
                                "px-3 py-2 rounded-lg text-center",
                                margin.isPositive 
                                  ? "bg-success/10 border border-success/20" 
                                  : "bg-destructive/10 border border-destructive/20"
                              )}>
                                <p className="text-xs text-muted-foreground mb-1">Margin</p>
                                <p className={cn(
                                  "text-xl font-bold tabular-nums",
                                  margin.isPositive ? "text-success" : "text-destructive"
                                )}>
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
              </div>

              {/* Save/Reset Action Bar */}
              {canEdit && !isNewInvoice && invoiceId && (
                <div className="flex items-center justify-between gap-3 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={handleSaveCosting}
                      disabled={!isDirty || isSaving}
                      className="gap-2"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Costing
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      disabled={!isDirty || isSaving}
                      className="gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                  {isDirty && (
                    <span className="text-xs text-warning">
                      You have unsaved changes
                    </span>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground italic">
                ⚠️ Costing is for internal reference only. It does not affect invoice totals and will not appear in printed invoices or PDFs.
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Import from Price Calculation Dialog */}
      <ImportPriceCalculationDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={(importedItems) => {
          // Merge imported items with existing items (or replace if empty)
          if (items.length === 1 && !items[0].item_type && items[0].line_total === 0) {
            // Replace the empty default row
            onItemsChange(importedItems);
          } else {
            // Append to existing items
            onItemsChange([...items, ...importedItems]);
          }
          setIsDirty(true);
        }}
        customerId={customerId}
      />

      {/* Costing Template Dialog */}
      <CostingTemplateDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        currentItems={items}
        hasExistingItems={items.length > 0 && !(items.length === 1 && !items[0].item_type && items[0].line_total === 0)}
        onLoadTemplate={(templateItems, mode) => {
          if (mode === 'replace') {
            onItemsChange(templateItems);
          } else {
            onItemsChange([...items, ...templateItems]);
          }
          setIsDirty(true);
        }}
      />
      
      {/* Unsaved Changes Warning Dialog */}
      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Costing Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved costing changes. Save before closing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleConfirmClose}>
              Discard Changes
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAndClose}>
              Save & Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
