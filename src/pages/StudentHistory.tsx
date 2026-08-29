
import { useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Student, 
  type StudentHistory as StudentHistoryRecord 
} from "../types";
import { ArrowLeft, GraduationCap, History } from "lucide-react";
import { useNavigate } from "react-router-dom";

const StudentHistory = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  
  // Mock student data - in a real app, you would fetch this from an API
  const [student, setStudent] = useState<Student>({
    id: studentId || "1",
    admissionNo: "001",
    name: "John Kamau",
    email: "john@example.com",
    gradeId: "2",
    streamId: "3",
    schoolId: "1",
    grade: {
      id: "2",
      name: "Grade 6",
      level: 6,
      curriculum: "cbc",
      schoolId: "1",
    },
    stream: {
      id: "3",
      name: "Blue",
      gradeId: "2",
    },
  });
  
  // Mock historical data
  const [history, setHistory] = useState<StudentHistoryRecord[]>([
    {
      id: "1",
      studentId: studentId || "1",
      academicYearId: "1",
      gradeId: "1",
      streamId: "1",
      grade: {
        id: "1",
        name: "Grade 5",
        level: 5,
        curriculum: "cbc",
        schoolId: "1",
      },
      stream: {
        id: "1",
        name: "Red",
        gradeId: "1",
      },
      academicYear: {
        id: "1",
        year: "2022-2023",
        isActive: false,
        createdAt: "2022-01-01T00:00:00Z",
        updatedAt: "2022-01-01T00:00:00Z",
        schoolId: "1",
      }
    },
    {
      id: "2",
      studentId: studentId || "1",
      academicYearId: "2",
      gradeId: "2",
      streamId: "3",
      grade: {
        id: "2",
        name: "Grade 6",
        level: 6,
        curriculum: "cbc",
        schoolId: "1",
      },
      stream: {
        id: "3",
        name: "Blue",
        gradeId: "2",
      },
      academicYear: {
        id: "2",
        year: "2023-2024",
        isActive: true,
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
        schoolId: "1",
      }
    }
  ]);

  return (
    <DashboardLayout title="Student History">
      <div className="mb-6 flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/students')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">{student.name}</h2>
          <p className="text-gray-500">Admission No: {student.admissionNo}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <GraduationCap className="mr-2 h-5 w-5 text-school-primary" />
              Current Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Current Grade</dt>
                <dd className="text-lg font-semibold">{student.grade?.name}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Stream</dt>
                <dd className="text-lg font-semibold">{student.stream?.name}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd>{student.email || "Not provided"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <History className="mr-2 h-5 w-5 text-school-primary" />
              Academic History
            </CardTitle>
            <CardDescription>
              Student's progression through academic years
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Academic Year</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Stream</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length > 0 ? (
                  history.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.academicYear.year}</TableCell>
                      <TableCell>{record.grade.name}</TableCell>
                      <TableCell>{record.stream.name}</TableCell>
                      <TableCell>
                        {record.academicYear.isActive ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            Current
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                            Completed
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                      No historical records found for this student.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentHistory;
