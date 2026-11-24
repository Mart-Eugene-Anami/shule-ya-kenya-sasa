import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { sanitizeInput, sanitizeEmail, sanitizePhone } from "@/utils/sanitize";

interface SchoolRegistrationWizardProps {
  onComplete: (schoolId: string) => void;
  onCancel: () => void;
}

export const SchoolRegistrationWizard = ({ onComplete, onCancel }: SchoolRegistrationWizardProps) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Admin data
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  
  // School data
  const [schoolName, setSchoolName] = useState("");
  const [schoolLocation, setSchoolLocation] = useState("");
  const [schoolPhone, setSchoolPhone] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");

  const validateStep1 = () => {
    if (!adminName.trim()) {
      toast({ title: "Error", description: "Admin name is required", variant: "destructive" });
      return false;
    }
    if (!adminEmail.trim() || !adminEmail.includes('@')) {
      toast({ title: "Error", description: "Valid admin email is required", variant: "destructive" });
      return false;
    }
    if (adminPassword.length < 6) {
      toast({ 
        title: "Error", 
        description: "Password must be at least 6 characters", 
        variant: "destructive" 
      });
      return false;
    }
    if (adminPassword !== adminConfirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return false;
    }
    return true;
  };
  
  const validateStep2 = () => {
    if (!schoolName.trim()) {
      toast({ title: "Error", description: "School name is required", variant: "destructive" });
      return false;
    }
    if (!schoolLocation.trim()) {
      toast({ title: "Error", description: "School location is required", variant: "destructive" });
      return false;
    }
    return true;
  };
  
  const handleNextStep = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      handleSubmit();
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onCancel();
    }
  };
  
  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) {
      return;
    }

    try {
      setIsLoading(true);
      
      const requestPayload = {
        adminName: sanitizeInput(adminName),
        adminEmail: sanitizeEmail(adminEmail),
        adminPassword,
        schoolName: sanitizeInput(schoolName),
        schoolLocation: sanitizeInput(schoolLocation),
        schoolPhone: sanitizePhone(schoolPhone || ''),
        schoolEmail: sanitizeEmail(schoolEmail || '')
      };

      // Throws with the server's own message (e.g. "email already registered") on failure
      const result = await invokeEdgeFunction<{ success: boolean; schoolId?: string; error?: string }>(
        'create-admin-user',
        requestPayload
      );

      if (!result || !result.success || !result.schoolId) {
        const errorMsg = result?.error || 'Unknown error occurred';
        throw new Error(errorMsg);
      }

      toast({
        title: "Registration Complete!",
        description: `${schoolName} has been registered successfully. Please set up academic year and terms after login.`
      });
      
      // Clear form
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      setAdminConfirmPassword("");
      setSchoolName("");
      setSchoolLocation("");
      setSchoolPhone("");
      setSchoolEmail("");
      setStep(1);
      
      onComplete(result.schoolId);
      
    } catch (error: any) {
      let errorMessage = "Registration failed. Please try again.";
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        errorMessage = "Unable to connect to the registration service. Please check your internet connection and try again.";
      } else if (error.message?.includes('already in use') || error.message?.includes('already exists')) {
        errorMessage = `The email ${adminEmail} is already registered. Please use a different email.`;
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = "Please provide a valid email address.";
      } else if (error.message?.includes('Password')) {
        errorMessage = "Password must be at least 6 characters long.";
      } else if (error.message?.includes('HTTP 500')) {
        errorMessage = "Server error occurred. Please try again in a few minutes.";
      } else if (error.message?.includes('HTTP 404')) {
        errorMessage = "Registration service not found. Please contact support.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return "Step 1: Admin Information";
      case 2: return "Step 2: School Information";
      default: return "Setup";
    }
  };
  
  return (
    <div className="space-y-4">
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStepTitle()}
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
          <div className="flex gap-2">
            <div className={`h-2 w-full rounded ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-2 w-full rounded ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        </CardHeader>
        
        {step === 1 ? (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminName">Admin Full Name *</Label>
              <Input 
                id="adminName" 
                placeholder="Enter admin's full name" 
                value={adminName} 
                onChange={(e) => setAdminName(e.target.value)} 
                disabled={isLoading}
                required
                maxLength={100}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin Email *</Label>
              <Input 
                id="adminEmail" 
                type="email" 
                placeholder="admin@school.com" 
                value={adminEmail} 
                onChange={(e) => setAdminEmail(e.target.value)}
                disabled={isLoading} 
                required
                maxLength={255}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="adminPassword">Password *</Label>
              <Input 
                id="adminPassword" 
                type="password" 
                placeholder="Create a secure password (min 6 characters)" 
                value={adminPassword} 
                onChange={(e) => setAdminPassword(e.target.value)}
                disabled={isLoading} 
                required
                minLength={6}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="adminConfirmPassword">Confirm Password *</Label>
              <Input 
                id="adminConfirmPassword" 
                type="password" 
                placeholder="Confirm password" 
                value={adminConfirmPassword} 
                onChange={(e) => setAdminConfirmPassword(e.target.value)}
                disabled={isLoading} 
                required
              />
            </div>
          </CardContent>
        ) : (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schoolName">School Name *</Label>
              <Input 
                id="schoolName" 
                placeholder="e.g. St. Mary's Academy" 
                value={schoolName} 
                onChange={(e) => setSchoolName(e.target.value)}
                disabled={isLoading} 
                required
                maxLength={200}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="schoolLocation">Location *</Label>
              <Input 
                id="schoolLocation" 
                placeholder="e.g. Nairobi, Kenya" 
                value={schoolLocation} 
                onChange={(e) => setSchoolLocation(e.target.value)}
                disabled={isLoading} 
                required
                maxLength={200}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="schoolPhone">Phone Number</Label>
              <Input 
                id="schoolPhone" 
                placeholder="e.g. +254 700 123456" 
                value={schoolPhone} 
                onChange={(e) => setSchoolPhone(e.target.value)}
                disabled={isLoading}
                maxLength={20}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="schoolEmail">School Email</Label>
              <Input 
                id="schoolEmail" 
                type="email" 
                placeholder="e.g. info@school.com" 
                value={schoolEmail} 
                onChange={(e) => setSchoolEmail(e.target.value)}
                disabled={isLoading}
                maxLength={255}
              />
            </div>
            
            <div className="rounded-lg bg-accent/50 p-4 border border-border">
              <h4 className="font-medium text-foreground mb-2">Next Steps</h4>
              <p className="text-sm text-muted-foreground">
                After school creation, you'll need to set up:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Academic year and term dates</li>
                <li>• Grades and streams</li>
                <li>• Teachers and students</li>
              </ul>
            </div>
          </CardContent>
        )}
        
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handlePrevStep}
            disabled={isLoading}
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          
          <Button 
            onClick={handleNextStep}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                Processing...
              </>
            ) : (
              step === 1 ? "Next: School Info" : "Create School"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
