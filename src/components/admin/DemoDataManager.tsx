import React, { useState, useEffect } from 'react';
import { useDemoData } from '@/hooks/useDemoData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Database, Clock, History, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface DemoDataManagerProps {
  organizationId: string;
  organizationName: string;
}

export const DemoDataManager: React.FC<DemoDataManagerProps> = ({
  organizationId,
  organizationName,
}) => {
  const {
    loading,
    demoRecords,
    cleanupLogs,
    fetchDemoRecords,
    fetchCleanupLogs,
    cleanupDemoData,
  } = useDemoData(organizationId);

  const [isCleaningUp, setIsCleaningUp] = useState(false);

  useEffect(() => {
    fetchDemoRecords(organizationId);
    fetchCleanupLogs(organizationId);
  }, [organizationId, fetchDemoRecords, fetchCleanupLogs]);

  const handleCleanup = async () => {
    setIsCleaningUp(true);
    await cleanupDemoData(organizationId, 'manual');
    await fetchDemoRecords(organizationId);
    await fetchCleanupLogs(organizationId);
    setIsCleaningUp(false);
  };

  // Group records by table
  const recordsByTable = demoRecords.reduce((acc, record) => {
    if (!acc[record.table_name]) {
      acc[record.table_name] = [];
    }
    acc[record.table_name].push(record);
    return acc;
  }, {} as Record<string, typeof demoRecords>);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Demo Data for {organizationName}
              </CardTitle>
              <CardDescription>
                Manage demo data loaded for this organization
              </CardDescription>
            </div>
            {demoRecords.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isCleaningUp}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Cleanup All Demo Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Cleanup Demo Data
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {demoRecords.length} demo records from {organizationName}. 
                      This action cannot be undone. Only demo data will be deleted - real data is safe.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCleanup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete Demo Data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {demoRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No demo data exists for this organization</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Demo Records</p>
                  <p className="text-2xl font-bold">{demoRecords.length}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Tables Affected</p>
                  <p className="text-2xl font-bold">{Object.keys(recordsByTable).length}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Auto-Cleanup Records</p>
                  <p className="text-2xl font-bold">
                    {demoRecords.filter(r => r.cleanup_after || r.cleanup_on_first_real_data).length}
                  </p>
                </div>
              </div>

              {/* Records by Table */}
              <div className="space-y-2">
                <h4 className="font-medium">Records by Table</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(recordsByTable).map(([tableName, records]) => (
                    <Badge key={tableName} variant="secondary" className="gap-1">
                      {tableName}: {records.length}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Scheduled Cleanups */}
              {demoRecords.some(r => r.cleanup_after) && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Scheduled Cleanups
                  </h4>
                  <div className="text-sm text-muted-foreground">
                    {demoRecords
                      .filter(r => r.cleanup_after)
                      .slice(0, 5)
                      .map(r => (
                        <p key={r.id}>
                          {r.table_name} record scheduled for cleanup on{' '}
                          {format(new Date(r.cleanup_after!), 'PPp')}
                        </p>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cleanup History */}
      {cleanupLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Cleanup History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Records Deleted</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cleanupLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {format(new Date(log.created_at), 'PPp')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {log.cleanup_reason.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.records_deleted}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.details ? (
                        Object.entries(log.details as Record<string, number>)
                          .map(([table, count]) => `${table}: ${count}`)
                          .join(', ')
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
