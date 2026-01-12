import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2,
  AlertCircle,
  Shield,
  Calculator,
  UserCheck,
  Palette,
  Briefcase,
  UserCog,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { OrgRole, ORG_ROLE_DISPLAY } from '@/lib/permissions/constants';

interface EditTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    user_id: string;
    role: OrgRole;
    profile?: {
      id: string;
      full_name: string;
      phone: string | null;
    } | null;
  } | null;
  organizationId: string;
  onSuccess: () => void;
}

const ASSIGNABLE_ROLES: OrgRole[] = ['manager', 'accounts', 'sales_staff', 'designer', 'employee'];

const roleIcons: Record<string, React.ReactNode> = {
  manager: <Shield className="h-4 w-4" />,
  accounts: <Calculator className="h-4 w-4" />,
  sales_staff: <UserCheck className="h-4 w-4" />,
  designer: <Palette className="h-4 w-4" />,
  employee: <Briefcase className="h-4 w-4" />,
};

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export const EditTeamMemberDialog: React.FC<EditTeamMemberDialogProps> = ({
  open,
  onOpenChange,
  member,
  organizationId,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<OrgRole>('employee');
  const [resetPassword, setResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset form when member changes
  useEffect(() => {
    if (member) {
      setFullName(member.profile?.full_name || '');
      setPhone(member.profile?.phone || '');
      setRole(member.role);
      setResetPassword(false);
      setNewPassword('');
      setShowPassword(false);
      setError('');
    }
  }, [member]);

  const handleGeneratePassword = () => {
    setNewPassword(generatePassword(12));
    setShowPassword(true);
  };

  const handleSubmit = async () => {
    if (!member) return;
    setError('');

    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }

    if (resetPassword && newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
        })
        .eq('id', member.user_id);

      if (profileError) throw profileError;

      // Update role if changed
      if (role !== member.role) {
        const { error: roleError } = await supabase
          .from('organization_members')
          .update({ role })
          .eq('id', member.id);

        if (roleError) throw roleError;
      }

      // Reset password if requested (via edge function)
      if (resetPassword && newPassword) {
        const { error: resetError, data } = await supabase.functions.invoke('add-team-member', {
          body: {
            action: 'reset-password',
            userId: member.user_id,
            newPassword,
            organizationId,
          },
        });

        if (resetError) {
          console.error('[EditTeamMemberDialog] Password reset error:', resetError);
          throw new Error('Failed to reset password');
        }

        if (data && !data.success) {
          throw new Error(data.error || 'Failed to reset password');
        }

        toast.success('Member updated with new password', {
          description: `New password: ${newPassword}`,
          duration: 10000,
        });
      } else {
        toast.success('Team member updated successfully');
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('[EditTeamMemberDialog] Error:', err);
      setError(err?.message || 'Failed to update team member');
      toast.error('Failed to update team member');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!member) return null;

  const isOwner = member.role === 'owner';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Edit Team Member
          </DialogTitle>
          <DialogDescription>
            Update team member details, role, or reset their password.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-name"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone (optional)</Label>
            <Input
              id="edit-phone"
              type="tel"
              placeholder="+880 1XXX-XXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="edit-role">Role</Label>
            {isOwner ? (
              <p className="text-sm text-muted-foreground italic">
                Owner role cannot be changed
              </p>
            ) : (
              <Select
                value={role}
                onValueChange={(v) => setRole(v as OrgRole)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      <div className="flex items-center gap-2">
                        {roleIcons[r]}
                        {ORG_ROLE_DISPLAY[r]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Reset Password Section */}
          {!isOwner && (
            <>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="reset-password"
                  checked={resetPassword}
                  onCheckedChange={(checked) => setResetPassword(checked === true)}
                  disabled={isSubmitting}
                />
                <Label htmlFor="reset-password" className="text-sm font-normal cursor-pointer">
                  Reset password
                </Label>
              </div>

              {resetPassword && (
                <div className="space-y-2 pl-6">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-password">
                      New Password <span className="text-destructive">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGeneratePassword}
                      disabled={isSubmitting}
                      className="h-7 text-xs gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Generate
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isSubmitting}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="min-w-[120px]">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditTeamMemberDialog;
