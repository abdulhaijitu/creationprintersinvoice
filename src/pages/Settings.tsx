import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanySettings, CompanySettings } from '@/contexts/CompanySettingsContext';
import { useSettingsTabPermissions, SettingsTabKey } from '@/hooks/useSettingsTabPermissions';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { UnsavedChangesWarning } from '@/components/settings/UnsavedChangesWarning';
import { Loader2, Upload, Building2, Landmark, FileText, Image, ShieldAlert, Eye, Lock } from 'lucide-react';

export default function Settings() {
  const { toast } = useToast();
  const { loading: authLoading } = useAuth();
  const { settings, loading: settingsLoading, refetchSettings, updateSettingsLocally } = useCompanySettings();
  const tabPermissions = useSettingsTabPermissions();
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTabKey>('company');

  // Determine if current tab allows management
  const currentTabCanManage = tabPermissions[activeTab]?.canManage ?? false;

  const form = useForm<CompanySettings>({
    defaultValues: {
      id: '',
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

  // Watch form values for dirty detection
  const formValues = form.watch();

  // Unsaved changes tracking - only enabled if user can manage current tab
  const {
    isDirty,
    markAsClean,
    markAsDirty,
    showBlockerDialog,
    confirmNavigation,
    cancelNavigation,
    showTabSwitchWarning,
    pendingTab,
    requestTabSwitch,
    confirmTabSwitch,
    cancelTabSwitch,
  } = useUnsavedChanges({
    enabled: currentTabCanManage,
  });

  // Track form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      if (currentTabCanManage) {
        markAsDirty();
      }
    });
    return () => subscription.unsubscribe();
  }, [form, markAsDirty, currentTabCanManage]);

  // Load settings into form
  useEffect(() => {
    if (settings) {
      form.reset(settings);
      if (settings.logo_url) {
        setLogoPreview(settings.logo_url);
      }
      // Mark as clean after loading
      markAsClean();
    }
  }, [settings, form, markAsClean]);

  // Set initial active tab to first visible tab
  useEffect(() => {
    if (tabPermissions.visibleTabs.length > 0 && !tabPermissions.visibleTabs.includes(activeTab)) {
      setActiveTab(tabPermissions.visibleTabs[0]);
    }
  }, [tabPermissions.visibleTabs, activeTab]);

  // Handle tab switch with unsaved changes check
  const handleTabChange = useCallback((newTab: string) => {
    if (isDirty && currentTabCanManage) {
      const canSwitch = requestTabSwitch(newTab);
      if (!canSwitch) return; // Warning dialog will show
    }
    setActiveTab(newTab as SettingsTabKey);
  }, [isDirty, currentTabCanManage, requestTabSwitch]);

  // Confirm tab switch after warning
  const handleConfirmTabSwitch = useCallback(() => {
    if (pendingTab) {
      setActiveTab(pendingTab as SettingsTabKey);
      // Reset form to last saved values
      if (settings) {
        form.reset(settings);
      }
    }
    confirmTabSwitch();
  }, [confirmTabSwitch, pendingTab, settings, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<CompanySettings>) => {
      console.log('[Settings] Save initiated');

      if (!settings?.id) {
        throw new Error('Company settings not loaded');
      }

      const { data: updateResult, error: updateError } = await supabase
        .from('company_settings')
        .update(data)
        .eq('id', settings.id)
        .select();

      if (updateError) {
        console.error('[Settings] Update error:', updateError);
        throw new Error(updateError.message || 'Database update failed');
      }

      if (!updateResult || updateResult.length === 0) {
        throw new Error('Update failed: You may not have permission to modify company settings.');
      }

      return updateResult[0] as CompanySettings;
    },
    onSuccess: (savedData) => {
      // Update global context immediately for live sync
      updateSettingsLocally(savedData);
      // Mark form as clean
      markAsClean();
      toast({
        title: 'Settings saved',
        description: 'Company settings saved successfully',
      });
    },
    onError: (error: Error) => {
      console.error('[Settings] Mutation error:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.message || 'Failed to save settings. Please check your permissions.',
      });
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
      markAsDirty();
    }
  };

  const uploadLogo = async () => {
    if (!logoFile) return null;
    
    setUploading(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
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
    if (!settings?.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Company settings not loaded. Please refresh the page.',
      });
      return;
    }

    // Check permission for current tab
    if (!currentTabCanManage) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'You do not have permission to modify these settings.',
      });
      return;
    }

    let logoUrl = data.logo_url;

    if (logoFile) {
      const uploadedUrl = await uploadLogo();
      if (uploadedUrl) {
        logoUrl = uploadedUrl;
      }
    }

    try {
      await updateMutation.mutateAsync({ ...data, logo_url: logoUrl });
    } catch (error) {
      console.error('[Settings] Submit error caught:', error);
    }
  };

  const isLoading = settingsLoading || authLoading || tabPermissions.loading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Access denied - no view permission for any tab
  if (!tabPermissions.canViewAnyTab) {
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
                  You don't have permission to view company settings. 
                  Please contact your system administrator for access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if current tab is read-only
  const isCurrentTabReadOnly = tabPermissions[activeTab]?.isReadOnly ?? true;

  return (
    <div className="space-y-6">
      {/* Navigation blocker dialog */}
      <UnsavedChangesWarning
        open={showBlockerDialog}
        onDiscard={confirmNavigation}
        onContinueEditing={cancelNavigation}
        context="navigation"
      />

      {/* Tab switch warning dialog */}
      <UnsavedChangesWarning
        open={showTabSwitchWarning}
        onDiscard={handleConfirmTabSwitch}
        onContinueEditing={cancelTabSwitch}
        context="tab-switch"
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Company Settings</h1>
          <p className="text-muted-foreground mt-1">
            Customize company info, bank details, and invoice templates
          </p>
        </div>
        {isCurrentTabReadOnly && (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-md">
            <Eye className="h-4 w-4" />
            <span className="text-sm font-medium">Read-only access</span>
          </div>
        )}
        {isDirty && currentTabCanManage && (
          <div className="flex items-center gap-2 text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 rounded-md">
            <span className="text-sm font-medium">Unsaved changes</span>
          </div>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className={`grid w-full mb-6`} style={{ gridTemplateColumns: `repeat(${tabPermissions.visibleTabs.length}, minmax(0, 1fr))` }}>
              {tabPermissions.visibleTabs.includes('company') && (
                <TabsTrigger value="company" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Company
                  {tabPermissions.company.isReadOnly && <Lock className="h-3 w-3 opacity-50" />}
                </TabsTrigger>
              )}
              {tabPermissions.visibleTabs.includes('logo') && (
                <TabsTrigger value="logo" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Logo
                  {tabPermissions.logo.isReadOnly && <Lock className="h-3 w-3 opacity-50" />}
                </TabsTrigger>
              )}
              {tabPermissions.visibleTabs.includes('bank') && (
                <TabsTrigger value="bank" className="flex items-center gap-2">
                  <Landmark className="h-4 w-4" />
                  Bank
                  {tabPermissions.bank.isReadOnly && <Lock className="h-3 w-3 opacity-50" />}
                </TabsTrigger>
              )}
              {tabPermissions.visibleTabs.includes('invoice') && (
                <TabsTrigger value="invoice" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Invoice
                  {tabPermissions.invoice.isReadOnly && <Lock className="h-3 w-3 opacity-50" />}
                </TabsTrigger>
              )}
            </TabsList>

            {tabPermissions.visibleTabs.includes('company') && (
              <TabsContent value="company">
                <Card>
                  <CardHeader>
                    <CardTitle>Company Information</CardTitle>
                    <CardDescription>
                      Company name, address, and contact information
                      {tabPermissions.company.isReadOnly && ' (Read-only)'}
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
                              <Input 
                                placeholder="Company Name" 
                                {...field} 
                                disabled={tabPermissions.company.isReadOnly}
                              />
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
                              <Input 
                                placeholder="Company Name in Bengali" 
                                {...field} 
                                value={field.value || ''} 
                                disabled={tabPermissions.company.isReadOnly}
                              />
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
                              <Textarea 
                                placeholder="Address" 
                                {...field} 
                                value={field.value || ''} 
                                disabled={tabPermissions.company.isReadOnly}
                              />
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
                              <Textarea 
                                placeholder="Address in Bengali" 
                                {...field} 
                                value={field.value || ''} 
                                disabled={tabPermissions.company.isReadOnly}
                              />
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
                              <Input 
                                placeholder="+880..." 
                                {...field} 
                                value={field.value || ''} 
                                disabled={tabPermissions.company.isReadOnly}
                              />
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
                              <Input 
                                type="email" 
                                placeholder="email@company.com" 
                                {...field} 
                                value={field.value || ''} 
                                disabled={tabPermissions.company.isReadOnly}
                              />
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
                              <Input 
                                placeholder="www.company.com" 
                                {...field} 
                                value={field.value || ''} 
                                disabled={tabPermissions.company.isReadOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {tabPermissions.visibleTabs.includes('logo') && (
              <TabsContent value="logo">
                <Card>
                  <CardHeader>
                    <CardTitle>Company Logo</CardTitle>
                    <CardDescription>
                      Upload a logo to display on invoices and quotations
                      {tabPermissions.logo.isReadOnly && ' (Read-only)'}
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
                      {!tabPermissions.logo.isReadOnly && (
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
                      )}
                      {tabPermissions.logo.isReadOnly && (
                        <p className="text-sm text-muted-foreground">
                          You have read-only access to logo settings
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {tabPermissions.visibleTabs.includes('bank') && (
              <TabsContent value="bank">
                <Card>
                  <CardHeader>
                    <CardTitle>Bank Information</CardTitle>
                    <CardDescription>
                      Bank account details for receiving payments
                      {tabPermissions.bank.isReadOnly && ' (Read-only)'}
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
                              <Input 
                                placeholder="Bank Name" 
                                {...field} 
                                value={field.value || ''} 
                                disabled={tabPermissions.bank.isReadOnly}
                              />
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
                              <Input 
                                placeholder="Account Holder Name" 
                                {...field} 
                                value={field.value || ''} 
                                disabled={tabPermissions.bank.isReadOnly}
                              />
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
                              <Input 
                                placeholder="Account Number" 
                                {...field} 
                                value={field.value || ''} 
                                disabled={tabPermissions.bank.isReadOnly}
                              />
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
                              <Input 
                                placeholder="Bank Branch" 
                                {...field} 
                                value={field.value || ''} 
                                disabled={tabPermissions.bank.isReadOnly}
                              />
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
                              <Input 
                                placeholder="Routing Number" 
                                {...field} 
                                value={field.value || ''} 
                                disabled={tabPermissions.bank.isReadOnly}
                              />
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
                              <Input 
                                placeholder="bKash/Nagad Number" 
                                {...field} 
                                value={field.value || ''} 
                                disabled={tabPermissions.bank.isReadOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {tabPermissions.visibleTabs.includes('invoice') && (
              <TabsContent value="invoice">
                <Card>
                  <CardHeader>
                    <CardTitle>Invoice Settings</CardTitle>
                    <CardDescription>
                      Invoice and quotation prefix, footer, and terms
                      {tabPermissions.invoice.isReadOnly && ' (Read-only)'}
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
                              <Input 
                                placeholder="INV" 
                                {...field} 
                                value={field.value || ''} 
                                disabled={tabPermissions.invoice.isReadOnly}
                              />
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
                              <Input 
                                placeholder="QUO" 
                                {...field} 
                                value={field.value || ''} 
                                disabled={tabPermissions.invoice.isReadOnly}
                              />
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
                              disabled={tabPermissions.invoice.isReadOnly}
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
                              disabled={tabPermissions.invoice.isReadOnly}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>

          <div className="flex justify-end gap-3 items-center">
            {isCurrentTabReadOnly && (
              <p className="text-sm text-muted-foreground">
                You have read-only access to this tab
              </p>
            )}
            <Button 
              type="submit" 
              disabled={!currentTabCanManage || updateMutation.isPending || uploading}
              className="min-w-32"
            >
              {(updateMutation.isPending || uploading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {currentTabCanManage ? 'Save' : 'View Only'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
