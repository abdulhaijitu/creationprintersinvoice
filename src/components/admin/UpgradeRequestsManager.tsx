import { useState } from 'react';
import { useUpgradeRequests, UpgradeRequest } from '@/hooks/useUpgradeRequests';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TableSkeleton } from '@/components/shared';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, ArrowUp, Building2, Search } from 'lucide-react';

export const UpgradeRequestsManager = () => {
  const { requests, loading, handleRequest } = useUpgradeRequests();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<UpgradeRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject' | null>(null);

  const filteredRequests = requests.filter(req =>
    req.organization_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingRequests = filteredRequests.filter(r => r.status === 'pending');
  const processedRequests = filteredRequests.filter(r => r.status !== 'pending');

  const handleAction = async () => {
    if (!selectedRequest || !dialogAction) return;
    
    setProcessing(true);
    const success = await handleRequest(
      selectedRequest.id, 
      dialogAction, 
      dialogAction === 'reject' ? rejectNotes : undefined
    );
    
    if (success) {
      setSelectedRequest(null);
      setDialogAction(null);
      setRejectNotes('');
    }
    setProcessing(false);
  };

  const openDialog = (request: UpgradeRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setDialogAction(action);
    setRejectNotes('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    const variants: Record<string, string> = {
      free: 'bg-muted text-muted-foreground',
      basic: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      pro: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      enterprise: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    };
    return (
      <Badge className={variants[plan] || 'bg-muted'}>
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </Badge>
    );
  };

  const RequestTable = ({ data }: { data: UpgradeRequest[] }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organization</TableHead>
            <TableHead>Plan Change</TableHead>
            <TableHead>Requested</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No upgrade requests found
              </TableCell>
            </TableRow>
          ) : (
            data.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{request.organization_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getPlanBadge(request.current_plan)}
                    <ArrowUp className="h-4 w-4 text-muted-foreground rotate-90" />
                    {getPlanBadge(request.requested_plan)}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(request.requested_at), 'dd/MM/yyyy HH:mm')}
                </TableCell>
                <TableCell>{getStatusBadge(request.status)}</TableCell>
                <TableCell className="text-right">
                  {request.status === 'pending' ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => openDialog(request, 'approve')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => openDialog(request, 'reject')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {request.reviewed_at && format(new Date(request.reviewed_at), 'dd/MM/yyyy')}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  if (loading) {
    return <TableSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUp className="h-5 w-5" />
          Plan Upgrade Requests
        </CardTitle>
        <CardDescription>
          Review and manage plan upgrade requests from organizations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary" className="ml-auto">
            {pendingRequests.length} Pending
          </Badge>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="relative">
              Pending
              {pendingRequests.length > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="processed">Processed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <RequestTable data={pendingRequests} />
          </TabsContent>
          <TabsContent value="processed">
            <RequestTable data={processedRequests} />
          </TabsContent>
          <TabsContent value="all">
            <RequestTable data={filteredRequests} />
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Approve/Reject Dialog */}
      <Dialog open={!!dialogAction} onOpenChange={() => setDialogAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'approve' ? 'Approve Upgrade Request' : 'Reject Upgrade Request'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  {dialogAction === 'approve' ? (
                    <>
                      Are you sure you want to upgrade <strong>{selectedRequest.organization_name}</strong> from{' '}
                      <strong>{selectedRequest.current_plan}</strong> to{' '}
                      <strong>{selectedRequest.requested_plan}</strong>?
                      This will unlock all features of the new plan immediately.
                    </>
                  ) : (
                    <>
                      Are you sure you want to reject the upgrade request from{' '}
                      <strong>{selectedRequest.organization_name}</strong>?
                    </>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {dialogAction === 'reject' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                placeholder="Provide a reason for rejection..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)} disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              variant={dialogAction === 'approve' ? 'default' : 'destructive'}
            >
              {processing ? 'Processing...' : dialogAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};