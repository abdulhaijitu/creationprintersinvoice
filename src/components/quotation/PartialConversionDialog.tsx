import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileCheck, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  discount: number;
  total: number;
}

interface ConversionItem extends QuotationItem {
  selected: boolean;
  convertQuantity: number;
  maxQuantity: number;
}

interface PartialConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationNumber: string;
  customerName: string;
  items: QuotationItem[];
  discount: number;
  tax: number;
  onConvert: (selectedItems: { item: QuotationItem; quantity: number }[], totals: { subtotal: number; discount: number; tax: number; total: number }) => void;
  converting: boolean;
}

export function PartialConversionDialog({
  open,
  onOpenChange,
  quotationNumber,
  customerName,
  items,
  discount: quotationDiscount,
  tax: quotationTax,
  onConvert,
  converting,
}: PartialConversionDialogProps) {
  const [conversionItems, setConversionItems] = useState<ConversionItem[]>([]);
  const [selectAll, setSelectAll] = useState(true);

  // Initialize conversion items when dialog opens
  useEffect(() => {
    if (open && items.length > 0) {
      setConversionItems(
        items.map((item) => ({
          ...item,
          selected: true,
          convertQuantity: item.quantity,
          maxQuantity: item.quantity,
        }))
      );
      setSelectAll(true);
    }
  }, [open, items]);

  // Handle select all toggle
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setConversionItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: checked,
        convertQuantity: checked ? item.maxQuantity : 0,
      }))
    );
  };

  // Handle individual item selection
  const handleItemSelect = (itemId: string, checked: boolean) => {
    setConversionItems((prev) => {
      const updated = prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              selected: checked,
              convertQuantity: checked ? item.maxQuantity : 0,
            }
          : item
      );
      // Update select all state
      setSelectAll(updated.every((i) => i.selected));
      return updated;
    });
  };

  // Handle quantity change
  const handleQuantityChange = (itemId: string, value: string) => {
    const qty = Math.max(0, parseInt(value) || 0);
    setConversionItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              convertQuantity: Math.min(qty, item.maxQuantity),
              selected: qty > 0,
            }
          : item
      )
    );
  };

  // Calculate totals for selected items
  const calculatedTotals = useMemo(() => {
    const selectedItems = conversionItems.filter((i) => i.selected && i.convertQuantity > 0);
    const subtotal = selectedItems.reduce(
      (sum, item) => sum + item.convertQuantity * Number(item.unit_price),
      0
    );
    
    // Proportionally calculate discount and tax based on subtotal ratio
    const originalSubtotal = items.reduce((sum, item) => sum + Number(item.total), 0);
    const ratio = originalSubtotal > 0 ? subtotal / originalSubtotal : 0;
    
    const discount = Math.round(quotationDiscount * ratio * 100) / 100;
    const tax = Math.round(quotationTax * ratio * 100) / 100;
    const total = subtotal - discount + tax;

    return { subtotal, discount, tax, total, selectedCount: selectedItems.length };
  }, [conversionItems, quotationDiscount, quotationTax, items]);

  const handleConvert = () => {
    const selectedItems = conversionItems
      .filter((i) => i.selected && i.convertQuantity > 0)
      .map((i) => ({
        item: {
          id: i.id,
          description: i.description,
          quantity: i.quantity,
          unit: i.unit,
          unit_price: i.unit_price,
          discount: i.discount,
          total: i.total,
        },
        quantity: i.convertQuantity,
      }));

    if (selectedItems.length === 0) {
      return;
    }

    onConvert(selectedItems, {
      subtotal: calculatedTotals.subtotal,
      discount: calculatedTotals.discount,
      tax: calculatedTotals.tax,
      total: calculatedTotals.total,
    });
  };

  const isPartialConversion = conversionItems.some(
    (i) => i.selected && i.convertQuantity < i.maxQuantity
  ) || conversionItems.some((i) => !i.selected);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Convert to Invoice
            {isPartialConversion && (
              <Badge variant="secondary" className="text-xs">
                Partial
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Select items and quantities to include in the invoice. You can convert all or part of this quotation.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4 space-y-4">
          {/* Quotation Info */}
          <div className="p-3 rounded-lg bg-muted/50 border text-sm grid grid-cols-2 gap-2">
            <p>
              <span className="text-muted-foreground">Quotation:</span>{' '}
              <strong>{quotationNumber}</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Customer:</span>{' '}
              <strong>{customerName}</strong>
            </p>
          </div>

          {/* Partial conversion warning */}
          {isPartialConversion && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Partial Conversion</p>
                <p className="text-muted-foreground">
                  Only selected items will be included in the invoice. The quotation will remain as "Converted".
                </p>
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all items"
                    />
                  </TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center w-24">Qty</TableHead>
                  <TableHead className="text-center w-28">Convert Qty</TableHead>
                  <TableHead className="text-right w-28">Unit Price</TableHead>
                  <TableHead className="text-right w-28">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversionItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className={!item.selected ? 'opacity-50' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={(checked) =>
                          handleItemSelect(item.id, checked as boolean)
                        }
                        aria-label={`Select ${item.description}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div
                        className="prose prose-sm max-w-none prose-p:m-0 line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: item.description }}
                      />
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {item.maxQuantity} {item.unit || ''}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={item.maxQuantity}
                        value={item.convertQuantity}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        className="w-20 h-8 text-center mx-auto"
                        disabled={!item.selected}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(item.unit_price))}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.selected && item.convertQuantity > 0
                        ? formatCurrency(item.convertQuantity * Number(item.unit_price))
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals Summary */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Selected Items: {calculatedTotals.selectedCount} of {items.length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(calculatedTotals.subtotal)}</span>
            </div>
            {calculatedTotals.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-destructive">-{formatCurrency(calculatedTotals.discount)}</span>
              </div>
            )}
            {calculatedTotals.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax/VAT</span>
                <span>{formatCurrency(calculatedTotals.tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg pt-2 border-t">
              <span>Invoice Total</span>
              <span className="text-primary">{formatCurrency(calculatedTotals.total)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={converting}>
            Cancel
          </Button>
          <Button
            onClick={handleConvert}
            disabled={converting || calculatedTotals.selectedCount === 0}
          >
            {converting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <FileCheck className="h-4 w-4 mr-2" />
                {isPartialConversion ? 'Convert Selected Items' : 'Convert All'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
