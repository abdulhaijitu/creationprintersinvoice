import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Loader2, FileDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const EXPORT_MODULES = [
  { key: 'customers', label: 'Customers', table: 'customers' },
  { key: 'invoices', label: 'Invoices', table: 'invoices' },
  { key: 'invoice_items', label: 'Invoice Items', table: 'invoice_items' },
  { key: 'invoice_payments', label: 'Payments', table: 'invoice_payments' },
  { key: 'quotations', label: 'Quotations', table: 'quotations' },
  { key: 'expenses', label: 'Expenses', table: 'expenses' },
  { key: 'employees', label: 'Employees', table: 'employees' },
  { key: 'employee_attendance', label: 'Attendance', table: 'employee_attendance' },
  { key: 'employee_salary_records', label: 'Salary Records', table: 'employee_salary_records' },
  { key: 'tasks', label: 'Tasks', table: 'tasks' },
  { key: 'vendors', label: 'Vendors', table: 'vendors' },
  { key: 'vendor_bills', label: 'Vendor Bills', table: 'vendor_bills' },
] as const;

type ExportFormat = 'csv' | 'xlsx';

export function DataExportSection() {
  const { organization } = useOrganization();
  const [selectedModules, setSelectedModules] = useState<string[]>(EXPORT_MODULES.map(m => m.key));
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('xlsx');

  const toggleModule = (key: string) => {
    setSelectedModules(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleAll = () => {
    if (selectedModules.length === EXPORT_MODULES.length) {
      setSelectedModules([]);
    } else {
      setSelectedModules(EXPORT_MODULES.map(m => m.key));
    }
  };

  const handleExport = async () => {
    if (!organization?.id || selectedModules.length === 0) return;

    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      let hasData = false;

      for (const mod of EXPORT_MODULES) {
        if (!selectedModules.includes(mod.key)) continue;

        const { data, error } = await supabase
          .from(mod.table)
          .select('*')
          .eq('organization_id', organization.id)
          .limit(10000);

        if (error) {
          console.warn(`Error exporting ${mod.label}:`, error.message);
          continue;
        }

        if (data && data.length > 0) {
          hasData = true;
          if (format === 'csv') {
            // Download as individual CSV
            const ws = XLSX.utils.json_to_sheet(data);
            const csv = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${mod.key}_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          } else {
            // Add as sheet in XLSX workbook
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, mod.label.substring(0, 31));
          }
        }
      }

      if (format === 'xlsx' && hasData) {
        XLSX.writeFile(wb, `organization_data_${new Date().toISOString().split('T')[0]}.xlsx`);
      }

      if (!hasData) {
        toast.info('No data found to export');
      } else {
        toast.success(`Data exported successfully (${format.toUpperCase()})`);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileDown className="h-4 w-4" />
          Data Export
        </CardTitle>
        <CardDescription>
          Export your organization's data as Excel or CSV files
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Format selection */}
        <div className="flex gap-2">
          <Button
            variant={format === 'xlsx' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFormat('xlsx')}
          >
            Excel (.xlsx)
          </Button>
          <Button
            variant={format === 'csv' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFormat('csv')}
          >
            CSV
          </Button>
        </div>

        {/* Module selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Select modules to export</span>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={toggleAll}>
              {selectedModules.length === EXPORT_MODULES.length ? 'Deselect all' : 'Select all'}
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {EXPORT_MODULES.map((mod) => (
              <label
                key={mod.key}
                className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedModules.includes(mod.key)}
                  onCheckedChange={() => toggleModule(mod.key)}
                />
                <span className="text-sm">{mod.label}</span>
              </label>
            ))}
          </div>
        </div>

        <Button
          onClick={handleExport}
          disabled={exporting || selectedModules.length === 0}
          className="w-full sm:w-auto"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {exporting ? 'Exporting...' : `Export ${selectedModules.length} module(s)`}
        </Button>
      </CardContent>
    </Card>
  );
}
