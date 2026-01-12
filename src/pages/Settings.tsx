import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Upload, Building2, Landmark, FileText, Image, ShieldAlert } from 'lucide-react';

interface CompanySettings {
  id: string;
  company_name: string;
  company_name_bn: string | null;
  address: string | null;
  address_bn: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
  bank_routing_number: string | null;
  mobile_banking: string | null;
  invoice_prefix: string | null;
  quotation_prefix: string | null;
  invoice_footer: string | null;
  invoice_terms: string | null;
}

export default function Settings() {
  const { toast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<CompanySettings>({
    defaultValues: {
      company_name: '',
      company_name_bn: '',
      address: '',
      address_bn: '',
      phone: '',
      email: '',
      website: '',
      logo_url: '',
      bank_name: '',
      bank_account_name: '',
      bank_account_number: '',
      bank_branch: '',
      bank_routing_number: '',
      mobile_banking: '',
      invoice_prefix: 'INV',
      quotation_prefix: 'QUO',
      invoice_footer: '',
      invoice_terms: '',
    },
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as CompanySettings;
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset(settings);
      if (settings.logo_url) {
        setLogoPreview(settings.logo_url);
      }
    }
  }, [settings, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<CompanySettings>) => {
      // CRITICAL: Validate settings ID exists before update
      if (!settings?.id) {
        throw new Error('Company settings ID not found. Cannot save.');
      }

      console.log('[Settings] Attempting update with ID:', settings.id);
      console.log('[Settings] Update payload:', data);

      // Use .select() to verify the update actually happened
      const { data: updatedData, error, count } = await supabase
        .from('company_settings')
        .update(data)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) {
        console.error('[Settings] Update error:', error);
        throw new Error(error.message || 'Database update failed');
      }

      // CRITICAL: Check if update actually affected a row
      if (!updatedData) {
        console.error('[Settings] Update returned no data - RLS may have blocked the update');
        throw new Error('Update failed: You may not have permission to modify company settings.');
      }

      console.log('[Settings] Update successful, returned data:', updatedData);

      // Verify the data was actually saved by re-fetching
      const { data: verifyData, error: verifyError } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', settings.id)
        .single();

      if (verifyError) {
        console.error('[Settings] Verification fetch failed:', verifyError);
        throw new Error('Could not verify save. Please refresh and check.');
      }

      // Compare key fields to ensure persistence
      const fieldsToVerify = ['company_name', 'phone', 'email', 'address'] as const;
      for (const field of fieldsToVerify) {
        if (data[field] !== undefined && verifyData[field] !== data[field]) {
          console.error(`[Settings] Field ${field} mismatch: sent "${data[field]}", got "${verifyData[field]}"`);
          throw new Error(`Save verification failed for ${field}. Please try again.`);
        }
      }

      console.log('[Settings] Save verified successfully');
      return updatedData;
    },
    onSuccess: (updatedData) => {
      // Invalidate and refetch to ensure UI shows fresh data from DB
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      toast({
        title: 'Settings saved',
        description: 'Company settings updated and verified successfully',
      });
    },
    onError: (error: Error) => {
      console.error('[Settings] Mutation error:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.message || 'Failed to save settings. Please check your permissions.',
      });
      // Do NOT reset form on error - keep user's changes
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async () => {
    if (!logoFile) return null;
    
    setUploading(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('company-assets')
        .upload(fileName, logoFile, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(fileName);
      
      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: 'Failed to upload logo',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: CompanySettings) => {
    // Validate ID before attempting save
    if (!settings?.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Company settings not loaded. Please refresh the page.',
      });
      return;
    }

    console.log('[Settings] Form submitted with data:', data);
    console.log('[Settings] Using settings ID:', settings.id);

    let logoUrl = data.logo_url;

    if (logoFile) {
      const uploadedUrl = await uploadLogo();
      if (uploadedUrl) {
        logoUrl = uploadedUrl;
      } else {
        // Logo upload failed, but we can still save other fields
        console.warn('[Settings] Logo upload failed, continuing with other fields');
      }
    }

    // Use mutateAsync to properly await and handle errors
    try {
      await updateMutation.mutateAsync({ ...data, logo_url: logoUrl });
    } catch (error) {
      // Error is already handled in onError callback
      console.error('[Settings] Submit error caught:', error);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Company Settings</h1>
          <p className="text-muted-foreground mt-1">
            Customize company info, bank details, and invoice templates
          </p>
        </div>
        
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center py-10 space-y-4">
              <div className="p-4 rounded-full bg-destructive/10">
                <ShieldAlert className="h-12 w-12 text-destructive" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
                <p className="text-muted-foreground max-w-md">
                  Only admin users can modify company settings. 
                  Please contact your system administrator for access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Company Settings</h1>
        <p className="text-muted-foreground mt-1">
          Customize company info, bank details, and invoice templates
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="company" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="company" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company
              </TabsTrigger>
              <TabsTrigger value="logo" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Logo
              </TabsTrigger>
              <TabsTrigger value="bank" className="flex items-center gap-2">
                <Landmark className="h-4 w-4" />
                Bank
              </TabsTrigger>
              <TabsTrigger value="invoice" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Invoice
              </TabsTrigger>
            </TabsList>

            <TabsContent value="company">
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                  <CardDescription>
                    Company name, address, and contact information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="company_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name (English)</FormLabel>
                          <FormControl>
                            <Input placeholder="Company Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company_name_bn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name (Bengali)</FormLabel>
                          <FormControl>
                            <Input placeholder="Company Name in Bengali" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address (English)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Address" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address_bn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address (Bengali)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Address in Bengali" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+880..." {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@company.com" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="www.company.com" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logo">
              <Card>
                <CardHeader>
                  <CardTitle>Company Logo</CardTitle>
                  <CardDescription>
                    Upload a logo to display on invoices and quotations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-6">
                    <div className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
                      {logoPreview ? (
                        <img 
                          src={logoPreview} 
                          alt="Logo Preview" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="w-auto"
                      />
                      <p className="text-sm text-muted-foreground">
                        PNG, JPG or SVG (max 2MB)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bank">
              <Card>
                <CardHeader>
                  <CardTitle>Bank Information</CardTitle>
                  <CardDescription>
                    Bank account details for receiving payments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bank_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Bank Name" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bank_account_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Account Holder Name" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bank_account_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Account Number" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bank_branch"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Branch</FormLabel>
                          <FormControl>
                            <Input placeholder="Bank Branch" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bank_routing_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Routing Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Routing Number" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mobile_banking"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile Banking</FormLabel>
                          <FormControl>
                            <Input placeholder="bKash/Nagad Number" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoice">
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Settings</CardTitle>
                  <CardDescription>
                    Invoice and quotation prefix, footer, and terms
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="invoice_prefix"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Prefix</FormLabel>
                          <FormControl>
                            <Input placeholder="INV" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="quotation_prefix"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quotation Prefix</FormLabel>
                          <FormControl>
                            <Input placeholder="QUO" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="invoice_footer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Footer</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Displayed at the bottom of invoices..." 
                            rows={3}
                            {...field} 
                            value={field.value || ''} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="invoice_terms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terms & Conditions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Payment and delivery terms..." 
                            rows={4}
                            {...field} 
                            value={field.value || ''} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={updateMutation.isPending || uploading}
              className="min-w-32"
            >
              {(updateMutation.isPending || uploading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
