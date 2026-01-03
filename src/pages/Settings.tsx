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
      if (!settings?.id) throw new Error('Settings not found');
      
      const { error } = await supabase
        .from('company_settings')
        .update(data)
        .eq('id', settings.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      toast({
        title: 'সেটিংস সংরক্ষিত হয়েছে',
        description: 'কোম্পানি সেটিংস সফলভাবে আপডেট করা হয়েছে',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'ত্রুটি',
        description: 'সেটিংস সংরক্ষণে সমস্যা হয়েছে',
      });
      console.error(error);
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
        title: 'আপলোড ত্রুটি',
        description: 'লোগো আপলোড করতে সমস্যা হয়েছে',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: CompanySettings) => {
    let logoUrl = data.logo_url;
    
    if (logoFile) {
      const uploadedUrl = await uploadLogo();
      if (uploadedUrl) {
        logoUrl = uploadedUrl;
      }
    }
    
    updateMutation.mutate({ ...data, logo_url: logoUrl });
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show access denied message for non-admin users
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">কোম্পানি সেটিংস</h1>
          <p className="text-muted-foreground mt-1">
            কোম্পানির তথ্য, ব্যাংক ডিটেইলস এবং ইনভয়েস টেমপ্লেট কাস্টমাইজ করুন
          </p>
        </div>
        
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center py-10 space-y-4">
              <div className="p-4 rounded-full bg-destructive/10">
                <ShieldAlert className="h-12 w-12 text-destructive" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">অ্যাক্সেস নেই</h2>
                <p className="text-muted-foreground max-w-md">
                  শুধুমাত্র অ্যাডমিন ব্যবহারকারীরা কোম্পানি সেটিংস পরিবর্তন করতে পারেন। 
                  আপনার অ্যাডমিন অ্যাক্সেস প্রয়োজন হলে আপনার সিস্টেম অ্যাডমিনের সাথে যোগাযোগ করুন।
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
        <h1 className="text-3xl font-bold text-foreground">কোম্পানি সেটিংস</h1>
        <p className="text-muted-foreground mt-1">
          কোম্পানির তথ্য, ব্যাংক ডিটেইলস এবং ইনভয়েস টেমপ্লেট কাস্টমাইজ করুন
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="company" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="company" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                কোম্পানি
              </TabsTrigger>
              <TabsTrigger value="logo" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                লোগো
              </TabsTrigger>
              <TabsTrigger value="bank" className="flex items-center gap-2">
                <Landmark className="h-4 w-4" />
                ব্যাংক
              </TabsTrigger>
              <TabsTrigger value="invoice" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                ইনভয়েস
              </TabsTrigger>
            </TabsList>

            <TabsContent value="company">
              <Card>
                <CardHeader>
                  <CardTitle>কোম্পানি তথ্য</CardTitle>
                  <CardDescription>
                    কোম্পানির নাম, ঠিকানা এবং যোগাযোগের তথ্য
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="company_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>কোম্পানির নাম (ইংরেজি)</FormLabel>
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
                          <FormLabel>কোম্পানির নাম (বাংলা)</FormLabel>
                          <FormControl>
                            <Input placeholder="কোম্পানির নাম" {...field} value={field.value || ''} />
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
                          <FormLabel>ঠিকানা (ইংরেজি)</FormLabel>
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
                          <FormLabel>ঠিকানা (বাংলা)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="ঠিকানা" {...field} value={field.value || ''} />
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
                          <FormLabel>ফোন</FormLabel>
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
                          <FormLabel>ইমেইল</FormLabel>
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
                          <FormLabel>ওয়েবসাইট</FormLabel>
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
                  <CardTitle>কোম্পানি লোগো</CardTitle>
                  <CardDescription>
                    ইনভয়েস এবং কোটেশনে প্রদর্শিত হবে এমন লোগো আপলোড করুন
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
                        PNG, JPG বা SVG (সর্বোচ্চ 2MB)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bank">
              <Card>
                <CardHeader>
                  <CardTitle>ব্যাংক তথ্য</CardTitle>
                  <CardDescription>
                    পেমেন্ট গ্রহণের জন্য ব্যাংক অ্যাকাউন্ট তথ্য
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bank_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ব্যাংকের নাম</FormLabel>
                          <FormControl>
                            <Input placeholder="ব্যাংকের নাম" {...field} value={field.value || ''} />
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
                          <FormLabel>অ্যাকাউন্ট নাম</FormLabel>
                          <FormControl>
                            <Input placeholder="অ্যাকাউন্ট হোল্ডারের নাম" {...field} value={field.value || ''} />
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
                          <FormLabel>অ্যাকাউন্ট নম্বর</FormLabel>
                          <FormControl>
                            <Input placeholder="অ্যাকাউন্ট নম্বর" {...field} value={field.value || ''} />
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
                          <FormLabel>শাখা</FormLabel>
                          <FormControl>
                            <Input placeholder="ব্যাংক শাখা" {...field} value={field.value || ''} />
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
                          <FormLabel>রাউটিং নম্বর</FormLabel>
                          <FormControl>
                            <Input placeholder="রাউটিং নম্বর" {...field} value={field.value || ''} />
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
                          <FormLabel>মোবাইল ব্যাংকিং</FormLabel>
                          <FormControl>
                            <Input placeholder="বিকাশ/নগদ নম্বর" {...field} value={field.value || ''} />
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
                  <CardTitle>ইনভয়েস সেটিংস</CardTitle>
                  <CardDescription>
                    ইনভয়েস এবং কোটেশনের প্রিফিক্স, ফুটার এবং শর্তাবলী
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="invoice_prefix"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ইনভয়েস প্রিফিক্স</FormLabel>
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
                          <FormLabel>কোটেশন প্রিফিক্স</FormLabel>
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
                        <FormLabel>ইনভয়েস ফুটার</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="ইনভয়েসের নিচে প্রদর্শিত হবে..." 
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
                        <FormLabel>শর্তাবলী</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="পেমেন্ট এবং ডেলিভারি সংক্রান্ত শর্তাবলী..." 
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
              সংরক্ষণ করুন
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
