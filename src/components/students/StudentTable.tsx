import { useState, useMemo } from "react";
import { Student } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, History, Trash2, UserPlus, UserCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cbcSeniorPathways, requiresPathway } from "@/services/curriculumService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StudentTableProps {
  students: Student[];
  onEdit?: (student: Student) => void;
  onDelete?: (student: Student) => void;
  onCreateAccount?: (student: Student) => void;
}

const PAGE_SIZES = [25, 50, 100];

const getPathwayLabel = (pathway?: string) => {
  if (!pathway) return null;
  const found = cbcSeniorPathways.find(p => p.value === pathway);
  return found?.label || pathway;
};

const getPathwayColor = (pathway?: string) => {
  switch (pathway) {
    case "stem": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case "arts_sports": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    case "social_sciences": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    default: return "";
  }
};

const StudentTable = ({ students, onEdit, onDelete, onCreateAccount }: StudentTableProps) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // Reset page when students change
  const studentKey = students.length;
  const [lastKey, setLastKey] = useState(studentKey);
  if (studentKey !== lastKey) {
    setPage(0);
    setLastKey(studentKey);
  }

  // Sort students
  const sortedStudents = useMemo(() => 
    [...students].sort((a, b) => {
      const gradeA = a.grade?.level ?? 999;
      const gradeB = b.grade?.level ?? 999;
      if (gradeA !== gradeB) return gradeA - gradeB;
      const streamA = a.stream?.name || "";
      const streamB = b.stream?.name || "";
      if (streamA !== streamB) return streamA.localeCompare(streamB);
      return a.name.localeCompare(b.name);
    }), [students]
  );

  const totalPages = Math.ceil(sortedStudents.length / pageSize);
  const paginatedStudents = sortedStudents.slice(page * pageSize, (page + 1) * pageSize);

  const viewStudentHistory = (studentId: string) => {
    navigate(`/students/${studentId}/history`);
  };

  const hasPathwayStudents = students.some(s => s.pathway || (s.grade?.name && requiresPathway(s.grade.name)));

  return (
    <div className="space-y-2">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Admission No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Stream</TableHead>
              {hasPathwayStudents && <TableHead>Pathway</TableHead>}
              <TableHead>Account Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedStudents.length > 0 ? (
              paginatedStudents.map((student) => {
                const showPathway = student.grade?.name && requiresPathway(student.grade.name);
                return (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.admissionNo}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.grade?.name || "-"}</TableCell>
                    <TableCell>{student.stream?.name || "-"}</TableCell>
                    {hasPathwayStudents && (
                      <TableCell>
                        {showPathway && student.pathway ? (
                          <Badge className={getPathwayColor(student.pathway)}>
                            {getPathwayLabel(student.pathway)}
                          </Badge>
                        ) : showPathway ? (
                          <span className="text-muted-foreground text-sm">Not set</span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      {student.userId ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800">
                          <UserCheck className="mr-1 h-3 w-3" />
                          Has Account
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground border-dashed">
                          No Account
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                      {onCreateAccount && !student.userId && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onCreateAccount(student)}
                          title="Create login account"
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Create Account
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => viewStudentHistory(student.id)}
                        title="View academic history"
                      >
                        <History className="mr-2 h-4 w-4 text-blue-500" />
                        History
                      </Button>
                      {onEdit && (
                        <Button variant="outline" size="sm" onClick={() => onEdit(student)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      )}
                      {onDelete && (
                        <Button variant="outline" size="sm" onClick={() => onDelete(student)}>
                          <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                          Delete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={hasPathwayStudents ? 7 : 6} className="h-24 text-center text-muted-foreground">
                  No students found. Import students or add them manually.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      {sortedStudents.length > PAGE_SIZES[0] && (
        <div className="flex items-center justify-between px-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map(s => (
                  <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span>
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sortedStudents.length)} of {sortedStudents.length}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentTable;
