
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart as BarChartIcon,
  Download,
  Filter,
  ChevronDown
} from "lucide-react";
import { 
  Exam, 
  ExamAnalytics as ExamAnalyticsData, 
  SubjectAnalytics, 
  StudentPerformance, 
  TrendAnalytics 
} from "../types";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { useAuth } from "../contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { 
  Bar, 
  BarChart, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Line,
  LineChart,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { format } from "date-fns";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const ExamAnalytics = () => {
  const { examId } = useParams<{ examId: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [examSummary, setExamSummary] = useState<ExamAnalyticsData | null>(null);
  const [studentRankings, setStudentRankings] = useState<StudentPerformance[]>([]);
  const [subjectAnalytics, setSubjectAnalytics] = useState<SubjectAnalytics[]>([]);
  const [trends, setTrends] = useState<TrendAnalytics[]>([]);

  // Mock data fetch
  useEffect(() => {
    // Simulate API call to get exam details
    const mockExams = [
      {
        id: "1",
        name: "Term 1 Mathematics Exam",
        description: "End of term examination for mathematics",
        grades: ["1", "2", "3"],
        subjects: ["Mathematics"],
        startDate: "2025-04-01",
        endDate: "2025-04-10",
        createdBy: "1",
        createdAt: "2025-03-15",
        schoolId: "1",
        isActive: true,
      },
      {
        id: "2",
        name: "Term 1 Science Exam",
        description: "End of term examination for science subjects",
        grades: ["1", "2"],
        subjects: ["Biology", "Chemistry", "Physics"],
        startDate: "2025-04-05",
        endDate: "2025-04-15",
        createdBy: "1",
        createdAt: "2025-03-20",
        schoolId: "1",
        isActive: true,
      },
    ];

    const foundExam = mockExams.find(e => e.id === examId);
    if (foundExam) {
      setExam(foundExam);

      // Mock exam summary data
      setExamSummary({
        examId: foundExam.id,
        examName: foundExam.name,
        studentCount: 120,
        highestScore: 98,
        lowestScore: 35,
        averageScore: 72.5,
        passingRate: 85,
        subjectAverages: [
          { subject: "Mathematics", average: 72.5 },
          { subject: "English", average: 68.3 },
          { subject: "Science", average: 75.1 },
        ],
        streamPerformance: [
          { streamId: "1", streamName: "Grade 1 Red", average: 76.2 },
          { streamId: "2", streamName: "Grade 1 Blue", average: 71.8 },
          { streamId: "3", streamName: "Grade 2 Green", average: 70.5 },
        ]
      });

      // Mock student rankings
      setStudentRankings([
        {
          studentId: "1",
          student: {
            name: "John Doe",
            admissionNo: "001",
            stream: {
              name: "Red",
              grade: {
                name: "Grade 1"
              }
            }
          },
          totalMarks: 450,
          averageScore: 90,
          rank: 1,
          subjects: [
            { subject: "Mathematics", score: 92, outOf: 100, grade: "A" },
            { subject: "English", score: 88, outOf: 100, grade: "A" },
            { subject: "Science", score: 95, outOf: 100, grade: "A" },
          ]
        },
        {
          studentId: "2",
          student: {
            name: "Jane Smith",
            admissionNo: "002",
            stream: {
              name: "Red",
              grade: {
                name: "Grade 1"
              }
            }
          },
          totalMarks: 435,
          averageScore: 87,
          rank: 2,
          subjects: [
            { subject: "Mathematics", score: 85, outOf: 100, grade: "A" },
            { subject: "English", score: 90, outOf: 100, grade: "A" },
            { subject: "Science", score: 88, outOf: 100, grade: "A" },
          ]
        },
        {
          studentId: "3",
          student: {
            name: "Bob Johnson",
            admissionNo: "003",
            stream: {
              name: "Blue",
              grade: {
                name: "Grade 1"
              }
            }
          },
          totalMarks: 410,
          averageScore: 82,
          rank: 3,
          subjects: [
            { subject: "Mathematics", score: 80, outOf: 100, grade: "A-" },
            { subject: "English", score: 78, outOf: 100, grade: "B+" },
            { subject: "Science", score: 86, outOf: 100, grade: "A" },
          ]
        },
      ]);

      // Mock subject analytics
      setSubjectAnalytics([
        {
          subject: "Mathematics",
          averageScore: 72.5,
          highestScore: 98,
          lowestScore: 35,
          passingRate: 85,
          streamBreakdown: [
            { streamId: "1", streamName: "Grade 1 Red", average: 76.2 },
            { streamId: "2", streamName: "Grade 1 Blue", average: 71.8 },
            { streamId: "3", streamName: "Grade 2 Green", average: 70.5 },
          ]
        },
        {
          subject: "English",
          averageScore: 68.3,
          highestScore: 92,
          lowestScore: 40,
          passingRate: 80,
          streamBreakdown: [
            { streamId: "1", streamName: "Grade 1 Red", average: 72.1 },
            { streamId: "2", streamName: "Grade 1 Blue", average: 68.5 },
            { streamId: "3", streamName: "Grade 2 Green", average: 65.8 },
          ]
        },
        {
          subject: "Science",
          averageScore: 75.1,
          highestScore: 95,
          lowestScore: 42,
          passingRate: 88,
          streamBreakdown: [
            { streamId: "1", streamName: "Grade 1 Red", average: 78.3 },
            { streamId: "2", streamName: "Grade 1 Blue", average: 74.6 },
            { streamId: "3", streamName: "Grade 2 Green", average: 72.9 },
          ]
        },
      ]);

      // Mock trend data
      setTrends([
        {
          subject: "Mathematics",
          periods: ["Term 1", "Term 2", "Term 3"],
          averages: [72.5, 74.1, 70.8],
          passingRates: [85, 87, 83]
        },
        {
          subject: "English",
          periods: ["Term 1", "Term 2", "Term 3"],
          averages: [68.3, 70.5, 71.2],
          passingRates: [80, 82, 84]
        },
        {
          subject: "Science",
          periods: ["Term 1", "Term 2", "Term 3"],
          averages: [75.1, 73.8, 76.4],
          passingRates: [88, 86, 89]
        },
      ]);
    }

    setLoading(false);
  }, [examId]);

  const downloadReport = (format: "pdf" | "csv") => {
    toast({
      title: "Download Started",
      description: `Your ${format.toUpperCase()} report is being generated.`,
    });
  };

  if (loading) {
    return (
      <DashboardLayout title="Loading...">
        <div className="flex justify-center items-center h-64">
          <p>Loading analytics...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!exam || !examSummary) {
    return (
      <DashboardLayout title="Exam Not Found">
        <div className="flex justify-center items-center h-64">
          <p>The requested exam analytics could not be found.</p>
        </div>
      </DashboardLayout>
    );
  }

  const streamPerformanceData = examSummary.streamPerformance.map(stream => ({
    name: stream.streamName,
    average: stream.average
  }));

  const subjectAveragesData = examSummary.subjectAverages.map(subject => ({
    name: subject.subject,
    average: subject.average
  }));

  const passingRateData = [
    { name: "Passed", value: examSummary.passingRate },
    { name: "Failed", value: 100 - examSummary.passingRate }
  ];

  const trendData = trends[0]?.periods.map((period, index) => {
    const data: any = { name: period };
    trends.forEach(trend => {
      data[trend.subject] = trend.averages[index];
    });
    return data;
  });

  return (
    <DashboardLayout title={`Analytics: ${exam.name}`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">{exam.name}</h2>
          <p className="text-gray-500">
            {format(new Date(exam.startDate), "MMM d, yyyy")} - {format(new Date(exam.endDate), "MMM d, yyyy")}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Report
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => downloadReport("pdf")}>
              Download as PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadReport("csv")}>
              Download as CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total Students</CardTitle>
            <CardDescription>Students who took the exam</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{examSummary.studentCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Average Score</CardTitle>
            <CardDescription>Average marks across all subjects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{examSummary.averageScore.toFixed(1)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Passing Rate</CardTitle>
            <CardDescription>Percentage of students who passed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{examSummary.passingRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Student Rankings</TabsTrigger>
          <TabsTrigger value="subjects">Subject Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Stream Performance</CardTitle>
                <CardDescription>Average scores by stream</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={streamPerformanceData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="average" fill="#2563EB" name="Average Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Subject Performance</CardTitle>
                <CardDescription>Average scores by subject</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={subjectAveragesData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip />
                      <Bar dataKey="average" fill="#10B981" name="Average Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Passing Rate</CardTitle>
                <CardDescription>Percentage of students who passed the exam</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={passingRateData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {passingRateData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#EF4444'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
                <CardDescription>Number of students in each grade range</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { range: "0-39", count: 10 },
                        { range: "40-49", count: 15 },
                        { range: "50-59", count: 22 },
                        { range: "60-69", count: 30 },
                        { range: "70-79", count: 25 },
                        { range: "80-89", count: 12 },
                        { range: "90-100", count: 6 },
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" name="Number of Students" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Student Rankings</CardTitle>
              <CardDescription>Top performing students across all subjects</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Admission No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Grade & Stream</TableHead>
                    <TableHead>Average</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentRankings.map(student => (
                    <TableRow key={student.studentId}>
                      <TableCell className="font-medium">{student.rank}</TableCell>
                      <TableCell>{student.student.admissionNo}</TableCell>
                      <TableCell>{student.student.name}</TableCell>
                      <TableCell>
                        {student.student.stream.grade.name} {student.student.stream.name}
                      </TableCell>
                      <TableCell>{student.averageScore}%</TableCell>
                      <TableCell>{student.totalMarks}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="subjects">
          <div className="space-y-6">
            {subjectAnalytics.map(subject => (
              <Card key={subject.subject}>
                <CardHeader>
                  <CardTitle>{subject.subject}</CardTitle>
                  <CardDescription>
                    Average: {subject.averageScore.toFixed(1)}% | Passing Rate: {subject.passingRate}%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Performance Summary</h4>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-gray-100 p-3 rounded-md">
                          <div className="text-sm text-gray-500">Highest</div>
                          <div className="text-lg font-bold">{subject.highestScore}%</div>
                        </div>
                        <div className="bg-gray-100 p-3 rounded-md">
                          <div className="text-sm text-gray-500">Average</div>
                          <div className="text-lg font-bold">{subject.averageScore.toFixed(1)}%</div>
                        </div>
                        <div className="bg-gray-100 p-3 rounded-md">
                          <div className="text-sm text-gray-500">Lowest</div>
                          <div className="text-lg font-bold">{subject.lowestScore}%</div>
                        </div>
                      </div>
                      
                      <h4 className="font-medium mb-2">Stream Breakdown</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Stream</TableHead>
                            <TableHead className="text-right">Average</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subject.streamBreakdown.map(stream => (
                            <TableRow key={stream.streamId}>
                              <TableCell>{stream.streamName}</TableCell>
                              <TableCell className="text-right">{stream.average.toFixed(1)}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={subject.streamBreakdown.map(stream => ({
                            name: stream.streamName,
                            average: stream.average
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Bar dataKey="average" fill="#2563EB" name="Average Score" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Subject performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    {trends.map((trend, index) => (
                      <Line 
                        key={trend.subject}
                        type="monotone" 
                        dataKey={trend.subject} 
                        stroke={COLORS[index % COLORS.length]} 
                        activeDot={{ r: 8 }} 
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-8">
                <h4 className="font-medium mb-4">Subject Passing Rates Over Time</h4>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trends[0]?.periods.map((period, index) => {
                        const data: any = { name: period };
                        trends.forEach(trend => {
                          data[`${trend.subject} Pass Rate`] = trend.passingRates[index];
                        });
                        return data;
                      })}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      {trends.map((trend, index) => (
                        <Line 
                          key={trend.subject}
                          type="monotone" 
                          dataKey={`${trend.subject} Pass Rate`}
                          stroke={COLORS[index % COLORS.length]} 
                          activeDot={{ r: 8 }} 
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default ExamAnalytics;
