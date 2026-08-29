
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AdminAnalytics } from "@/components/analytics/AdminAnalytics";
import { ArrowLeft, School, Users, GraduationCap, BookOpen, UserCircle, Settings } from "lucide-react";

const SchoolView = () => {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [schoolData, setSchoolData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchSchoolData = async () => {
      if (!schoolId) return;
      
      try {
        // Fetch basic school info
        const { data: schoolInfo, error: schoolError } = await supabase
          .from('schools')
          .select('*')
          .eq('id', schoolId)
          .single();
          
        if (schoolError) throw schoolError;
        
        // Fetch admin info
        let adminInfo = null;
        if (schoolInfo.admin_id) {
          const { data: admin, error: adminError } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', schoolInfo.admin_id)
            .single();
            
          if (!adminError) {
            adminInfo = admin;
          }
        }
        
        // Fetch counts of students, teachers, etc.
        const [
          { count: studentCount },
          { count: teacherCount },
          { count: gradeCount }
        ] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
          supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
          supabase.from('grades').select('*', { count: 'exact', head: true }).eq('school_id', schoolId)
        ]);
        
        setSchoolData({
          ...schoolInfo,
          admin: adminInfo,
          counts: {
            students: studentCount || 0,
            teachers: teacherCount || 0,
            grades: gradeCount || 0
          }
        });
        
        // Set the current school context for navigation
        localStorage.setItem('currentSchoolId', schoolId);
        localStorage.setItem('currentSchoolName', schoolInfo.name);
        
      } catch (error: any) {
        console.error("Error fetching school data:", error);
        toast({
          title: "Error loading school",
          description: error.message || "Failed to load school data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSchoolData();
  }, [schoolId, toast]);
  
  if (loading) {
    return (
      <DashboardLayout title="School View">
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span className="sr-only">Loading...</span>
        </div>
      </DashboardLayout>
    );
  }
  
  if (!schoolData) {
    return (
      <DashboardLayout title="School Not Found">
        <div className="text-center py-10">
          <School className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">School Not Found</h2>
          <p className="text-gray-500 mb-6">The requested school could not be found</p>
          <Button 
            onClick={() => navigate("/super-admin")}
            className="bg-school-primary hover:bg-school-secondary"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Return to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout title={`School: ${schoolData.name}`}>
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate("/super-admin")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Super Admin Dashboard
        </Button>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>School Overview</CardTitle>
            <CardDescription>Basic information about {schoolData.name}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-medium">Contact Information</h3>
              <div className="mt-2 space-y-2">
                <p className="text-sm"><strong>Location:</strong> {schoolData.location}</p>
                <p className="text-sm"><strong>Email:</strong> {schoolData.email}</p>
                <p className="text-sm"><strong>Phone:</strong> {schoolData.phone}</p>
              </div>
            </div>
            <div>
              <h3 className="font-medium">Administrator</h3>
              <div className="mt-2 space-y-2">
                <p className="text-sm"><strong>Name:</strong> {schoolData.admin?.name || "Not assigned"}</p>
                <p className="text-sm"><strong>Email:</strong> {schoolData.admin?.email || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* School Statistics */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Students</p>
                <p className="text-3xl font-bold">{schoolData.counts.students}</p>
                <p className="text-xs text-gray-500 mt-1">Total enrolled</p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Teachers</p>
                <p className="text-3xl font-bold">{schoolData.counts.teachers}</p>
                <p className="text-xs text-gray-500 mt-1">Teaching staff</p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <UserCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Grades</p>
                <p className="text-3xl font-bold">{schoolData.counts.grades}</p>
                <p className="text-xs text-gray-500 mt-1">Academic levels</p>
              </div>
              <div className="rounded-full bg-amber-100 p-3">
                <GraduationCap className="h-8 w-8 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* School Management Navigation */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">School Management</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/students`)}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="rounded-full bg-blue-100 p-3">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">Students</h3>
                  <p className="text-sm text-gray-500">Manage student records</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/teachers`)}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="rounded-full bg-green-100 p-3">
                  <UserCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium">Teachers</h3>
                  <p className="text-sm text-gray-500">Manage teaching staff</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/grades`)}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="rounded-full bg-amber-100 p-3">
                  <GraduationCap className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-medium">Grades</h3>
                  <p className="text-sm text-gray-500">Manage grades & streams</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/exams`)}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="rounded-full bg-purple-100 p-3">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium">Exams</h3>
                  <p className="text-sm text-gray-500">Manage exams & marks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/academic-settings`)}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="rounded-full bg-indigo-100 p-3">
                  <School className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-medium">Academic Year</h3>
                  <p className="text-sm text-gray-500">Manage academic periods</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/settings`)}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="rounded-full bg-gray-100 p-3">
                  <Settings className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-medium">Settings</h3>
                  <p className="text-sm text-gray-500">School configuration</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* School Analytics */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">School Analytics</h2>
        <AdminAnalytics schoolId={schoolId || ""} />
      </div>
    </DashboardLayout>
  );
};

export default SchoolView;
