
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Grade } from "../types";
import { Search, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useDataQuery } from "../hooks/useDataQuery";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface GradeStream {
  id: string;
  streamId: string;
  streamName: string;
  teacherId?: string;
  teacherName?: string;
  studentCount: number;
}

const Streams = () => {
  const { id: gradeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Fetch grade details
  const { 
    data: grades = [], 
    isLoading: gradeLoading 
  } = useDataQuery<Grade>({
    tableName: 'grades',
    filterColumn: 'id',
    filterValue: gradeId,
    schoolId: user?.schoolId
  });
  
  const grade = grades[0];

  const [search, setSearch] = useState("");
  const [gradeStreams, setGradeStreams] = useState<GradeStream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (gradeId && user?.schoolId) {
      loadGradeStreams();
    }
  }, [gradeId, user?.schoolId]);

  const loadGradeStreams = async () => {
    if (!gradeId) return;
    
    try {
      setLoading(true);
      
      // Fetch grade-stream combinations with teacher and student data
      const { data: gradeStreamData, error } = await supabase
        .from('grade_streams')
        .select(`
          id,
          teacher_id,
          streams!inner (
            id,
            name
          )
        `)
        .eq('grade_id', gradeId);
      
      if (error) throw error;

      // Get teacher names and student counts for each grade-stream
      const enrichedData = await Promise.all(
        gradeStreamData.map(async (gs: any) => {
          // Get teacher name
          let teacherName = "Not assigned";
          if (gs.teacher_id) {
            const { data: teacher } = await supabase
              .from('teachers')
              .select('name')
              .eq('id', gs.teacher_id)
              .single();
            
            if (teacher) teacherName = teacher.name;
          }

          // Get student count
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('grade_id', gradeId)
            .eq('stream_id', gs.streams.id);

          return {
            id: gs.id,
            streamId: gs.streams.id,
            streamName: gs.streams.name,
            teacherId: gs.teacher_id,
            teacherName,
            studentCount: count || 0
          };
        })
      );

      setGradeStreams(enrichedData);
    } catch (error) {
      console.error('Error loading grade streams:', error);
      toast({
        title: "Error",
        description: "Failed to load streams for this grade",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStreams = gradeStreams.filter((stream) =>
    stream.streamName.toLowerCase().includes(search.toLowerCase())
  );

  if (gradeLoading || loading) {
    return (
      <DashboardLayout title="Streams">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-school-primary mx-auto mb-2"></div>
            <p className="text-gray-500">Loading streams...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!grade) {
    return (
      <DashboardLayout title="Grade Not Found">
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">The requested grade could not be found.</p>
          <Button onClick={() => navigate("/grades")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Grades
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`${grade.name} - Streams`}>
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate("/grades")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Grades
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{grade.name} Streams Overview</CardTitle>
          <CardDescription>
            View streams and their assigned teachers for this grade. Teachers are assigned when creating/editing teacher records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Streams</p>
              <p className="text-2xl font-bold">{gradeStreams.length}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Assigned Teachers</p>
              <p className="text-2xl font-bold">
                {gradeStreams.filter(s => s.teacherId).length}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Students</p>
              <p className="text-2xl font-bold">
                {gradeStreams.reduce((sum, s) => sum + s.studentCount, 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search streams..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stream Name</TableHead>
              <TableHead>Assigned Teacher</TableHead>
              <TableHead>Students</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStreams.length > 0 ? (
              filteredStreams.map((stream) => (
                <TableRow key={stream.id}>
                  <TableCell className="font-medium">{stream.streamName}</TableCell>
                  <TableCell>
                    {stream.teacherName}
                    {!stream.teacherId && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Assign via Teachers page)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{stream.studentCount}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  {search ? `No streams found matching "${search}"` : "No streams found for this grade"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> To assign a teacher to a specific stream in this grade, go to the Teachers page and 
          set them as a "Stream Teacher" with the appropriate grade-stream combination.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Streams;
