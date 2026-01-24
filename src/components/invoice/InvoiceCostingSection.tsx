import { useState, useCallback } from 'react';
import { Plus, Trash2, ChevronDown, Calculator } from 'lucide-react';
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

// Default costing item types
const DEFAULT_ITEM_TYPES = [
  { value: 'plate', label: 'Plate' },
  { value: 'print', label: 'Print' },
  { value: 'lamination', label: 'Lamination' },
  { value: 'die_cutting', label: 'Die Cutting' },
  { value: 'foil', label: 'Foil' },
  { value: 'binding', label: 'Binding' },
  { value: 'packaging', label: 'Packaging' },
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
}

export function InvoiceCostingSection({
  items,
  onItemsChange,
  canEdit,
  canView,
}: InvoiceCostingSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customItemTypes, setCustomItemTypes] = useState<string[]>([]);

  // Build options list including custom types
  const itemTypeOptions = [
    ...DEFAULT_ITEM_TYPES,
    ...customItemTypes.map(type => ({ value: type, label: type })),
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
  }, [items, onItemsChange]);

  const addItem = useCallback(() => {
    const newItem: CostingItem = {
      id: crypto.randomUUID(),
      item_type: '',
      description: '',
      quantity: 1,
      price: 0,
      line_total: 0,
    };
    onItemsChange([...items, newItem]);
  }, [items, onItemsChange]);

  const removeItem = useCallback((id: string) => {
    if (items.length === 1) return;
    onItemsChange(items.filter((item) => item.id !== id));
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
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
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
                                disabled={items.length === 1}
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
                            disabled={items.length === 1}
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

              {/* Add Row Button & Grand Total */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                {canEdit && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addItem}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Costing Row
                  </Button>
                )}
                
                {items.length > 0 && (
                  <div className="flex items-center gap-3 ml-auto px-3 py-2 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Grand Total:</span>
                    <span className="text-lg font-bold tabular-nums text-primary">
                      {formatCurrency(calculateGrandTotal())}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground italic">
                ⚠️ Costing is for internal reference only. It does not affect invoice totals and will not appear in printed invoices or PDFs.
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
