// CSV Import Utility Functions

export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export const parseCSV = <T extends Record<string, string>>(
  csvText: string,
  requiredFields: string[]
): { data: T[]; errors: string[] } => {
  const lines = csvText.trim().split('\n');
  const errors: string[] = [];
  
  if (lines.length < 2) {
    return { data: [], errors: ['CSV ফাইলে পর্যাপ্ত ডেটা নেই'] };
  }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
  
  // Validate required fields
  const missingFields = requiredFields.filter(field => !header.includes(field.toLowerCase()));
  if (missingFields.length > 0) {
    return { 
      data: [], 
      errors: [`প্রয়োজনীয় কলাম অনুপস্থিত: ${missingFields.join(', ')}`] 
    };
  }

  const data: T[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle CSV with quoted values
    const values = parseCSVLine(line);
    
    if (values.length !== header.length) {
      errors.push(`সারি ${i + 1}: কলাম সংখ্যা মেলেনি`);
      continue;
    }

    const row: Record<string, string> = {};
    header.forEach((h, index) => {
      row[h] = values[index]?.trim() || '';
    });
    
    data.push(row as T);
  }

  return { data, errors };
};

// Parse a single CSV line handling quoted values
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
};

export const generateCSVTemplate = (headers: Record<string, string>): string => {
  const keys = Object.keys(headers);
  const headerRow = keys.join(',');
  const exampleRow = keys.map(k => `"উদাহরণ ${headers[k]}"`).join(',');
  return `${headerRow}\n${exampleRow}`;
};

export const downloadTemplate = (filename: string, headers: Record<string, string>) => {
  const content = generateCSVTemplate(headers);
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_template.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};
