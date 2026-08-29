
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface InviteData {
  email: string;
  role: string;
  token: string;
  schoolId?: string;
  schoolName?: string;
  expiresAt: string;
}

const InviteRegistration = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [isValidInvite, setIsValidInvite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  useEffect(() => {
    const validateInvite = async () => {
      try {
        const encodedData = searchParams.get('data');
        
        if (!encodedData) {
          throw new Error("Invalid invitation link");
        }
        
        // Decode the invitation data
        const decodedData = JSON.parse(atob(encodedData)) as InviteData;
        
        // Verify the invitation hasn't expired
        const expiresAt = new Date(decodedData.expiresAt);
        if (expiresAt < new Date()) {
          throw new Error("This invitation has expired");
        }
        
        setInviteData(decodedData);
        setIsValidInvite(true);
      } catch (error: any) {
        console.error("Error validating invite:", error);
        toast({
          title: "Invalid Invitation",
          description: error.message || "The invitation link is invalid or has expired",
          variant: "destructive",
        });
        setIsValidInvite(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    validateInvite();
  }, [searchParams]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteData) return;
    
    // Validate inputs
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }
    
    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure both passwords match",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // For school admin registration (without a schoolId)
      if (inviteData.role === 'admin' && !inviteData.schoolId) {
        // Sign up the user first
        const { data: userData, error: signUpError } = await supabase.auth.signUp({
          email: inviteData.email,
          password,
          options: {
            data: {
              name,
              role: inviteData.role,
            }
          }
        });
        
        if (signUpError) throw signUpError;
        
        if (!userData.user) {
          throw new Error("Failed to create user account");
        }
        
        toast({
          title: "Registration successful",
          description: "Now you can create your school",
        });
        
        // Store data for school setup
        localStorage.setItem("schoolSetupData", JSON.stringify({
          isFromWizard: true,
          schoolInfo: {
            admin_email: inviteData.email,
            admin_name: name
          }
        }));
        
        // Redirect to the school creation page
        navigate("/schools/create");
        return;
      }
      
      // For other roles (with schoolId)
      if (inviteData.schoolId) {
        const { data: userData, error: signUpError } = await supabase.auth.signUp({
          email: inviteData.email,
          password,
          options: {
            data: {
              name,
              role: inviteData.role,
              school_id: inviteData.schoolId
            }
          }
        });
        
        if (signUpError) throw signUpError;
        
        if (!userData.user) {
          throw new Error("Failed to create user account");
        }
        
        toast({
          title: "Registration successful",
          description: `You have successfully registered as a ${inviteData.role}`,
        });
        
        // Redirect to the login page
        navigate("/login");
        return;
      }
      
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message || "There was a problem with your registration",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-school-light to-white">
        <header className="bg-school-primary py-4 shadow-md">
          <div className="container mx-auto px-6">
            <h1 className="text-2xl font-bold text-white">Shule ya Kenya Sasa</h1>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-school-primary mx-auto" />
            <p className="mt-4">Validating invitation...</p>
          </div>
        </div>

        <footer className="bg-gray-100 py-4 mt-auto">
          <div className="container mx-auto px-6 text-center text-gray-600 text-sm">
            <p>© 2025 Shule ya Kenya Sasa. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }
  
  if (!isValidInvite) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-school-light to-white">
        <header className="bg-school-primary py-4 shadow-md">
          <div className="container mx-auto px-6">
            <h1 className="text-2xl font-bold text-white">Shule ya Kenya Sasa</h1>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-center text-red-500">Invalid Invitation</CardTitle>
              <CardDescription className="text-center">
                This invitation link is invalid or has expired
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button
                onClick={() => navigate("/")}
                className="bg-school-primary hover:bg-school-secondary"
              >
                Return to Home
              </Button>
            </CardFooter>
          </Card>
        </div>

        <footer className="bg-gray-100 py-4 mt-auto">
          <div className="container mx-auto px-6 text-center text-gray-600 text-sm">
            <p>© 2025 Shule ya Kenya Sasa. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-school-light to-white">
      <header className="bg-school-primary py-4 shadow-md">
        <div className="container mx-auto px-6">
          <h1 className="text-2xl font-bold text-white">Shule ya Kenya Sasa</h1>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">Accept Invitation</h1>
            <p className="mt-2 text-gray-600">
              {inviteData?.role === 'admin' 
                ? "Complete your registration to create your school" 
                : `Register to join ${inviteData?.schoolName || "the school"} as a ${inviteData?.role}`}
            </p>
          </div>

          <Card className="border-0 shadow-lg">
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      value={inviteData?.email || ""}
                      disabled
                      className="pl-10 bg-gray-50"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10"
                    />
                    <div 
                      className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Enter the same password again"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="pl-10"
                    />
                    <div 
                      className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="pt-2 pb-6">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-school-primary hover:bg-school-secondary py-6"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registering...
                    </>
                  ) : (
                    "Complete Registration"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
          
          <div className="text-center">
            <p className="text-gray-600">
              Already have an account?{" "}
              <a
                href="/login"
                className="font-medium text-school-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/login");
                }}
              >
                Sign In
              </a>
            </p>
          </div>
        </div>
      </div>

      <footer className="bg-gray-100 py-4 mt-auto">
        <div className="container mx-auto px-6 text-center text-gray-600 text-sm">
          <p>© 2025 Shule ya Kenya Sasa. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default InviteRegistration;
