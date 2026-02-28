import { useEffect, useState, useMemo } from 'react';
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
  AreaChart,
  Area,
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
  ArrowUpRight,
  ArrowDownRight,
  Percent,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval, parseISO, differenceInDays } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
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
  monthlyData: { month: string; income: number; expense: number; profit: number }[];
  dailyData: { date: string; income: number; expense: number; profit: number }[];
  categoryExpenses: { name: string; value: number; color: string }[];
  topCustomers: { name: string; total: number }[];
  invoices: any[];
  // Previous period comparison
  prevTotalIncome: number;
  prevTotalExpense: number;
  prevNetProfit: number;
  // P&L breakdown
  totalInvoiceAmount: number;
  totalCollection: number;
  totalDue: number;
  vendorBillExpense: number;
  salaryExpense: number;
  officeExpense: number;
  prevTotalInvoiceAmount: number;
  prevTotalCollection: number;
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
  subtitle?: React.ReactNode;
}

const StatCard = ({ title, value, icon, iconBgClass, valueClass = 'text-foreground', subtitle }: StatCardProps) => (
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
          {subtitle && <div className="mt-0.5">{subtitle}</div>}
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

// Percentage change badge
const ChangeIndicator = ({ current, previous, label }: { current: number; previous: number; label?: string }) => {
  if (previous === 0 && current === 0) return null;
  const change = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / Math.abs(previous)) * 100;
  const isPositive = change >= 0;

  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-medium",
      isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
    )}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(change).toFixed(1)}%
      {label && <span className="text-muted-foreground ml-0.5">{label}</span>}
    </span>
  );
};

const Reports = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const { organization } = useOrganization();
  const { canPerform } = usePermissions();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'monthly' | 'yearly' | 'custom'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));
  const [customFromDate, setCustomFromDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [customToDate, setCustomToDate] = useState<Date | undefined>(new Date());
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
    dailyData: [],
    categoryExpenses: [],
    topCustomers: [],
    invoices: [],
    prevTotalIncome: 0,
    prevTotalExpense: 0,
    prevNetProfit: 0,
    totalInvoiceAmount: 0,
    totalCollection: 0,
    totalDue: 0,
    vendorBillExpense: 0,
    salaryExpense: 0,
    officeExpense: 0,
    prevTotalInvoiceAmount: 0,
    prevTotalCollection: 0,
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
  }, [reportType, selectedMonth, selectedYear, customFromDate, customToDate, hasReportAccess, organization?.id]);

  // Expense breakdown for pie chart
  const expenseBreakdownData = useMemo(() => {
    const data: { name: string; value: number; color: string }[] = [];
    if (reportData.vendorBillExpense > 0) data.push({ name: 'Vendor Bills', value: reportData.vendorBillExpense, color: 'hsl(var(--destructive))' });
    if (reportData.officeExpense > 0) data.push({ name: 'Office Expenses', value: reportData.officeExpense, color: 'hsl(var(--chart-4))' });
    if (reportData.salaryExpense > 0) data.push({ name: 'Salary', value: reportData.salaryExpense, color: 'hsl(var(--chart-5))' });
    return data;
  }, [reportData.vendorBillExpense, reportData.officeExpense, reportData.salaryExpense]);

  // Category expense as % of income
  const categoryWithRatio = useMemo(() => {
    return reportData.categoryExpenses.map(cat => ({
      ...cat,
      ratio: reportData.totalInvoiceAmount > 0 ? ((cat.value / reportData.totalInvoiceAmount) * 100).toFixed(1) : '0.0',
    }));
  }, [reportData.categoryExpenses, reportData.totalInvoiceAmount]);

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
      } else if (reportType === 'yearly') {
        startDate = startOfYear(new Date(Number(selectedYear), 0));
        endDate = endOfYear(new Date(Number(selectedYear), 0));
      } else {
        // Custom date range
        if (!customFromDate || !customToDate) return;
        startDate = customFromDate;
        endDate = customToDate;
      }

      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Calculate previous period for comparison
      const periodDays = differenceInDays(endDate, startDate) + 1;
      const prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      const prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - periodDays + 1);
      const prevStartDateStr = format(prevStartDate, 'yyyy-MM-dd');
      const prevEndDateStr = format(prevEndDate, 'yyyy-MM-dd');

      const [
        invoicesRes,
        expensesRes,
        customersRes,
        vendorBillsRes,
        vendorBillsPeriodRes,
        salaryRes,
        prevInvoicesRes,
        prevExpensesRes,
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
        // Vendor bills for the selected period (for P&L breakdown)
        supabase
          .from('vendor_bills')
          .select('net_amount')
          .eq('organization_id', organization.id)
          .gte('bill_date', startDateStr)
          .lte('bill_date', endDateStr),
        // Salary records for the selected period
        supabase
          .from('employee_salary_records')
          .select('net_payable')
          .eq('organization_id', organization.id)
          .gte('year', startDate.getFullYear())
          .lte('year', endDate.getFullYear()),
        // Previous period data for comparison
        supabase
          .from('invoices')
          .select('paid_amount, total')
          .eq('organization_id', organization.id)
          .gte('invoice_date', prevStartDateStr)
          .lte('invoice_date', prevEndDateStr),
        supabase
          .from('expenses')
          .select('amount')
          .eq('organization_id', organization.id)
          .gte('date', prevStartDateStr)
          .lte('date', prevEndDateStr),
      ]);

      const invoices = invoicesRes.data || [];
      const expenses = expensesRes.data || [];

      // P&L Breakdown calculations
      const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
      const totalCollection = invoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
      const totalDue = totalInvoiceAmount - totalCollection;

      // Vendor bills expense for the period
      const vendorBillExpense = (vendorBillsPeriodRes.data || []).reduce(
        (sum, bill) => sum + Number(bill.net_amount || 0), 0
      );

      // Salary expense - filter by month range within the period
      const startMonth = startDate.getMonth() + 1;
      const startYear = startDate.getFullYear();
      const endMonth = endDate.getMonth() + 1;
      const endYear = endDate.getFullYear();
      const salaryExpense = (salaryRes.data || []).filter((rec: any) => {
        // For same year, filter by month range
        if (startYear === endYear) {
          return rec.year === startYear && rec.month >= startMonth && rec.month <= endMonth;
        }
        // For cross-year ranges (rare)
        return true;
      }).reduce((sum, rec) => sum + Number(rec.net_payable || 0), 0);

      // Office/Other expenses = total expenses minus vendor-bill-synced expenses
      const officeExpense = expenses
        .filter((exp: any) => !exp.vendor_bill_id)
        .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

      const totalIncome = totalCollection; // Collection is the actual income received
      const totalExpense = vendorBillExpense + officeExpense + salaryExpense;
      const netProfit = totalInvoiceAmount - totalExpense;

      // Previous period
      const prevTotalIncome = (prevInvoicesRes.data || []).reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
      const prevTotalInvoiceAmount = (prevInvoicesRes.data || []).reduce((sum, inv) => sum + Number(inv.total || 0), 0);
      const prevTotalCollection = prevTotalIncome;
      const prevTotalExpense = (prevExpensesRes.data || []).reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
      const prevNetProfit = prevTotalInvoiceAmount - prevTotalExpense;

      const paidInvoices = invoices.filter((inv) => inv.status === 'paid').length;
      const unpaidInvoices = invoices.filter((inv) => inv.status === 'unpaid' || inv.status === 'partial').length;

      const vendorDue = (vendorBillsRes.data || []).reduce(
        (sum, bill) => sum + Number(bill.amount || 0),
        0
      );

      // Calculate monthly data for yearly report
      const monthlyData: { month: string; income: number; expense: number; profit: number }[] = [];
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
            profit: monthIncome - monthExpense,
          });
        }
      }

      // Calculate daily data for monthly/custom reports
      const dailyData: { date: string; income: number; expense: number; profit: number }[] = [];
      if (reportType === 'monthly' || reportType === 'custom') {
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        const shouldGroupByWeek = days.length > 60;
        
        if (shouldGroupByWeek) {
          const monthIntervals = eachMonthOfInterval({ start: startDate, end: endDate });
          monthIntervals.forEach((monthStart) => {
            const mStart = format(monthStart, 'yyyy-MM-dd');
            const mEnd = format(endOfMonth(monthStart), 'yyyy-MM-dd');
            const dayIncome = invoices
              .filter((inv) => inv.invoice_date >= mStart && inv.invoice_date <= mEnd)
              .reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
            const dayExpense = expenses
              .filter((exp) => exp.date >= mStart && exp.date <= mEnd)
              .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
            dailyData.push({
              date: format(monthStart, 'MMM yyyy'),
              income: dayIncome,
              expense: dayExpense,
              profit: dayIncome - dayExpense,
            });
          });
        } else {
          days.forEach((day) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayIncome = invoices
              .filter((inv) => inv.invoice_date === dayStr)
              .reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
            const dayExpense = expenses
              .filter((exp) => exp.date === dayStr)
              .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
            dailyData.push({
              date: format(day, 'd MMM'),
              income: dayIncome,
              expense: dayExpense,
              profit: dayIncome - dayExpense,
            });
          });
        }
      }

      // Category-wise expenses (only office/other expenses, not vendor-bill-synced)
      const categoryMap = new Map<string, number>();
      expenses.forEach((exp: any) => {
        if (!exp.vendor_bill_id) {
          const categoryName = (exp.expense_categories as any)?.name || 'Others';
          categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + Number(exp.amount || 0));
        }
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
        dailyData,
        categoryExpenses,
        topCustomers,
        invoices,
        prevTotalIncome,
        prevTotalExpense,
        prevNetProfit,
        totalInvoiceAmount,
        totalCollection,
        totalDue,
        vendorBillExpense,
        salaryExpense,
        officeExpense,
        prevTotalInvoiceAmount,
        prevTotalCollection,
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

  const profitMargin = reportData.totalInvoiceAmount > 0
    ? ((reportData.netProfit / reportData.totalInvoiceAmount) * 100).toFixed(1)
    : '0.0';




  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const title = reportType === 'monthly' 
      ? `Monthly Report - ${format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}`
      : reportType === 'yearly'
      ? `Annual Report - ${selectedYear}`
      : `Custom Report - ${customFromDate ? format(customFromDate, 'd MMM yyyy') : ''} to ${customToDate ? format(customToDate, 'd MMM yyyy') : ''}`;

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
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
          .summary-card { background: #f8f9fa; padding: 20px; border-radius: 12px; text-align: left; border: 1px solid #e5e7eb; }
          .summary-card .label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          .summary-card .value { font-size: 20px; font-weight: 700; }
          .profit { color: #16a34a; }
          .loss { color: #dc2626; }
          .primary { color: #2563eb; }
          .orange { color: #d97706; }
          .section-title { font-size: 16px; font-weight: 700; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #f8f9fa; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb; }
          td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
          td.right { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
          tr.section-header td { background: #f0f9ff; font-weight: 700; color: #2563eb; }
          tr.section-header-expense td { background: #fff1f2; font-weight: 700; color: #dc2626; }
          tr.total-row td { border-top: 2px solid #e5e7eb; font-weight: 700; }
          tr.grand-total td { border-top: 3px solid #1a1a1a; font-size: 16px; font-weight: 800; }
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
            <div class="label">Invoice Amount</div>
            <div class="value primary">${formatCurrency(reportData.totalInvoiceAmount)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Collection</div>
            <div class="value profit">${formatCurrency(reportData.totalCollection)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Due Amount</div>
            <div class="value orange">${formatCurrency(reportData.totalDue)}</div>
          </div>
        </div>
        
        <div class="section-title">Profit & Loss Statement</div>
        <table>
          <tr class="section-header"><td colspan="2">Revenue</td></tr>
          <tr><td style="padding-left:24px">Invoice Amount</td><td class="right">${formatCurrency(reportData.totalInvoiceAmount)}</td></tr>
          <tr><td style="padding-left:24px">Collection (আদায়)</td><td class="right profit">${formatCurrency(reportData.totalCollection)}</td></tr>
          <tr><td style="padding-left:24px">Due (বাকি)</td><td class="right orange">${formatCurrency(reportData.totalDue)}</td></tr>
          <tr class="section-header-expense"><td colspan="2">Expenses</td></tr>
          <tr><td style="padding-left:24px">Vendor Bills</td><td class="right">${formatCurrency(reportData.vendorBillExpense)}</td></tr>
          <tr><td style="padding-left:24px">Office Expenses</td><td class="right">${formatCurrency(reportData.officeExpense)}</td></tr>
          <tr><td style="padding-left:24px">Salary</td><td class="right">${formatCurrency(reportData.salaryExpense)}</td></tr>
          <tr class="total-row"><td style="padding-left:24px">Total Expense</td><td class="right loss">${formatCurrency(reportData.totalExpense)}</td></tr>
          <tr class="grand-total"><td>Net Profit / Loss</td><td class="right ${reportData.netProfit >= 0 ? 'profit' : 'loss'}">${formatCurrency(reportData.netProfit)}</td></tr>
          <tr><td>Profit Margin</td><td class="right ${Number(profitMargin) >= 0 ? 'profit' : 'loss'}">${profitMargin}%</td></tr>
        </table>
        
        <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const chartConfig = {
    income: { label: 'Income', color: 'hsl(var(--chart-2))' },
    expense: { label: 'Expense', color: 'hsl(var(--destructive))' },
    profit: { label: 'Profit', color: 'hsl(var(--primary))' },
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

  // Trend data for charts - use daily for monthly/custom, monthly for yearly
  const trendData = reportType === 'yearly' ? reportData.monthlyData : reportData.dailyData;

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
              <Select value={reportType} onValueChange={(v: 'monthly' | 'yearly' | 'custom') => setReportType(v)}>
                <SelectTrigger className="w-[140px] h-9 bg-background border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
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
            ) : reportType === 'yearly' ? (
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
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">From:</span>
                <DatePicker
                  value={customFromDate}
                  onChange={setCustomFromDate}
                  placeholder="Start date"
                  toDate={customToDate}
                  className="w-[160px] h-9"
                  dateFormat="d MMM yyyy"
                />
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">To:</span>
                <DatePicker
                  value={customToDate}
                  onChange={setCustomToDate}
                  placeholder="End date"
                  fromDate={customFromDate}
                  className="w-[160px] h-9"
                  dateFormat="d MMM yyyy"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Invoice Amount"
          value={formatCurrency(reportData.totalInvoiceAmount)}
          icon={<FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
          iconBgClass="bg-blue-100 dark:bg-blue-900/40"
          valueClass="text-blue-600 dark:text-blue-400"
          subtitle={<ChangeIndicator current={reportData.totalInvoiceAmount} previous={reportData.prevTotalInvoiceAmount} label="vs prev" />}
        />
        <StatCard
          title="Total Expense"
          value={formatCurrency(reportData.totalExpense)}
          icon={<TrendingDown className="h-5 w-5 text-rose-600 dark:text-rose-400" />}
          iconBgClass="bg-rose-100 dark:bg-rose-900/40"
          valueClass="text-rose-600 dark:text-rose-400"
          subtitle={<ChangeIndicator current={reportData.totalExpense} previous={reportData.prevTotalExpense} label="vs prev" />}
        />
        <StatCard
          title="Net Profit/Loss"
          value={formatCurrency(reportData.netProfit)}
          icon={<Wallet className={cn("h-5 w-5", reportData.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")} />}
          iconBgClass={reportData.netProfit >= 0 ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-rose-100 dark:bg-rose-900/40"}
          valueClass={reportData.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
          subtitle={<ChangeIndicator current={reportData.netProfit} previous={reportData.prevNetProfit} label="vs prev" />}
        />
        <StatCard
          title="Profit Margin"
          value={`${profitMargin}%`}
          icon={<Percent className={cn("h-5 w-5", Number(profitMargin) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")} />}
          iconBgClass={Number(profitMargin) >= 0 ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-rose-100 dark:bg-rose-900/40"}
          valueClass={Number(profitMargin) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
        />
      </div>

      {/* Tabs & Content */}
      <Tabs defaultValue="profit-loss" className="space-y-4">
        <TabsList className="print:hidden bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="profit-loss" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2 text-sm font-medium">
            Profit & Loss
          </TabsTrigger>
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

        {/* ========== Profit & Loss Tab ========== */}
        <TabsContent value="profit-loss" className="space-y-4 mt-4">
          {/* P&L Summary Cards - Row 1: Revenue */}
          <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-3">
            <Card className="border-border/50 bg-gradient-to-br from-blue-50/80 to-blue-100/30 dark:from-blue-950/30 dark:to-blue-900/15">
              <CardContent className="p-4 sm:p-5">
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Invoice Amount (মোট বিল)</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(reportData.totalInvoiceAmount)}
                </p>
                <ChangeIndicator current={reportData.totalInvoiceAmount} previous={reportData.prevTotalInvoiceAmount} label="vs prev" />
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-gradient-to-br from-emerald-50/80 to-emerald-100/30 dark:from-emerald-950/30 dark:to-emerald-900/15">
              <CardContent className="p-4 sm:p-5">
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Collection (আদায়)</p>
                <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(reportData.totalCollection)}
                </p>
                <ChangeIndicator current={reportData.totalCollection} previous={reportData.prevTotalCollection} label="vs prev" />
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-gradient-to-br from-amber-50/80 to-amber-100/30 dark:from-amber-950/30 dark:to-amber-900/15">
              <CardContent className="p-4 sm:p-5">
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Due Amount (বাকি)</p>
                <p className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(reportData.totalDue)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* P&L Summary Cards - Row 2: Expenses */}
          <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-3">
            <Card className="border-border/50 bg-gradient-to-br from-rose-50/80 to-rose-100/30 dark:from-rose-950/30 dark:to-rose-900/15">
              <CardContent className="p-4 sm:p-5">
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Vendor Bills</p>
                <p className="text-lg sm:text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(reportData.vendorBillExpense)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-gradient-to-br from-rose-50/80 to-rose-100/30 dark:from-rose-950/30 dark:to-rose-900/15">
              <CardContent className="p-4 sm:p-5">
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Expenses + Salary</p>
                <p className="text-lg sm:text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(reportData.officeExpense + reportData.salaryExpense)}
                </p>
                <div className="flex gap-3 mt-1 text-[10px] sm:text-xs text-muted-foreground">
                  <span>Office: {formatCurrency(reportData.officeExpense)}</span>
                  <span>Salary: {formatCurrency(reportData.salaryExpense)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              "border-border/50 relative overflow-hidden",
              reportData.netProfit >= 0
                ? "bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 dark:from-emerald-950/30 dark:to-emerald-900/20"
                : "bg-gradient-to-br from-rose-50/80 to-rose-100/40 dark:from-rose-950/30 dark:to-rose-900/20"
            )}>
              <CardContent className="p-4 sm:p-5">
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Net Profit / Loss</p>
                <p className={cn(
                  "text-lg sm:text-2xl font-bold",
                  reportData.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}>
                  {formatCurrency(reportData.netProfit)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <ChangeIndicator current={reportData.netProfit} previous={reportData.prevNetProfit} label="vs prev" />
                  <span className={cn(
                    "text-[10px] sm:text-xs font-semibold",
                    Number(profitMargin) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  )}>
                    ({profitMargin}% margin)
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expense Breakdown Pie Chart + P&L Statement Table */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Expense Breakdown Pie Chart */}
            {expenseBreakdownData.length > 0 && (
              <Card className="border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">Expense Breakdown</CardTitle>
                  <CardDescription>Vendor Bills, Office Expenses, Salary</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{
                    vendor: { label: 'Vendor Bills', color: 'hsl(var(--destructive))' },
                    office: { label: 'Office Expenses', color: 'hsl(var(--chart-4))' },
                    salary: { label: 'Salary', color: 'hsl(var(--chart-5))' },
                  }} className="h-[260px] w-full">
                    <PieChart>
                      <Pie
                        data={expenseBreakdownData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {expenseBreakdownData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent formatter={(value: number) => formatCurrency(value)} />} />
                      <Legend />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {/* P&L Statement Table */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">P&L Statement</CardTitle>
                <CardDescription>অ্যাকাউন্টিং ফরম্যাটে আয়-ব্যয় বিবরণী</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    <TableRow interactive={false} className="bg-blue-50/50 dark:bg-blue-950/20">
                      <TableCell className="font-semibold text-blue-700 dark:text-blue-400 text-sm" colSpan={2}>Revenue</TableCell>
                    </TableRow>
                    <TableRow interactive={false}>
                      <TableCell className="pl-8 text-sm">Invoice Amount</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-sm">{formatCurrency(reportData.totalInvoiceAmount)}</TableCell>
                    </TableRow>
                    <TableRow interactive={false}>
                      <TableCell className="pl-8 text-sm">Collection (আদায়)</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(reportData.totalCollection)}</TableCell>
                    </TableRow>
                    <TableRow interactive={false}>
                      <TableCell className="pl-8 text-sm">Due (বাকি)</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-sm text-amber-600 dark:text-amber-400">{formatCurrency(reportData.totalDue)}</TableCell>
                    </TableRow>

                    <TableRow interactive={false} className="bg-rose-50/50 dark:bg-rose-950/20">
                      <TableCell className="font-semibold text-rose-700 dark:text-rose-400 text-sm" colSpan={2}>Expenses</TableCell>
                    </TableRow>
                    <TableRow interactive={false}>
                      <TableCell className="pl-8 text-sm">Vendor Bills</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-sm">{formatCurrency(reportData.vendorBillExpense)}</TableCell>
                    </TableRow>
                    <TableRow interactive={false}>
                      <TableCell className="pl-8 text-sm">Office Expenses</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-sm">{formatCurrency(reportData.officeExpense)}</TableCell>
                    </TableRow>
                    <TableRow interactive={false}>
                      <TableCell className="pl-8 text-sm">Salary</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-sm">{formatCurrency(reportData.salaryExpense)}</TableCell>
                    </TableRow>
                    <TableRow interactive={false} className="border-t-2 border-border">
                      <TableCell className="pl-8 font-semibold text-sm">Total Expense</TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-sm text-rose-600 dark:text-rose-400">{formatCurrency(reportData.totalExpense)}</TableCell>
                    </TableRow>

                    <TableRow interactive={false} className={cn(
                      "border-t-2 border-border",
                      reportData.netProfit >= 0 ? "bg-emerald-50/50 dark:bg-emerald-950/20" : "bg-rose-50/50 dark:bg-rose-950/20"
                    )}>
                      <TableCell className="font-bold text-base">Net Profit / Loss</TableCell>
                      <TableCell className={cn(
                        "text-right font-bold tabular-nums text-base",
                        reportData.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      )}>
                        {formatCurrency(reportData.netProfit)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* P&L Trend Chart */}
          {trendData.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg font-semibold">Income vs Expense Trend</CardTitle>
                    <CardDescription>
                      {reportType === 'yearly' ? `Monthly breakdown for ${selectedYear}` : 
                       reportType === 'monthly' ? `Daily breakdown for ${format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}` :
                       'Period breakdown'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey={reportType === 'yearly' ? 'month' : 'date'} className="text-xs" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={formatChartCurrency} className="text-xs" />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value: number) => formatCurrency(value)}
                        />
                      }
                    />
                    <Area type="monotone" dataKey="income" stroke="hsl(var(--chart-2))" fill="url(#incomeGrad)" strokeWidth={2} name="Income" />
                    <Area type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" fill="url(#expenseGrad)" strokeWidth={2} name="Expense" />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========== Invoices Tab ========== */}
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

        {/* ========== Overview Tab ========== */}
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

          {/* Income/Expense Trend Chart — shown for ALL report types */}
          {trendData.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg font-semibold">
                      {reportType === 'yearly' ? 'Monthly Income-Expense Trend' : 'Daily Income-Expense Trend'}
                    </CardTitle>
                    <CardDescription>
                      {reportType === 'yearly' ? `Monthly analysis for ${selectedYear}` :
                       reportType === 'monthly' ? `Daily analysis for ${format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}` :
                       'Period analysis'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  {reportType === 'yearly' ? (
                    <BarChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                  ) : (
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="incomeGrad2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expenseGrad2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={formatChartCurrency} className="text-xs" />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value: number) => formatCurrency(value)}
                          />
                        }
                      />
                      <Area type="monotone" dataKey="income" stroke="hsl(var(--chart-2))" fill="url(#incomeGrad2)" strokeWidth={2} name="Income" />
                      <Area type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" fill="url(#expenseGrad2)" strokeWidth={2} name="Expense" />
                    </AreaChart>
                  )}
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========== Expenses Tab ========== */}
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

        {/* ========== Customers Tab ========== */}
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
