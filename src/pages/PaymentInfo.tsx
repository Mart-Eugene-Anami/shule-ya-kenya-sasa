import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CreditCard, Phone, Building2, Users, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { 
  getSchoolPricingTier, 
  PRICING_TIERS, 
  PAYMENT_DETAILS,
  formatKES,
  getPricingTierDisplayName,
  type PricingTierInfo 
} from "@/services/accessControlService";
import { checkSchoolAccess } from "@/services/accessControlService";

const PaymentInfo = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pricingInfo, setPricingInfo] = useState<PricingTierInfo | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentInfo = async () => {
      if (!user?.schoolId) {
        setIsLoading(false);
        return;
      }

      try {
        const [pricing, access] = await Promise.all([
          getSchoolPricingTier(user.schoolId),
          checkSchoolAccess(user.schoolId)
        ]);
        
        setPricingInfo(pricing);
        setHasAccess(access);
      } catch (error: any) {
        console.error('Error fetching payment info:', error);
        toast({
          title: "Error loading payment information",
          description: error.message || "Failed to load payment details",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentInfo();
  }, [user?.schoolId, toast]);

  if (isLoading) {
    return (
      <DashboardLayout title="Payment Information">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Payment Information">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payment Information</h1>
          <p className="text-muted-foreground mt-2">
            View your subscription details and make payments
          </p>
        </div>

        {/* Access Status Alert */}
        {hasAccess !== null && (
          <Alert variant={hasAccess ? "default" : "destructive"}>
            {hasAccess ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {hasAccess ? "Access Granted" : "Access Restricted"}
            </AlertTitle>
            <AlertDescription>
              {hasAccess 
                ? "Your school has full access to the system. Thank you for your payment!"
                : "Your school's access is currently restricted. Please make a payment to activate your account. Contact the super administrator if you've already made a payment."
              }
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Current Plan Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Current Plan
              </CardTitle>
              <CardDescription>
                Based on your active student count
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pricingInfo ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Students</span>
                    <span className="font-semibold text-lg">
                      {pricingInfo.student_count.toLocaleString()}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pricing Tier</span>
                    <Badge variant="secondary" className="text-sm">
                      {getPricingTierDisplayName(pricingInfo.pricing_tier)}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Monthly Cost</span>
                    <span className="font-bold text-xl text-primary">
                      {formatKES(pricingInfo.monthly_cost)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Per Term Cost</span>
                    <span className="font-bold text-xl text-primary">
                      {formatKES(pricingInfo.termly_cost)}
                    </span>
                  </div>
                  {pricingInfo.requires_consultation && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Custom Pricing</AlertTitle>
                      <AlertDescription>
                        Your school has over 2,000 students. Please contact us for a customized quote.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  Unable to determine pricing. Please contact support.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Payment Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                How to Pay
              </CardTitle>
              <CardDescription>
                Use M-Pesa or Airtel Money Paybill to make your payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-green-600 rounded-full flex items-center justify-center">
                    <Phone className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paybill (M-Pesa / Airtel Money)</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                      {PAYMENT_DETAILS.paybillNumber}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-green-600 rounded-full flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Account Number</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                      {PAYMENT_DETAILS.accountNumber}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground space-y-4">
                <div>
                  <p className="font-medium">M-Pesa Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1 mt-1">
                    <li>Go to M-Pesa on your phone</li>
                    <li>Select "Lipa na M-Pesa"</li>
                    <li>Select "Pay Bill"</li>
                    <li>Enter Business Number: <strong>{PAYMENT_DETAILS.paybillNumber}</strong></li>
                    <li>Enter Account Number: <strong>{PAYMENT_DETAILS.accountNumber}</strong></li>
                    <li>Enter the amount and confirm</li>
                  </ol>
                </div>
                <div>
                  <p className="font-medium">Airtel Money Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1 mt-1">
                    <li>Dial *334# on your phone</li>
                    <li>Select "Make Payments"</li>
                    <li>Select "Pay Bill"</li>
                    <li>Enter Business Number: <strong>{PAYMENT_DETAILS.paybillNumber}</strong></li>
                    <li>Enter Account Number: <strong>{PAYMENT_DETAILS.accountNumber}</strong></li>
                    <li>Enter the amount and confirm</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Tiers Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing Tiers Reference</CardTitle>
            <CardDescription>
              Our pricing is based on the number of active students in your school
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(PRICING_TIERS).map(([key, tier]) => (
                <div 
                  key={key}
                  className={`border rounded-lg p-4 ${
                    pricingInfo?.pricing_tier === key 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{tier.name}</h4>
                    {pricingInfo?.pricing_tier === key && (
                      <Badge>Current</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{tier.range}</p>
                  {tier.monthly !== null ? (
                    <>
                      <p className="text-lg font-bold text-primary">
                        KES {tier.monthly.toLocaleString()}/mo
                      </p>
                      <p className="text-sm text-muted-foreground">
                        KES {tier.termly?.toLocaleString()}/term
                      </p>
                    </>
                  ) : (
                    <p className="text-lg font-semibold text-amber-600">
                      Contact for Quote
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card>
          <CardContent className="py-6">
            <div className="text-center">
              <p className="text-muted-foreground">
                Need help with payments or have questions about your plan?
              </p>
              <p className="font-medium mt-2">
                Contact us at <a href="mailto:support@sabbyschool.com" className="text-primary hover:underline">support@sabbyschool.com</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PaymentInfo;
