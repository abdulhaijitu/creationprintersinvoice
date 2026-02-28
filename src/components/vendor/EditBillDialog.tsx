import React, { useState, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarWithJumps } from "@/components/ui/calendar-with-jumps";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { BillFormData } from "./AddBillDialog";

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

interface BillData {
  id: string;
  bill_date: string;
  description: string | null;
  amount: number;
  discount: number;
  net_amount: number;
  due_date: string | null;
  reference_no: string | null;
}

interface EditBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (billData: BillFormData) => Promise<void>;
  bill: BillData | null;
  customers?: Customer[];
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const createEmptyLineItem = (): LineItem => ({
  id: generateId(),
  description: "",
  quantity: "1",
  rate: "",
});

/**
 * Parse description field to extract line items and customer info.
 * Format: "Client: Name (Company)\n1. desc — qty × rate = total\n2. ..."
 */
function parseDescription(
  description: string | null,
  amount: number,
  customers: Customer[]
): { lineItems: LineItem[]; customerId: string } {
  let customerId = "";
  if (!description) {
    return {
      lineItems: [{ ...createEmptyLineItem(), rate: amount.toString() }],
      customerId,
    };
  }

  const lines = description.split("\n").filter((l) => l.trim());

  // Try to extract customer from "Client: Name" or "Client: Name (Company)"
  const clientLine = lines.find((l) => l.startsWith("Client:"));
  if (clientLine) {
    const clientName = clientLine.replace("Client:", "").trim().split("(")[0].trim();
    const match = customers.find(
      (c) => c.name.toLowerCase() === clientName.toLowerCase()
    );
    if (match) customerId = match.id;
  }

  // Parse line items: "N. description — qty × rate = total"
  const itemLines = lines.filter((l) => /^\d+\.\s/.test(l));
  if (itemLines.length === 0) {
    return {
      lineItems: [{ ...createEmptyLineItem(), description: description, rate: amount.toString() }],
      customerId,
    };
  }

  const parsed: LineItem[] = itemLines.map((line) => {
    // Try: "1. desc — qty × rate = total"
    const match = line.match(/^\d+\.\s*(.*?)\s*—\s*([\d.]+)\s*×\s*([\d.]+)\s*=\s*([\d.]+)$/);
    if (match) {
      return {
        id: generateId(),
        description: match[1].trim(),
        quantity: match[2],
        rate: match[3],
      };
    }
    // Fallback: just use the text after the number
    const textMatch = line.match(/^\d+\.\s*(.*)$/);
    return {
      id: generateId(),
      description: textMatch ? textMatch[1].trim() : line,
      quantity: "1",
      rate: "",
    };
  });

  return { lineItems: parsed.length > 0 ? parsed : [createEmptyLineItem()], customerId };
}

export function EditBillDialog({ open, onOpenChange, onSave, bill, customers = [] }: EditBillDialogProps) {
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

  // Populate form when dialog opens with bill data
  useEffect(() => {
    if (open && bill) {
      setBillDate(parseISO(bill.bill_date));
      setReference(bill.reference_no || "");
      setDiscount(bill.discount ? bill.discount.toString() : "");
      setDueDate(bill.due_date ? parseISO(bill.due_date) : undefined);
      setErrors({});

      const { lineItems: parsed, customerId: parsedCustomer } = parseDescription(
        bill.description,
        bill.amount,
        customers
      );
      setLineItems(parsed);
      setCustomerId(parsedCustomer);
    }
  }, [open, bill, customers]);

  // Auto-focus new row
  useEffect(() => {
    if (shouldFocusNewRow.current && newRowRef.current) {
      newRowRef.current.focus();
      shouldFocusNewRow.current = false;
    }
  }, [lineItems.length]);

  const getLineTotal = (item: LineItem): number => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    return qty * rate;
  };

  const amount = lineItems.reduce((sum, item) => sum + getLineTotal(item), 0);
  const discountValue = parseFloat(discount) || 0;
  const netPayable = Math.max(0, amount - discountValue);

  const updateLineItem = (id: string, field: keyof LineItem, value: string) => {
    setLineItems((items) =>
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
    if (errors[`lineItem_${id}`]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[`lineItem_${id}`];
        return n;
      });
    }
  };

  const addLineItem = () => {
    setLineItems((items) => [...items, createEmptyLineItem()]);
    shouldFocusNewRow.current = true;
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) {
      toast.error("At least one line item is required");
      return;
    }
    setLineItems((items) => items.filter((item) => item.id !== id));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!billDate) newErrors.billDate = "Bill date is required";

    const validLineItems = lineItems.filter((item) => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      return qty > 0 && rate > 0;
    });
    if (validLineItems.length === 0) {
      newErrors.lineItems = "At least one line item with quantity and rate is required";
    }

    lineItems.forEach((item) => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      if (item.rate && rate <= 0) newErrors[`lineItem_${item.id}`] = "Rate must be > 0";
      if (item.quantity && qty <= 0) newErrors[`lineItem_${item.id}`] = "Quantity must be > 0";
    });

    if (discountValue > amount) newErrors.discount = "Discount cannot exceed amount";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const validLineItems = lineItems
        .filter((item) => {
          const qty = parseFloat(item.quantity) || 0;
          const rate = parseFloat(item.rate) || 0;
          return qty > 0 && rate > 0;
        })
        .map((item) => ({
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
    } catch (error) {
      toast.error("Failed to update bill");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 2,
    }).format(value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Bill</DialogTitle>
          <DialogDescription>Update bill details and line items</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* SECTION A: BILL META */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Bill Date <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10",
                      !billDate && "text-muted-foreground",
                      errors.billDate && "border-destructive"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {billDate ? format(billDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarWithJumps
                    mode="single"
                    selected={billDate}
                    onSelect={(date) => date && setBillDate(date)}
                    fromYear={2020}
                    toYear={new Date().getFullYear() + 5}
                  />
                </PopoverContent>
              </Popover>
              {errors.billDate && <p className="text-xs text-destructive">{errors.billDate}</p>}
            </div>

            <div className="space-y-2">
              <Label>Ref#</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional reference number" />
            </div>
          </div>

          {/* SECTION B: LINE ITEMS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            {errors.lineItems && <p className="text-xs text-destructive">{errors.lineItems}</p>}

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
                      <TableCell className="text-center font-medium text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          id={`edit-line-desc-${item.id}`}
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
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            e.preventDefault();
                            if (index === lineItems.length - 1) {
                              addLineItem();
                              return;
                            }
                            const nextId = lineItems[index + 1]?.id;
                            const next = nextId
                              ? (document.getElementById(`edit-line-desc-${nextId}`) as HTMLInputElement | null)
                              : null;
                            next?.focus();
                          }}
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
              <Label>Client's Job</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn("w-full justify-between font-normal h-10", !customerId && "text-muted-foreground")}
                  >
                    {customerId
                      ? (() => {
                          const customer = customers.find((c) => c.id === customerId);
                          return customer
                            ? `${customer.name}${customer.company_name ? ` - ${customer.company_name}` : ""}`
                            : "Select client (optional)";
                        })()
                      : "Select client (optional)"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 pointer-events-auto" align="start">
                  <Command>
                    <CommandInput placeholder="Search client or job..." />
                    <CommandList>
                      <CommandEmpty>No job found.</CommandEmpty>
                      <CommandGroup>
                        {customers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={`${customer.name} ${customer.company_name || ""}`}
                            onSelect={() => setCustomerId(customerId === customer.id ? "" : customer.id)}
                          >
                            <Check className={cn("mr-2 h-4 w-4", customerId === customer.id ? "opacity-100" : "opacity-0")} />
                            <span className="truncate">
                              {customer.name}
                              {customer.company_name && <span className="text-muted-foreground ml-1">- {customer.company_name}</span>}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
              <Label>Discount</Label>
              <Input
                type="number"
                value={discount}
                onChange={(e) => {
                  setDiscount(e.target.value);
                  if (errors.discount) {
                    setErrors((prev) => {
                      const n = { ...prev };
                      delete n.discount;
                      return n;
                    });
                  }
                }}
                placeholder="0.00"
                min="0"
                step="any"
                className={cn(errors.discount && "border-destructive")}
              />
              {errors.discount && <p className="text-xs text-destructive">{errors.discount}</p>}
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
                    "w-full md:w-auto min-w-[200px] justify-start text-left font-normal h-10",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Select due date (optional)"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarWithJumps
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  fromYear={2020}
                  toYear={new Date().getFullYear() + 5}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Updating..." : "Update Bill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
