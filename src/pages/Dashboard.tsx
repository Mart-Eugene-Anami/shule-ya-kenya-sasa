import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { getActiveAcademicYear, getCurrentActiveTerm } from "@/services/academicService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SchoolStats {
  studentCount: number;
  teacherCount: number;
  gradeCount: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [academicStatus, setAcademicStatus] = useState<{
    hasAcademicYear: boolean;
    currentTerm: any;
    loading: boolean;
  }>({
    hasAcademicYear: false,
    currentTerm: null,
    loading: true
  });
  const [schoolStats, setSchoolStats] = useState<SchoolStats>({
    studentCount: 0,
    teacherCount: 0,
    gradeCount: 0,
  });

  useEffect(() => {
    if (user?.role === 'super_admin') {
      setAcademicStatus({ hasAcademicYear: true, currentTerm: null, loading: false });
      return;
    }
    if (!user?.schoolId) return;
    
    // Fetch academic setup and stats in parallel
    const schoolId = user.schoolId;
    
    Promise.all([
      getActiveAcademicYear(schoolId),
      getCurrentActiveTerm(schoolId),
      // Use head:true count queries in parallel — no full table scans
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('grades').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_active', true),
    ]).then(([academicYear, currentTerm, studentsRes, teachersRes, gradesRes]) => {
      setAcademicStatus({
        hasAcademicYear: !!academicYear,
        currentTerm,
        loading: false
      });
      
      if (!academicYear) {
        toast({
          title: "Academic Setup Required",
          description: "Please set up your academic year and terms to continue.",
          variant: "destructive"
        });
        navigate("/academic-setup");
      }

      setSchoolStats({
        studentCount: studentsRes.count || 0,
        teacherCount: teachersRes.count || 0,
        gradeCount: gradesRes.count || 0,
      });
    }).catch(error => {
      console.error("Error loading dashboard:", error);
      setAcademicStatus(prev => ({ ...prev, loading: false }));
    });
  }, [user?.schoolId, user?.role, navigate]);

  const quickStats = [
    {
      title: "Students",
      value: schoolStats.studentCount.toString(),
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      description: "Total enrolled"
    },
    {
      title: "Teachers",
      value: schoolStats.teacherCount.toString(),
      icon: GraduationCap,
      color: "text-green-600",
      bgColor: "bg-green-100",
      description: "Active staff"
    },
    {
      title: "Grades",
      value: schoolStats.gradeCount.toString(),
      icon: BookOpen,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      description: "Active grades"
    },
  ];

  const quickActions = [
    {
      title: "Manage Students",
      description: "Add, edit, or view student information",
      icon: Users,
      path: "/students",
      color: "bg-blue-600"
    },
    {
      title: "Manage Teachers",
      description: "Handle teacher profiles and assignments",
      icon: GraduationCap,
      path: "/teachers",
      color: "bg-green-600"
    },
    {
      title: "View Grades & Streams",
      description: "Configure academic structure",
      icon: BookOpen,
      path: "/grades",
      color: "bg-purple-600"
    },
    {
      title: "Streams Dashboard",
      description: "Manage streams and view performance",
      icon: TrendingUp,
      path: "/streams-dashboard",
      color: "bg-indigo-600"
    },
    {
      title: "Academic Settings",
      description: "Manage academic years and terms",
      icon: Calendar,
      path: "/academic-settings",
      color: "bg-orange-600"
    }
  ];

  if (academicStatus.loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Clock className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back, {user?.name?.split(' ')[0] || 'Admin'}!
            </h1>
            <p className="text-muted-foreground">
              Here's what's happening at your school today.
            </p>
          </div>
        </div>

        {/* Academic Status Card */}
        {academicStatus.hasAcademicYear && (
          <Card className="border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <h3 className="font-medium text-green-800 dark:text-green-300">Academic Year Active</h3>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {academicStatus.currentTerm 
                      ? `Currently in ${academicStatus.currentTerm.name}` 
                      : "Academic year is set up and running"
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickStats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                  </div>
                  <div className={`rounded-full p-3 ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6" onClick={() => navigate(action.path)}>
                  <div className="flex items-center gap-4">
                    <div className={`rounded-lg p-3 ${action.color}`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>All systems operational</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Database connectivity: Normal</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Academic year: {academicStatus.hasAcademicYear ? 'Configured' : 'Setup required'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
