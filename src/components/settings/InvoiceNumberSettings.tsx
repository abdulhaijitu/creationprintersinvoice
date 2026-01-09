import { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Hash, 
  Save, 
  Loader2, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2,
  Eye
} from 'lucide-react';
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

interface InvoiceSequence {
  prefix: string;
  starting_number: number;
  current_sequence: number;
  last_migration_at: string | null;
}

interface MigrationPreview {
  invoice_count: number;
  first_invoice: string | null;
  last_invoice: string | null;
  next_invoice: string;
}

export const InvoiceNumberSettings = () => {
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [showMigrateDialog, setShowMigrateDialog] = useState(false);
  
  const [sequence, setSequence] = useState<InvoiceSequence>({
    prefix: 'INV-',
    starting_number: 1,
    current_sequence: 0,
    last_migration_at: null
  });
  
  const [preview, setPreview] = useState<MigrationPreview | null>(null);
  const [startingNumber, setStartingNumber] = useState('1');

  useEffect(() => {
    if (organization?.id) {
      fetchSequence();
      fetchPreview();
    }
  }, [organization?.id]);

  const fetchSequence = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoice_sequences')
        .select('*')
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSequence({
          prefix: data.prefix || 'INV-',
          starting_number: data.starting_number || 1,
          current_sequence: data.current_sequence || 0,
          last_migration_at: data.last_migration_at
        });
        setStartingNumber(String(data.starting_number || 1));
      }
    } catch (error) {
      console.error('Error fetching sequence:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = async () => {
    if (!organization?.id) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('migrate-invoice-numbers', {
        body: { 
          organization_id: organization.id,
          action: 'preview'
        }
      });

      if (error) throw error;
      if (data) {
        setPreview(data);
      }
    } catch (error) {
      console.error('Error fetching preview:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!organization?.id) return;
    
    const numValue = parseInt(startingNumber, 10);
    if (isNaN(numValue) || numValue < 1) {
      toast.error('Starting number must be at least 1');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_invoice_sequence_settings', {
        p_org_id: organization.id,
        p_prefix: 'INV-',
        p_starting_number: numValue
      });

      if (error) throw error;

      toast.success('Invoice settings saved');
      await fetchSequence();
      await fetchPreview();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleMigrate = async () => {
    if (!organization?.id) return;
    
    setMigrating(true);
    setShowMigrateDialog(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('migrate-invoice-numbers', {
        body: { 
          organization_id: organization.id,
          action: 'migrate'
        }
      });

      if (error) throw error;

      toast.success(data.message || 'Migration completed');
      await fetchSequence();
      await fetchPreview();
    } catch (error: any) {
      console.error('Error migrating:', error);
      toast.error('Migration failed');
    } finally {
      setMigrating(false);
    }
  };

  const getNextInvoicePreview = () => {
    const num = parseInt(startingNumber, 10) || 1;
    const current = sequence.current_sequence || 0;
    const nextNum = current > 0 ? current + 1 : num;
    return `INV-${nextNum.toString().padStart(4, '0')}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            Invoice Number Settings
          </CardTitle>
          <CardDescription>
            Configure invoice numbering format and sequence for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Format Preview */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Next Invoice Number</p>
                <p className="text-2xl font-bold font-mono tracking-wide">
                  {getNextInvoicePreview()}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </Badge>
            </div>
          </div>

          {/* Settings Form */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prefix">Prefix</Label>
              <Input
                id="prefix"
                value="INV-"
                disabled
                className="bg-muted font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Fixed prefix for all invoices
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="starting_number">Starting Number</Label>
              <Input
                id="starting_number"
                type="number"
                min="1"
                value={startingNumber}
                onChange={(e) => setStartingNumber(e.target.value)}
                className="font-mono"
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground">
                Invoice numbers will start from this number
              </p>
            </div>
          </div>

          {/* Current Status */}
          {sequence.current_sequence > 0 && (
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Sequence Active</p>
                  <p className="text-sm text-muted-foreground">
                    Current sequence: <span className="font-mono">{sequence.current_sequence}</span>
                  </p>
                  {sequence.last_migration_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last migrated: {new Date(sequence.last_migration_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Migration Preview */}
          {preview && preview.invoice_count > 0 && (
            <div className="p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    {preview.invoice_count} existing invoices found
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    You can migrate all existing invoices to the new format. 
                    This will rename them from <span className="font-mono">{preview.first_invoice}</span> to <span className="font-mono">{preview.last_invoice}</span>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button 
              onClick={handleSaveSettings} 
              disabled={saving}
              className="flex-1 sm:flex-none"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
            
            {preview && preview.invoice_count > 0 && (
              <Button 
                variant="outline" 
                onClick={() => setShowMigrateDialog(true)}
                disabled={migrating}
                className="flex-1 sm:flex-none"
              >
                {migrating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Rebuild Sequence
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Migration Confirmation Dialog */}
      <AlertDialog open={showMigrateDialog} onOpenChange={setShowMigrateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rebuild Invoice Sequence?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This will rename all {preview?.invoice_count} existing invoices to follow the new format.
                </p>
                <div className="p-3 rounded bg-muted text-sm font-mono">
                  <p>First: {preview?.first_invoice}</p>
                  <p>Last: {preview?.last_invoice}</p>
                  <p>Next: {preview?.next_invoice}</p>
                </div>
                <p className="text-amber-600 dark:text-amber-400">
                  This action cannot be undone. Make sure to backup your data first.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMigrate}>
              Yes, Rebuild Sequence
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
