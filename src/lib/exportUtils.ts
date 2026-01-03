import { format } from 'date-fns';

export const exportToCSV = (data: Record<string, unknown>[], filename: string, headers: Record<string, string>) => {
  if (data.length === 0) {
    return;
  }

  const headerKeys = Object.keys(headers);
  const headerLabels = Object.values(headers);

  // Create CSV content
  const csvRows: string[] = [];
  
  // Add header row
  csvRows.push(headerLabels.map(h => `"${h}"`).join(','));
  
  // Add data rows
  data.forEach(row => {
    const values = headerKeys.map(key => {
      const value = row[key];
      if (value === null || value === undefined) {
        return '""';
      }
      // Escape quotes and wrap in quotes
      return `"${String(value).replace(/"/g, '""')}"`;
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

export const exportToExcel = (data: Record<string, unknown>[], filename: string, headers: Record<string, string>) => {
  if (data.length === 0) {
    return;
  }

  const headerKeys = Object.keys(headers);
  const headerLabels = Object.values(headers);

  // Create HTML table for Excel
  let tableHtml = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table border="1">';
  
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
      const value = row[key];
      const displayValue = value === null || value === undefined ? '' : String(value);
      tableHtml += `<td style="padding:6px;">${escapeHtml(displayValue)}</td>`;
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

const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
