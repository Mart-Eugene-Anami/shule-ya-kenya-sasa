import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { Student } from "../types";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Clock, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import StudentTable from "../components/students/StudentTable";
import StudentToolbar from "../components/students/StudentToolbar";
import AddStudentDialog from "../components/students/AddStudentDialog";
import BulkImportDialog from "../components/students/BulkImportDialog";
import CreateStudentAccountDialog from "../components/students/CreateStudentAccountDialog";

import { getStudents, createStudent, deleteStudent } from "../services/studentService";

interface GradeStreamGroup {
  gradeId: string;
  gradeName: string;
  gradeLevel: number;
  streamId: string;
  streamName: string;
  students: Student[];
  key: string;
}

const Students = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkImportDialogOpen, setIsBulkImportDialogOpen] = useState(false);
  const [isCreateAccountDialogOpen, setIsCreateAccountDialogOpen] = useState(false);
  const [selectedStudentForAccount, setSelectedStudentForAccount] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  
  const { toast } = useToast();

  useEffect(() => {
    if (user?.schoolId) {
      loadStudents();
    }
  }, [user?.schoolId]);

  const loadStudents = async () => {
    if (!user?.schoolId) return;
    
    try {
      setIsLoading(true);
      const data = await getStudents(user.schoolId);
      setStudents(data);
    } catch (error) {
      console.error('Error loading students:', error);
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(search.toLowerCase()) ||
    student.admissionNo.includes(search) ||
    (student.email && student.email.toLowerCase().includes(search.toLowerCase()))
  );

  // Group students by grade and stream, sorted by grade level then stream name
  const { groups, grades } = useMemo(() => {
    const groupMap = new Map<string, GradeStreamGroup>();
    
    for (const student of filteredStudents) {
      const gradeName = student.grade?.name || "Unassigned";
      const streamName = student.stream?.name || "Unassigned";
      const gradeLevel = student.grade?.level ?? 999;
      const key = `${student.gradeId}-${student.streamId}`;
      
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          gradeId: student.gradeId,
          gradeName,
          gradeLevel,
          streamId: student.streamId,
          streamName,
          students: [],
          key,
        });
      }
      groupMap.get(key)!.students.push(student);
    }

    const allGroups = Array.from(groupMap.values()).sort((a, b) => {
      if (a.gradeLevel !== b.gradeLevel) return a.gradeLevel - b.gradeLevel;
      return a.streamName.localeCompare(b.streamName);
    });

    // Extract unique grades for navigation
    const gradeMap = new Map<string, { id: string; name: string; level: number; count: number }>();
    for (const g of allGroups) {
      if (!gradeMap.has(g.gradeId)) {
        gradeMap.set(g.gradeId, { id: g.gradeId, name: g.gradeName, level: g.gradeLevel, count: 0 });
      }
      gradeMap.get(g.gradeId)!.count += g.students.length;
    }
    const gradeList = Array.from(gradeMap.values()).sort((a, b) => a.level - b.level);

    return { groups: allGroups, grades: gradeList };
  }, [filteredStudents]);

  // Default to highest grade level once grades are available
  useEffect(() => {
    if (grades.length > 0 && selectedGrade === "") {
      const highest = grades[grades.length - 1];
      setSelectedGrade(highest.id);
    }
  }, [grades, selectedGrade]);

  // Filter groups by selected grade
  const visibleGroups = selectedGrade === "all" 
    ? groups 
    : groups.filter(g => g.gradeId === selectedGrade);

  const visibleStudents = visibleGroups.flatMap(g => g.students);

  const handleAddStudent = async (newStudentData: {
    admissionNo: string;
    name: string;
    email: string;
    gradeId: string;
    streamId: string;
    pathway?: string;
    trackId?: string;
  }) => {
    if (!user?.schoolId) {
      toast({
        title: "Error",
        description: "No school ID found",
        variant: "destructive",
      });
      return;
    }

    try {
      const student = await createStudent({
        ...newStudentData,
        schoolId: user.schoolId,
      });
      
      setStudents(prev => [student, ...prev]);
      setIsAddDialogOpen(false);
      
      toast({
        title: "Success",
        description: `Student ${student.name} has been added successfully`,
      });
    } catch (error) {
      console.error('Error adding student:', error);
      toast({
        title: "Error",
        description: "Failed to add student",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    try {
      await deleteStudent(student.id);
      setStudents(prev => prev.filter(s => s.id !== student.id));
      
      toast({
        title: "Success",
        description: `Student ${student.name} has been deleted`,
      });
    } catch (error) {
      console.error('Error deleting student:', error);
      toast({
        title: "Error",
        description: "Failed to delete student",
        variant: "destructive",
      });
    }
  };

  const handleCreateAccount = (student: Student) => {
    setSelectedStudentForAccount(student);
    setIsCreateAccountDialogOpen(true);
  };

  return (
    <DashboardLayout title="Students">
      <div className="flex items-center justify-between mb-4">
        <StudentToolbar
          search={search}
          onSearchChange={setSearch}
          onAddStudent={() => setIsAddDialogOpen(true)}
          onBulkImport={() => setIsBulkImportDialogOpen(true)}
        />
        <Button
          variant="outline"
          onClick={() => navigate("/student-history")}
          className="ml-2 shrink-0"
        >
          <Clock className="h-4 w-4 mr-2" />
          Student History
        </Button>
      </div>

      {/* Grade navigation */}
      {!isLoading && grades.length > 0 && (
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Filter by grade:</span>
            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades ({students.length})</SelectItem>
                {grades.map(grade => (
                  <SelectItem key={grade.id} value={grade.id}>
                    {grade.name} ({grade.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Quick grade chips for fast navigation */}
          <div className="flex flex-wrap gap-1.5">
            {grades.map(grade => (
              <Badge
                key={grade.id}
                variant={selectedGrade === grade.id ? "default" : "outline"}
                className="cursor-pointer transition-colors hover:bg-primary/10"
                onClick={() => setSelectedGrade(selectedGrade === grade.id ? "all" : grade.id)}
              >
                {grade.name}
                <span className="ml-1 text-xs opacity-70">{grade.count}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">Loading students...</div>
      ) : (
        <StudentTable 
          students={visibleStudents} 
          onDelete={handleDeleteStudent}
          onCreateAccount={handleCreateAccount}
        />
      )}

      <AddStudentDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddStudent={handleAddStudent}
      />

      <BulkImportDialog
        isOpen={isBulkImportDialogOpen}
        onOpenChange={setIsBulkImportDialogOpen}
        onUploadComplete={loadStudents}
      />

      <CreateStudentAccountDialog
        student={selectedStudentForAccount}
        isOpen={isCreateAccountDialogOpen}
        onOpenChange={setIsCreateAccountDialogOpen}
        onAccountCreated={loadStudents}
      />
    </DashboardLayout>
  );
};

export default Students;
