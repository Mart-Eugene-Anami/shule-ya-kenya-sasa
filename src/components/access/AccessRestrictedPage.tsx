import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, CreditCard, Phone, Building2 } from "lucide-react";
import { PAYMENT_DETAILS } from "@/services/accessControlService";
import { useAuth } from "@/contexts/AuthContext";

const AccessRestrictedPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleBackToLogin = async () => {
    await logout();
    navigate("/login", { replace: true });
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Access Restricted</CardTitle>
          <CardDescription className="text-base">
            Your school's access to the system is currently restricted. Please make a payment to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Details */}
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Paybill (M-Pesa / Airtel)</p>
                  <p className="font-bold text-green-700 dark:text-green-400">
                    {PAYMENT_DETAILS.paybillNumber}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Account</p>
                  <p className="font-bold text-green-700 dark:text-green-400">
                    {PAYMENT_DETAILS.accountNumber}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground text-center">
            <p>
              If you have already made a payment, please contact your super administrator 
              to grant access to your school.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => navigate("/payment-info")}
              className="w-full"
            >
              View Full Payment Information
            </Button>
            <Button 
              variant="outline"
              onClick={handleBackToLogin}
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessRestrictedPage;
