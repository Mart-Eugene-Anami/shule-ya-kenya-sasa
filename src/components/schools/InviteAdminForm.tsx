
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail, AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const InviteAdminForm = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastInvite, setLastInvite] = useState<{email: string, url?: string} | null>(null);
  const { sendRegistrationLink } = useAuth();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please provide a valid email address",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log(`Sending invitation to: ${email}`);
      
      const response = await sendRegistrationLink(email, 'school_admin');
      
      // Store the last invite for reference
      setLastInvite({ 
        email, 
        url: response?.registrationUrl 
      });
      
      toast({
        title: "Invitation sent successfully",
        description: `An invitation has been sent to ${email}. The admin can now register and access their school dashboard.`
      });
      
      setEmail("");
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      
      let errorMessage = "There was a problem sending the invitation";
      
      if (error.message?.includes('already exists')) {
        errorMessage = "A user with this email already exists in the system";
      } else if (error.message?.includes('Email service not configured')) {
        errorMessage = "Email service is not properly configured. Please contact the system administrator.";
      } else if (error.message?.includes('RESEND_API_KEY')) {
        errorMessage = "Email service is not configured. Please set up email configuration in the system settings.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Failed to send invitation",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Invite School Administrators</CardTitle>
          <CardDescription>
            Send invitations to school administrators to register their schools on Sabby School.
            They will receive an email with a secure registration link.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@school.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="pl-9"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={isLoading || !email}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                      </>
                    ) : (
                      "Send Invitation"
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>What happens next:</strong>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      <li>Admin receives an email invitation</li>
                      <li>They click the link to complete registration</li>
                      <li>They can immediately access their school dashboard</li>
                      <li>The school appears in your schools list below</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </form>
      </Card>

      {/* Last invitation confirmation */}
      {lastInvite && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Invitation sent to {lastInvite.email}</span>
            </div>
            {lastInvite.url && (
              <div className="mt-2">
                <Label className="text-xs text-green-600">Direct registration link (for testing):</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input 
                    value={lastInvite.url} 
                    readOnly 
                    className="text-xs bg-white border-green-200" 
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(lastInvite.url, '_blank')}
                    className="border-green-200 text-green-700 hover:bg-green-100"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
