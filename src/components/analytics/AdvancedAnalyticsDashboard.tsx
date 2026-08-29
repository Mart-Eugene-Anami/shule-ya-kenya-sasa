import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  FileText,
  Calendar,
  Download,
  RefreshCw,
  Filter
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  attendanceAnalyticsService,
  financialAnalyticsService,
  teacherAnalyticsService,
  riskAnalyticsService,
  comparativeAnalyticsService
} from "@/services/advancedAnalyticsService";
import { reportGenerationService } from "@/services/reportGenerationService";

export function AdvancedAnalyticsDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("current");
  
  // Analytics data
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [financialData, setFinancialData] = useState<any>(null);
  const [riskData, setRiskData] = useState<any>(null);
  const [comparativeData, setComparativeData] = useState<any>(null);

  useEffect(() => {
    if (user?.schoolId) {
      loadAnalyticsData();
    }
  }, [user?.schoolId, selectedGrade, selectedPeriod]);

  const loadAnalyticsData = async () => {
    if (!user?.schoolId) return;
    
    setLoading(true);
    try {
      // Load attendance analytics
      const attendance = await attendanceAnalyticsService.getAttendanceAnalytics(user.schoolId);
      setAttendanceData(attendance);

      // Load financial analytics
      const financial = await financialAnalyticsService.getFinancialAnalytics(user.schoolId);
      setFinancialData(financial);

      // Load at-risk students
      const risk = await riskAnalyticsService.identifyAtRiskStudents(user.schoolId);
      setRiskData(risk);

      // Load comparative analytics
      const comparative = await comparativeAnalyticsService.getComparativeAnalytics(user.schoolId);
      setComparativeData(comparative);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (type: string) => {
    if (!user?.schoolId) return;

    try {
      const config = {
        type: type as any,
        format: 'pdf' as const,
        filters: {
          schoolId: user.schoolId,
          gradeId: selectedGrade !== 'all' ? selectedGrade : undefined
        }
      };

      const report = await reportGenerationService.generateReport(config, user.id);
      
      if (report) {
        toast({
          title: 'Report Generated',
          description: `${report.metadata.title} has been generated successfully`
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive'
      });
    }
  };

  const handleExportData = (dataType: string) => {
    let data: any;
    let filename: string;

    switch (dataType) {
      case 'attendance':
        data = attendanceData;
        filename = 'attendance_report.csv';
        break;
      case 'financial':
        data = financialData;
        filename = 'financial_report.csv';
        break;
      case 'risk':
        data = riskData;
        filename = 'at_risk_students.csv';
        break;
      default:
        return;
    }

    const csv = reportGenerationService.exportToCSV(data, filename);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Successful',
      description: `Data exported to ${filename}`
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advanced Analytics</h2>
          <p className="text-muted-foreground">Comprehensive school performance insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => loadAnalyticsData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => handleGenerateReport('comparative')}>
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Grade:</span>
          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All grades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              <SelectItem value="1">Grade 1</SelectItem>
              <SelectItem value="2">Grade 2</SelectItem>
              <SelectItem value="3">Grade 3</SelectItem>
              <SelectItem value="4">Grade 4</SelectItem>
              <SelectItem value="5">Grade 5</SelectItem>
              <SelectItem value="6">Grade 6</SelectItem>
              <SelectItem value="7">Grade 7</SelectItem>
              <SelectItem value="8">Grade 8</SelectItem>
              <SelectItem value="9">Grade 9</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Period:</span>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Current term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Term</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_quarter">Last Quarter</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="ghost" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          More Filters
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Overall Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">
                {attendanceData?.overallAttendanceRate?.toFixed(1) || 0}%
              </div>
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {attendanceData?.period || 'Current period'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Fee Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">
                {financialData?.collectionRate?.toFixed(1) || 0}%
              </div>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {financialData?.collectedAmount?.toLocaleString() || 0} collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">At-Risk Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">
                {riskData?.length || 0}
              </div>
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Require intervention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">
                {comparativeData?.trends?.[0]?.changePercentage?.toFixed(1) || 0}%
              </div>
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              vs previous period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="risk">At-Risk</TabsTrigger>
          <TabsTrigger value="comparative">Comparative</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <AttendanceOverviewCard data={attendanceData} />
            <FinancialOverviewCard data={financialData} />
          </div>
          <RiskOverviewCard data={riskData} />
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <AttendanceDetailCard data={attendanceData} onExport={() => handleExportData('attendance')} />
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <FinancialDetailCard data={financialData} onExport={() => handleExportData('financial')} />
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <RiskDetailCard data={riskData} onExport={() => handleExportData('risk')} />
        </TabsContent>

        <TabsContent value="comparative" className="space-y-4">
          <ComparativeDetailCard data={comparativeData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

function AttendanceOverviewCard({ data }: { data: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Attendance Overview
        </CardTitle>
        <CardDescription>Student attendance patterns</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Overall Rate</span>
              <span className="font-medium">{data?.overallAttendanceRate?.toFixed(1) || 0}%</span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${data?.overallAttendanceRate || 0}%` }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Chronic Absentees</p>
              <p className="text-2xl font-bold">{data?.chronicAbsentees?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Grades Tracked</p>
              <p className="text-2xl font-bold">{data?.gradeAttendance?.length || 0}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FinancialOverviewCard({ data }: { data: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Financial Overview
        </CardTitle>
        <CardDescription>Fee collection status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Collection Rate</span>
              <span className="font-medium">{data?.collectionRate?.toFixed(1) || 0}%</span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-600 rounded-full transition-all"
                style={{ width: `${data?.collectionRate || 0}%` }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Collected</p>
              <p className="text-2xl font-bold">
                {data?.collectedAmount?.toLocaleString() || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Outstanding</p>
              <p className="text-2xl font-bold">
                {data?.outstandingAmount?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskOverviewCard({ data }: { data: any }) {
  const highRisk = data?.filter((s: any) => s.overallRiskScore > 70)?.length || 0;
  const mediumRisk = data?.filter((s: any) => s.overallRiskScore >= 50 && s.overallRiskScore <= 70)?.length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          At-Risk Students Overview
        </CardTitle>
        <CardDescription>Students requiring intervention</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="text-center p-4 border rounded-lg">
            <p className="text-3xl font-bold text-red-600">{highRisk}</p>
            <p className="text-sm text-muted-foreground">High Risk</p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <p className="text-3xl font-bold text-orange-600">{mediumRisk}</p>
            <p className="text-sm text-muted-foreground">Medium Risk</p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{data?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Total At-Risk</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AttendanceDetailCard({ data, onExport }: { data: any; onExport: () => void }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Detailed Attendance Analysis</CardTitle>
            <CardDescription>Comprehensive attendance breakdown</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Grade-wise attendance */}
          <div>
            <h4 className="font-medium mb-3">Attendance by Grade</h4>
            <div className="space-y-3">
              {data?.gradeAttendance?.slice(0, 5).map((grade: any) => (
                <div key={grade.gradeId} className="flex items-center justify-between">
                  <span className="text-sm">{grade.gradeName}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${grade.attendanceRate}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12">{grade.attendanceRate.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chronic absentees */}
          <div>
            <h4 className="font-medium mb-3">Chronic Absentees</h4>
            <div className="space-y-2">
              {data?.chronicAbsentees?.slice(0, 5).map((student: any) => (
                <div key={student.studentId} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium text-sm">{student.studentName}</p>
                    <p className="text-xs text-muted-foreground">{student.admissionNo}</p>
                  </div>
                  <Badge variant="destructive">{student.attendanceRate.toFixed(1)}%</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FinancialDetailCard({ data, onExport }: { data: any; onExport: () => void }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Detailed Financial Analysis</CardTitle>
            <CardDescription>Fee collection and payment patterns</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Grade-wise financials */}
          <div>
            <h4 className="font-medium mb-3">Collection by Grade</h4>
            <div className="space-y-3">
              {data?.gradeFinancials?.map((grade: any) => (
                <div key={grade.gradeId} className="flex items-center justify-between">
                  <span className="text-sm">{grade.gradeName}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-600 rounded-full"
                        style={{ width: `${(grade.collectedAmount / grade.totalFees) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12">
                      {((grade.collectedAmount / grade.totalFees) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Overdue payments */}
          <div>
            <h4 className="font-medium mb-3">Overdue Payments</h4>
            <div className="space-y-2">
              {data?.overduePayments?.slice(0, 5).map((payment: any) => (
                <div key={payment.studentId} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium text-sm">{payment.studentName}</p>
                    <p className="text-xs text-muted-foreground">{payment.admissionNo}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{payment.outstandingAmount.toLocaleString()}</p>
                    <p className="text-xs text-red-600">{payment.daysOverdue} days overdue</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskDetailCard({ data, onExport }: { data: any; onExport: () => void }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>At-Risk Students Detail</CardTitle>
            <CardDescription>Students requiring intervention</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data?.map((student: any) => (
            <div key={student.studentId} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium">{student.studentName}</p>
                  <p className="text-sm text-muted-foreground">{student.admissionNo}</p>
                </div>
                <Badge variant={student.overallRiskScore > 70 ? "destructive" : "secondary"}>
                  Risk Score: {student.overallRiskScore.toFixed(0)}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Risk Factors:</p>
                {student.riskFactors.map((factor: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span>{factor.description}</span>
                    <Badge variant="outline">{factor.severity}</Badge>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-medium">Recommended Actions:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  {student.recommendedActions.map((action: string, idx: number) => (
                    <li key={idx}>{action}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ComparativeDetailCard({ data }: { data: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparative Analysis</CardTitle>
        <CardDescription>Year-over-year performance comparison</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current vs Previous */}
          <div>
            <h4 className="font-medium mb-3">Performance Trends</h4>
            <div className="space-y-3">
              {data?.trends?.map((trend: any) => (
                <div key={trend.metric} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{trend.metric}</p>
                    <p className="text-sm text-muted-foreground">
                      Previous: {trend.previous.toFixed(1)}% | Current: {trend.current.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${trend.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {trend.change >= 0 ? '+' : ''}{trend.change.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {trend.changePercentage.toFixed(1)}% change
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Benchmark comparison */}
          <div>
            <h4 className="font-medium mb-3">Benchmark Comparison</h4>
            <div className="space-y-3">
              {data?.benchmarkComparison?.map((benchmark: any) => (
                <div key={benchmark.metric} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{benchmark.metric}</p>
                    <p className="text-sm text-muted-foreground">
                      School: {benchmark.schoolValue.toFixed(1)}% | Benchmark: {benchmark.benchmarkValue}%
                    </p>
                  </div>
                  <Badge variant={benchmark.difference >= 0 ? "default" : "secondary"}>
                    {benchmark.percentile.toFixed(0)}th percentile
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
