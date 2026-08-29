import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const RegisterConfirm = () => {
  const [name, setName] = useState("");
  const [password, setPassword]  = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const getHashParams = async () => {
      try {
        setIsLoading(true);
        // Get role and schoolId from URL
        const roleParam = searchParams.get("role");
        const schoolIdParam = searchParams.get("schoolId");
        
        if (roleParam) {
          setRole(roleParam);
        }
        
        if (schoolIdParam) {
          setSchoolId(schoolIdParam);
        }
        
        // Extract and verify the hash from URL
        const hash = window.location.hash.substring(1);
        if (!hash) {
          toast({
            title: "Invalid invitation link",
            description: "This link appears to be invalid or has expired.",
            variant: "destructive",
          });
          return;
        }
        
        // Verify the email link
        const { data, error } = await supabase.auth.verifyOtp({
          type: 'signup',
          token_hash: hash,
        });
        
        if (error || !data?.user) {
          console.error("Error verifying invitation:", error);
          toast({
            title: "Invalid or expired link",
            description: "This invitation link has expired or is invalid. Please request a new invitation.",
            variant: "destructive",
          });
          setTimeout(() => navigate("/login"), 2000);
          return;
        }
        
        // Set email from the verified user data
        setEmail(data.user.email || "");
        
        // Extract metadata
        const metadata = data.user.user_metadata || {};
        
        // Set role and schoolId from metadata if not in URL
        if (!roleParam && metadata.role) {
          setRole(metadata.role);
        }
        
        if (!schoolIdParam && metadata.school_id) {
          setSchoolId(metadata.school_id);
        }
        
      } catch (error: any) {
        console.error("Error processing invitation:", error);
        toast({
          title: "Error processing invitation",
          description: "There was a problem with your invitation link. Please contact your administrator.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    getHashParams();
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password
    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please ensure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }
    
    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Complete the signup process
      const { data, error } = await supabase.auth.updateUser({
        password,
        data: {
          name,
          role: role as string,
          school_id: schoolId
        }
      });
      
      if (error || !data.user) {
        throw error || new Error("Failed to complete registration");
      }
      
      // Update the profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          name,
          role: role as "super_admin" | "school_admin" | "teacher" | "student",
          school_id: schoolId
        })
        .eq('id', data.user.id);
        
      if (profileError) {
        console.error("Error updating profile:", profileError);
        // Continue anyway since the auth part was successful
      }
      
      toast({
        title: "Registration complete",
        description: `Welcome to Shule ya Kenya Sasa! You've been registered as a ${role}.`,
      });
      
      // Navigate to the appropriate dashboard
      setTimeout(() => {
        if (role === "super_admin") {
          navigate("/super-admin");
        } else {
          navigate("/dashboard");
        }
      }, 1500);
      
    } catch (error: any) {
      console.error("Registration error:", error);
      
      toast({
        title: "Registration failed",
        description: error.message || "There was a problem completing your registration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !email) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-school-light to-white">
        <header className="bg-school-primary py-4 shadow-md">
          <div className="container mx-auto px-6">
            <h1 className="text-2xl font-bold text-white">Shule ya Kenya Sasa</h1>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-0 shadow-lg">
            <CardContent className="pt-6 flex flex-col items-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-school-primary" />
              <p className="mt-4">Verifying your invitation...</p>
            </CardContent>
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
            <h1 className="text-3xl font-bold text-gray-800">Complete Registration</h1>
            <p className="mt-2 text-gray-600">Set up your account</p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl text-center text-school-primary">
                {role ? `${role.charAt(0).toUpperCase() + role.slice(1)} Registration` : "User Registration"}
              </CardTitle>
              <CardDescription className="text-center">Please complete your account details</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">Email</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      readOnly
                      className="pl-10 bg-gray-50"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700">Full Name</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700">Password</Label>
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
                  <Label htmlFor="confirmPassword" className="text-gray-700">Confirm Password</Label>
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
                  className="w-full bg-school-primary hover:bg-school-secondary py-6"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...
                    </>
                  ) : (
                    "Complete Registration"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
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

export default RegisterConfirm;
