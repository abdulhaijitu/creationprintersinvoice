import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/lib/permissions/hooks';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  Wallet,
  Printer,
  ShieldAlert,
  Loader2,
  Search,
  Filter,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ReportData {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  invoiceCount: number;
  paidInvoices: number;
  unpaidInvoices: number;
  customerCount: number;
  vendorDue: number;
  monthlyData: { month: string; income: number; expense: number }[];
  categoryExpenses: { name: string; value: number; color: string }[];
  topCustomers: { name: string; total: number }[];
  invoices: any[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(217, 91%, 60%)',
  'hsl(280, 87%, 65%)',
  'hsl(340, 82%, 52%)',
];

// Summary Stat Card Component - Premium Design
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgClass: string;
  valueClass?: string;
}

const StatCard = ({ title, value, icon, iconBgClass, valueClass = 'text-foreground' }: StatCardProps) => (
  <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
    <CardContent className="p-3 sm:p-5">
      <div className="flex items-center gap-2.5 sm:gap-4">
        <div className={cn(
          "flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl transition-transform duration-300 group-hover:scale-110",
          iconBgClass
        )}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
            {title}
          </p>
          <p className={cn("text-sm sm:text-xl font-bold tracking-tight", valueClass)}>
            {value}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Loading Skeleton
const ReportsSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <Skeleton className="h-9 w-40 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
    <Skeleton className="h-16 rounded-xl" />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
    <Skeleton className="h-12 w-96 rounded-lg" />
    <Skeleton className="h-[400px] rounded-xl" />
  </div>
);

const Reports = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const { organization } = useOrganization();
  const { canPerform } = usePermissions();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all');
  const [reportData, setReportData] = useState<ReportData>({
    totalIncome: 0,
    totalExpense: 0,
    netProfit: 0,
    invoiceCount: 0,
    paidInvoices: 0,
    unpaidInvoices: 0,
    customerCount: 0,
    vendorDue: 0,
    monthlyData: [],
    categoryExpenses: [],
    topCustomers: [],
    invoices: [],
  });

  const months = [];
  for (let i = 0; i < 12; i++) {
    const date = subMonths(new Date(), i);
    months.push({
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    });
  }

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let i = 0; i < 5; i++) {
    years.push({
      value: String(currentYear - i),
      label: `${currentYear - i}`,
    });
  }

  const hasReportAccess = canPerform('reports', 'view');

  useEffect(() => {
    if (hasReportAccess && organization?.id) {
      fetchReportData();
    }
  }, [reportType, selectedMonth, selectedYear, hasReportAccess, organization?.id]);

  // Access control check
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasReportAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center animate-fade-in">
        <div className="p-4 rounded-2xl bg-destructive/10 mb-4">
          <ShieldAlert className="h-12 w-12 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground max-w-md">You don't have permission to view reports. Contact your administrator.</p>
      </div>
    );
  }

  const fetchReportData = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      let startDate: Date;
      let endDate: Date;

      if (reportType === 'monthly') {
        const [year, month] = selectedMonth.split('-').map(Number);
        startDate = startOfMonth(new Date(year, month - 1));
        endDate = endOfMonth(new Date(year, month - 1));
      } else {
        startDate = startOfYear(new Date(Number(selectedYear), 0));
        endDate = endOfYear(new Date(Number(selectedYear), 0));
      }

      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      const [
        invoicesRes,
        expensesRes,
        customersRes,
        vendorBillsRes,
      ] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, customers(name)')
          .eq('organization_id', organization.id)
          .gte('invoice_date', startDateStr)
          .lte('invoice_date', endDateStr)
          .order('invoice_date', { ascending: false }),
        supabase
          .from('expenses')
          .select('*, expense_categories(name)')
          .eq('organization_id', organization.id)
          .gte('date', startDateStr)
          .lte('date', endDateStr),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
        supabase.from('vendor_bills').select('amount, status').eq('organization_id', organization.id).neq('status', 'paid'),
      ]);

      const invoices = invoicesRes.data || [];
      const expenses = expensesRes.data || [];

      const totalIncome = invoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
      const totalExpense = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
      const netProfit = totalIncome - totalExpense;

      const paidInvoices = invoices.filter((inv) => inv.status === 'paid').length;
      const unpaidInvoices = invoices.filter((inv) => inv.status === 'unpaid' || inv.status === 'partial').length;

      const vendorDue = (vendorBillsRes.data || []).reduce(
        (sum, bill) => sum + Number(bill.amount || 0),
        0
      );

      // Calculate monthly data for yearly report
      const monthlyData: { month: string; income: number; expense: number }[] = [];
      if (reportType === 'yearly') {
        for (let i = 0; i < 12; i++) {
          const monthDate = new Date(Number(selectedYear), i, 1);
          const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
          const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');

          const monthIncome = invoices
            .filter((inv) => inv.invoice_date >= monthStart && inv.invoice_date <= monthEnd)
            .reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);

          const monthExpense = expenses
            .filter((exp) => exp.date >= monthStart && exp.date <= monthEnd)
            .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

          monthlyData.push({
            month: format(monthDate, 'MMM'),
            income: monthIncome,
            expense: monthExpense,
          });
        }
      }

      // Category-wise expenses
      const categoryMap = new Map<string, number>();
      expenses.forEach((exp) => {
        const categoryName = (exp.expense_categories as any)?.name || 'Others';
        categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + Number(exp.amount || 0));
      });

      const categoryExpenses = Array.from(categoryMap.entries())
        .map(([name, value], index) => ({
          name,
          value,
          color: COLORS[index % COLORS.length],
        }))
        .sort((a, b) => b.value - a.value);

      // Top customers
      const customerMap = new Map<string, number>();
      invoices.forEach((inv) => {
        const customerName = (inv.customers as any)?.name || 'Unknown';
        customerMap.set(customerName, (customerMap.get(customerName) || 0) + Number(inv.total || 0));
      });

      const topCustomers = Array.from(customerMap.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      setReportData({
        totalIncome,
        totalExpense,
        netProfit,
        invoiceCount: invoices.length,
        paidInvoices,
        unpaidInvoices,
        customerCount: customersRes.count || 0,
        vendorDue,
        monthlyData,
        categoryExpenses,
        topCustomers,
        invoices,
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `BDT ${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatChartCurrency = (value: number) => {
    if (value >= 1000000) {
      return `৳${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `৳${(value / 1000).toFixed(0)}K`;
    }
    return `৳${value}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const title = reportType === 'monthly' 
      ? `Monthly Report - ${format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}`
      : `Annual Report - ${selectedYear}`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Error',
        description: 'Failed to create PDF. Please disable pop-up blocker.',
        variant: 'destructive',
      });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 1200px; margin: 0 auto; color: #1a1a1a; }
          .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #f97316; }
          .header h1 { font-size: 28px; font-weight: 700; margin: 0 0 8px 0; }
          .header p { color: #666; font-size: 14px; margin: 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 40px; }
          .summary-card { background: #f8f9fa; padding: 20px; border-radius: 12px; text-align: left; border: 1px solid #e5e7eb; }
          .summary-card .label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          .summary-card .value { font-size: 20px; font-weight: 700; }
          .profit { color: #16a34a; }
          .loss { color: #dc2626; }
          .primary { color: #f97316; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; }
          th { background: #f8f9fa; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb; }
          td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <p>Generated on: ${format(new Date(), 'd MMMM yyyy')}</p>
        </div>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">Total Income</div>
            <div class="value profit">${formatCurrency(reportData.totalIncome)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Expense</div>
            <div class="value loss">${formatCurrency(reportData.totalExpense)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Net Profit/Loss</div>
            <div class="value ${reportData.netProfit >= 0 ? 'profit' : 'loss'}">${formatCurrency(reportData.netProfit)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Invoices</div>
            <div class="value primary">${reportData.invoiceCount}</div>
          </div>
        </div>
        <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const chartConfig = {
    income: { label: 'Income', color: 'hsl(var(--chart-2))' },
    expense: { label: 'Expense', color: 'hsl(var(--destructive))' },
  };

  // Filter invoices
  const filteredInvoices = reportData.invoices.filter((inv) => {
    const matchesSearch = invoiceSearch === '' || 
      inv.invoice_number?.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      (inv.customers as any)?.name?.toLowerCase().includes(invoiceSearch.toLowerCase());
    const matchesStatus = invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 font-medium">Paid</Badge>;
      case 'partial':
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 font-medium">Partial</Badge>;
      default:
        return <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-0 font-medium">Unpaid</Badge>;
    }
  };

  // Show access denied message for non-admin users
  if (!isAdmin) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">Financial analysis and report generation</p>
        </div>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center py-12 space-y-4">
              <div className="p-4 rounded-2xl bg-destructive/10">
                <ShieldAlert className="h-12 w-12 text-destructive" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
                <p className="text-muted-foreground max-w-md">
                  Only admin users can view reports. Contact your system administrator if you need access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <ReportsSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in" id="report-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-0.5 text-sm sm:text-base">Financial analysis and report generation</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button 
            variant="outline" 
            onClick={handlePrint} 
            className="gap-2 h-10 px-4 border-border/60 hover:bg-muted/80"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          <Button 
            onClick={handleExportPDF} 
            className="gap-2 h-10 px-4 bg-primary hover:bg-primary/90"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download PDF</span>
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="print:hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-3 md:p-4">
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Report Type:</span>
              <Select value={reportType} onValueChange={(v: 'monthly' | 'yearly') => setReportType(v)}>
                <SelectTrigger className="w-[130px] h-9 bg-background border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="h-6 w-px bg-border/60 hidden sm:block" />

            {reportType === 'monthly' ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Month:</span>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[180px] h-9 bg-background border-border/60">
                    <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Year:</span>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[120px] h-9 bg-background border-border/60">
                    <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats - 2-col tablet, 4-col desktop */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Income"
          value={formatCurrency(reportData.totalIncome)}
          icon={<TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/40"
          valueClass="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          title="Total Expense"
          value={formatCurrency(reportData.totalExpense)}
          icon={<TrendingDown className="h-5 w-5 text-rose-600 dark:text-rose-400" />}
          iconBgClass="bg-rose-100 dark:bg-rose-900/40"
          valueClass="text-rose-600 dark:text-rose-400"
        />
        <StatCard
          title="Net Profit/Loss"
          value={formatCurrency(reportData.netProfit)}
          icon={<Wallet className={cn("h-5 w-5", reportData.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")} />}
          iconBgClass={reportData.netProfit >= 0 ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-rose-100 dark:bg-rose-900/40"}
          valueClass={reportData.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
        />
        <StatCard
          title="Total Invoices"
          value={reportData.invoiceCount.toString()}
          icon={<FileText className="h-5 w-5 text-primary" />}
          iconBgClass="bg-primary/10"
          valueClass="text-primary"
        />
      </div>

      {/* Tabs & Content */}
      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList className="print:hidden bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="invoices" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2 text-sm font-medium">
            Invoices
          </TabsTrigger>
          <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2 text-sm font-medium">
            Overview
          </TabsTrigger>
          <TabsTrigger value="expenses" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2 text-sm font-medium">
            Expense Analysis
          </TabsTrigger>
          <TabsTrigger value="customers" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2 text-sm font-medium">
            Customer Analysis
          </TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Invoice Report</CardTitle>
              <CardDescription>Filter and view invoices for the selected period</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by invoice number or customer..."
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    className="pl-10 h-10 bg-background border-border/60"
                  />
                </div>
                <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[160px] h-10 bg-background border-border/60">
                    <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="border border-border/50 rounded-xl overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                <div className="min-w-[650px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Invoice No</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Customer</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Date</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Total</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Paid</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Due</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                          <p className="font-medium">No invoices found</p>
                          <p className="text-sm">Try adjusting your search or filters</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvoices.map((inv) => (
                        <TableRow key={inv.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium text-primary">{inv.invoice_number}</TableCell>
                          <TableCell className="text-foreground">{(inv.customers as any)?.name || '-'}</TableCell>
                          <TableCell className="text-muted-foreground">{format(new Date(inv.invoice_date), 'd MMM yyyy')}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(inv.total || 0)}</TableCell>
                          <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(inv.paid_amount || 0)}</TableCell>
                          <TableCell className="text-right font-medium text-rose-600 dark:text-rose-400">
                            {formatCurrency((inv.total || 0) - (inv.paid_amount || 0))}
                          </TableCell>
                          <TableCell>{getStatusBadge(inv.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Invoice Status */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Invoice Status</CardTitle>
                <CardDescription>Payment status overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-4 rounded-xl bg-success/5 border border-success/20">
                  <span className="font-medium text-success">Paid</span>
                  <Badge className="bg-success text-success-foreground text-sm px-3">{reportData.paidInvoices}</Badge>
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                  <span className="font-medium text-destructive">Unpaid/Partial</span>
                  <Badge className="bg-destructive text-destructive-foreground text-sm px-3">{reportData.unpaidInvoices}</Badge>
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl bg-warning/5 border border-warning/20">
                  <span className="font-medium text-warning">Vendor Due</span>
                  <span className="font-bold text-warning">{formatCurrency(reportData.vendorDue)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Profit Margin */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Profit Margin</CardTitle>
                <CardDescription>Income vs Expense ratio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Income</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {reportData.totalIncome + reportData.totalExpense > 0
                        ? Math.round((reportData.totalIncome / (reportData.totalIncome + reportData.totalExpense)) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          reportData.totalIncome + reportData.totalExpense > 0
                            ? (reportData.totalIncome / (reportData.totalIncome + reportData.totalExpense)) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Expense</span>
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      {reportData.totalIncome + reportData.totalExpense > 0
                        ? Math.round((reportData.totalExpense / (reportData.totalIncome + reportData.totalExpense)) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          reportData.totalIncome + reportData.totalExpense > 0
                            ? (reportData.totalExpense / (reportData.totalIncome + reportData.totalExpense)) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trend for Yearly Report */}
          {reportType === 'yearly' && reportData.monthlyData.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg font-semibold">Monthly Income-Expense Trend</CardTitle>
                    <CardDescription>Monthly analysis for {selectedYear}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart data={reportData.monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis tickFormatter={formatChartCurrency} className="text-xs" />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value: number) => formatCurrency(value)}
                        />
                      }
                    />
                    <Bar dataKey="income" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Income" />
                    <Bar dataKey="expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Expense" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Category Pie Chart */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Category-wise Expenses</CardTitle>
                <CardDescription>Expense breakdown by category</CardDescription>
              </CardHeader>
              <CardContent>
                {reportData.categoryExpenses.length > 0 ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportData.categoryExpenses}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {reportData.categoryExpenses.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend
                          formatter={(value: string) => (
                            <span className="text-foreground text-sm">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Wallet className="h-10 w-10 mb-3 opacity-30" />
                    <p className="font-medium">No expense data</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category List */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Expense Breakdown</CardTitle>
                <CardDescription>Category-wise expense details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.categoryExpenses.length > 0 ? (
                    reportData.categoryExpenses.map((category, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full shadow-sm"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <span className="font-bold">{formatCurrency(category.value)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <p className="text-sm">No expenses recorded</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Top Customers</CardTitle>
              <CardDescription>Customers with highest order value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportData.topCustomers.length > 0 ? (
                  reportData.topCustomers.map((customer, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm transition-transform group-hover:scale-110",
                          index === 0 ? "bg-gradient-to-br from-warning to-primary" :
                          index === 1 ? "bg-gradient-to-br from-muted-foreground/60 to-muted-foreground/80" :
                          index === 2 ? "bg-gradient-to-br from-warning/70 to-warning/90" :
                          "bg-gradient-to-br from-primary to-primary/80"
                        )}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-foreground">{customer.name}</span>
                      </div>
                      <span className="font-bold text-lg">{formatCurrency(customer.total)}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FileText className="h-10 w-10 mb-3 opacity-30" />
                    <p className="font-medium">No customer data</p>
                    <p className="text-sm">No invoices found for this period</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;