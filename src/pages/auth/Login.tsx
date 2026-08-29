
import { useState, useEffect } from "react"; // rebuild
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Key, User, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { sanitizeEmail } from "@/utils/sanitize";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/seo/SEOHead";
import {
  isLockedOut,
  getRemainingLockoutSeconds,
  recordFailedAttempt,
  resetAttempts,
  attemptsRemaining,
} from "@/utils/loginRateLimit";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const { login, user, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Check if user is already logged in
  useEffect(() => {
    if (session && user) {
      const redirectPath = user.role === "super_admin" ? "/super-admin" : "/dashboard";
      navigate(redirectPath, { replace: true });
    }
  }, [session, user, navigate]);

  // Tick down the lockout timer every second while locked out
  useEffect(() => {
    setLockoutSeconds(getRemainingLockoutSeconds());
    const interval = setInterval(() => {
      const remaining = getRemainingLockoutSeconds();
      setLockoutSeconds(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const locked = lockoutSeconds > 0;

  const formatCountdown = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Block submission if locked out
    if (isLockedOut()) {
      setLockoutSeconds(getRemainingLockoutSeconds());
      return;
    }

    setIsLoading(true);

    try {
      await login(sanitizeEmail(email), password);
      resetAttempts();
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    } catch (error: any) {
      // Login error handled by toast below

      const nowLocked = recordFailedAttempt();
      setLockoutSeconds(getRemainingLockoutSeconds());

      if (nowLocked) {
        toast({
          title: "Too many failed attempts",
          description: "Your account has been temporarily locked. Please wait 10 minutes before trying again.",
          variant: "destructive",
        });
      } else {
        const remaining = attemptsRemaining();
        toast({
          title: "Login failed",
          description: `Invalid credentials. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <SEOHead title="Sign In" description="Sign in to your Score school management account." noindex />
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
            <h1 className="text-3xl font-bold text-gray-800">Sign In</h1>
            <p className="mt-2 text-gray-600">Access your school management account</p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl text-center text-school-primary">User Login</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-4">
                {/* Lockout warning banner */}
                {locked && (
                  <div className="flex items-center gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    <ShieldAlert className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-medium">Too many failed attempts</p>
                      <p>Please wait {formatCountdown(lockoutSeconds)} before trying again.</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">Email</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={locked}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700">Password</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={locked}
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
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  className="w-full bg-school-primary hover:bg-school-secondary py-6"
                  disabled={isLoading || locked}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing In...
                    </>
                  ) : locked ? (
                    `Locked (${formatCountdown(lockoutSeconds)})`
                  ) : (
                    "Sign In"
                  )}
                </Button>
                
                <div className="text-center w-full">
                  <a
                    href="/forgot-password"
                    className="text-sm font-medium text-school-primary hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate("/forgot-password");
                    }}
                  >
                    Forgot Password?
                  </a>
                </div>
              </CardFooter>
            </form>
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
    </>
  );
};

export default Login;
