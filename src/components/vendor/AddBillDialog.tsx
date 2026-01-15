import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  rate: string;
}

interface Customer {
  id: string;
  name: string;
  company_name?: string;
}

interface AddBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (billData: BillFormData) => Promise<void>;
  customers?: Customer[];
}

export interface BillFormData {
  billDate: Date;
  reference: string;
  customerId: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    rate: number;
    total: number;
  }>;
  amount: number;
  discount: number;
  netPayable: number;
  dueDate: Date | undefined;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const createEmptyLineItem = (): LineItem => ({
  id: generateId(),
  description: "",
  quantity: "1",
  rate: "",
});

export function AddBillDialog({ open, onOpenChange, onSave, customers = [] }: AddBillDialogProps) {
  const [billDate, setBillDate] = useState<Date>(new Date());
  const [reference, setReference] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([createEmptyLineItem()]);
  const [discount, setDiscount] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const newRowRef = useRef<HTMLInputElement>(null);
  const shouldFocusNewRow = useRef(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setBillDate(new Date());
      setReference("");
      setCustomerId("");
      setLineItems([createEmptyLineItem()]);
      setDiscount("");
      setDueDate(undefined);
      setErrors({});
    }
  }, [open]);

  // Auto-focus new row
  useEffect(() => {
    if (shouldFocusNewRow.current && newRowRef.current) {
      newRowRef.current.focus();
      shouldFocusNewRow.current = false;
    }
  }, [lineItems.length]);

  // Calculate line total
  const getLineTotal = (item: LineItem): number => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    return qty * rate;
  };

  // Calculate totals
  const amount = lineItems.reduce((sum, item) => sum + getLineTotal(item), 0);
  const discountValue = parseFloat(discount) || 0;
  const netPayable = Math.max(0, amount - discountValue);

  // Update line item
  const updateLineItem = (id: string, field: keyof LineItem, value: string) => {
    setLineItems(items =>
      items.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
    // Clear line item errors
    if (errors[`lineItem_${id}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`lineItem_${id}`];
        return newErrors;
      });
    }
  };

  // Add new line item
  const addLineItem = () => {
    setLineItems(items => [...items, createEmptyLineItem()]);
    shouldFocusNewRow.current = true;
  };

  // Remove line item
  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) {
      toast.error("At least one line item is required");
      return;
    }
    setLineItems(items => items.filter(item => item.id !== id));
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!billDate) {
      newErrors.billDate = "Bill date is required";
    }

    // Validate line items
    const validLineItems = lineItems.filter(item => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      return qty > 0 && rate > 0;
    });

    if (validLineItems.length === 0) {
      newErrors.lineItems = "At least one line item with quantity and rate is required";
    }

    lineItems.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      if (item.rate && rate <= 0) {
        newErrors[`lineItem_${item.id}`] = "Rate must be greater than 0";
      }
      if (item.quantity && qty <= 0) {
        newErrors[`lineItem_${item.id}`] = "Quantity must be greater than 0";
      }
    });

    if (discountValue > amount) {
      newErrors.discount = "Discount cannot exceed amount";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const validLineItems = lineItems
        .filter(item => {
          const qty = parseFloat(item.quantity) || 0;
          const rate = parseFloat(item.rate) || 0;
          return qty > 0 && rate > 0;
        })
        .map(item => ({
          description: item.description,
          quantity: parseFloat(item.quantity) || 0,
          rate: parseFloat(item.rate) || 0,
          total: getLineTotal(item),
        }));

      await onSave({
        billDate,
        reference,
        customerId,
        lineItems: validLineItems,
        amount,
        discount: discountValue,
        netPayable,
        dueDate,
      });

      onOpenChange(false);
      toast.success("Bill saved successfully");
    } catch (error) {
      toast.error("Failed to save bill");
    } finally {
      setSaving(false);
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Bill</DialogTitle>
          <DialogDescription>
            Record vendor bill and track payable
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* SECTION A: BILL META */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billDate">
                Bill Date <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !billDate && "text-muted-foreground",
                      errors.billDate && "border-destructive"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {billDate ? format(billDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={billDate}
                    onSelect={(date) => date && setBillDate(date)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {errors.billDate && (
                <p className="text-xs text-destructive">{errors.billDate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Ref#</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Optional reference number"
              />
            </div>
          </div>

          {/* SECTION B: LINE ITEMS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            {errors.lineItems && (
              <p className="text-xs text-destructive">{errors.lineItems}</p>
            )}

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 text-center">Sl#</TableHead>
                    <TableHead className="min-w-[180px]">Description</TableHead>
                    <TableHead className="w-24 text-right">Qty</TableHead>
                    <TableHead className="w-28 text-right">Rate</TableHead>
                    <TableHead className="w-32 text-right">Line Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, index) => (
                    <TableRow key={item.id} className={errors[`lineItem_${item.id}`] ? "bg-destructive/5" : ""}>
                      <TableCell className="text-center font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <Input
                          ref={index === lineItems.length - 1 ? newRowRef : undefined}
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                          placeholder="Item description"
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, "quantity", e.target.value)}
                          placeholder="1"
                          min="0"
                          step="any"
                          className="h-8 text-sm text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateLineItem(item.id, "rate", e.target.value)}
                          placeholder="0.00"
                          min="0"
                          step="any"
                          className="h-8 text-sm text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(getLineTotal(item))}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeLineItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* SECTION C: CONTEXT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Client's Job</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.company_name && ` - ${customer.company_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="h-10 px-3 flex items-center rounded-md border bg-muted/50 font-medium tabular-nums">
                {formatCurrency(amount)}
              </div>
            </div>
          </div>

          {/* SECTION D: PAYMENT SUMMARY */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="discount">Discount</Label>
              <Input
                id="discount"
                type="number"
                value={discount}
                onChange={(e) => {
                  setDiscount(e.target.value);
                  if (errors.discount) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.discount;
                      return newErrors;
                    });
                  }
                }}
                placeholder="0.00"
                min="0"
                step="any"
                className={cn(errors.discount && "border-destructive")}
              />
              {errors.discount && (
                <p className="text-xs text-destructive">{errors.discount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Net Payable</Label>
              <div className="h-10 px-3 flex items-center rounded-md border bg-primary/5 border-primary/20 font-semibold text-lg tabular-nums text-primary">
                {formatCurrency(netPayable)}
              </div>
            </div>
          </div>

          {/* SECTION E: DUE DATE */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full md:w-auto min-w-[200px] justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Select due date (optional)"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Bill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
