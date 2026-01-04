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
import { Upload, FileText, AlertCircle, CheckCircle, Download, Loader2 } from 'lucide-react';
import { parseCSV, downloadTemplate, ImportResult } from '@/lib/importUtils';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  requiredFields: string[];
  fieldMapping: Record<string, string>;
  onImport: (data: Record<string, string>[], onProgress?: (current: number, total: number) => void) => Promise<ImportResult>;
  templateFilename: string;
}

const CSVImportDialog = ({
  open,
  onOpenChange,
  title,
  description,
  requiredFields,
  fieldMapping,
  onImport,
  templateFilename,
}: CSVImportDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Only CSV files are accepted');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { data, errors } = parseCSV(text, requiredFields);
      setParsedData(data);
      setParseErrors(errors);
      setImportResult(null);
    };
    reader.readAsText(file);
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

    setImporting(true);
    setImportProgress({ current: 0, total: parsedData.length });
    
    try {
      const result = await onImport(parsedData, (current, total) => {
        setImportProgress({ current, total });
      });
      setImportResult(result);
      
      if (result.success > 0) {
        toast.success(`${result.success} imported successfully`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} failed to import`);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed');
    } finally {
      setImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  const handleClose = () => {
    setParsedData([]);
    setParseErrors([]);
    setImportResult(null);
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
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">CSV Template</p>
                <p className="text-xs text-muted-foreground">
                  Download template first and fill in the data
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
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-file-input"
            />
            <Upload className={`h-8 w-8 mx-auto mb-2 transition-colors ${
              isDragging ? 'text-primary' : 'text-muted-foreground'
            }`} />
            <p className="text-sm text-muted-foreground mb-2">
              {isDragging ? 'Drop your CSV file here' : 'Drag & drop CSV file here, or click to select'}
            </p>
            <Button 
              type="button"
              variant="outline" 
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Select File
            </Button>
          </div>

          {/* Parse Errors */}
          {parseErrors.length > 0 && (
            <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Issues found:</span>
              </div>
              <ul className="text-sm text-destructive space-y-1">
                {parseErrors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
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
              <div className="flex items-center gap-4">
                {importResult.success > 0 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>{importResult.success} successful</span>
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
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  {importResult.errors.slice(0, 5).map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                  {importResult.errors.length > 5 && (
                    <li>...and {importResult.errors.length - 5} more issues</li>
                  )}
                </ul>
              )}
            </div>
          )}

          {/* Preview Table */}
          {parsedData.length > 0 && !importResult && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Preview ({parsedData.length} records)
              </p>
              <ScrollArea className="h-[200px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(fieldMapping).map((key) => (
                        <TableHead key={key}>{fieldMapping[key]}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((row, i) => (
                      <TableRow key={i}>
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

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          {parsedData.length > 0 && !importResult && (
            <Button onClick={handleImport} disabled={importing}>
              {importing ? 'Importing...' : `Import ${parsedData.length}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CSVImportDialog;
