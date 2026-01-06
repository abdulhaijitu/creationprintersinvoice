import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';
import { 
  Globe, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Copy,
  ExternalLink,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
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
  DialogTrigger,
} from '@/components/ui/dialog';

export const CustomDomainPanel = () => {
  const { domains, addDomain, removeDomain, isDomainUpdating, isCustomDomainEnabled } = useWhiteLabel();
  const [newDomain, setNewDomain] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleAddDomain = () => {
    if (!newDomain) return;
    
    // Basic domain validation
    const domainRegex = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(newDomain)) {
      toast.error('Please enter a valid domain name');
      return;
    }
    
    addDomain(newDomain);
    setNewDomain('');
    setShowAddDialog(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusBadge = (domain: { is_verified: boolean; ssl_status: string }) => {
    if (domain.is_verified) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Pending Verification
      </Badge>
    );
  };

  const getSSLBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="bg-green-500">
            <Shield className="h-3 w-3 mr-1" />
            SSL Active
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            SSL Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            No SSL
          </Badge>
        );
    }
  };

  if (!isCustomDomainEnabled) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Globe className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Custom Domains Not Enabled</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Contact your administrator to enable custom domain support for your organization.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Custom Domains
            </CardTitle>
            <CardDescription>
              Connect your own domain to access your app
            </CardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Domain
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Domain</DialogTitle>
                <DialogDescription>
                  Enter your domain name to get started
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain Name</Label>
                  <Input
                    id="domain"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="app.yourdomain.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use a subdomain like app.yourdomain.com for best results
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddDomain} disabled={isDomainUpdating}>
                  Add Domain
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No custom domains configured yet</p>
              <p className="text-sm">Add your first domain to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SSL</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {domain.domain}
                        {domain.is_primary && (
                          <Badge variant="outline" className="text-xs">Primary</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(domain)}</TableCell>
                    <TableCell>{getSSLBadge(domain.ssl_status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(domain.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {domain.is_verified && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(`https://${domain.domain}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => removeDomain(domain.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* DNS Instructions */}
      {domains.some(d => !d.is_verified) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">DNS Configuration</CardTitle>
            <CardDescription>
              Add these DNS records to verify your domain
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {domains.filter(d => !d.is_verified).map((domain) => (
              <div key={domain.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
                <p className="font-medium">{domain.domain}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-background rounded text-sm">
                    <div>
                      <span className="text-muted-foreground">Type:</span> A Record
                    </div>
                    <div>
                      <span className="text-muted-foreground">Value:</span> 185.158.133.1
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard('185.158.133.1')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-background rounded text-sm">
                    <div>
                      <span className="text-muted-foreground">Type:</span> TXT Record
                    </div>
                    <div>
                      <span className="text-muted-foreground">Name:</span> _lovable
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {domain.verification_token}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(domain.verification_token || '')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  DNS changes can take up to 72 hours to propagate
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
