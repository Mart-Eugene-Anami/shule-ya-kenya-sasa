import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, RefreshCw, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type Reason = "no_school" | "missing_profile" | "fetch_failed" | "invalid_role" | "role" | undefined;

const MESSAGES: Record<string, { title: string; text: string }> = {
  no_school: {
    title: "Account not linked to a school",
    text: "Your account isn't linked to a school yet. Please contact your system administrator.",
  },
  missing_profile: {
    title: "Account not ready",
    text: "Your account has no profile yet. Please contact your school administrator.",
  },
  fetch_failed: {
    title: "Couldn't load your account",
    text: "We couldn't load your account details. Please try again.",
  },
  invalid_role: {
    title: "Account not ready",
    text: "Your account has an unrecognised role. Please contact your school administrator.",
  },
  role: {
    title: "Unauthorized Access",
    text: "You don't have permission to access this page.",
  },
};

const homeFor = (role?: string) => {
  switch (role) {
    case "super_admin": return "/super-admin";
    case "teacher": return "/teacher-dashboard";
    case "student": return "/student-dashboard";
    default: return "/dashboard";
  }
};

const Unauthorized = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session, refreshProfile, logout } = useAuth();

  const reason = (location.state as { reason?: Reason } | null)?.reason;
  const message = (reason && MESSAGES[reason]) || MESSAGES.role;
  const signedIn = !!session;
  // Problems with the account itself (as opposed to a page you may not open) can be retried.
  const canRetry = signedIn && reason !== undefined && reason !== "role";

  const handleRetry = async () => {
    await refreshProfile();
    // The Login page sends each role to its own home once the account loads.
    navigate("/login", { replace: true });
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center max-w-md p-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-6">
          <Shield className="h-10 w-10 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold mb-4 text-gray-900">{message.title}</h1>
        <p className="text-lg text-gray-600 mb-8">{message.text}</p>
        <div className="space-y-4">
          {canRetry && (
            <Button className="bg-blue-600 hover:bg-blue-700 w-full" onClick={handleRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          )}
          {user && reason === "role" && (
            <Button
              className="bg-school-primary hover:bg-school-secondary w-full"
              onClick={() => navigate(homeFor(user.role))}
            >
              Go to my dashboard
            </Button>
          )}
          {signedIn ? (
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          ) : (
            <Button className="bg-school-primary hover:bg-school-secondary w-full" onClick={() => navigate("/login")}>
              Return to Login
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
