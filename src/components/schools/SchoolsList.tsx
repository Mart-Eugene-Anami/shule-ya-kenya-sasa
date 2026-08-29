
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { School, Users, GraduationCap, ArrowRight, Edit, Trash2, RefreshCw, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SchoolAccessToggle } from "./SchoolAccessToggle";
import { getSchoolsWithAccessInfo, type SchoolAccessInfo } from "@/services/accessControlService";

interface SchoolData {
  id: string;
  name: string;
  location: string;
  email: string;
  phone: string;
  admin_id: string;
  created_at: string;
  admin_name?: string;
  admin_email?: string;
  students_count?: number;
  teachers_count?: number;
  can_access?: boolean;
  access_status?: 'allowed' | 'restricted';
}

export const SchoolsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [schoolsAccessInfo, setSchoolsAccessInfo] = useState<SchoolAccessInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchSchools = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      console.log("Fetching schools...");
      
      // Fetch schools with basic info - more efficient query
      const { data: schoolsData, error } = await supabase
        .from('schools')
        .select(`
          id,
          name,
          location,
          email,
          phone,
          admin_id,
          created_at,
          access_status
        `)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching schools:", error);
        throw error;
      }
      
      console.log(`Found ${schoolsData?.length || 0} schools`);
      
      if (!schoolsData || schoolsData.length === 0) {
        setSchools([]);
        setSchoolsAccessInfo([]);
        return;
      }

      // Fetch access info for all schools
      try {
        const accessInfo = await getSchoolsWithAccessInfo();
        setSchoolsAccessInfo(accessInfo);
      } catch (accessError) {
        console.error("Error fetching access info:", accessError);
      }
      
      // Batch fetch additional data for better performance
      const schoolIds = schoolsData.map(school => school.id);
      const adminIds = schoolsData.map(school => school.admin_id).filter(Boolean);
      
      // Fetch admin profiles in batch if we have admin IDs
      let adminProfiles: any[] = [];
      if (adminIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', adminIds);
        adminProfiles = profiles || [];
      }
      
      // Fetch counts in batch
      const [studentsCountResult, teachersCountResult] = await Promise.allSettled([
        supabase
          .from('students')
          .select('school_id', { count: 'exact', head: true })
          .in('school_id', schoolIds),
        supabase
          .from('teachers')
          .select('school_id', { count: 'exact', head: true })
          .in('school_id', schoolIds)
      ]);
      
      // Process schools with fetched data
      const schoolsWithDetails = schoolsData.map(school => {
        const adminProfile = adminProfiles?.find(admin => admin.id === school.admin_id);
        
        return {
          ...school,
          admin_name: adminProfile?.name || 'Not assigned',
          admin_email: adminProfile?.email || 'N/A',
          students_count: 0,
          teachers_count: 0,
          can_access: Boolean(adminProfile),
          access_status: school.access_status as 'allowed' | 'restricted'
        };
      });
      
      setSchools(schoolsWithDetails);
      
      if (showRefreshToast) {
        toast({
          title: "Schools refreshed",
          description: `Found ${schoolsWithDetails.length} schools`
        });
      }
    } catch (error: any) {
      console.error("Error fetching schools:", error);
      toast({
        title: "Failed to load schools",
        description: error.message || "There was an error loading the schools data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchSchools();
  }, []);
  
  const handleAccessSchool = (schoolId: string, schoolName: string) => {
    // Store the selected school in local storage for reference
    localStorage.setItem('currentSchoolId', schoolId);
    localStorage.setItem('currentSchoolName', schoolName);
    
    toast({
      title: "Accessing school",
      description: `Navigating to ${schoolName} dashboard`
    });
    
    // Navigate to the school dashboard
    navigate(`/schools/${schoolId}`);
  };
  
  const handleEditSchool = (schoolId: string) => {
    toast({
      title: "Edit school",
      description: "Opening school edit interface"
    });
    navigate(`/schools/edit/${schoolId}`);
  };
  
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDeleteSchool = async (schoolId: string, schoolName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${schoolName}"?\n\nThis will PERMANENTLY remove:\n- The school record\n- All student records and their user accounts\n- All teacher records and their user accounts\n- All academic data (marks, attendance, exams)\n- All timetables and configurations\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      setIsDeleting(schoolId);
      
      // Use the edge function to delete school and all associated user accounts
      const { data, error } = await supabase.functions.invoke('delete-school', {
        body: { schoolId }
      });
        
      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to delete school');
      }
      
      const usersDeleted = data.details?.usersDeleted || 0;
      
      toast({
        title: "School deleted",
        description: `${schoolName} and ${usersDeleted} user account(s) have been permanently removed`
      });
      
      // Refresh the schools list
      fetchSchools();
    } catch (error: any) {
      console.error("Error deleting school:", error);
      toast({
        title: "Failed to delete school",
        description: error.message || "An error occurred while deleting the school",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleRefresh = () => {
    fetchSchools(true);
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Registered Schools
          </CardTitle>
          <CardDescription>
            Loading schools data...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Loading skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                  <Skeleton className="h-8 w-16 mx-auto mb-2" />
                  <Skeleton className="h-4 w-24 mx-auto" />
                </div>
              ))}
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              Registered Schools
            </CardTitle>
            <CardDescription>
              All schools currently registered in the system. Click "Access" to manage a school directly.
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {schools.length === 0 ? (
          <div className="text-center py-12">
            <School className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No schools registered yet</h3>
            <p className="text-gray-500 mb-4">
              Use the "Register New School" button above or "Invite School Administrators" to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{schools.length}</div>
                <div className="text-sm text-gray-600">Total Schools</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {schools.reduce((sum, school) => sum + (school.students_count || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Total Students</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {schools.reduce((sum, school) => sum + (school.teachers_count || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Total Teachers</div>
              </div>
            </div>

            {/* Schools list */}
            <div className="space-y-4">
              {schools.map((school) => {
                const accessInfo = schoolsAccessInfo.find(s => s.id === school.id);
                
                return (
                  <div key={school.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div>
                            <h3 className="font-medium text-lg">{school.name}</h3>
                            <p className="text-sm text-muted-foreground">{school.location}</p>
                            <p className="text-xs text-muted-foreground/70">{school.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{school.admin_name}</span>
                            {school.can_access && (
                              <Badge variant="secondary" className="text-xs ml-1">
                                Active
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Access Control Section */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        {accessInfo && (
                          <SchoolAccessToggle 
                            school={accessInfo} 
                            onAccessChanged={() => fetchSchools(true)} 
                          />
                        )}
                        
                        <div className="flex items-center gap-2">
                          {school.can_access ? (
                            <Button
                              size="sm"
                              onClick={() => handleAccessSchool(school.id, school.name)}
                              className="bg-school-primary hover:bg-school-secondary"
                            >
                              Access <ArrowRight className="ml-1 h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              title="School admin needs to complete registration"
                            >
                              Pending Setup
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSchool(school.id)}
                            title="Edit school details"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSchool(school.id, school.name)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete school"
                            disabled={isDeleting === school.id}
                          >
                            {isDeleting === school.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
