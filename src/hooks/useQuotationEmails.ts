import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type EmailType = 'sent' | 'accepted' | 'expiring_soon' | 'expired';

export const useQuotationEmails = () => {
  const sendQuotationEmail = async (
    quotationId: string,
    emailType: EmailType,
    recipientEmail?: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('send-quotation-email', {
        body: {
          quotation_id: quotationId,
          email_type: emailType,
          recipient_email: recipientEmail,
        },
      });

      if (error) {
        console.error('Error sending quotation email:', error);
        toast.error('Failed to send email notification');
        return false;
      }

      if (data?.skipped) {
        console.log('Email skipped - no recipient email available');
        return true; // Not an error, just skipped
      }

      if (data?.success) {
        const emailTypeLabels: Record<EmailType, string> = {
          sent: 'Quotation sent',
          accepted: 'Acceptance confirmation',
          expiring_soon: 'Expiry reminder',
          expired: 'Expiry notification',
        };
        toast.success(`${emailTypeLabels[emailType]} email sent successfully`);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error invoking email function:', err);
      toast.error('Failed to send email notification');
      return false;
    }
  };

  return { sendQuotationEmail };
};
