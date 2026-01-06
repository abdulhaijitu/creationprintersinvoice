import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useWhiteLabel, BrandingSettings } from '@/hooks/useWhiteLabel';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, Palette, Image, Type, Eye } from 'lucide-react';
import { toast } from 'sonner';

export const BrandingSettingsPanel = () => {
  const { organization } = useOrganization();
  const { branding, updateBranding, isBrandingUpdating, isWhiteLabelEnabled } = useWhiteLabel();
  
  const [formData, setFormData] = useState<BrandingSettings>({
    app_name: '',
    logo_url: '',
    favicon_url: '',
    primary_color: '#6366f1',
    secondary_color: '#8b5cf6',
    accent_color: '',
    footer_text: '',
    hide_platform_branding: false,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (branding) {
      setFormData({
        app_name: branding.app_name || '',
        logo_url: branding.logo_url || '',
        favicon_url: branding.favicon_url || '',
        primary_color: branding.primary_color || '#6366f1',
        secondary_color: branding.secondary_color || '#8b5cf6',
        accent_color: branding.accent_color || '',
        footer_text: branding.footer_text || '',
        hide_platform_branding: branding.hide_platform_branding || false,
      });
    }
  }, [branding]);

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    if (!organization?.id) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${organization.id}/${folder}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('branding')
      .upload(fileName, file);
    
    if (uploadError) {
      toast.error('Failed to upload file: ' + uploadError.message);
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('branding')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleSave = async () => {
    setUploading(true);
    
    try {
      let logoUrl = formData.logo_url;
      let faviconUrl = formData.favicon_url;
      
      if (logoFile) {
        const url = await uploadFile(logoFile, 'logos');
        if (url) logoUrl = url;
      }
      
      if (faviconFile) {
        const url = await uploadFile(faviconFile, 'favicons');
        if (url) faviconUrl = url;
      }
      
      updateBranding({
        ...formData,
        logo_url: logoUrl,
        favicon_url: faviconUrl,
      });
      
      setLogoFile(null);
      setFaviconFile(null);
    } catch (error) {
      toast.error('Failed to save branding settings');
    } finally {
      setUploading(false);
    }
  };

  if (!isWhiteLabelEnabled) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Palette className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">White-Label Not Enabled</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Contact your administrator to enable white-label features for your organization.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* App Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            App Identity
          </CardTitle>
          <CardDescription>
            Customize your app's name and basic identity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="app_name">App Name</Label>
            <Input
              id="app_name"
              value={formData.app_name || ''}
              onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
              placeholder="Your Business Name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="footer_text">Footer Text</Label>
            <Textarea
              id="footer_text"
              value={formData.footer_text || ''}
              onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
              placeholder="© 2024 Your Company. All rights reserved."
              rows={2}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="hide_branding">Hide Platform Branding</Label>
              <p className="text-sm text-muted-foreground">
                Remove all platform branding from your app
              </p>
            </div>
            <Switch
              id="hide_branding"
              checked={formData.hide_platform_branding}
              onCheckedChange={(checked) => setFormData({ ...formData, hide_platform_branding: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Logo & Favicon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Logo & Favicon
          </CardTitle>
          <CardDescription>
            Upload your brand assets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Logo */}
            <div className="space-y-4">
              <Label>Business Logo</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                {formData.logo_url || logoFile ? (
                  <div className="space-y-3">
                    <img
                      src={logoFile ? URL.createObjectURL(logoFile) : formData.logo_url || ''}
                      alt="Logo preview"
                      className="max-h-20 mx-auto object-contain"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLogoFile(null);
                        setFormData({ ...formData, logo_url: '' });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Click to upload logo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: 200x50px PNG with transparent background
              </p>
            </div>

            {/* Favicon */}
            <div className="space-y-4">
              <Label>Favicon</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                {formData.favicon_url || faviconFile ? (
                  <div className="space-y-3">
                    <img
                      src={faviconFile ? URL.createObjectURL(faviconFile) : formData.favicon_url || ''}
                      alt="Favicon preview"
                      className="h-8 w-8 mx-auto object-contain"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFaviconFile(null);
                        setFormData({ ...formData, favicon_url: '' });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Click to upload favicon
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setFaviconFile(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: 32x32px or 64x64px PNG/ICO
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Brand Colors
          </CardTitle>
          <CardDescription>
            Customize your app's color scheme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  placeholder="#6366f1"
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="secondary_color">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary_color"
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  placeholder="#8b5cf6"
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accent_color">Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  id="accent_color"
                  type="color"
                  value={formData.accent_color || '#f59e0b'}
                  onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.accent_color || ''}
                  onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                  placeholder="#f59e0b"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Color Preview */}
          <div className="pt-4 border-t">
            <Label className="flex items-center gap-2 mb-3">
              <Eye className="h-4 w-4" />
              Preview
            </Label>
            <div className="flex gap-3">
              <div 
                className="h-16 w-24 rounded-lg flex items-center justify-center text-white text-sm font-medium shadow-sm"
                style={{ backgroundColor: formData.primary_color }}
              >
                Primary
              </div>
              <div 
                className="h-16 w-24 rounded-lg flex items-center justify-center text-white text-sm font-medium shadow-sm"
                style={{ backgroundColor: formData.secondary_color }}
              >
                Secondary
              </div>
              {formData.accent_color && (
                <div 
                  className="h-16 w-24 rounded-lg flex items-center justify-center text-white text-sm font-medium shadow-sm"
                  style={{ backgroundColor: formData.accent_color }}
                >
                  Accent
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isBrandingUpdating || uploading}>
          {(isBrandingUpdating || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Branding Settings
        </Button>
      </div>
    </div>
  );
};
