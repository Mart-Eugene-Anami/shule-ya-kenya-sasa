
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { 
  Calendar, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  FileEdit,
  BarChart,
  ClipboardList,
} from "lucide-react";
import { Exam, Grade } from "../types";
import ExamMarkProgress from "../components/exams/ExamMarkProgress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { useAuth } from "../contexts/AuthContext";
import { examService } from "../services/examService";
import { useDataQuery } from "../hooks/useDataQuery";

const Exams = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch exams from database
  const { 
    data: exams = [], 
    isLoading: examsLoading, 
    refetch: refetchExams 
  } = useDataQuery<Exam>({
    tableName: 'exams',
    schoolId: user?.schoolId,
    orderBy: 'created_at',
    orderDirection: 'desc'
  });

  // Fetch grades from database
  const { 
    data: grades = [], 
    isLoading: gradesLoading 
  } = useDataQuery<Grade>({
    tableName: 'grades',
    schoolId: user?.schoolId,
    orderBy: 'level',
    orderDirection: 'asc'
  });

  // Fetch active subjects from database
  const { 
    data: rawSubjects = [], 
    isLoading: subjectsLoading 
  } = useDataQuery<{ id: string; name: string; curriculum: string; division_id: string | null }>({
    tableName: 'subjects',
    schoolId: user?.schoolId,
    filterColumn: 'is_active',
    filterValue: true,
    orderBy: 'name',
    orderDirection: 'asc'
  });

  const [search, setSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>(new Date());
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(new Date());
  const [newExam, setNewExam] = useState<Partial<Exam>>({
    name: "",
    description: "",
    grades: [],
    subjects: [],
  });

  // Filter subjects by selected grades' divisions, then deduplicate by name
  // Strict filtering: only show subjects that belong to a division matching
  // the selected grades. Subjects with no division_id are excluded to prevent
  // cross-division leakage.
  const subjects = (() => {
    let filtered = rawSubjects;
    if (selectedGrades.length > 0) {
      const selectedDivisionIds = new Set(
        grades
          .filter(g => selectedGrades.includes(g.id))
          .map(g => (g as any).division_id)
          .filter(Boolean)
      );
      if (selectedDivisionIds.size > 0) {
        filtered = rawSubjects.filter(s => 
          s.division_id && selectedDivisionIds.has(s.division_id)
        );
      }
    }
    // Deduplicate by name
    const seen = new Set<string>();
    return filtered.filter(s => {
      if (seen.has(s.name)) return false;
      seen.add(s.name);
      return true;
    });
  })();

  // Clear invalid subject selections when grades change
  useEffect(() => {
    const validNames = new Set(subjects.map(s => s.name));
    setSelectedSubjects(prev => prev.filter(s => validNames.has(s)));
  }, [selectedGrades, subjects.length]);

  const filteredExams = exams.filter(exam => 
    exam.name.toLowerCase().includes(search.toLowerCase()) ||
    exam.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddExam = async () => {
    if (!newExam.name || !selectedGrades.length || !selectedSubjects.length || !selectedStartDate || !selectedEndDate) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    if (selectedStartDate > selectedEndDate) {
      toast({
        title: "Error",
        description: "Start date must be before end date",
        variant: "destructive",
      });
      return;
    }

    if (!user?.schoolId) {
      toast({
        title: "Error",
        description: "School information not found",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const examData = {
        name: newExam.name,
        description: newExam.description || "",
        grades: selectedGrades,
        subjects: selectedSubjects,
        startDate: selectedStartDate.toISOString().split('T')[0],
        endDate: selectedEndDate.toISOString().split('T')[0],
        createdBy: user.id,
        schoolId: user.schoolId,
        isActive: true,
      };

      console.log('Creating exam with data:', examData);
      await examService.createExam(examData);

      toast({
        title: "Exam created",
        description: `${newExam.name} has been created successfully.`,
      });

      // Reset form
      setNewExam({
        name: "",
        description: "",
        grades: [],
        subjects: [],
      });
      setSelectedGrades([]);
      setSelectedSubjects([]);
      setSelectedStartDate(new Date());
      setSelectedEndDate(new Date());
      setIsAddDialogOpen(false);

      // Refetch exams to show the new one
      refetchExams();
    } catch (error) {
      console.error('Error creating exam:', error);
      toast({
        title: "Error",
        description: "Failed to create exam. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleGradeToggle = (gradeId: string) => {
    setSelectedGrades(prev => 
      prev.includes(gradeId) 
        ? prev.filter(id => id !== gradeId) 
        : [...prev, gradeId]
    );
  };

  const handleSubjectToggle = (subject: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subject) 
        ? prev.filter(s => s !== subject) 
        : [...prev, subject]
    );
  };

  const getGradeNames = (gradeIds: string[]) => {
    return gradeIds.map(id => 
      grades.find(grade => grade.id === id)?.name || id
    ).join(", ");
  };

  const handleDeleteExam = async () => {
    if (!examToDelete) return;
    setIsDeleting(true);
    try {
      await examService.deleteExam(examToDelete.id);
      toast({
        title: "Exam deleted",
        description: `"${examToDelete.name}" and all associated marks, timetable entries, and analytics have been permanently deleted.`,
      });
      setIsDeleteDialogOpen(false);
      setExamToDelete(null);
      refetchExams();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete exam. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isExamActive = (exam: Exam) => {
    const today = new Date().toISOString().split('T')[0];
    return exam.isActive && 
           today >= exam.startDate && 
           today <= exam.endDate;
  };

  if (examsLoading || gradesLoading || subjectsLoading) {
    return (
      <DashboardLayout title="Exams">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-school-primary mx-auto mb-2"></div>
            <p className="text-gray-500">Loading exams...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Exams">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search exams..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {user?.role === "school_admin" && (
          <Button
            className="bg-school-primary hover:bg-school-secondary"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Exam
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Grades</TableHead>
              <TableHead>Subjects</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExams.length > 0 ? (
              filteredExams.map((exam) => (
                <React.Fragment key={exam.id}>
                <TableRow>
                  <TableCell className="font-medium">{exam.name}</TableCell>
                  <TableCell>{getGradeNames(exam.grades)}</TableCell>
                  <TableCell>{exam.subjects.join(", ")}</TableCell>
                  <TableCell>{format(new Date(exam.startDate), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{format(new Date(exam.endDate), "MMM dd, yyyy")}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isExamActive(exam) 
                        ? "bg-green-100 text-green-800" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {isExamActive(exam) ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/exam-marks-list/${exam.id}`)}
                      >
                        <ClipboardList className="mr-2 h-4 w-4" />
                        View Marks
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/exam-marks/${exam.id}`)}
                      >
                        <FileEdit className="mr-2 h-4 w-4" />
                        Enter Marks
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/exam-analytics/${exam.id}`)}
                      >
                        <BarChart className="mr-2 h-4 w-4" />
                        Analytics
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/exam-timetable/${exam.id}`)}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Timetable
                      </Button>
                      {user?.role === "school_admin" && (
                        <>
                         <Button variant="outline" size="sm">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setExamToDelete(exam);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="p-0">
                    <ExamMarkProgress exam={exam} grades={grades} />
                  </TableCell>
                </TableRow>
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No exams found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Exam Dialog */}
      {/* Create Exam Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Create New Exam</DialogTitle>
            <DialogDescription>
              Define a new exam with grades, subjects, and date range.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div className="space-y-2">
              <Label htmlFor="exam-name">Exam Name</Label>
              <Input
                id="exam-name"
                placeholder="Term 1 Mathematics Exam"
                value={newExam.name}
                onChange={(e) => setNewExam({ ...newExam, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="exam-description">Description (Optional)</Label>
              <Textarea
                id="exam-description"
                placeholder="End of term examination for mathematics"
                value={newExam.description}
                onChange={(e) => setNewExam({ ...newExam, description: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Grades</Label>
                {grades.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => setSelectedGrades(grades.map(g => g.id))}
                    >
                      Select All
                    </Button>
                    <span className="text-muted-foreground">|</span>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => setSelectedGrades([])}
                    >
                      Deselect All
                    </Button>
                  </div>
                )}
              </div>
              {grades.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                  {grades.map((grade) => (
                    <div key={grade.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`grade-${grade.id}`} 
                        checked={selectedGrades.includes(grade.id)}
                        onCheckedChange={() => handleGradeToggle(grade.id)}
                      />
                      <label
                        htmlFor={`grade-${grade.id}`}
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {grade.name}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border rounded-md p-3 text-center text-muted-foreground">
                  No grades found. Please set up grades first.
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Subjects</Label>
                {subjects.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => setSelectedSubjects(subjects.map(s => s.name))}
                    >
                      Select All
                    </Button>
                    <span className="text-muted-foreground">|</span>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => setSelectedSubjects([])}
                    >
                      Deselect All
                    </Button>
                  </div>
                )}
              </div>
              {subjects.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                  {subjects.map((subject) => (
                    <div key={subject.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`subject-${subject.id}`} 
                        checked={selectedSubjects.includes(subject.name)}
                        onCheckedChange={() => handleSubjectToggle(subject.name)}
                      />
                      <label
                        htmlFor={`subject-${subject.id}`}
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {subject.name}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border rounded-md p-3 text-center text-muted-foreground">
                  No subjects found. Please set up subjects in curriculum setup first.
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {selectedStartDate ? format(selectedStartDate, "PP") : "Select date"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarUI
                      mode="single"
                      selected={selectedStartDate}
                      onSelect={setSelectedStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {selectedEndDate ? format(selectedEndDate, "PP") : "Select date"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarUI
                      mode="single"
                      selected={selectedEndDate}
                      onSelect={setSelectedEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 pt-4 gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              className="bg-school-primary hover:bg-school-secondary"
              onClick={handleAddExam}
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Create Exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Exam Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>"{examToDelete?.name}"</strong> along with
              all associated marks, exam timetable entries, and analytics data. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExam}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </DashboardLayout>
  );
};

export default Exams;
