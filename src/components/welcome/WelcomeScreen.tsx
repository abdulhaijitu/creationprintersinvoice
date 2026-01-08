import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useBranding } from '@/contexts/BrandingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  LayoutDashboard, 
  User, 
  Users,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface WelcomeScreenProps {
  onComplete: () => void;
}

const WelcomeScreen = ({ onComplete }: WelcomeScreenProps) => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { organization, membership } = useOrganization();
  const { appName } = useBranding();

  const handleGoToDashboard = () => {
    onComplete();
    navigate('/');
  };

  const handleCompleteProfile = () => {
    onComplete();
    navigate('/settings');
  };

  const handleInviteTeam = () => {
    onComplete();
    navigate('/team-members');
  };

  const getRoleLabel = () => {
    if (membership?.role === 'owner') return 'Owner';
    if (membership?.role === 'manager') return 'Manager';
    if (membership?.role === 'accounts') return 'Accounts';
    return 'Staff';
  };

  const canInviteTeam = membership?.role === 'owner' || membership?.role === 'manager';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg animate-scale-in">
        {/* Header with icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6 animate-fade-in">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Welcome to {appName} 👋
          </h1>
          <p className="text-lg text-muted-foreground">
            Great to have you here, <span className="font-medium text-foreground">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</span>!
          </p>
        </div>

        {/* Organization info card */}
        <Card className="mb-6 border-primary/20 shadow-lg animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Your Organization</p>
                <p className="text-xl font-semibold text-foreground">{organization?.name || 'Your Business'}</p>
              </div>
              <Badge variant="secondary" className="text-sm">
                {getRoleLabel()}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Your organization is ready</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>You can start managing your printing business now</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <Button 
            onClick={handleGoToDashboard} 
            className="w-full h-12 text-base font-medium"
            size="lg"
          >
            <LayoutDashboard className="mr-2 h-5 w-5" />
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={handleCompleteProfile} 
              variant="outline"
              className="h-11"
            >
              <User className="mr-2 h-4 w-4" />
              Complete Profile
            </Button>
            
            {canInviteTeam && (
              <Button 
                onClick={handleInviteTeam} 
                variant="outline"
                className="h-11"
              >
                <Users className="mr-2 h-4 w-4" />
                Invite Team
              </Button>
            )}
            
            {!canInviteTeam && (
              <Button 
                onClick={handleGoToDashboard} 
                variant="ghost"
                className="h-11"
              >
                Skip for now
              </Button>
            )}
          </div>
        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-muted-foreground mt-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
          You can always access these options from the sidebar menu
        </p>
      </div>
    </div>
  );
};

export default WelcomeScreen;
