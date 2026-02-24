import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SmsSettingsProps {
  isReadOnly?: boolean;
}

export function SmsNotificationSettings({ isReadOnly = false }: SmsSettingsProps) {
  const [provider, setProvider] = useState('bulksmsbd');
  const [testNumber, setTestNumber] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Notification event toggles
  const [events, setEvents] = useState({
    invoiceReminder: true,
    paymentConfirmation: true,
    taskUpdate: false,
    quotationSent: false,
  });

  const toggleEvent = (key: keyof typeof events) => {
    setEvents(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const sendTestSms = async () => {
    if (!testNumber) {
      toast.error('Enter a phone number first');
      return;
    }

    setSending(true);
    setSent(false);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms-notification', {
        body: {
          to: testNumber,
          message: 'Test SMS from PrintoSaaS 🎉 Your SMS notifications are working!',
          provider,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setSent(true);
        toast.success('Test SMS sent successfully!');
      } else {
        toast.error(data?.error || 'Failed to send test SMS');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send test SMS');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          SMS Notifications
        </CardTitle>
        <CardDescription>
          Configure SMS notifications for invoices, payments and tasks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label>SMS Provider</Label>
          <Select value={provider} onValueChange={setProvider} disabled={isReadOnly}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bulksmsbd">BulkSMSBD</SelectItem>
              <SelectItem value="sslwireless">SSL Wireless</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            API Key ও Sender ID সিক্রেট হিসেবে কনফিগার করতে হবে
          </p>
        </div>

        {/* Notification Events */}
        <div className="space-y-3">
          <Label>Notification Events</Label>
          <div className="space-y-2">
            {[
              { key: 'invoiceReminder' as const, label: 'Invoice Due Reminder', desc: 'ইনভয়েস ডিউ ডেটের আগে SMS' },
              { key: 'paymentConfirmation' as const, label: 'Payment Confirmation', desc: 'পেমেন্ট পাওয়ার পর কাস্টমারকে SMS' },
              { key: 'taskUpdate' as const, label: 'Task Status Updates', desc: 'টাস্ক স্ট্যাটাস পরিবর্তনে SMS' },
              { key: 'quotationSent' as const, label: 'Quotation Sent', desc: 'কোটেশন পাঠানোর পর কাস্টমারকে SMS' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-md border">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  checked={events[key]}
                  onCheckedChange={() => toggleEvent(key)}
                  disabled={isReadOnly}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Test SMS */}
        {!isReadOnly && (
          <div className="space-y-2 border-t pt-4">
            <Label>Send Test SMS</Label>
            <div className="flex gap-2">
              <Input
                placeholder="01XXXXXXXXX"
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
                className="flex-1"
              />
              <Button onClick={sendTestSms} disabled={sending || !testNumber}>
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : sent ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
