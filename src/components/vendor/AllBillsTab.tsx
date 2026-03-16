import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/hooks/useQueryConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableTableHeader, type SortDirection } from "@/components/shared/SortableTableHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  CalendarIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Receipt,
  DollarSign,
  AlertCircle,
  FileText,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

interface DateRange {
  from?: Date;
  to?: Date;
}

interface VendorBill {
  id: string;
  bill_date: string;
  description: string | null;
  amount: number;
  discount: number;
  net_amount: number;
  paid_amount: number;
  status: string | null;
  vendor_id: string;
  vendor_name: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function AllBillsTab() {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const now = new Date();

  // Filter states
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [statusFilter, setStatusFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<"month" | "range">("month");

  // Fetch vendors list
  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors-list-filter", organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, name")
        .eq("organization_id", organization!.id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization?.id,
    staleTime: STALE_TIMES.LIST_DATA,
  });

  // Pagination & sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>("bill_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Compute date boundaries
  const dateFrom = filterMode === "month"
    ? format(startOfMonth(new Date(selectedYear, selectedMonth)), "yyyy-MM-dd")
    : dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;

  const dateTo = filterMode === "month"
    ? format(endOfMonth(new Date(selectedYear, selectedMonth)), "yyyy-MM-dd")
    : dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ["all-vendor-bills", organization?.id, dateFrom, dateTo, statusFilter, vendorFilter],
    queryFn: async () => {
      let query = supabase
        .from("vendor_bills")
        .select("id, bill_date, description, amount, discount, net_amount, paid_amount, status, vendor_id, vendors(name)")
        .eq("organization_id", organization!.id)
        .order("bill_date", { ascending: false });

      if (dateFrom) query = query.gte("bill_date", dateFrom);
      if (dateTo) query = query.lte("bill_date", dateTo);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((b: any) => ({
        id: b.id,
        bill_date: b.bill_date,
        description: b.description,
        amount: b.amount,
        discount: b.discount,
        net_amount: b.net_amount,
        paid_amount: b.paid_amount,
        status: b.status,
        vendor_id: b.vendor_id,
        vendor_name: b.vendors?.name || "Unknown",
      })) as VendorBill[];
    },
    enabled: !!organization?.id && !!(dateFrom && dateTo),
    staleTime: STALE_TIMES.LIST_DATA,
  });

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, statusFilter]);

  // Summary
  const summary = useMemo(() => {
    const totalBills = bills.reduce((s, b) => s + b.net_amount, 0);
    const totalPaid = bills.reduce((s, b) => s + b.paid_amount, 0);
    return { totalBills, totalPaid, totalDue: totalBills - totalPaid, count: bills.length };
  }, [bills]);

  // Sorting
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") { setSortDirection(null); setSortKey(null); }
      else setSortDirection("asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedBills = useMemo(() => {
    if (!sortKey || !sortDirection) return bills;
    return [...bills].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortKey) {
        case "bill_date": aVal = a.bill_date; bVal = b.bill_date; break;
        case "vendor_name": aVal = a.vendor_name.toLowerCase(); bVal = b.vendor_name.toLowerCase(); break;
        case "net_amount": aVal = a.net_amount; bVal = b.net_amount; break;
        case "paid_amount": aVal = a.paid_amount; bVal = b.paid_amount; break;
        case "due": aVal = a.net_amount - a.paid_amount; bVal = b.net_amount - b.paid_amount; break;
        default: return 0;
      }
      const cmp = typeof aVal === "string" ? aVal.localeCompare(bVal) : aVal - bVal;
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [bills, sortKey, sortDirection]);

  const totalPages = Math.ceil(sortedBills.length / PAGE_SIZE);
  const paginatedBills = sortedBills.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Year options
  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const handleMonthChange = (val: string) => {
    setSelectedMonth(parseInt(val));
    setFilterMode("month");
    setDateRange(undefined);
  };

  const handleYearChange = (val: string) => {
    setSelectedYear(parseInt(val));
    setFilterMode("month");
    setDateRange(undefined);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from) setFilterMode("range");
    if (range?.to) setIsDateOpen(false);
  };

  const clearDateRange = () => {
    setDateRange(undefined);
    setFilterMode("month");
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "paid": return <Badge className="bg-success/10 text-success border-success/30 hover:bg-success/20">Paid</Badge>;
      case "partial": return <Badge variant="outline" className="text-warning border-warning/50">Partial</Badge>;
      default: return <Badge variant="destructive">Unpaid</Badge>;
    }
  };

  const activeFilterCount = (statusFilter !== "all" ? 1 : 0) + (filterMode === "range" && dateRange?.from ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          {/* Monthly filter */}
          <div className="flex items-center gap-2">
            <Select value={String(selectedMonth)} onValueChange={handleMonthChange}>
              <SelectTrigger className={cn("w-[130px] h-10 bg-background/50 border-border/50", filterMode === "range" && "opacity-50")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={handleYearChange}>
              <SelectTrigger className={cn("w-[90px] h-10 bg-background/50 border-border/50", filterMode === "range" && "opacity-50")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-10 gap-2 border-border/50 bg-background/50",
                  filterMode === "range" && "ring-2 ring-primary/30"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <span className="text-xs">
                      {format(dateRange.from, "dd MMM")} – {format(dateRange.to, "dd MMM")}
                    </span>
                  ) : (
                    <span className="text-xs">{format(dateRange.from, "dd MMM")}</span>
                  )
                ) : (
                  <span className="hidden sm:inline text-xs">Date Range</span>
                )}
                {filterMode === "range" && (
                  <X
                    className="h-3 w-3 ml-1 hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); clearDateRange(); }}
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                selected={dateRange?.from ? { from: dateRange.from, to: dateRange.to } : undefined}
                onSelect={(range) => handleDateRangeChange(range as DateRange | undefined)}
                numberOfMonths={2}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-10 bg-background/50 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 gap-1.5 text-muted-foreground"
              onClick={() => { setStatusFilter("all"); clearDateRange(); }}
            >
              <X className="h-4 w-4" />Clear
              <Badge variant="secondary" className="ml-1 px-1.5">{activeFilterCount}</Badge>
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" />Bills Count
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-xl md:text-2xl font-bold">{summary.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-xl md:text-2xl font-bold">{formatCurrency(summary.totalBills)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-success flex items-center gap-2">
              <DollarSign className="h-4 w-4" />Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-xl md:text-2xl font-bold text-success">{formatCurrency(summary.totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />Total Due
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-xl md:text-2xl font-bold text-destructive">{formatCurrency(summary.totalDue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card border rounded-lg p-4 space-y-3" style={{ opacity: 1 - i * 0.15 }}>
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : paginatedBills.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No bills found"
            description="No vendor bills match your current filters"
          />
        ) : (
          paginatedBills.map((bill) => (
            <div
              key={bill.id}
              className="bg-card border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/vendors/${bill.vendor_id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{bill.vendor_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(bill.bill_date)}</p>
                  {bill.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{bill.description}</p>
                  )}
                </div>
                {getStatusBadge(bill.status)}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pt-2 border-t">
                <span>Net: {formatCurrency(bill.net_amount)}</span>
                <span className="text-success">Paid: {formatCurrency(bill.paid_amount)}</span>
                <span className="text-destructive">Due: {formatCurrency(bill.net_amount - bill.paid_amount)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableTableHeader label="Date" sortKey="bill_date" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} />
              </TableHead>
              <TableHead>
                <SortableTableHeader label="Vendor" sortKey="vendor_name" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} />
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead className="text-right">
                <SortableTableHeader label="Net Amount" sortKey="net_amount" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} align="right" />
              </TableHead>
              <TableHead className="text-right">
                <SortableTableHeader label="Paid" sortKey="paid_amount" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} align="right" />
              </TableHead>
              <TableHead className="text-right">
                <SortableTableHeader label="Due" sortKey="due" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} align="right" />
              </TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="flex items-center gap-4 px-2" style={{ opacity: 1 - i * 0.1 }}>
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-20 bg-muted rounded animate-pulse ml-auto" />
                        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedBills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-0">
                  <EmptyState
                    icon={FileText}
                    title="No bills found"
                    description="No vendor bills match your current filters"
                  />
                </TableCell>
              </TableRow>
            ) : (
              paginatedBills.map((bill) => (
                <TableRow
                  key={bill.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/vendors/${bill.vendor_id}`)}
                >
                  <TableCell className="tabular-nums">{formatDate(bill.bill_date)}</TableCell>
                  <TableCell className="font-medium">{bill.vendor_name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {bill.description || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(bill.amount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(bill.discount)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(bill.net_amount)}</TableCell>
                  <TableCell className="text-right tabular-nums text-success">{formatCurrency(bill.paid_amount)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {bill.net_amount - bill.paid_amount > 0 ? (
                      <span className="text-destructive font-semibold">{formatCurrency(bill.net_amount - bill.paid_amount)}</span>
                    ) : (
                      <span className="text-success">{formatCurrency(0)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{getStatusBadge(bill.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sortedBills.length)} of {sortedBills.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
