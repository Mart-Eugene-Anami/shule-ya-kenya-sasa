import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload,
  DollarSign,
  Users,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Download,
  Search,
} from "lucide-react";
import {
  getFeeSettings,
  upsertFeeSettings,
  getSchoolFees,
  getCapitationRecords,
  getFeeUploads,
  parseFeeCSV,
  processFeeCsvUpload,
  type FeeSettings,
  type FeeUpload,
} from "@/services/feeService";

const FeeManagement = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState<FeeSettings | null>(null);
  const [fees, setFees] = useState<any[]>([]);
  const [capitation, setCapitation] = useState<any[]>([]);
  const [uploads, setUploads] = useState<FeeUpload[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user?.schoolId) loadData();
  }, [user?.schoolId]);

  useEffect(() => {
    if (user?.schoolId && selectedTerm) {
      loadFees();
      loadCapitation();
    }
  }, [selectedTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsData, termsData, uploadsData] = await Promise.all([
        getFeeSettings(user!.schoolId!),
        supabase.from("terms").select("*").eq("school_id", user!.schoolId!).order("start_date", { ascending: false }),
        getFeeUploads(user!.schoolId!),
      ]);

      setSettings(settingsData);
      setTerms(termsData.data || []);
      setUploads(uploadsData as FeeUpload[]);

      const activeTerm = (termsData.data || []).find((t: any) => t.is_active);
      if (activeTerm) {
        setSelectedTerm(activeTerm.id);
      } else if (termsData.data && termsData.data.length > 0) {
        setSelectedTerm(termsData.data[0].id);
      }
    } catch (error) {
      console.error("Error loading fee data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFees = async () => {
    try {
      const data = await getSchoolFees(user!.schoolId!, selectedTerm || undefined);
      setFees(data);
    } catch (error) {
      console.error("Error loading fees:", error);
    }
  };

  const loadCapitation = async () => {
    try {
      const data = await getCapitationRecords(user!.schoolId!, selectedTerm || undefined);
      setCapitation(data);
    } catch (error) {
      console.error("Error loading capitation:", error);
    }
  };

  const handleToggleFees = async (enabled: boolean) => {
    try {
      await upsertFeeSettings({ school_id: user!.schoolId!, is_enabled: enabled });
      setSettings(prev => prev ? { ...prev, is_enabled: enabled } : { 
        id: "", school_id: user!.schoolId!, is_enabled: enabled, 
        show_on_report_card: false, is_boarding_school: false, currency_code: "KES" 
      });
      toast({ title: enabled ? "Fee module enabled" : "Fee module disabled" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
    }
  };

  const handleToggleReportCard = async (show: boolean) => {
    try {
      await upsertFeeSettings({ school_id: user!.schoolId!, show_on_report_card: show });
      setSettings(prev => prev ? { ...prev, show_on_report_card: show } : null);
      toast({ title: show ? "Fees will show on report cards" : "Fees hidden from report cards" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
    }
  };

  const handleToggleBoarding = async (boarding: boolean) => {
    try {
      await upsertFeeSettings({ school_id: user!.schoolId!, is_boarding_school: boarding });
      setSettings(prev => prev ? { ...prev, is_boarding_school: boarding } : null);
      toast({ title: boarding ? "Boarding fees enabled" : "Boarding fees disabled" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.schoolId || !user?.id) return;

    if (!file.name.endsWith(".csv")) {
      toast({ title: "Invalid file", description: "Please upload a CSV file", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const text = await file.text();
      const { rows, capitation: cap, errors } = parseFeeCSV(text);

      if (errors.length > 0 && rows.length === 0) {
        toast({ title: "CSV Error", description: errors.join(", "), variant: "destructive" });
        setUploading(false);
        return;
      }

      const result = await processFeeCsvUpload(
        user.schoolId,
        selectedTerm || null,
        file.name,
        user.id,
        rows,
        cap
      );

      toast({
        title: "Upload Complete",
        description: `${result.matched} records matched, ${result.failed} failed`,
      });

      if (errors.length > 0) {
        toast({ title: "CSV Warnings", description: errors.slice(0, 3).join("; "), variant: "destructive" });
      }

      await Promise.all([loadFees(), loadCapitation(), loadData()]);
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    const headers = [
      "name", "admission_no", "tuition_balance", "boarding_fee_balance",
      "lunch_fee_balance", "transport_fee", "activity_fee", "smasse_fee",
      "administration_fee", "exam_fee", "development_fund", "other_charges",
      "total_outstanding", "total_paid", "last_payment_date", "payment_reference",
      "currency_code", "capitation_total", "capitation_per_student", "capitation_student_count"
    ].join(",");
    const sample = "John Doe,ADM001,5000,0,1500,0,500,200,300,400,1000,0,8900,5000,2026-01-15,MPE123456,KES,,,";
    const capitationRow = "CAPITATION,capitation,,,,,,,,,,,,,,,KES,1500000,1500,1000";
    const csv = `${headers}\n${sample}\n${capitationRow}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fee_upload_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredFees = fees.filter((f: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const student = f.students;
    return (
      student?.name?.toLowerCase().includes(q) ||
      student?.admission_no?.toLowerCase().includes(q)
    );
  });

  const totalOutstanding = fees.reduce((sum, f) => sum + (f.total_outstanding || 0), 0);
  const totalPaid = fees.reduce((sum, f) => sum + (f.total_paid || 0), 0);
  const latestCapitation = capitation.length > 0 ? capitation[0] : null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: settings?.currency_code || "KES" }).format(amount);
  };

  if (loading) {
    return (
      <DashboardLayout title="Fee Management">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Fee Management">
      <div className="space-y-6">
        {/* Header & Settings */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Fee Management</h1>
            <p className="text-muted-foreground mt-1">
              Import and manage student fee records from your accounting system
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={settings?.is_enabled ?? false}
                onCheckedChange={handleToggleFees}
              />
              <Label className="text-sm">Enable Fees</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings?.show_on_report_card ?? false}
                onCheckedChange={handleToggleReportCard}
                disabled={!settings?.is_enabled}
              />
              <Label className="text-sm">Show on Reports</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings?.is_boarding_school ?? false}
                onCheckedChange={handleToggleBoarding}
                disabled={!settings?.is_enabled}
              />
              <Label className="text-sm">Boarding School</Label>
            </div>
          </div>
        </div>

        {!settings?.is_enabled ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <DollarSign className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Fee Module Disabled</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Enable the fee module above to start managing student fees
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Term Selector */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="w-64">
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    {terms.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.is_active ? "(Active)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Outstanding</p>
                      <p className="text-2xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</p>
                    </div>
                    <div className="rounded-full bg-destructive/10 p-3">
                      <AlertCircle className="h-6 w-6 text-destructive" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Collected</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(totalPaid)}</p>
                    </div>
                    <div className="rounded-full bg-primary/10 p-3">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Capitation (School)</p>
                      <p className="text-2xl font-bold text-foreground">
                        {latestCapitation ? formatCurrency(latestCapitation.total_amount) : "—"}
                      </p>
                    </div>
                    <div className="rounded-full bg-accent/50 p-3">
                      <DollarSign className="h-6 w-6 text-accent-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Capitation/Student</p>
                      <p className="text-2xl font-bold text-foreground">
                        {latestCapitation ? formatCurrency(latestCapitation.per_student_amount) : "—"}
                      </p>
                    </div>
                    <div className="rounded-full bg-secondary p-3">
                      <Users className="h-6 w-6 text-secondary-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Import Fee Data
                </CardTitle>
                <CardDescription>
                  Upload a CSV file from your accounting system. The file should contain student admission numbers, 
                  fee balances per vote head, and optionally capitation data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {uploading ? "Processing..." : "Upload CSV"}
                  </Button>
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="mr-2 h-4 w-4" /> Download Template
                  </Button>
                </div>

                {/* Upload History */}
                {uploads.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Recent Uploads</p>
                    {uploads.slice(0, 5).map(u => (
                      <div key={u.id} className="flex items-center gap-3 text-sm border rounded-lg p-3">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate">{u.file_name}</span>
                        <Badge variant={u.status === "completed" ? "default" : "secondary"}>
                          {u.status}
                        </Badge>
                        <span className="text-muted-foreground">
                          {u.records_matched}/{u.records_processed} matched
                        </span>
                        {u.records_failed > 0 && (
                          <span className="text-destructive">{u.records_failed} failed</span>
                        )}
                        <span className="text-muted-foreground ml-auto text-xs">
                          {new Date(u.uploaded_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Student Fee Records */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <CardTitle>Student Fee Records</CardTitle>
                    <CardDescription>{filteredFees.length} students</CardDescription>
                  </div>
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or admission no..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Adm No</TableHead>
                        <TableHead className="text-right">Tuition</TableHead>
                        {settings?.is_boarding_school && <TableHead className="text-right">Boarding</TableHead>}
                        <TableHead className="text-right">Lunch</TableHead>
                        <TableHead className="text-right">Other Fees</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead>Last Payment</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={settings?.is_boarding_school ? 10 : 9} className="text-center py-8 text-muted-foreground">
                            No fee records found. Upload a CSV to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredFees.map((f: any) => {
                          const otherFees = (f.transport_fee || 0) + (f.activity_fee || 0) + (f.smasse_fee || 0) +
                            (f.administration_fee || 0) + (f.exam_fee || 0) + (f.development_fund || 0) + (f.other_charges || 0);
                          return (
                            <TableRow key={f.id}>
                              <TableCell className="font-medium">{f.students?.name}</TableCell>
                              <TableCell>{f.students?.admission_no}</TableCell>
                              <TableCell className="text-right">{formatCurrency(f.tuition_balance)}</TableCell>
                              {settings?.is_boarding_school && (
                                <TableCell className="text-right">{formatCurrency(f.boarding_fee_balance)}</TableCell>
                              )}
                              <TableCell className="text-right">{formatCurrency(f.lunch_fee_balance)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(otherFees)}</TableCell>
                              <TableCell className="text-right font-semibold text-destructive">
                                {formatCurrency(f.total_outstanding)}
                              </TableCell>
                              <TableCell className="text-right text-primary">
                                {formatCurrency(f.total_paid)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {f.last_payment_date ? new Date(f.last_payment_date).toLocaleDateString() : "—"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {f.payment_reference || "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FeeManagement;
