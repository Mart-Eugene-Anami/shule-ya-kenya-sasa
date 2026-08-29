import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setIsSubmitted(true);
      toast({
        title: "Reset link sent",
        description: "Check your email for the password reset link.",
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reset link. Please try again.",
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
            <h1 className="text-3xl font-bold text-gray-800">Reset Password</h1>
            <p className="mt-2 text-gray-600">
              Enter your email to receive a password reset link
            </p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl text-center text-school-primary">
                Forgot Password
              </CardTitle>
              <CardDescription className="text-center">
                We'll send you instructions to reset your password
              </CardDescription>
            </CardHeader>

            {isSubmitted ? (
              <CardContent className="pt-6">
                <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <strong>Check your email!</strong>
                    <br />
                    We've sent a password reset link to <strong>{email}</strong>.
                    <br />
                    <span className="text-sm">
                      Click the link in the email to reset your password. The link expires in 1 hour.
                    </span>
                  </AlertDescription>
                </Alert>
                <div className="mt-6 text-center">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/login")}
                    className="w-full"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Button>
                </div>
              </CardContent>
            ) : (
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700">
                      Email Address
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button
                    type="submit"
                    className="w-full bg-school-primary hover:bg-school-secondary py-6"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Reset Link
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate("/login")}
                    className="w-full"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
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

export default ForgotPassword;
