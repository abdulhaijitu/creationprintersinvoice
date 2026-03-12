import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Upload, Loader2, HardDrive, Shield, Clock, FileJson, AlertTriangle, CheckCircle } from 'lucide-react';
import { useBackupRestore } from '@/hooks/useBackupRestore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function BackupRestoreSection() {
  const {
    createBackup,
    restoreBackup,
    parseBackupFile,
    backupLoading,
    restoreLoading,
    canBackup,
    canRestore,
  } = useBackupRestore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreFile, setRestoreFile] = useState<{ name: string; data: any } | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const handleBackup = async () => {
    await createBackup();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = await parseBackupFile(file);
    if (data) {
      setRestoreFile({ name: file.name, data });
      setShowRestoreConfirm(true);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRestoreConfirm = async () => {
    if (!restoreFile) return;
    setShowRestoreConfirm(false);
    await restoreBackup(restoreFile.data, 'merge');
    setRestoreFile(null);
  };

  const handleRestoreCancel = () => {
    setShowRestoreConfirm(false);
    setRestoreFile(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            <CardTitle>Backup & Restore</CardTitle>
          </div>
          <CardDescription>
            আপনার সব ব্যবসায়িক ডাটার ব্যাকআপ নিন এবং প্রয়োজনে রিস্টোর করুন
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Backup Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium">Create Backup</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              সব customers, invoices, payments, quotations, expenses, employees, attendance, salary, vendors এবং delivery challans ডাটা JSON ফাইল হিসেবে ডাউনলোড হবে।
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {['Customers', 'Invoices', 'Payments', 'Quotations', 'Expenses', 'Employees', 'Attendance', 'Salary', 'Vendors', 'Challans'].map(item => (
                <Badge key={item} variant="secondary" className="text-xs">
                  {item}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleBackup}
                disabled={backupLoading || !canBackup}
              >
                {backupLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Backup...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download Backup
                  </>
                )}
              </Button>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileJson className="h-3.5 w-3.5" />
                <span>JSON format</span>
              </div>
            </div>
            {!canBackup && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <Shield className="h-3 w-3" />
                শুধুমাত্র Organization Owner ব্যাকআপ নিতে পারবেন
              </p>
            )}
          </div>

          <Separator />

          {/* Restore Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium">Restore from Backup</h4>
              <Badge variant="outline" className="text-xs">
                Merge Mode
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              পূর্বে নেওয়া ব্যাকআপ ফাইল আপলোড করে ডাটা রিস্টোর করুন। বিদ্যমান ডাটার সাথে merge হবে।
            </p>
            <div className="p-3 rounded-lg border border-warning/30 bg-warning/5">
              <div className="flex gap-2 text-xs text-warning">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  রিস্টোর করার আগে অবশ্যই বর্তমান ডাটার একটি ব্যাকআপ নিয়ে রাখুন। রিস্টোর প্রক্রিয়া বিদ্যমান ডাটা পরিবর্তন করতে পারে।
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={restoreLoading || !canRestore}
              >
                {restoreLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Backup File
                  </>
                )}
              </Button>
            </div>
            {!canRestore && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <Shield className="h-3 w-3" />
                শুধুমাত্র Organization Owner রিস্টোর করতে পারবেন
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Confirm Restore
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  আপনি কি <strong>{restoreFile?.name}</strong> ফাইল থেকে ডাটা রিস্টোর করতে চান?
                </p>
                {restoreFile?.data && (
                  <div className="p-3 rounded-lg bg-muted text-sm space-y-1">
                    <p className="font-medium text-foreground">Backup Details:</p>
                    <p className="text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      তারিখ: {new Date(restoreFile.data.created_at).toLocaleString('bn-BD')}
                    </p>
                    <p className="text-muted-foreground">
                      <CheckCircle className="h-3 w-3 inline mr-1" />
                      মোট রেকর্ড: {Object.values(restoreFile.data.record_counts || {}).reduce((a: number, b: unknown) => a + (Number(b) || 0), 0)}
                    </p>
                  </div>
                )}
                <p className="text-destructive text-xs">
                  এই প্রক্রিয়া বিদ্যমান ডাটার সাথে merge করবে। রিস্টোর শুরু করার পর বাতিল করা যাবে না।
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleRestoreCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreConfirm} className="bg-warning text-warning-foreground hover:bg-warning/90">
              Restore Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
