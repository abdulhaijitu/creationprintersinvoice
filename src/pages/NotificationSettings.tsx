import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { NotificationSettingsPanel } from '@/components/notifications/NotificationSettingsPanel';
import { NotificationLogsPanel } from '@/components/notifications/NotificationLogsPanel';
import { Bell, Settings, History } from 'lucide-react';

const NotificationSettings = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Settings"
        description="Manage how you receive notifications and alerts"
      />

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <NotificationSettingsPanel />
        </TabsContent>

        <TabsContent value="history">
          <NotificationLogsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationSettings;
