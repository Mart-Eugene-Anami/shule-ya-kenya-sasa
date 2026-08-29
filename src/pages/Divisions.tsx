import DashboardLayout from "@/components/layout/DashboardLayout";
import { DivisionManager } from "@/components/divisions/DivisionManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, BookOpen, Calendar } from "lucide-react";
import { useDivisions } from "@/hooks/useDivisions";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Divisions = () => {
  const { user } = useAuth();
  const { divisions, loading } = useDivisions();
  const [divisionStats, setDivisionStats] = useState<Record<string, { grades: number; teachers: number; students: number }>>({});

  useEffect(() => {
    const loadStats = async () => {
      if (!user?.schoolId || divisions.length === 0) return;

      const stats: Record<string, { grades: number; teachers: number; students: number }> = {};

      for (const division of divisions) {
        // Get grades count
        const { count: gradesCount } = await supabase
          .from("grades")
          .select("*", { count: "exact", head: true })
          .eq("division_id", division.id);

        // Get teachers count
        const { count: teachersCount } = await supabase
          .from("teachers")
          .select("*", { count: "exact", head: true })
          .eq("division_id", division.id)
          .eq("status", "active");

        // Get students count (through grades)
        const { data: gradeIds } = await supabase
          .from("grades")
          .select("id")
          .eq("division_id", division.id);

        let studentsCount = 0;
        if (gradeIds && gradeIds.length > 0) {
          const { count } = await supabase
            .from("students")
            .select("*", { count: "exact", head: true })
            .in("grade_id", gradeIds.map(g => g.id))
            .eq("status", "active");
          studentsCount = count || 0;
        }

        stats[division.id] = {
          grades: gradesCount || 0,
          teachers: teachersCount || 0,
          students: studentsCount,
        };
      }

      setDivisionStats(stats);
    };

    loadStats();
  }, [user?.schoolId, divisions]);

  return (
    <DashboardLayout title="School Divisions">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">School Divisions</h2>
          <p className="text-muted-foreground">
            Organize your school into distinct sections with independent configurations
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <Building2 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="manage" className="gap-2">
              <Calendar className="h-4 w-4" />
              Manage Divisions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : divisions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Divisions Configured</h3>
                  <p className="text-muted-foreground">
                    Go to the "Manage Divisions" tab to initialize your school divisions.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {divisions.map((division) => {
                  const stats = divisionStats[division.id] || { grades: 0, teachers: 0, students: 0 };
                  return (
                    <Card key={division.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{division.name}</CardTitle>
                          {division.short_name && (
                            <span className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary">
                              {division.short_name}
                            </span>
                          )}
                        </div>
                        <CardDescription>
                          {division.curriculum === "8-4-4" 
                            ? `Form ${division.grade_level_start}-${division.grade_level_end}`
                            : `Grade ${division.grade_level_start}-${division.grade_level_end}`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="flex items-center justify-center mb-1">
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="text-2xl font-bold">{stats.grades}</div>
                            <div className="text-xs text-muted-foreground">Grades</div>
                          </div>
                          <div>
                            <div className="flex items-center justify-center mb-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="text-2xl font-bold">{stats.teachers}</div>
                            <div className="text-xs text-muted-foreground">Teachers</div>
                          </div>
                          <div>
                            <div className="flex items-center justify-center mb-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="text-2xl font-bold">{stats.students}</div>
                            <div className="text-xs text-muted-foreground">Students</div>
                          </div>
                        </div>
                        {division.description && (
                          <p className="mt-4 text-sm text-muted-foreground border-t pt-4">
                            {division.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="manage">
            <DivisionManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Divisions;
