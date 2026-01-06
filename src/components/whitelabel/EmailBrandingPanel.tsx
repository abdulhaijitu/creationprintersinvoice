import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useWhiteLabel, EmailBranding } from '@/hooks/useWhiteLabel';
import { Loader2, Mail, MessageSquare, Phone } from 'lucide-react';

export const EmailBrandingPanel = () => {
  const { emailBranding, updateEmailBranding, isEmailBrandingUpdating, isEmailBrandingEnabled } = useWhiteLabel();
  
  const [formData, setFormData] = useState<EmailBranding>({
    sender_name: '',
    sender_email: '',
    reply_to_email: '',
    email_footer: '',
    whatsapp_sender_label: '',
    sms_sender_label: '',
  });

  useEffect(() => {
    if (emailBranding) {
      setFormData({
        sender_name: emailBranding.sender_name || '',
        sender_email: emailBranding.sender_email || '',
        reply_to_email: emailBranding.reply_to_email || '',
        email_footer: emailBranding.email_footer || '',
        whatsapp_sender_label: emailBranding.whatsapp_sender_label || '',
        sms_sender_label: emailBranding.sms_sender_label || '',
      });
    }
  }, [emailBranding]);

  const handleSave = () => {
    updateEmailBranding(formData);
  };

  if (!isEmailBrandingEnabled) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Mail className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Email Branding Not Enabled</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Contact your administrator to enable email branding for your organization.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Branding
          </CardTitle>
          <CardDescription>
            Customize how emails appear to your customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sender_name">Sender Name</Label>
              <Input
                id="sender_name"
                value={formData.sender_name || ''}
                onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                placeholder="Your Company Name"
              />
              <p className="text-xs text-muted-foreground">
                This name will appear as the sender of all emails
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sender_email">Sender Email</Label>
              <Input
                id="sender_email"
                type="email"
                value={formData.sender_email || ''}
                onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
                placeholder="noreply@yourdomain.com"
              />
              <p className="text-xs text-muted-foreground">
                Requires domain verification
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reply_to_email">Reply-To Email</Label>
            <Input
              id="reply_to_email"
              type="email"
              value={formData.reply_to_email || ''}
              onChange={(e) => setFormData({ ...formData, reply_to_email: e.target.value })}
              placeholder="support@yourdomain.com"
            />
            <p className="text-xs text-muted-foreground">
              Replies will be sent to this address
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email_footer">Email Footer</Label>
            <Textarea
              id="email_footer"
              value={formData.email_footer || ''}
              onChange={(e) => setFormData({ ...formData, email_footer: e.target.value })}
              placeholder="© 2024 Your Company. Address: 123 Street, City, Country. Contact: support@yourdomain.com"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This text will appear at the bottom of all emails
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SMS & WhatsApp */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS & WhatsApp Branding
          </CardTitle>
          <CardDescription>
            Customize how messages appear to your customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sms_sender_label">SMS Sender ID</Label>
              <Input
                id="sms_sender_label"
                value={formData.sms_sender_label || ''}
                onChange={(e) => setFormData({ ...formData, sms_sender_label: e.target.value })}
                placeholder="YOURCOMPANY"
                maxLength={11}
              />
              <p className="text-xs text-muted-foreground">
                Max 11 characters, alphanumeric only
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="whatsapp_sender_label">WhatsApp Business Name</Label>
              <Input
                id="whatsapp_sender_label"
                value={formData.whatsapp_sender_label || ''}
                onChange={(e) => setFormData({ ...formData, whatsapp_sender_label: e.target.value })}
                placeholder="Your Company Name"
              />
              <p className="text-xs text-muted-foreground">
                Display name for WhatsApp messages
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Email Preview</CardTitle>
          <CardDescription>
            Preview how your branded emails will look
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            {/* Email Header */}
            <div className="bg-muted/50 p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {(formData.sender_name || 'C')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{formData.sender_name || 'Your Company'}</p>
                  <p className="text-sm text-muted-foreground">
                    {formData.sender_email || 'noreply@example.com'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Email Body */}
            <div className="p-6 space-y-4">
              <p className="text-lg font-semibold">Invoice #INV-001</p>
              <p className="text-muted-foreground">
                Dear Customer, please find attached your invoice for the recent services.
              </p>
              <div className="h-24 bg-muted/30 rounded-lg flex items-center justify-center text-muted-foreground">
                [Invoice Content]
              </div>
            </div>
            
            {/* Email Footer */}
            <div className="bg-muted/30 p-4 border-t text-center text-sm text-muted-foreground">
              {formData.email_footer || '© 2024 Your Company. All rights reserved.'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isEmailBrandingUpdating}>
          {isEmailBrandingUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Email Branding
        </Button>
      </div>
    </div>
  );
};
