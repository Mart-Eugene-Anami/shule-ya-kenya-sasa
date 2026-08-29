
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Unauthorized = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const handleRefresh = async () => {
    if (user) {
      await refreshProfile();
      // Give it a moment then redirect to dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center max-w-md p-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-6">
          <Shield className="h-10 w-10 text-red-600" />
        </div>
        <h1 className="text-4xl font-bold mb-4 text-gray-900">Unauthorized Access</h1>
        <p className="text-xl text-gray-600 mb-8">
          {user ? 
            "Your account is being set up. This may take a moment after registration." :
            "You don't have permission to access this page."
          }
        </p>
        <div className="space-y-4">
          {user && (
            <Button
              className="bg-blue-600 hover:bg-blue-700 w-full"
              onClick={handleRefresh}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Account Status
            </Button>
          )}
          <Button
            className="bg-school-primary hover:bg-school-secondary w-full"
            onClick={() => navigate(user ? "/dashboard" : "/login")}
          >
            {user ? "Go to Dashboard" : "Return to Login"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
