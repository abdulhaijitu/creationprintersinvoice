import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOwnershipTransfer } from '@/hooks/useOwnershipTransfer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CriticalActionDialog } from '@/components/shared/CriticalActionDialog';
import { Crown, Send, XCircle, Clock, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { format } from 'date-fns';

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  profile?: { full_name: string | null };
  email?: string;
}

export const OwnershipTransferRequest = () => {
  const { organization, isOrgOwner } = useOrganization();
  const { pendingRequest, loadingRequest, cancelTransfer, requestTransfer } = useOwnershipTransfer();
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [note, setNote] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Fetch team members
  const { data: teamMembers = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['team-members-for-transfer', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data: members, error } = await supabase
        .from('organization_members')
        .select('id, user_id, role')
        .eq('organization_id', organization.id)
        .neq('role', 'owner');
      
      if (error) throw error;

      // Fetch profiles for each member
      const enrichedMembers = await Promise.all(
        (members || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', member.user_id)
            .single();
          
          return { ...member, profile } as TeamMember;
        })
      );

      return enrichedMembers;
    },
    enabled: !!organization?.id && isOrgOwner,
  });

  if (!isOrgOwner) {
    return null;
  }

  const handleSubmitRequest = () => {
    if (selectedMember) {
      requestTransfer.mutate({ targetUserId: selectedMember, note: note || undefined }, {
        onSuccess: () => {
          setConfirmDialogOpen(false);
          setSelectedMember('');
          setNote('');
        },
      });
    }
  };

  const handleCancelRequest = () => {
    if (pendingRequest) {
      cancelTransfer.mutate(pendingRequest.id);
    }
  };

  const selectedMemberInfo = teamMembers.find(m => m.user_id === selectedMember);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          Transfer Ownership
        </CardTitle>
        <CardDescription>
          Request to transfer organization ownership to another team member
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingRequest ? (
          <div className="space-y-4">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Pending Transfer Request</strong>
                <p className="mt-1 text-sm">
                  A transfer request is awaiting approval from the platform administrator.
                </p>
              </AlertDescription>
            </Alert>
            
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending Review
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Requested</span>
                <span className="text-sm">{format(new Date(pendingRequest.created_at), 'MMM d, yyyy')}</span>
              </div>
              {pendingRequest.note && (
                <div className="pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Note:</span>
                  <p className="text-sm mt-1">{pendingRequest.note}</p>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              onClick={handleCancelRequest}
              disabled={cancelTransfer.isPending}
              className="w-full"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {cancelTransfer.isPending ? 'Cancelling...' : 'Cancel Request'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant="default" className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>Important:</strong> Transferring ownership will give the new owner full control over this organization, including billing and team management.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Select New Owner</Label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.profile?.full_name || 'Unknown'} ({member.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {teamMembers.length === 0 && !loadingMembers && (
                <p className="text-sm text-muted-foreground">
                  No other team members available for transfer.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note for the administrator..."
                rows={3}
              />
            </div>

            <Button
              onClick={() => setConfirmDialogOpen(true)}
              disabled={!selectedMember || requestTransfer.isPending}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Request Transfer
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              <Info className="h-3 w-3 inline mr-1" />
              Transfers require approval from a platform administrator
            </p>
          </div>
        )}
      </CardContent>

      <CriticalActionDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Confirm Ownership Transfer Request"
        description={`You are requesting to transfer ownership of "${organization?.name}" to ${selectedMemberInfo?.profile?.full_name || 'the selected member'}. This action will be reviewed by a platform administrator. Once approved, you will be demoted to Manager role.`}
        confirmText="Submit Request"
        confirmValue={organization?.name || ''}
        onConfirm={handleSubmitRequest}
        isDestructive={false}
        isLoading={requestTransfer.isPending}
      />
    </Card>
  );
};
