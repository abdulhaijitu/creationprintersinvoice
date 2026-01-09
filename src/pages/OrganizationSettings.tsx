import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Building2, Upload, Save, Loader2, CreditCard, Crown, Users } from 'lucide-react';
import { format } from 'date-fns';
import { OwnershipTransferRequest } from '@/components/ownership/OwnershipTransferRequest';
import { OwnershipHistory } from '@/components/ownership/OwnershipHistory';
import { InvoiceNumberSettings } from '@/components/settings/InvoiceNumberSettings';

interface OrganizationSettings {
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  tax_rate: number;
  invoice_prefix: string;
  quotation_prefix: string;
  challan_prefix: string;
  invoice_terms: string | null;
  invoice_footer: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
  bank_routing_number: string | null;
  mobile_banking: string | null;
}

const OrganizationSettings = () => {
  const navigate = useNavigate();
  const { organization, subscription, isOrgOwner, refetchOrganization } = useOrganization();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<OrganizationSettings>({
    defaultValues: {
      name: organization?.name || '',
      slug: organization?.slug || '',
      address: organization?.address || '',
      phone: organization?.phone || '',
      email: organization?.email || '',
      website: organization?.website || '',
      tax_rate: organization?.tax_rate || 0,
      invoice_prefix: organization?.invoice_prefix || 'INV',
      quotation_prefix: organization?.quotation_prefix || 'QUO',
      challan_prefix: organization?.challan_prefix || 'DC',
      invoice_terms: organization?.invoice_terms || '',
      invoice_footer: organization?.invoice_footer || '',
      bank_name: organization?.bank_name || '',
      bank_account_name: organization?.bank_account_name || '',
      bank_account_number: organization?.bank_account_number || '',
      bank_branch: organization?.bank_branch || '',
      bank_routing_number: organization?.bank_routing_number || '',
      mobile_banking: organization?.mobile_banking || '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<OrganizationSettings>) => {
      if (!organization?.id) throw new Error('No organization found');
      
      const { error } = await supabase
        .from('organizations')
        .update(data)
        .eq('id', organization.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Settings saved successfully');
      refetchOrganization();
    },
    onError: (error) => {
      toast.error('Failed to save settings', { description: error.message });
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
    if (!logoFile || !organization?.id) return organization?.logo_url;

    setIsUploading(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${organization.id}/logo.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(fileName, logoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: OrganizationSettings) => {
    try {
      let logo_url = organization?.logo_url;
      
      if (logoFile) {
        logo_url = await uploadLogo();
      }

      await updateMutation.mutateAsync({ ...data, logo_url } as any);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const getPlanBadge = () => {
    const plan = subscription?.plan || 'free';
    const colors: Record<string, string> = {
      free: 'bg-muted text-muted-foreground',
      basic: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      pro: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
      enterprise: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
    };
    return (
      <Badge className={colors[plan]}>
        <Crown className="h-3 w-3 mr-1" />
        {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
      </Badge>
    );
  };

  const getStatusBadge = () => {
    const status = subscription?.status || 'trial';
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      trial: 'secondary',
      active: 'default',
      suspended: 'destructive',
      cancelled: 'outline',
      expired: 'destructive',
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  if (!isOrgOwner) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">
            Only organization owners can modify settings.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Organization Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your organization's profile and preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getPlanBadge()}
          {getStatusBadge()}
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="logo">Logo</TabsTrigger>
          <TabsTrigger value="bank">Bank Details</TabsTrigger>
          <TabsTrigger value="invoice">Invoicing</TabsTrigger>
          <TabsTrigger value="numbering">Numbering</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit(onSubmit)}>
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>
                  Basic information about your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Business Name *</Label>
                    <Input
                      id="name"
                      {...register('name', { required: 'Business name is required' })}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">URL Slug</Label>
                    <Input id="slug" {...register('slug')} disabled />
                    <p className="text-xs text-muted-foreground">
                      This cannot be changed
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea id="address" {...register('address')} rows={3} />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" {...register('phone')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...register('email')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" {...register('website')} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logo">
            <Card>
              <CardHeader>
                <CardTitle>Company Logo</CardTitle>
                <CardDescription>
                  Upload your logo to display on invoices and documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
                    {logoPreview || organization?.logo_url ? (
                      <img
                        src={logoPreview || organization?.logo_url || ''}
                        alt="Logo"
                        className="max-w-full max-h-full object-contain"
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
                      className="max-w-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended: 500x500px, PNG or JPG
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bank">
            <Card>
              <CardHeader>
                <CardTitle>Bank Details</CardTitle>
                <CardDescription>
                  Banking information for invoices and payments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input id="bank_name" {...register('bank_name')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_branch">Branch</Label>
                    <Input id="bank_branch" {...register('bank_branch')} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bank_account_name">Account Name</Label>
                    <Input id="bank_account_name" {...register('bank_account_name')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_account_number">Account Number</Label>
                    <Input id="bank_account_number" {...register('bank_account_number')} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bank_routing_number">Routing Number</Label>
                    <Input id="bank_routing_number" {...register('bank_routing_number')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobile_banking">Mobile Banking Info</Label>
                    <Input id="mobile_banking" {...register('mobile_banking')} placeholder="bKash, Nagad, etc." />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoice">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Settings</CardTitle>
                <CardDescription>
                  Configure invoice numbering and defaults
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice_prefix">Invoice Prefix</Label>
                    <Input id="invoice_prefix" {...register('invoice_prefix')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quotation_prefix">Quotation Prefix</Label>
                    <Input id="quotation_prefix" {...register('quotation_prefix')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="challan_prefix">Challan Prefix</Label>
                    <Input id="challan_prefix" {...register('challan_prefix')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax_rate">Default Tax Rate (%)</Label>
                    <Input
                      id="tax_rate"
                      type="number"
                      step="0.01"
                      {...register('tax_rate', { valueAsNumber: true })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_terms">Default Terms & Conditions</Label>
                  <Textarea id="invoice_terms" {...register('invoice_terms')} rows={4} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_footer">Invoice Footer</Label>
                  <Textarea id="invoice_footer" {...register('invoice_footer')} rows={2} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="numbering">
            <InvoiceNumberSettings />
          </TabsContent>

          <div className="flex justify-end mt-6">
            <Button type="submit" disabled={updateMutation.isPending || isUploading}>
              {(updateMutation.isPending || isUploading) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Tabs>

      {/* Subscription Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="font-medium capitalize">{subscription?.plan || 'Free'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{subscription?.status || 'Trial'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Team Limit</p>
              <p className="font-medium">{subscription?.user_limit || 5} members</p>
            </div>
            {subscription?.trial_ends_at && subscription.status === 'trial' && (
              <div>
                <p className="text-sm text-muted-foreground">Trial Ends</p>
                <p className="font-medium">
                  {format(new Date(subscription.trial_ends_at), 'MMM d, yyyy')}
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => navigate('/team-members')}>
              <Users className="h-4 w-4 mr-2" />
              Manage Team Members
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ownership Management - Only visible to org owners */}
      <OwnershipTransferRequest />
      <OwnershipHistory />
    </div>
  );
};

export default OrganizationSettings;
