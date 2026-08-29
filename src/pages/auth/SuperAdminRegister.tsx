
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SuperAdminRegister = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSuperAdmin, setHasSuperAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const { register } = useAuth();
  const navigate = useNavigate();

  // Check if a super admin already exists using the security definer function
  const checkForSuperAdmin = async () => {
    setIsCheckingAdmin(true);
    try {
      console.log("Checking for existing super admin...");
      const { data, error } = await supabase.rpc('check_super_admin_exists');
      
      if (error) {
        console.error("Error checking for super admin:", error);
        toast({
          title: "Error checking for super admin",
          description: "Please try refreshing the page.",
          variant: "destructive",
        });
      } else {
        console.log("Super admin exists:", data);
        setHasSuperAdmin(data === true);
      }
    } catch (error: any) {
      console.error("Error checking for super admin:", error);
    } finally {
      setIsCheckingAdmin(false);
    }
  };
  
  useEffect(() => {
    checkForSuperAdmin();
  }, []);

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
      console.log("Attempting to register super admin...");
      const user = await register(name, email, password);
      
      if (user) {
        console.log("Registration successful:", user);
        
        toast({
          title: "Registration successful",
          description: "Welcome to Shule ya Kenya Sasa! You are now the super administrator.",
        });
        
        // Give a moment for profile creation to complete
        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      
      toast({
        title: "Registration failed",
        description: error.message || "There was a problem with your registration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-school-light to-white">
        {/* Header with logo */}
        <header className="bg-school-primary py-4 shadow-md">
          <div className="container mx-auto px-6">
            <h1 className="text-2xl font-bold text-white">Shule ya Kenya Sasa</h1>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-0 shadow-lg">
            <CardContent className="pt-6 flex flex-col items-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-school-primary" />
              <p className="mt-4">Checking system status...</p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="bg-gray-100 py-4 mt-auto">
          <div className="container mx-auto px-6 text-center text-gray-600 text-sm">
            <p>© 2025 Shule ya Kenya Sasa. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

  if (hasSuperAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-school-light to-white">
        {/* Header with logo */}
        <header className="bg-school-primary py-4 shadow-md">
          <div className="container mx-auto px-6">
            <h1 className="text-2xl font-bold text-white">Shule ya Kenya Sasa</h1>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-center text-school-primary">Super Admin Already Exists</CardTitle>
                <CardDescription className="text-center">A super administrator account has already been created.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center text-gray-600">
                  Please contact the system administrator for access or log in if you already have an account.
                </p>
              </CardContent>
              <CardFooter className="flex justify-center pb-6">
                <Button
                  className="bg-school-primary hover:bg-school-secondary px-8 py-6"
                  onClick={() => navigate("/login")}
                >
                  Return to Login
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Footer */}
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
      {/* Header with logo */}
      <header className="bg-school-primary py-4 shadow-md">
        <div className="container mx-auto px-6">
          <h1 className="text-2xl font-bold text-white">Shule ya Kenya Sasa</h1>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">Create Admin Account</h1>
            <p className="mt-2 text-gray-600">Set up your super administrator account</p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl text-center text-school-primary">Super Admin Registration</CardTitle>
              <CardDescription className="text-center">This will be the primary administrator account</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-4">
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
                  <Label htmlFor="email" className="text-gray-700">Email</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                    "Create Super Admin Account"
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

      {/* Footer */}
      <footer className="bg-gray-100 py-4 mt-auto">
        <div className="container mx-auto px-6 text-center text-gray-600 text-sm">
          <p>© 2025 Shule ya Kenya Sasa. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default SuperAdminRegister;
