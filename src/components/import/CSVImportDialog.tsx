import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, FileText, AlertCircle, CheckCircle, Download, Loader2, AlertTriangle } from 'lucide-react';
import { parseCSV, parseXLSX, downloadTemplate, ImportResult, ValidationRule } from '@/lib/importUtils';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  requiredFields: string[];
  fieldMapping: Record<string, string>;
  onImport: (data: Record<string, string>[], onProgress?: (current: number, total: number) => void) => Promise<ImportResult>;
  templateFilename: string;
  validationRules?: ValidationRule[];
}

const ACCEPTED_FILE_TYPES = ['.csv', '.xlsx', '.xls'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const CSVImportDialog = ({
  open,
  onOpenChange,
  title,
  description,
  requiredFields,
  fieldMapping,
  onImport,
  templateFilename,
  validationRules,
}: CSVImportDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [fileName, setFileName] = useState<string>('');

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 10MB limit';
    }
    
    // Check file type
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_FILE_TYPES.includes(extension)) {
      return 'Only CSV and Excel files (.csv, .xlsx, .xls) are accepted';
    }
    
    return null;
  };

  const processFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setFileName(file.name);
    setParseErrors([]);
    setParseWarnings([]);
    setImportResult(null);
    
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let result: { data: Record<string, string>[]; errors: string[] };
      
      if (extension === 'xlsx' || extension === 'xls') {
        result = await parseXLSX(file, requiredFields, validationRules);
      } else {
        const text = await file.text();
        result = parseCSV(text, requiredFields, validationRules);
      }
      
      // Separate errors and warnings
      const errors = result.errors.filter(e => !e.toLowerCase().includes('warning'));
      const warnings = result.errors.filter(e => e.toLowerCase().includes('warning'));
      
      setParsedData(result.data);
      setParseErrors(errors);
      setParseWarnings(warnings);
      
      if (result.data.length === 0 && errors.length === 0) {
        setParseErrors(['No valid data found in the file']);
      }
    } catch (error) {
      console.error('File processing error:', error);
      toast.error('Failed to process file');
      setParseErrors(['Failed to read file. Please check the file format.']);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error('No data to import');
      return;
    }

    // Confirm if there are warnings
    if (parseWarnings.length > 0) {
      const proceed = confirm(`There are ${parseWarnings.length} warnings. Do you want to continue with the import?`);
      if (!proceed) return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: parsedData.length });
    
    try {
      const result = await onImport(parsedData, (current, total) => {
        setImportProgress({ current, total });
      });
      setImportResult(result);
      
      if (result.success > 0) {
        toast.success(`${result.success} record(s) imported successfully`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} record(s) failed to import`);
      }
      if (result.duplicates && result.duplicates > 0) {
        toast.warning(`${result.duplicates} duplicate(s) skipped`);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed unexpectedly');
    } finally {
      setImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  const handleClose = () => {
    setParsedData([]);
    setParseErrors([]);
    setParseWarnings([]);
    setImportResult(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  const handleDownloadTemplate = () => {
    downloadTemplate(templateFilename, fieldMapping);
    toast.success('Template downloading');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">CSV Template</p>
                <p className="text-xs text-muted-foreground">
                  Download template first, fill in the data, then upload
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
          </div>

          {/* File Upload with Drag & Drop */}
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              isDragging 
                ? 'border-primary bg-primary/10' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-file-input"
            />
            <Upload className={`h-8 w-8 mx-auto mb-2 transition-colors ${
              isDragging ? 'text-primary' : 'text-muted-foreground'
            }`} />
            {fileName ? (
              <p className="text-sm font-medium text-foreground mb-2">{fileName}</p>
            ) : (
              <p className="text-sm text-muted-foreground mb-2">
                {isDragging ? 'Drop your file here' : 'Drag & drop CSV/Excel file here, or click to select'}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Supports: CSV, XLSX • Max size: 10MB
            </p>
          </div>

          {/* Parse Warnings */}
          {parseWarnings.length > 0 && (
            <div className="p-4 border border-warning/50 rounded-lg bg-warning/10">
              <div className="flex items-center gap-2 text-warning mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Warnings ({parseWarnings.length}):</span>
              </div>
              <ul className="text-sm text-warning space-y-1 max-h-20 overflow-auto">
                {parseWarnings.slice(0, 3).map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
                {parseWarnings.length > 3 && (
                  <li>...and {parseWarnings.length - 3} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Parse Errors */}
          {parseErrors.length > 0 && (
            <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Errors ({parseErrors.length}):</span>
              </div>
              <ul className="text-sm text-destructive space-y-1 max-h-32 overflow-auto">
                {parseErrors.slice(0, 5).map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
                {parseErrors.length > 5 && (
                  <li>...and {parseErrors.length - 5} more issues</li>
                )}
              </ul>
            </div>
          )}

          {/* Import Progress */}
          {importing && importProgress.total > 0 && (
            <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">Importing...</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {importProgress.current} / {importProgress.total} ({Math.round((importProgress.current / importProgress.total) * 100)}%)
                </span>
              </div>
              <Progress value={(importProgress.current / importProgress.total) * 100} className="h-2" />
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="font-medium mb-2">Import Complete</p>
              <div className="flex items-center gap-4 flex-wrap">
                {importResult.success > 0 && (
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-4 w-4" />
                    <span>{importResult.success} successful</span>
                  </div>
                )}
                {importResult.duplicates && importResult.duplicates > 0 && (
                  <div className="flex items-center gap-2 text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{importResult.duplicates} duplicates skipped</span>
                  </div>
                )}
                {importResult.failed > 0 && (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{importResult.failed} failed</span>
                  </div>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <ScrollArea className="h-24 mt-2">
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {importResult.errors.slice(0, 10).map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li>...and {importResult.errors.length - 10} more issues</li>
                    )}
                  </ul>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Preview Table */}
          {parsedData.length > 0 && !importResult && (
            <div className="space-y-2 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Preview ({parsedData.length} records)
                </p>
                {parseErrors.length === 0 && (
                  <span className="text-xs text-success flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Ready to import
                  </span>
                )}
              </div>
              <ScrollArea className="flex-1 border rounded-lg min-h-[150px] max-h-[200px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      {Object.keys(fieldMapping).map((key) => (
                        <TableHead key={key}>{fieldMapping[key]}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                        {Object.keys(fieldMapping).map((key) => (
                          <TableCell key={key} className="truncate max-w-[150px]">
                            {row[key.toLowerCase()] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              {parsedData.length > 10 && (
                <p className="text-xs text-muted-foreground text-center">
                  ...and {parsedData.length - 10} more records
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose}>
            {importResult ? 'Close' : 'Cancel'}
          </Button>
          {parsedData.length > 0 && !importResult && parseErrors.length === 0 && (
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${parsedData.length} Record${parsedData.length > 1 ? 's' : ''}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CSVImportDialog;
