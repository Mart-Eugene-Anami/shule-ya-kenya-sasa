import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Key, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Invalid or expired reset link. Please request a new one.");
      }
    };
    checkSession();
  }, []);

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return "Password must be at least 6 characters long";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      setIsSuccess(true);
      toast({
        title: "Password updated",
        description: "Your password has been successfully reset. Please log in with your new password.",
      });

      // Sign out and redirect to login after 3 seconds
      await supabase.auth.signOut();
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      console.error("Password update error:", err);
      setError(err.message || "Failed to update password. Please try again.");
      toast({
        title: "Error",
        description: err.message || "Failed to update password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-school-light to-white">
      {/* Header */}
      <header className="bg-school-primary py-4 shadow-md">
        <div className="container mx-auto px-6">
          <h1 className="text-2xl font-bold text-white">Shule ya Kenya Sasa</h1>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">Set New Password</h1>
            <p className="mt-2 text-gray-600">
              Enter your new password below
            </p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl text-center text-school-primary">
                Reset Password
              </CardTitle>
              <CardDescription className="text-center">
                Choose a strong password for your account
              </CardDescription>
            </CardHeader>

            {isSuccess ? (
              <CardContent className="pt-6">
                <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <strong>Password updated successfully!</strong>
                    <br />
                    <span className="text-sm">
                      You will be redirected to the login page shortly...
                    </span>
                  </AlertDescription>
                </Alert>
                <div className="mt-6 text-center">
                  <Button
                    onClick={() => navigate("/login")}
                    className="w-full bg-school-primary hover:bg-school-secondary"
                  >
                    Go to Login
                  </Button>
                </div>
              </CardContent>
            ) : (
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4 pt-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700">
                      New Password
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-10 pr-10"
                        minLength={6}
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
                    <Label htmlFor="confirmPassword" className="text-gray-700">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="pl-10 pr-10"
                        minLength={6}
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

                  <div className="text-sm text-muted-foreground">
                    <p>Password requirements:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li className={password.length >= 6 ? "text-green-600 dark:text-green-400" : ""}>
                        At least 6 characters
                      </li>
                    </ul>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button
                    type="submit"
                    className="w-full bg-school-primary hover:bg-school-secondary py-6"
                    disabled={isLoading || !!error}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      <>
                        <Key className="mr-2 h-4 w-4" />
                        Update Password
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            )}
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
};

export default ResetPassword;
