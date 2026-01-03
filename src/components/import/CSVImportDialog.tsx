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
import { toast } from 'sonner';
import { Upload, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { parseCSV, downloadTemplate, ImportResult } from '@/lib/importUtils';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  requiredFields: string[];
  fieldMapping: Record<string, string>;
  onImport: (data: Record<string, string>[]) => Promise<ImportResult>;
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('শুধুমাত্র CSV ফাইল গ্রহণযোগ্য');
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

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error('ইম্পোর্ট করার মতো ডেটা নেই');
      return;
    }

    setImporting(true);
    try {
      const result = await onImport(parsedData);
      setImportResult(result);
      
      if (result.success > 0) {
        toast.success(`${result.success}টি সফলভাবে ইম্পোর্ট হয়েছে`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed}টি ইম্পোর্ট ব্যর্থ হয়েছে`);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('ইম্পোর্ট করতে সমস্যা হয়েছে');
    } finally {
      setImporting(false);
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
    toast.success('টেমপ্লেট ডাউনলোড হচ্ছে');
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
                <p className="font-medium text-sm">CSV টেমপ্লেট</p>
                <p className="text-xs text-muted-foreground">
                  প্রথমে টেমপ্লেট ডাউনলোড করে ডেটা পূরণ করুন
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              টেমপ্লেট
            </Button>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              CSV ফাইল আপলোড করুন
            </p>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              ফাইল নির্বাচন করুন
            </Button>
          </div>

          {/* Parse Errors */}
          {parseErrors.length > 0 && (
            <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">সমস্যা পাওয়া গেছে:</span>
              </div>
              <ul className="text-sm text-destructive space-y-1">
                {parseErrors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-4">
                {importResult.success > 0 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>{importResult.success}টি সফল</span>
                  </div>
                )}
                {importResult.failed > 0 && (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{importResult.failed}টি ব্যর্থ</span>
                  </div>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  {importResult.errors.slice(0, 5).map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                  {importResult.errors.length > 5 && (
                    <li>...এবং আরো {importResult.errors.length - 5}টি সমস্যা</li>
                  )}
                </ul>
              )}
            </div>
          )}

          {/* Preview Table */}
          {parsedData.length > 0 && !importResult && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                প্রিভিউ ({parsedData.length}টি রেকর্ড)
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
                  ...এবং আরো {parsedData.length - 10}টি রেকর্ড
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            বন্ধ করুন
          </Button>
          {parsedData.length > 0 && !importResult && (
            <Button onClick={handleImport} disabled={importing}>
              {importing ? 'ইম্পোর্ট হচ্ছে...' : `${parsedData.length}টি ইম্পোর্ট করুন`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CSVImportDialog;
