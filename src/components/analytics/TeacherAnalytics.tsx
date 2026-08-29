
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceCard } from "./PerformanceCard";
import { ExamPerformanceChart } from "./ExamPerformanceChart";
import { SubjectComparisonChart } from "./SubjectComparisonChart";
import { Button } from "@/components/ui/button";
import { ChevronRight, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TeacherAnalyticsProps {
  teacherId?: string;
}

export function TeacherAnalytics({ teacherId }: TeacherAnalyticsProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedStream, setSelectedStream] = useState<string>("all");
  
  // Mock data - would be fetched from API in a real implementation
  const performanceData = {
    average: 68,
    passing: 84,
    trend: { value: 2.5, isPositive: true, label: "vs last term" },
    submissions: 95.2,
    topScore: 94,
  };
  
  const streams = [
    { id: "all", name: "All Streams" },
    { id: "1", name: "Form 1 Red" },
    { id: "2", name: "Form 1 Blue" },
    { id: "3", name: "Form 2 Green" },
  ];
  
  const streamPerformance = [
    { name: "Form 1 Red", value: 72 },
    { name: "Form 1 Blue", value: 65 },
    { name: "Form 2 Green", value: 68 },
    { name: "Form 2 Yellow", value: 70 },
  ];
  
  const examTrends = [
    { name: "Term 1", "Form 1 Red": 68, "Form 1 Blue": 62, "Form 2 Green": 65, "Form 2 Yellow": 67 },
    { name: "Term 2", "Form 1 Red": 70, "Form 1 Blue": 63, "Form 2 Green": 67, "Form 2 Yellow": 68 },
    { name: "Term 3", "Form 1 Red": 72, "Form 1 Blue": 65, "Form 2 Green": 68, "Form 2 Yellow": 70 },
  ];
  
  const streamTrendData = [
    { name: "Form 1 Red", dataKey: "Form 1 Red", color: "#2563EB" },
    { name: "Form 1 Blue", dataKey: "Form 1 Blue", color: "#10B981" },
    { name: "Form 2 Green", dataKey: "Form 2 Green", color: "#F59E0B" },
    { name: "Form 2 Yellow", dataKey: "Form 2 Yellow", color: "#8B5CF6" },
  ];
  
  // Top performing and struggling students (would be fetched)
  const topStudents = [
    { name: "Jane Doe", average: 92, stream: "Form 1 Red" },
    { name: "John Smith", average: 90, stream: "Form 2 Green" },
    { name: "Sarah Johnson", average: 87, stream: "Form 1 Blue" },
  ];
  
  const strugglingStudents = [
    { name: "Michael Brown", average: 42, stream: "Form 1 Blue" },
    { name: "Emma Wilson", average: 45, stream: "Form 2 Yellow" },
    { name: "David Lee", average: 48, stream: "Form 1 Red" },
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 animate-pulse rounded"></div>
        ))}
      </div>
      <div className="h-64 bg-gray-200 animate-pulse rounded"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Subject Performance Analytics</h3>
        <Button 
          variant="outline" 
          className="flex items-center" 
          onClick={() => navigate("/exams")}
        >
          <FileText className="mr-2 h-4 w-4" /> Generate Reports
        </Button>
      </div>
      
      <div className="flex items-center justify-end space-x-4">
        <div className="flex items-center">
          <span className="mr-2 text-sm font-medium">Stream:</span>
          <Select
            value={selectedStream}
            onValueChange={setSelectedStream}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select stream" />
            </SelectTrigger>
            <SelectContent>
              {streams.map((stream) => (
                <SelectItem key={stream.id} value={stream.id}>
                  {stream.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <PerformanceCard
          title="Class Average"
          value={`${performanceData.average}%`}
          trend={performanceData.trend}
        />
        <PerformanceCard
          title="Passing Rate"
          value={`${performanceData.passing}%`}
          description="Students scored 50% or higher"
        />
        <PerformanceCard
          title="Assignment Submission"
          value={`${performanceData.submissions}%`}
          description="Completed assignments"
        />
        <PerformanceCard
          title="Highest Mark"
          value={`${performanceData.topScore}%`}
          description="Top student performance"
        />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <ExamPerformanceChart 
          title="Performance By Stream"
          description="Average scores across different streams"
          data={streamPerformance}
          dataKey="value"
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Student Intervention Needed</CardTitle>
            <CardDescription>Students requiring additional support</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {strugglingStudents.map((student, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-gray-500">{student.stream}</p>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2 font-bold text-red-500">{student.average}%</span>
                    <Button variant="outline" size="sm">Review</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <SubjectComparisonChart
        title="Stream Performance Trends"
        description="Performance over time across different streams"
        data={examTrends}
        subjects={streamTrendData}
        height={350}
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Students</CardTitle>
          <CardDescription>Recognize excellence in your subject</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topStudents.map((student, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <p className="font-medium">{student.name}</p>
                  <p className="text-sm text-gray-500">{student.stream}</p>
                </div>
                <div className="flex items-center">
                  <span className="mr-2 font-bold text-green-500">{student.average}%</span>
                  <Button variant="outline" size="sm">View Details</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
