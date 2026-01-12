import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ShieldX, MessageSquare } from 'lucide-react';

interface DeviceBlockedAlertProps {
  message: string;
  onRequestCorrection?: () => void;
}

export const DeviceBlockedAlert: React.FC<DeviceBlockedAlertProps> = ({
  message,
  onRequestCorrection,
}) => {
  return (
    <Alert variant="destructive" className="mb-4">
      <ShieldX className="h-5 w-5" />
      <AlertTitle className="ml-2">Device Not Approved</AlertTitle>
      <AlertDescription className="ml-2 mt-2">
        <p className="mb-3">{message}</p>
        {onRequestCorrection && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRequestCorrection}
            className="border-destructive/50 hover:bg-destructive/10"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Request Correction
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
