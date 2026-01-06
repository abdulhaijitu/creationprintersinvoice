import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { 
  Palette, 
  Globe, 
  Mail, 
  FileText, 
  Eye, 
  Settings2, 
  Search, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Building2,
  ExternalLink
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_email: string | null;
  created_at: string;
}

interface WhiteLabelSettings {
  id?: string;
  organization_id: string;
  whitelabel_enabled: boolean;
  custom_domain_enabled: boolean;
  email_branding_enabled: boolean;
  pdf_branding_enabled: boolean;
  enabled_by: string | null;
  enabled_at: string | null;
  notes: string | null;
}

interface Branding {
  app_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

interface Domain {
  id: string;
  domain: string;
  is_verified: boolean;
  ssl_status: string;
}

export const AdminWhiteLabelManagement = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showPreviewSheet, setShowPreviewSheet] = useState(false);

  // Fetch all organizations with white-label data
  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ['admin-organizations-whitelabel'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, owner_email, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Organization[];
    },
  });

  // Fetch white-label settings for all orgs
  const { data: allSettings = [] } = useQuery({
    queryKey: ['admin-whitelabel-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_whitelabel_settings')
        .select('*');
      if (error) throw error;
      return data as WhiteLabelSettings[];
    },
  });

  // Fetch branding for selected org
  const { data: selectedBranding } = useQuery({
    queryKey: ['admin-org-branding', selectedOrg?.id],
    queryFn: async () => {
      if (!selectedOrg?.id) return null;
      const { data, error } = await supabase
        .from('organization_branding')
        .select('*')
        .eq('organization_id', selectedOrg.id)
        .maybeSingle();
      if (error) throw error;
      return data as Branding | null;
    },
    enabled: !!selectedOrg?.id,
  });

  // Fetch domains for selected org
  const { data: selectedDomains = [] } = useQuery({
    queryKey: ['admin-org-domains', selectedOrg?.id],
    queryFn: async () => {
      if (!selectedOrg?.id) return [];
      const { data, error } = await supabase
        .from('organization_domains')
        .select('*')
        .eq('organization_id', selectedOrg.id);
      if (error) throw error;
      return data as Domain[];
    },
    enabled: !!selectedOrg?.id,
  });

  // Update white-label settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<WhiteLabelSettings> & { organization_id: string }) => {
      const { data: existing } = await supabase
        .from('organization_whitelabel_settings')
        .select('id')
        .eq('organization_id', settings.organization_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('organization_whitelabel_settings')
          .update({
            ...settings,
            enabled_at: new Date().toISOString(),
            enabled_by: 'Super Admin',
          })
          .eq('organization_id', settings.organization_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_whitelabel_settings')
          .insert({
            ...settings,
            enabled_at: new Date().toISOString(),
            enabled_by: 'Super Admin',
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-whitelabel-settings'] });
      toast.success('White-label settings updated');
    },
    onError: (error) => {
      toast.error('Failed to update settings: ' + error.message);
    },
  });

  // Verify domain mutation
  const verifyDomainMutation = useMutation({
    mutationFn: async ({ domainId, verified }: { domainId: string; verified: boolean }) => {
      const { error } = await supabase
        .from('organization_domains')
        .update({
          is_verified: verified,
          verified_at: verified ? new Date().toISOString() : null,
          ssl_status: verified ? 'active' : 'pending',
        })
        .eq('id', domainId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-domains'] });
      toast.success('Domain verification status updated');
    },
    onError: (error) => {
      toast.error('Failed to update domain: ' + error.message);
    },
  });

  const getSettingsForOrg = (orgId: string): WhiteLabelSettings | undefined => {
    return allSettings.find(s => s.organization_id === orgId);
  };

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.owner_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Settings form state
  const [formSettings, setFormSettings] = useState<Partial<WhiteLabelSettings>>({});

  const handleOpenSettings = (org: Organization) => {
    setSelectedOrg(org);
    const existingSettings = getSettingsForOrg(org.id);
    setFormSettings({
      whitelabel_enabled: existingSettings?.whitelabel_enabled || false,
      custom_domain_enabled: existingSettings?.custom_domain_enabled || false,
      email_branding_enabled: existingSettings?.email_branding_enabled || false,
      pdf_branding_enabled: existingSettings?.pdf_branding_enabled || false,
      notes: existingSettings?.notes || '',
    });
    setShowSettingsDialog(true);
  };

  const handleSaveSettings = () => {
    if (!selectedOrg) return;
    updateSettingsMutation.mutate({
      organization_id: selectedOrg.id,
      ...formSettings,
    });
    setShowSettingsDialog(false);
  };

  const handleOpenPreview = (org: Organization) => {
    setSelectedOrg(org);
    setShowPreviewSheet(true);
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {allSettings.filter(s => s.whitelabel_enabled).length}
                </p>
                <p className="text-sm text-muted-foreground">White-Label Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {allSettings.filter(s => s.custom_domain_enabled).length}
                </p>
                <p className="text-sm text-muted-foreground">Custom Domains</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {allSettings.filter(s => s.email_branding_enabled).length}
                </p>
                <p className="text-sm text-muted-foreground">Email Branding</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {allSettings.filter(s => s.pdf_branding_enabled).length}
                </p>
                <p className="text-sm text-muted-foreground">PDF Branding</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>White-Label Management</CardTitle>
              <CardDescription>Enable and configure white-label features per organization</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>White-Label</TableHead>
                  <TableHead>Custom Domain</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>PDF</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrgs.map((org) => {
                  const settings = getSettingsForOrg(org.id);
                  return (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <p className="text-sm text-muted-foreground">{org.owner_email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {settings?.whitelabel_enabled ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        {settings?.custom_domain_enabled ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        {settings?.email_branding_enabled ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        {settings?.pdf_branding_enabled ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenPreview(org)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenSettings(org)}
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>White-Label Settings</DialogTitle>
            <DialogDescription>
              Configure white-label features for {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>White-Label Branding</Label>
                <p className="text-sm text-muted-foreground">
                  Allow custom logo, colors, and app name
                </p>
              </div>
              <Switch
                checked={formSettings.whitelabel_enabled}
                onCheckedChange={(checked) => 
                  setFormSettings({ ...formSettings, whitelabel_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Custom Domain</Label>
                <p className="text-sm text-muted-foreground">
                  Allow tenant to use their own domain
                </p>
              </div>
              <Switch
                checked={formSettings.custom_domain_enabled}
                onCheckedChange={(checked) => 
                  setFormSettings({ ...formSettings, custom_domain_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Branding</Label>
                <p className="text-sm text-muted-foreground">
                  Custom email sender and footer
                </p>
              </div>
              <Switch
                checked={formSettings.email_branding_enabled}
                onCheckedChange={(checked) => 
                  setFormSettings({ ...formSettings, email_branding_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>PDF Branding</Label>
                <p className="text-sm text-muted-foreground">
                  Custom branding on invoices and documents
                </p>
              </div>
              <Switch
                checked={formSettings.pdf_branding_enabled}
                onCheckedChange={(checked) => 
                  setFormSettings({ ...formSettings, pdf_branding_enabled: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Admin Notes</Label>
              <Textarea
                value={formSettings.notes || ''}
                onChange={(e) => setFormSettings({ ...formSettings, notes: e.target.value })}
                placeholder="Internal notes about this organization's white-label setup..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings} disabled={updateSettingsMutation.isPending}>
              {updateSettingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Sheet */}
      <Sheet open={showPreviewSheet} onOpenChange={setShowPreviewSheet}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>Branding Preview</SheetTitle>
            <SheetDescription>
              Preview branding for {selectedOrg?.name}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            {/* Branding Info */}
            <div className="space-y-4">
              <h4 className="font-medium">Brand Identity</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">App Name</p>
                  <p className="font-medium">{selectedBranding?.app_name || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Logo</p>
                  {selectedBranding?.logo_url ? (
                    <img 
                      src={selectedBranding.logo_url} 
                      alt="Logo" 
                      className="h-8 object-contain"
                    />
                  ) : (
                    <p className="font-medium text-muted-foreground">Not set</p>
                  )}
                </div>
              </div>

              {/* Colors */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Brand Colors</p>
                <div className="flex gap-3">
                  <div 
                    className="h-12 w-16 rounded-lg shadow-sm border"
                    style={{ backgroundColor: selectedBranding?.primary_color || '#6366f1' }}
                  />
                  <div 
                    className="h-12 w-16 rounded-lg shadow-sm border"
                    style={{ backgroundColor: selectedBranding?.secondary_color || '#8b5cf6' }}
                  />
                </div>
              </div>
            </div>

            {/* Domains */}
            <div className="space-y-4">
              <h4 className="font-medium">Custom Domains</h4>
              {selectedDomains.length === 0 ? (
                <p className="text-sm text-muted-foreground">No domains configured</p>
              ) : (
                <div className="space-y-2">
                  {selectedDomains.map((domain) => (
                    <div key={domain.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span>{domain.domain}</span>
                        {domain.is_verified ? (
                          <Badge variant="default" className="bg-green-500 text-xs">Verified</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Pending</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!domain.is_verified && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => verifyDomainMutation.mutate({ domainId: domain.id, verified: true })}
                          >
                            Verify
                          </Button>
                        )}
                        {domain.is_verified && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(`https://${domain.domain}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview Mockup */}
            <div className="space-y-4">
              <h4 className="font-medium">App Preview</h4>
              <div className="border rounded-lg overflow-hidden">
                {/* Header mockup */}
                <div 
                  className="h-12 flex items-center px-4 gap-3"
                  style={{ backgroundColor: selectedBranding?.primary_color || '#6366f1' }}
                >
                  {selectedBranding?.logo_url ? (
                    <img src={selectedBranding.logo_url} alt="Logo" className="h-6" />
                  ) : (
                    <div className="h-6 w-6 bg-white/20 rounded" />
                  )}
                  <span className="text-white font-medium">
                    {selectedBranding?.app_name || selectedOrg?.name}
                  </span>
                </div>
                {/* Content mockup */}
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-1/2 bg-muted rounded" />
                  <div className="h-20 bg-muted/50 rounded-lg" />
                  <div 
                    className="h-8 w-24 rounded-lg"
                    style={{ backgroundColor: selectedBranding?.primary_color || '#6366f1' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
