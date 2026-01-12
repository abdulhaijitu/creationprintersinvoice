import React, { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CorrectionRequestsTable } from '@/components/attendance/CorrectionRequestsTable';
import { DeviceRestrictionSettings } from '@/components/attendance/DeviceRestrictionSettings';
import { useAttendanceCorrectionRequests } from '@/hooks/useAttendanceCorrectionRequests';
import { Clock, Smartphone, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const AttendanceCorrectionRequests: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const { correctionRequests, pendingCount, isLoading } = useAttendanceCorrectionRequests();

  const approvedCount = correctionRequests.filter((r) => r.status === 'approved').length;
  const rejectedCount = correctionRequests.filter((r) => r.status === 'rejected').length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Attendance Corrections"
        description="Review and manage attendance correction requests"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">Total approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground">Total rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="pending" className="gap-2">
            <FileText className="h-4 w-4" />
            Pending
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="h-4 w-4" />
            Rejected
          </TabsTrigger>
          <TabsTrigger value="devices" className="gap-2">
            <Smartphone className="h-4 w-4" />
            Devices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Correction Requests</CardTitle>
              <CardDescription>
                Review and approve or reject employee correction requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CorrectionRequestsTable filter="pending" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Approved Requests</CardTitle>
              <CardDescription>
                Correction requests that have been approved and applied
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CorrectionRequestsTable filter="approved" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Rejected Requests</CardTitle>
              <CardDescription>
                Correction requests that have been rejected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CorrectionRequestsTable filter="rejected" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="mt-6">
          <DeviceRestrictionSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttendanceCorrectionRequests;
