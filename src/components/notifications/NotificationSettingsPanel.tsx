import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, MessageSquare, Phone, Bell, BellOff, Save } from 'lucide-react';
import {
  useNotificationSettings,
  NotificationChannel,
  NotificationType,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_CATEGORIES,
} from '@/hooks/useNotificationSettings';
import { useOrganization } from '@/contexts/OrganizationContext';

const channelIcons: Record<NotificationChannel, React.ReactNode> = {
  email: <Mail className="h-5 w-5" />,
  sms: <Phone className="h-5 w-5" />,
  whatsapp: <MessageSquare className="h-5 w-5" />,
};

const channelLabels: Record<NotificationChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
};

export const NotificationSettingsPanel = () => {
  const {
    channelSettings,
    typeSettings,
    loading,
    saving,
    updateChannelSetting,
    updateTypeSetting,
  } = useNotificationSettings();
  const { isOrgOwner } = useOrganization();

  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null);
  const [channelForm, setChannelForm] = useState({
    contact_email: '',
    contact_phone: '',
    whatsapp_number: '',
  });

  const handleEditChannel = (channel: NotificationChannel) => {
    const setting = channelSettings.find(c => c.channel === channel);
    setChannelForm({
      contact_email: setting?.contact_email || '',
      contact_phone: setting?.contact_phone || '',
      whatsapp_number: setting?.whatsapp_number || '',
    });
    setEditingChannel(channel);
  };

  const handleSaveChannel = async () => {
    if (!editingChannel) return;
    
    await updateChannelSetting(editingChannel, {
      contact_email: channelForm.contact_email || undefined,
      contact_phone: channelForm.contact_phone || undefined,
      whatsapp_number: channelForm.whatsapp_number || undefined,
    });
    
    setEditingChannel(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!isOrgOwner) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <BellOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Only organization owners can manage notification settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="channels" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="channels">Channels</TabsTrigger>
        <TabsTrigger value="types">Notification Types</TabsTrigger>
      </TabsList>

      <TabsContent value="channels" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Channels
            </CardTitle>
            <CardDescription>
              Configure how you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {(['email', 'sms', 'whatsapp'] as NotificationChannel[]).map(channel => {
              const setting = channelSettings.find(c => c.channel === channel);
              const isEditing = editingChannel === channel;

              return (
                <div key={channel} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {channelIcons[channel]}
                      <div>
                        <h4 className="font-medium">{channelLabels[channel]}</h4>
                        <p className="text-sm text-muted-foreground">
                          {channel === 'email' && 'Receive notifications via email'}
                          {channel === 'sms' && 'Receive SMS alerts for urgent notifications'}
                          {channel === 'whatsapp' && 'Get WhatsApp messages for important updates'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={setting?.is_enabled ?? false}
                      onCheckedChange={(checked) => updateChannelSetting(channel, { is_enabled: checked })}
                      disabled={saving}
                    />
                  </div>

                  {setting?.is_enabled && (
                    <div className="pl-8 space-y-3">
                      {isEditing ? (
                        <div className="space-y-3">
                          {channel === 'email' && (
                            <div>
                              <Label>Email Address</Label>
                              <Input
                                type="email"
                                value={channelForm.contact_email}
                                onChange={(e) => setChannelForm(prev => ({ ...prev, contact_email: e.target.value }))}
                                placeholder="Enter email address"
                              />
                            </div>
                          )}
                          {channel === 'sms' && (
                            <div>
                              <Label>Phone Number</Label>
                              <Input
                                type="tel"
                                value={channelForm.contact_phone}
                                onChange={(e) => setChannelForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                                placeholder="+880 1XXXXXXXXX"
                              />
                            </div>
                          )}
                          {channel === 'whatsapp' && (
                            <div>
                              <Label>WhatsApp Number</Label>
                              <Input
                                type="tel"
                                value={channelForm.whatsapp_number}
                                onChange={(e) => setChannelForm(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                                placeholder="+880 1XXXXXXXXX"
                              />
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveChannel} disabled={saving}>
                              <Save className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingChannel(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            {channel === 'email' && (setting?.contact_email || 'Using organization email')}
                            {channel === 'sms' && (setting?.contact_phone || 'No phone number set')}
                            {channel === 'whatsapp' && (setting?.whatsapp_number || setting?.contact_phone || 'No number set')}
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => handleEditChannel(channel)}>
                            Edit
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="types" className="space-y-4">
        {Object.entries(NOTIFICATION_TYPE_CATEGORIES).map(([category, types]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">{category}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {types.map(type => {
                const setting = typeSettings.find(t => t.notification_type === type);
                return (
                  <div key={type} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{NOTIFICATION_TYPE_LABELS[type]}</span>
                      {setting?.is_enabled ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <Switch
                      checked={setting?.is_enabled ?? true}
                      onCheckedChange={(checked) => updateTypeSetting(type, checked)}
                      disabled={saving}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </TabsContent>
    </Tabs>
  );
};
