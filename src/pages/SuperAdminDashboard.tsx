import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { BadgePlus, School, Settings, Users, RefreshCw, AlertCircle, BookOpen, Building2 } from "lucide-react";
import { SchoolsList } from "@/components/schools/SchoolsList";
import { InviteAdminForm } from "@/components/schools/InviteAdminForm";
import { SchoolRegistrationWizard } from "@/components/schools/SchoolRegistrationWizard";
import { SystemSubjectManager } from "@/components/superadmin/SystemSubjectManager";
import { supabase } from "@/integrations/supabase/client";

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showRegistrationWizard, setShowRegistrationWizard] = useState(false);
  const [activeTab, setActiveTab] = useState("schools");
  const [systemStats, setSystemStats] = useState({
    totalSchools: 0,
    totalStudents: 0,
    totalTeachers: 0,
    activeAdmins: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const fetchSystemStats = async () => {
    try {
      setIsLoadingStats(true);
      
      // Get all statistics in parallel with proper error handling
      const [schoolsResult, studentsResult, teachersResult, adminsResult] = await Promise.allSettled([
        supabase.from('schools').select('*', { count: 'exact', head: true }),
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('teachers').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'school_admin')
      ]);
      
      setSystemStats({
        totalSchools: schoolsResult.status === 'fulfilled' ? (schoolsResult.value.count || 0) : 0,
        totalStudents: studentsResult.status === 'fulfilled' ? (studentsResult.value.count || 0) : 0,
        totalTeachers: teachersResult.status === 'fulfilled' ? (teachersResult.value.count || 0) : 0,
        activeAdmins: adminsResult.status === 'fulfilled' ? (adminsResult.value.count || 0) : 0,
      });
    } catch (error) {
      console.error("Error fetching system stats:", error);
      toast({
        title: "Error loading statistics",
        description: "Some statistics may not be up to date. Please try refreshing.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const handleCreateSchool = () => {
    setShowRegistrationWizard(true);
  };

  const handleSchoolRegistrationComplete = (schoolId: string) => {
    setShowRegistrationWizard(false);
    
    // Refresh stats
    fetchSystemStats();
    
    toast({
      title: "School Registration Complete",
      description: "The school has been successfully registered and is ready for use",
    });
  };

  const handleCancelRegistration = () => {
    setShowRegistrationWizard(false);
  };

  return (
    <DashboardLayout title="Super Admin Dashboard">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Manage schools, administrators, and system-wide settings for Sabby School
        </p>
      </div>

      {/* System Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Schools</p>
                <p className="text-3xl font-bold text-primary">
                  {isLoadingStats ? "..." : systemStats.totalSchools}
                </p>
                <p className="text-xs text-gray-500 mt-1">Registered in system</p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <School className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <p className="text-3xl font-bold text-green-600">
                  {isLoadingStats ? "..." : systemStats.totalStudents}
                </p>
                <p className="text-xs text-gray-500 mt-1">Across all schools</p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Teachers</p>
                <p className="text-3xl font-bold text-purple-600">
                  {isLoadingStats ? "..." : systemStats.totalTeachers}
                </p>
                <p className="text-xs text-gray-500 mt-1">Across all schools</p>
              </div>
              <div className="rounded-full bg-purple-100 p-3">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">System Settings</p>
                <Button 
                  variant="link" 
                  className="text-xl font-bold p-0 h-auto text-orange-600" 
                  onClick={() => navigate("/settings")}
                >
                  Configure
                </Button>
                <p className="text-xs text-gray-500 mt-1">Global system settings</p>
              </div>
              <div className="rounded-full bg-orange-100 p-3">
                <Settings className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
          <TabsTrigger value="schools" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Schools
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            System Subjects
          </TabsTrigger>
        </TabsList>

        {/* Schools Tab */}
        <TabsContent value="schools" className="space-y-6">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">School Management</h2>
              <p className="text-sm text-muted-foreground">Create schools directly or invite administrators to register</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={fetchSystemStats}
                disabled={isLoadingStats}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
                Refresh Stats
              </Button>
              <Button 
                onClick={handleCreateSchool} 
                disabled={showRegistrationWizard}
                className="bg-school-primary hover:bg-school-secondary"
              >
                <BadgePlus className="mr-2 h-4 w-4" />
                Register New School
              </Button>
            </div>
          </div>

          {/* School Registration Wizard - Fixed layout to prevent jumping */}
          {showRegistrationWizard ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold">Create New School</h3>
              </div>
              <div className="min-h-[400px]">
                <SchoolRegistrationWizard
                  onComplete={handleSchoolRegistrationComplete}
                  onCancel={handleCancelRegistration}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Admin Invitations */}
              <div>
                <InviteAdminForm />
              </div>

              {/* Schools List - Add loading state */}
              <div>
                <SchoolsList />
              </div>
            </>
          )}

          {/* Help Section */}
          <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">Need Help?</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">Creating Schools</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Use "Register New School" to create schools directly, or "Invite School Administrators" 
                    to let school admins register themselves.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">Managing Schools</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Click "Access" next to any school to manage it directly as a super admin. 
                    You can view students, teachers, and all school data.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subjects Tab */}
        <TabsContent value="subjects" className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">System Subject Management</h2>
            <p className="text-sm text-muted-foreground">
              Manage default subjects that schools can choose from during registration. 
              Changes here affect all new school registrations.
            </p>
          </div>
          
          <SystemSubjectManager />

          {/* Subjects Help Section */}
          <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-2">About System Subjects</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium text-amber-800 dark:text-amber-200">Curriculum Support</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                     Subjects are organized by curriculum (CBE, CBE Senior, 8-4-4) and division type 
                     (Lower Primary, Upper Primary, Junior Secondary, etc.)
                   </p>
                 </div>
                 <div>
                   <h4 className="font-medium text-amber-800 dark:text-amber-200">Pathways (CBE Senior)</h4>
                   <p className="text-sm text-amber-700 dark:text-amber-300">
                     CBE Senior subjects can be assigned to specific pathways (STEM, Arts & Sports, 
                     Social Sciences) or marked as core subjects available to all students.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
