
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceCard } from "./PerformanceCard";
import { ExamPerformanceChart } from "./ExamPerformanceChart";
import { SubjectComparisonChart } from "./SubjectComparisonChart";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ChevronRight, BarChart3, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminAnalyticsProps {
  schoolId?: string;
}

export function AdminAnalytics({ schoolId }: AdminAnalyticsProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedExam, setSelectedExam] = useState<string>("latest");
  
  // Mock data - would be fetched from API in a real implementation
  const performanceData = {
    average: 70.2,
    passing: 82,
    trend: { value: 1.8, isPositive: true, label: "vs last term" },
    attendance: 94.5,
    totalStudents: 324,
    examsTaken: 3,
  };
  
  const grades = [
    { id: "all", name: "All Grades" },
    { id: "1", name: "Form 1" },
    { id: "2", name: "Form 2" },
    { id: "3", name: "Form 3" },
    { id: "4", name: "Form 4" },
  ];
  
  const exams = [
    { id: "latest", name: "Latest Exam" },
    { id: "term1", name: "Term 1 Exams" },
    { id: "term2", name: "Term 2 Exams" },
    { id: "term3", name: "Term 3 Exams" },
  ];
  
  const gradePerformance = [
    { name: "Form 1", value: 74 },
    { name: "Form 2", value: 68 },
    { name: "Form 3", value: 72 },
    { name: "Form 4", value: 67 },
  ];
  
  const streamPerformance = [
    { name: "Form 1 Red", value: 76 },
    { name: "Form 1 Blue", value: 72 },
    { name: "Form 2 Red", value: 65 },
    { name: "Form 2 Blue", value: 70 },
    { name: "Form 3 Red", value: 73 },
    { name: "Form 3 Blue", value: 71 },
    { name: "Form 4 Red", value: 64 },
    { name: "Form 4 Blue", value: 69 },
  ];
  
  const subjectPerformance = [
    { name: "Mathematics", value: 65 },
    { name: "English", value: 72 },
    { name: "Physics", value: 68 },
    { name: "Chemistry", value: 70 },
    { name: "Biology", value: 74 },
    { name: "History", value: 76 },
    { name: "Geography", value: 71 },
  ];
  
  const yearlyTrends = [
    { name: "Term 1, 2024", "Form 1": 70, "Form 2": 65, "Form 3": 68, "Form 4": 63 },
    { name: "Term 2, 2024", "Form 1": 72, "Form 2": 66, "Form 3": 70, "Form 4": 64 },
    { name: "Term 3, 2024", "Form 1": 74, "Form 2": 68, "Form 3": 72, "Form 4": 67 },
    { name: "Term 1, 2025", "Form 1": 75, "Form 2": 69, "Form 3": 73, "Form 4": 68 },
  ];
  
  const gradeTrendData = [
    { name: "Form 1", dataKey: "Form 1", color: "#2563EB" },
    { name: "Form 2", dataKey: "Form 2", color: "#10B981" },
    { name: "Form 3", dataKey: "Form 3", color: "#F59E0B" },
    { name: "Form 4", dataKey: "Form 4", color: "#8B5CF6" },
  ];
  
  // Top and bottom streams
  const topStreams = [
    { name: "Form 1 Red", average: 76, improvement: 3.2 },
    { name: "Form 3 Red", average: 73, improvement: 2.5 },
    { name: "Form 1 Blue", average: 72, improvement: 1.8 },
  ];
  
  const bottomStreams = [
    { name: "Form 4 Red", average: 64, change: -1.2 },
    { name: "Form 2 Red", average: 65, change: -0.5 },
    { name: "Form 4 Blue", average: 69, change: 0.2 },
  ];

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <div className="space-y-3">
      <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 animate-pulse rounded"></div>
        ))}
      </div>
      <div className="h-64 bg-gray-200 animate-pulse rounded"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">School Performance Analytics</h3>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            className="flex items-center" 
            onClick={() => navigate("/exams/analytics")}
          >
            <BarChart3 className="mr-2 h-4 w-4" /> Detailed Analytics
          </Button>
          <Button 
            className="flex items-center" 
            onClick={() => navigate("/reports/generate")}
          >
            <FileText className="mr-2 h-4 w-4" /> Generate Reports
          </Button>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="mr-2 text-sm font-medium">Grade:</span>
            <Select
              value={selectedGrade}
              onValueChange={setSelectedGrade}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((grade) => (
                  <SelectItem key={grade.id} value={grade.id}>
                    {grade.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center">
            <span className="mr-2 text-sm font-medium">Exam Period:</span>
            <Select
              value={selectedExam}
              onValueChange={setSelectedExam}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((exam) => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Button variant="ghost" className="flex items-center text-blue-600">
          <Filter className="mr-2 h-4 w-4" /> More Filters
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <PerformanceCard
          title="School Average"
          value={`${performanceData.average}%`}
          trend={performanceData.trend}
        />
        <PerformanceCard
          title="Passing Rate"
          value={`${performanceData.passing}%`}
          description="Students scored 50% or higher"
        />
        <PerformanceCard
          title="Average Attendance"
          value={`${performanceData.attendance}%`}
          description="Current term"
        />
      </div>
      
      <Tabs defaultValue="grades">
        <TabsList className="mb-4">
          <TabsTrigger value="grades">By Grade</TabsTrigger>
          <TabsTrigger value="streams">By Stream</TabsTrigger>
          <TabsTrigger value="subjects">By Subject</TabsTrigger>
        </TabsList>
        
        <TabsContent value="grades">
          <div className="grid gap-6 md:grid-cols-2">
            <ExamPerformanceChart 
              title="Performance By Grade"
              description="Average scores across different grade levels"
              data={gradePerformance}
              dataKey="value"
            />
            
            <SubjectComparisonChart
              title="Grade Performance Trends"
              description="Progress over examination periods"
              data={yearlyTrends}
              subjects={gradeTrendData}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="streams">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Stream Performance Comparison</CardTitle>
                <CardDescription>Average scores across all streams</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ExamPerformanceChart 
                    title=""
                    data={streamPerformance}
                    dataKey="value"
                    height={320}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className="lg:row-span-2">
              <CardHeader>
                <CardTitle>Stream Rankings</CardTitle>
                <CardDescription>Best and worst performing streams</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium text-sm text-gray-500 mb-3">Top Performing</h4>
                  <div className="space-y-4">
                    {topStreams.map((stream, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{stream.name}</p>
                          <p className="text-sm text-gray-500">Avg: {stream.average}%</p>
                        </div>
                        <div className="text-green-500 text-sm font-medium">
                          +{stream.improvement}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium text-sm text-gray-500 mb-3">Needs Improvement</h4>
                  <div className="space-y-4">
                    {bottomStreams.map((stream, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{stream.name}</p>
                          <p className="text-sm text-gray-500">Avg: {stream.average}%</p>
                        </div>
                        <div className={stream.change < 0 ? "text-red-500 text-sm font-medium" : "text-green-500 text-sm font-medium"}>
                          {stream.change > 0 ? "+" : ""}{stream.change}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Stream Comparison By Subject</CardTitle>
                <CardDescription>Detailed breakdown of performance by subject</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-500 p-8">
                  Select specific streams to compare their subject performance
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="subjects">
          <div className="grid gap-6 md:grid-cols-2">
            <ExamPerformanceChart 
              title="Performance By Subject"
              description="Average scores across different subjects"
              data={subjectPerformance}
              dataKey="value"
              colors={["#10B981"]}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Subject Highlights</CardTitle>
                <CardDescription>Noteworthy performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-l-4 border-green-500 pl-4 py-2">
                    <p className="font-medium">Strongest Subject</p>
                    <p className="text-lg">History (76%)</p>
                    <p className="text-sm text-gray-500">2.5% improvement from last term</p>
                  </div>
                  
                  <div className="border-l-4 border-red-500 pl-4 py-2">
                    <p className="font-medium">Weakest Subject</p>
                    <p className="text-lg">Mathematics (65%)</p>
                    <p className="text-sm text-gray-500">1.2% decline from last term</p>
                  </div>
                  
                  <div className="border-l-4 border-blue-500 pl-4 py-2">
                    <p className="font-medium">Most Improved</p>
                    <p className="text-lg">Biology (74%)</p>
                    <p className="text-sm text-gray-500">5.3% improvement from last term</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
