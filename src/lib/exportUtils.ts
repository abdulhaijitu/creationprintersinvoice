import { format } from 'date-fns';

// Status labels for human-readable export
export const STATUS_LABELS: Record<string, string> = {
  paid: 'Paid',
  unpaid: 'Due',
  partial: 'Partial',
  overdue: 'Overdue',
  due: 'Due',
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  active: 'Active',
  inactive: 'Inactive',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Format value for export (handles dates, numbers, status)
export const formatExportValue = (value: unknown, key?: string): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  // Handle status fields
  if (key?.includes('status') && typeof value === 'string') {
    return STATUS_LABELS[value.toLowerCase()] || value;
  }
  
  // Handle dates
  if (value instanceof Date) {
    return format(value, 'dd/MM/yyyy');
  }
  
  // Handle date strings
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    try {
      return format(new Date(value), 'dd/MM/yyyy');
    } catch {
      return value;
    }
  }
  
  // Handle numbers (format with proper decimal places)
  if (typeof value === 'number') {
    if (key?.includes('amount') || key?.includes('total') || key?.includes('price') || key?.includes('paid') || key?.includes('due')) {
      return value.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return String(value);
  }
  
  return String(value);
};

// Escape HTML for Excel export
const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Escape CSV value (handle quotes, newlines)
const escapeCSVValue = (value: string): string => {
  // If contains comma, newline, or quote, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return `"${value}"`;
};

export interface ExportOptions {
  filename: string;
  headers: Record<string, string>;
  formatters?: Record<string, (value: unknown) => string>;
  dateFormat?: string;
}

export const exportToCSV = (
  data: Record<string, unknown>[], 
  filename: string, 
  headers: Record<string, string>,
  formatters?: Record<string, (value: unknown) => string>
) => {
  if (data.length === 0) {
    return;
  }

  const headerKeys = Object.keys(headers);
  const headerLabels = Object.values(headers);

  // Create CSV content
  const csvRows: string[] = [];
  
  // Add header row
  csvRows.push(headerLabels.map(h => escapeCSVValue(h)).join(','));
  
  // Add data rows
  data.forEach(row => {
    const values = headerKeys.map(key => {
      const rawValue = row[key];
      let displayValue: string;
      
      // Use custom formatter if provided
      if (formatters?.[key]) {
        displayValue = formatters[key](rawValue);
      } else {
        displayValue = formatExportValue(rawValue, key);
      }
      
      return escapeCSVValue(displayValue);
    });
    csvRows.push(values.join(','));
  });

  const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM for Excel UTF-8 support
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToExcel = (
  data: Record<string, unknown>[], 
  filename: string, 
  headers: Record<string, string>,
  formatters?: Record<string, (value: unknown) => string>
) => {
  if (data.length === 0) {
    return;
  }

  const headerKeys = Object.keys(headers);
  const headerLabels = Object.values(headers);

  // Create HTML table for Excel
  let tableHtml = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<!--[if gte mso 9]>
<xml>
<x:ExcelWorkbook>
<x:ExcelWorksheets>
<x:ExcelWorksheet>
<x:Name>Sheet1</x:Name>
<x:WorksheetOptions>
<x:DisplayGridlines/>
</x:WorksheetOptions>
</x:ExcelWorksheet>
</x:ExcelWorksheets>
</x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  td, th { mso-number-format: "\\@"; white-space: nowrap; }
  .number { mso-number-format: "#,##0.00"; text-align: right; }
</style>
</head>
<body>
<table border="1">`;
  
  // Add header row
  tableHtml += '<tr>';
  headerLabels.forEach(h => {
    tableHtml += `<th style="background-color:#4472C4;color:white;font-weight:bold;padding:8px;">${escapeHtml(h)}</th>`;
  });
  tableHtml += '</tr>';
  
  // Add data rows
  data.forEach((row, index) => {
    const bgColor = index % 2 === 0 ? '#ffffff' : '#f2f2f2';
    tableHtml += `<tr style="background-color:${bgColor}">`;
    headerKeys.forEach(key => {
      const rawValue = row[key];
      let displayValue: string;
      
      // Use custom formatter if provided
      if (formatters?.[key]) {
        displayValue = formatters[key](rawValue);
      } else {
        displayValue = formatExportValue(rawValue, key);
      }
      
      // Add number class for amount/total columns
      const isNumber = key.includes('amount') || key.includes('total') || key.includes('price') || key.includes('paid') || key.includes('due');
      const cellClass = isNumber ? ' class="number"' : '';
      
      tableHtml += `<td style="padding:6px;"${cellClass}>${escapeHtml(displayValue)}</td>`;
    });
    tableHtml += '</tr>';
  });
  
  tableHtml += '</table></body></html>';

  // Create and download file
  const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export large datasets in chunks (for performance)
export const exportLargeDataset = async (
  fetchData: (offset: number, limit: number) => Promise<Record<string, unknown>[]>,
  filename: string,
  headers: Record<string, string>,
  format: 'csv' | 'excel',
  onProgress?: (current: number, total: number) => void,
  chunkSize = 500
): Promise<void> => {
  const allData: Record<string, unknown>[] = [];
  let offset = 0;
  let hasMore = true;
  
  // Fetch all data in chunks
  while (hasMore) {
    const chunk = await fetchData(offset, chunkSize);
    allData.push(...chunk);
    offset += chunkSize;
    hasMore = chunk.length === chunkSize;
    onProgress?.(allData.length, -1);
  }
  
  // Export using appropriate method
  if (format === 'csv') {
    exportToCSV(allData, filename, headers);
  } else {
    exportToExcel(allData, filename, headers);
  }
};
