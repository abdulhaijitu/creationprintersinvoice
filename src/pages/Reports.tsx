import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  LineChart,
  Line,
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
  Users,
  ShoppingCart,
  Calendar,
  Printer,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { bn } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

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
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--info))',
  'hsl(217, 91%, 60%)',
  'hsl(280, 87%, 65%)',
  'hsl(340, 82%, 52%)',
];

const Reports = () => {
  const { isAdmin, role, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));
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
  });

  const months = [];
  for (let i = 0; i < 12; i++) {
    const date = subMonths(new Date(), i);
    months.push({
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: bn }),
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

  useEffect(() => {
    if (hasPermission(role, 'reports', 'view')) {
      fetchReportData();
    }
  }, [reportType, selectedMonth, selectedYear, role]);

  // Access control check
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasPermission(role, 'reports', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">অ্যাক্সেস নেই</h2>
        <p className="text-muted-foreground">এই পেজ দেখার অনুমতি আপনার নেই।</p>
      </div>
    );
  }

  const fetchReportData = async () => {
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
        categoriesRes,
      ] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, customers(name)')
          .gte('invoice_date', startDateStr)
          .lte('invoice_date', endDateStr),
        supabase
          .from('expenses')
          .select('*, expense_categories(name)')
          .gte('date', startDateStr)
          .lte('date', endDateStr),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('vendor_bills').select('amount, status').neq('status', 'paid'),
        supabase.from('expense_categories').select('*'),
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
            month: format(monthDate, 'MMM', { locale: bn }),
            income: monthIncome,
            expense: monthExpense,
          });
        }
      }

      // Category-wise expenses
      const categoryMap = new Map<string, number>();
      expenses.forEach((exp) => {
        const categoryName = (exp.expense_categories as any)?.name || 'অন্যান্য';
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
        const customerName = (inv.customers as any)?.name || 'অজানা';
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
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: 'ত্রুটি',
        description: 'রিপোর্ট ডেটা লোড করতে সমস্যা হয়েছে',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('bn-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
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
    // Generate printable content
    const printContent = document.getElementById('report-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'ত্রুটি',
        description: 'PDF তৈরি করতে সমস্যা হয়েছে। Pop-up blocker বন্ধ করুন।',
        variant: 'destructive',
      });
      return;
    }

    const title = reportType === 'monthly' 
      ? `মাসিক রিপোর্ট - ${format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: bn })}`
      : `বার্ষিক রিপোর্ট - ${selectedYear}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: 'Noto Sans Bengali', Arial, sans-serif;
            padding: 40px;
            max-width: 1200px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            color: #333;
          }
          .header p {
            color: #666;
            margin-top: 10px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }
          .summary-card {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
          }
          .summary-card h3 {
            margin: 0;
            font-size: 14px;
            color: #666;
          }
          .summary-card p {
            margin: 10px 0 0;
            font-size: 24px;
            font-weight: bold;
          }
          .section {
            margin-bottom: 30px;
          }
          .section h2 {
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background: #f5f5f5;
          }
          .profit { color: green; }
          .loss { color: red; }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <p>তৈরির তারিখ: ${format(new Date(), 'd MMMM yyyy', { locale: bn })}</p>
        </div>
        
        <div class="summary-grid">
          <div class="summary-card">
            <h3>মোট আয়</h3>
            <p class="profit">${formatCurrency(reportData.totalIncome)}</p>
          </div>
          <div class="summary-card">
            <h3>মোট ব্যয়</h3>
            <p class="loss">${formatCurrency(reportData.totalExpense)}</p>
          </div>
          <div class="summary-card">
            <h3>নিট লাভ/ক্ষতি</h3>
            <p class="${reportData.netProfit >= 0 ? 'profit' : 'loss'}">${formatCurrency(reportData.netProfit)}</p>
          </div>
          <div class="summary-card">
            <h3>ইনভয়েস সংখ্যা</h3>
            <p>${reportData.invoiceCount}</p>
          </div>
        </div>

        <div class="section">
          <h2>ইনভয়েস সারাংশ</h2>
          <table>
            <tr>
              <th>বিবরণ</th>
              <th>সংখ্যা</th>
            </tr>
            <tr>
              <td>মোট ইনভয়েস</td>
              <td>${reportData.invoiceCount}</td>
            </tr>
            <tr>
              <td>পরিশোধিত</td>
              <td>${reportData.paidInvoices}</td>
            </tr>
            <tr>
              <td>বাকি/আংশিক</td>
              <td>${reportData.unpaidInvoices}</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <h2>ক্যাটেগরি অনুযায়ী খরচ</h2>
          <table>
            <tr>
              <th>ক্যাটেগরি</th>
              <th>পরিমাণ</th>
            </tr>
            ${reportData.categoryExpenses.map(cat => `
              <tr>
                <td>${cat.name}</td>
                <td>${formatCurrency(cat.value)}</td>
              </tr>
            `).join('')}
          </table>
        </div>

        <div class="section">
          <h2>শীর্ষ গ্রাহক</h2>
          <table>
            <tr>
              <th>গ্রাহক</th>
              <th>মোট অর্ডার</th>
            </tr>
            ${reportData.topCustomers.map(cust => `
              <tr>
                <td>${cust.name}</td>
                <td>${formatCurrency(cust.total)}</td>
              </tr>
            `).join('')}
          </table>
        </div>

        <div class="footer">
          <p>এই রিপোর্টটি স্বয়ংক্রিয়ভাবে তৈরি করা হয়েছে</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            }
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const chartConfig = {
    income: {
      label: 'আয়',
      color: 'hsl(var(--success))',
    },
    expense: {
      label: 'ব্যয়',
      color: 'hsl(var(--destructive))',
    },
  };

  // Show access denied message for non-admin users
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">রিপোর্ট</h1>
          <p className="text-muted-foreground mt-1">
            আর্থিক বিশ্লেষণ ও রিপোর্ট জেনারেশন
          </p>
        </div>
        
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center py-10 space-y-4">
              <div className="p-4 rounded-full bg-destructive/10">
                <ShieldAlert className="h-12 w-12 text-destructive" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">অ্যাক্সেস নেই</h2>
                <p className="text-muted-foreground max-w-md">
                  শুধুমাত্র অ্যাডমিন ব্যবহারকারীরা রিপোর্ট দেখতে পারেন। 
                  আপনার অ্যাডমিন অ্যাক্সেস প্রয়োজন হলে আপনার সিস্টেম অ্যাডমিনের সাথে যোগাযোগ করুন।
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" id="report-content">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">রিপোর্ট</h1>
          <p className="text-muted-foreground">আর্থিক বিশ্লেষণ ও রিপোর্ট জেনারেশন</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="print:hidden">
            <Printer className="w-4 h-4 mr-2" />
            প্রিন্ট
          </Button>
          <Button onClick={handleExportPDF} className="print:hidden">
            <Download className="w-4 h-4 mr-2" />
            PDF ডাউনলোড
          </Button>
        </div>
      </div>

      {/* Report Type Selection */}
      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">রিপোর্ট টাইপ:</label>
              <Select value={reportType} onValueChange={(v: 'monthly' | 'yearly') => setReportType(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">মাসিক</SelectItem>
                  <SelectItem value="yearly">বার্ষিক</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === 'monthly' ? (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">মাস:</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-48">
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
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">বছর:</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-32">
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-success/10">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">মোট আয়</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(reportData.totalIncome)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">মোট ব্যয়</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(reportData.totalExpense)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${reportData.netProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                <Wallet className={`h-6 w-6 ${reportData.netProfit >= 0 ? 'text-success' : 'text-destructive'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">নিট লাভ/ক্ষতি</p>
                <p className={`text-2xl font-bold ${reportData.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(reportData.netProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">মোট ইনভয়েস</p>
                <p className="text-2xl font-bold">{reportData.invoiceCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analysis */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="print:hidden">
          <TabsTrigger value="overview">সারসংক্ষেপ</TabsTrigger>
          <TabsTrigger value="expenses">খরচ বিশ্লেষণ</TabsTrigger>
          <TabsTrigger value="customers">গ্রাহক বিশ্লেষণ</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Invoice Status */}
            <Card>
              <CardHeader>
                <CardTitle>ইনভয়েস স্ট্যাটাস</CardTitle>
                <CardDescription>পেমেন্ট অবস্থা</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-success/10">
                    <span className="font-medium">পরিশোধিত</span>
                    <Badge className="bg-success text-success-foreground">{reportData.paidInvoices}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-destructive/10">
                    <span className="font-medium">বাকি/আংশিক</span>
                    <Badge className="bg-destructive text-destructive-foreground">{reportData.unpaidInvoices}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-warning/10">
                    <span className="font-medium">ভেন্ডর ডিউ</span>
                    <span className="font-bold text-warning">{formatCurrency(reportData.vendorDue)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profit Margin */}
            <Card>
              <CardHeader>
                <CardTitle>লাভের মার্জিন</CardTitle>
                <CardDescription>আয় ও ব্যয়ের অনুপাত</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <span className="text-sm font-semibold">আয়</span>
                      <span className="text-sm font-semibold text-success">
                        {reportData.totalIncome + reportData.totalExpense > 0
                          ? Math.round((reportData.totalIncome / (reportData.totalIncome + reportData.totalExpense)) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="overflow-hidden h-3 text-xs flex rounded-full bg-muted">
                      <div
                        style={{
                          width: `${
                            reportData.totalIncome + reportData.totalExpense > 0
                              ? (reportData.totalIncome / (reportData.totalIncome + reportData.totalExpense)) * 100
                              : 0
                          }%`,
                        }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-success rounded-full"
                      />
                    </div>
                  </div>
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <span className="text-sm font-semibold">ব্যয়</span>
                      <span className="text-sm font-semibold text-destructive">
                        {reportData.totalIncome + reportData.totalExpense > 0
                          ? Math.round((reportData.totalExpense / (reportData.totalIncome + reportData.totalExpense)) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="overflow-hidden h-3 text-xs flex rounded-full bg-muted">
                      <div
                        style={{
                          width: `${
                            reportData.totalIncome + reportData.totalExpense > 0
                              ? (reportData.totalExpense / (reportData.totalIncome + reportData.totalExpense)) * 100
                              : 0
                          }%`,
                        }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-destructive rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trend for Yearly Report */}
          {reportType === 'yearly' && reportData.monthlyData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>মাসভিত্তিক আয়-ব্যয় ট্রেন্ড</CardTitle>
                <CardDescription>{selectedYear} সালের মাসিক বিশ্লেষণ</CardDescription>
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
                    <Bar dataKey="income" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="আয়" />
                    <Bar dataKey="expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="ব্যয়" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Category Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>ক্যাটেগরি অনুযায়ী খরচ</CardTitle>
                <CardDescription>খরচের বিভাজন</CardDescription>
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
                  <p className="text-center text-muted-foreground py-8">কোনো খরচের ডেটা নেই</p>
                )}
              </CardContent>
            </Card>

            {/* Category List */}
            <Card>
              <CardHeader>
                <CardTitle>খরচের তালিকা</CardTitle>
                <CardDescription>ক্যাটেগরি অনুযায়ী বিস্তারিত</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.categoryExpenses.length > 0 ? (
                    reportData.categoryExpenses.map((category, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <span className="font-bold">{formatCurrency(category.value)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">কোনো খরচ নেই</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>শীর্ষ গ্রাহক</CardTitle>
              <CardDescription>সর্বাধিক অর্ডারকারী গ্রাহক</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.topCustomers.length > 0 ? (
                  reportData.topCustomers.map((customer, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-bold text-primary">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">গ্রাহক</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(customer.total)}</p>
                        <p className="text-sm text-muted-foreground">মোট অর্ডার</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">কোনো গ্রাহক ডেটা নেই</p>
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