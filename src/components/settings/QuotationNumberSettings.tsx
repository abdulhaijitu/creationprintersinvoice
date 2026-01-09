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
  CheckCircle2,
  Eye,
  FileText
} from 'lucide-react';

interface QuotationSequence {
  prefix: string;
  current_sequence: number;
  year: number;
}

export const QuotationNumberSettings = () => {
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [sequence, setSequence] = useState<QuotationSequence>({
    prefix: 'QO',
    current_sequence: 0,
    year: new Date().getFullYear()
  });
  
  const [prefix, setPrefix] = useState('QO');
  const [startingNumber, setStartingNumber] = useState('1');
  const [quotationCount, setQuotationCount] = useState(0);

  useEffect(() => {
    if (organization?.id) {
      fetchSequence();
      fetchQuotationCount();
    }
  }, [organization?.id]);

  const fetchSequence = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from('quotation_sequences')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('year', currentYear)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSequence({
          prefix: data.prefix || 'QO',
          current_sequence: data.current_sequence || 0,
          year: data.year
        });
        setPrefix(data.prefix || 'QO');
        setStartingNumber(String(Math.max(data.current_sequence + 1, 1)));
      }
    } catch (error) {
      console.error('Error fetching sequence:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotationCount = async () => {
    if (!organization?.id) return;
    
    try {
      const { count, error } = await supabase
        .from('quotations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id);

      if (error) throw error;
      setQuotationCount(count || 0);
    } catch (error) {
      console.error('Error fetching quotation count:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!organization?.id) return;
    
    if (!prefix.trim()) {
      toast.error('Prefix cannot be empty');
      return;
    }

    const numValue = parseInt(startingNumber, 10);
    if (isNaN(numValue) || numValue < 1) {
      toast.error('Starting number must be at least 1');
      return;
    }

    // Prevent setting starting number below current sequence
    if (sequence.current_sequence > 0 && numValue <= sequence.current_sequence) {
      toast.error(`Starting number must be greater than ${sequence.current_sequence} (last used number)`);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_quotation_sequence_settings', {
        p_org_id: organization.id,
        p_prefix: prefix.trim(),
        p_starting_number: numValue
      });

      if (error) throw error;

      toast.success('Quotation settings saved');
      await fetchSequence();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getNextQuotationPreview = () => {
    const currentPrefix = prefix || 'QO';
    const num = sequence.current_sequence > 0 
      ? sequence.current_sequence + 1 
      : parseInt(startingNumber, 10) || 1;
    return `${currentPrefix}${num.toString().padStart(4, '0')}`;
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
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Quotation Number Settings
        </CardTitle>
        <CardDescription>
          Configure quotation numbering format and sequence for your organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Format Preview */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Next Quotation Number</p>
              <p className="text-2xl font-bold font-mono tracking-wide">
                {getNextQuotationPreview()}
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
            <Label htmlFor="quotation_prefix">Prefix</Label>
            <Input
              id="quotation_prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              className="font-mono h-10"
              placeholder="QO"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">
              Prefix for all quotation numbers (e.g., QO, QUOTE)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quotation_starting_number">Starting Number</Label>
            <Input
              id="quotation_starting_number"
              type="number"
              min="1"
              value={startingNumber}
              onChange={(e) => setStartingNumber(e.target.value)}
              className="font-mono h-10"
              placeholder="1"
              disabled={sequence.current_sequence > 0}
            />
            <p className="text-xs text-muted-foreground">
              {sequence.current_sequence > 0 
                ? `Sequence active - last used: ${sequence.current_sequence}`
                : 'Quotation numbers will start from this number'}
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
                <p className="text-xs text-muted-foreground mt-1">
                  {quotationCount} quotation{quotationCount !== 1 ? 's' : ''} created this year
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Helper Text */}
        <div className="p-3 rounded-lg bg-muted/30 border border-muted">
          <p className="text-sm text-muted-foreground">
            <Hash className="h-4 w-4 inline mr-1" />
            Quotation numbers are auto-generated on save and must be unique per organization.
          </p>
        </div>

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
        </div>
      </CardContent>
    </Card>
  );
};
