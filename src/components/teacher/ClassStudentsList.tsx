import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Student {
  id: string;
  name: string;
  admission_no: string;
  email: string | null;
  gender: string | null;
  status: string | null;
}

interface ClassStudentsListProps {
  streamId: string;
  gradeId: string;
  gradeName: string;
  streamName: string;
}

export function ClassStudentsList({ 
  streamId, 
  gradeId, 
  gradeName, 
  streamName 
}: ClassStudentsListProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchStudents();
  }, [streamId, gradeId]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("id, name, admission_no, email, gender, status")
        .eq("stream_id", streamId)
        .eq("grade_id", gradeId)
        .order("name");

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.admission_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Students in {gradeName} {streamName}
          </div>
          <Badge variant="secondary">{students.length} students</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or admission number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Admission No.</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {searchTerm ? "No students match your search" : "No students in this class"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.admission_no}</TableCell>
                    <TableCell>{student.gender || "-"}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={student.status === "active" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {student.status || "active"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
