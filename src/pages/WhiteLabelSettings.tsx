import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrandingSettingsPanel } from '@/components/whitelabel/BrandingSettingsPanel';
import { CustomDomainPanel } from '@/components/whitelabel/CustomDomainPanel';
import { EmailBrandingPanel } from '@/components/whitelabel/EmailBrandingPanel';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Palette, Globe, Mail, FileText, Crown } from 'lucide-react';
import { LockedOverlay } from '@/components/subscription/LockedOverlay';
import { useNavigate } from 'react-router-dom';

const WhiteLabelSettings = () => {
  const { subscription, isOrgOwner } = useOrganization();
  const { isProPlan, isWhiteLabelEnabled, isCustomDomainEnabled, isEmailBrandingEnabled, isPdfBrandingEnabled } = useWhiteLabel();
  const navigate = useNavigate();

  // Check if on Pro plan
  const hasAccess = isProPlan;

  if (!isOrgOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Lock className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Only organization owners can access white-label settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="White-Label Settings"
        description="Customize your app's branding and make it your own"
      />

      {/* Plan Banner */}
      {!hasAccess && (
        <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Crown className="h-8 w-8 text-amber-500" />
              <div>
                <h3 className="font-semibold">Upgrade to Pro</h3>
                <p className="text-sm text-muted-foreground">
                  White-label features are available on Pro and Enterprise plans
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-amber-500 text-amber-500">
              Pro Feature
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Feature Status */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isWhiteLabelEnabled ? 'bg-green-500/10' : 'bg-muted'}`}>
                <Palette className={`h-5 w-5 ${isWhiteLabelEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-sm font-medium">Branding</p>
                <Badge variant={isWhiteLabelEnabled ? 'default' : 'secondary'} className="text-xs">
                  {isWhiteLabelEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isCustomDomainEnabled ? 'bg-green-500/10' : 'bg-muted'}`}>
                <Globe className={`h-5 w-5 ${isCustomDomainEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-sm font-medium">Custom Domain</p>
                <Badge variant={isCustomDomainEnabled ? 'default' : 'secondary'} className="text-xs">
                  {isCustomDomainEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isEmailBrandingEnabled ? 'bg-green-500/10' : 'bg-muted'}`}>
                <Mail className={`h-5 w-5 ${isEmailBrandingEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-sm font-medium">Email Branding</p>
                <Badge variant={isEmailBrandingEnabled ? 'default' : 'secondary'} className="text-xs">
                  {isEmailBrandingEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isPdfBrandingEnabled ? 'bg-green-500/10' : 'bg-muted'}`}>
                <FileText className={`h-5 w-5 ${isPdfBrandingEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-sm font-medium">PDF Branding</p>
                <Badge variant={isPdfBrandingEnabled ? 'default' : 'secondary'} className="text-xs">
                  {isPdfBrandingEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <div className="relative">
        {!hasAccess && (
          <LockedOverlay 
            message="White-Label features require Pro plan"
          />
        )}
        
        <Tabs defaultValue="branding" className={!hasAccess ? 'opacity-50 pointer-events-none' : ''}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="branding">
              <Palette className="h-4 w-4 mr-2" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="domain">
              <Globe className="h-4 w-4 mr-2" />
              Custom Domain
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              Email Branding
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding" className="mt-6">
            <BrandingSettingsPanel />
          </TabsContent>

          <TabsContent value="domain" className="mt-6">
            <CustomDomainPanel />
          </TabsContent>

          <TabsContent value="email" className="mt-6">
            <EmailBrandingPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WhiteLabelSettings;
