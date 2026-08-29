
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceCard } from "./PerformanceCard";
import { ExamPerformanceChart } from "./ExamPerformanceChart";
import { SubjectComparisonChart } from "./SubjectComparisonChart";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StudentAnalyticsProps {
  studentId?: string;
}

export function StudentAnalytics({ studentId }: StudentAnalyticsProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Mock data - would be fetched from API in a real implementation
  const performanceData = {
    average: 72,
    rank: "5th",
    trend: { value: 3.2, isPositive: true, label: "vs last term" },
    attendance: 98.2,
    subjectsImproved: 4,
    totalSubjects: 7
  };
  
  const examHistory = [
    { name: "Term 1", value: 65 },
    { name: "Term 2", value: 68 },
    { name: "Term 3", value: 72 },
  ];
  
  const subjectData = [
    { name: "Term 1", Mathematics: 60, English: 65, Science: 70, History: 58 },
    { name: "Term 2", Mathematics: 65, English: 68, Science: 72, History: 63 },
    { name: "Term 3", Mathematics: 70, English: 75, Science: 68, History: 74 },
  ];
  
  const subjects = [
    { name: "Mathematics", dataKey: "Mathematics", color: "#2563EB" },
    { name: "English", dataKey: "English", color: "#10B981" },
    { name: "Science", dataKey: "Science", color: "#F59E0B" },
    { name: "History", dataKey: "History", color: "#8B5CF6" },
  ];
  
  const streamComparison = [
    { name: "Mathematics", value: 72, average: 68 },
    { name: "English", value: 75, average: 70 },
    { name: "Science", value: 68, average: 72 },
    { name: "History", value: 74, average: 67 },
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
        <h3 className="text-lg font-medium">Your Performance Summary</h3>
        <Button 
          variant="ghost" 
          className="flex items-center text-blue-600" 
          onClick={() => navigate("/student/exam-history")}
        >
          View all exams <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <PerformanceCard
          title="Overall Average"
          value={`${performanceData.average}%`}
          trend={performanceData.trend}
        />
        <PerformanceCard
          title="Class Ranking"
          value={performanceData.rank}
          description="Out of 35 students"
        />
        <PerformanceCard
          title="Attendance"
          value={`${performanceData.attendance}%`}
          description="Current term"
        />
        <PerformanceCard
          title="Subjects Improved"
          value={`${performanceData.subjectsImproved}/${performanceData.totalSubjects}`}
          description="Since last term"
        />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <ExamPerformanceChart 
          title="Your Progress Over Time"
          description="Average scores across all subjects"
          data={examHistory}
          dataKey="value"
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Subject vs. Class Average</CardTitle>
            <CardDescription>How you compare to your classmates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {streamComparison.map((subject) => (
                <div key={subject.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{subject.name}</span>
                    <span className="font-medium">{subject.value}%</span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-600 rounded-full"
                      style={{ width: `${subject.value}%` }}
                    ></div>
                    <div
                      className="absolute inset-y-0 left-0 border-r-2 border-red-500"
                      style={{ left: `${subject.average}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-end text-xs text-gray-500">
                    Class average: {subject.average}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <SubjectComparisonChart
        title="Subject Performance Trends"
        description="Your progress in each subject over time"
        data={subjectData}
        subjects={subjects}
        height={350}
      />
    </div>
  );
}
