import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useDeviceRestriction } from '@/hooks/useDeviceRestriction';
import { Smartphone, ShieldCheck, ShieldX, Trash2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export const DeviceRestrictionSettings: React.FC = () => {
  const {
    settings,
    allDeviceRegistrations,
    isLoadingAllDevices,
    approveDevice,
    revokeDevice,
    deleteDevice,
    updateSettings,
    isRestrictionEnabled,
  } = useDeviceRestriction();

  const handleToggleRestriction = (enabled: boolean) => {
    updateSettings.mutate({ device_restriction_enabled: enabled });
  };

  const handleToggleAutoApprove = (enabled: boolean) => {
    updateSettings.mutate({ auto_approve_first_device: enabled });
  };

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Device Restriction Settings
          </CardTitle>
          <CardDescription>
            Control which devices can be used to mark attendance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="device-restriction" className="text-base">
                Enable Device Restriction
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, employees can only mark attendance from approved devices
              </p>
            </div>
            <Switch
              id="device-restriction"
              checked={isRestrictionEnabled}
              onCheckedChange={handleToggleRestriction}
              disabled={updateSettings.isPending}
            />
          </div>

          {isRestrictionEnabled && (
            <div className="flex items-center justify-between border-t pt-4">
              <div className="space-y-0.5">
                <Label htmlFor="auto-approve" className="text-base">
                  Auto-Approve First Device
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically approve the first device an employee uses
                </p>
              </div>
              <Switch
                id="auto-approve"
                checked={settings?.auto_approve_first_device ?? true}
                onCheckedChange={handleToggleAutoApprove}
                disabled={updateSettings.isPending}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Device Registrations */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Devices</CardTitle>
          <CardDescription>
            View and manage devices registered by employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAllDevices ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : allDeviceRegistrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No devices registered yet</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDeviceRegistrations.map((device: any) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">
                        {device.employee?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{device.device_name || 'Unknown Device'}</p>
                          <p className="text-xs text-muted-foreground">
                            {device.browser_info} • {device.os_info}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {device.is_approved ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            <ShieldX className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {device.last_used_at
                          ? format(new Date(device.last_used_at), 'dd/MM/yyyy HH:mm')
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(device.created_at), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!device.is_approved ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => approveDevice.mutate(device.id)}
                              disabled={approveDevice.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              onClick={() => revokeDevice.mutate(device.id)}
                              disabled={revokeDevice.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Device Registration</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove the device registration. The employee will need to
                                  register their device again.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteDevice.mutate(device.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
