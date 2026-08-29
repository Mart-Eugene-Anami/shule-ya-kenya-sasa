import { useState, useEffect } from "react";
import { format, parseISO, isToday, isBefore, addDays } from "date-fns";
import DashboardLayout from "../components/layout/DashboardLayout";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Clock, Calendar as CalendarIcon, AlertTriangle, Lock, Unlock, Download, Printer } from "lucide-react";
import {
  generateAndPrintDailyAttendance,
  generateAndDownloadDailyAttendance,
} from "@/utils/attendanceExport";
import BulkAttendanceDownloadDialog from "@/components/attendance/BulkAttendanceDownloadDialog";
import { Student, Stream, Grade, Attendance, Teacher } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { getGrades, getSchoolStreamGradeCombinations } from "../services/academicService";

const AttendancePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCombinationId, setSelectedCombinationId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedAttendanceRecords, setSelectedAttendanceRecords] = useState<Attendance[]>([]);
  const [confirmOverrideDialogOpen, setConfirmOverrideDialogOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // State for real data
  const [streamGradeCombinations, setStreamGradeCombinations] = useState<Array<{
    id: string;
    gradeId: string;
    streamId: string;
    gradeName: string;
    streamName: string;
    displayName: string;
    teacherId?: string;
  }>>([]);
  
  // Load real data from database
  useEffect(() => {
    if (user?.schoolId) {
      loadSchoolData();
    }
  }, [user?.schoolId]);

  const loadSchoolData = async () => {
    if (!user?.schoolId) return;
    
    setIsLoadingData(true);
    try {
      // Load stream-grade combinations and teachers in parallel (lightweight)
      const [combinations, teachersRes] = await Promise.all([
        getSchoolStreamGradeCombinations(user.schoolId),
        supabase.from('teachers').select('id, name, email, subject, school_id, is_stream_teacher').eq('school_id', user.schoolId),
      ]);
      
      setStreamGradeCombinations(combinations);
      
      if (!teachersRes.error && teachersRes.data) {
        setTeachers(teachersRes.data.map(t => ({
          id: t.id,
          name: t.name,
          email: t.email,
          subject: t.subject,
          schoolId: t.school_id,
          isStreamTeacher: t.is_stream_teacher
        })));
      }

      // DON'T load all students or attendance records upfront
      // They will be loaded on-demand when a combination is selected

    } catch (error) {
      console.error('Error loading school data:', error);
      toast({
        title: "Error", 
        description: "Failed to load school data",
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  // Load students and attendance on-demand when combination or date changes
  const loadCombinationData = async (combo: { streamId: string; gradeId: string }) => {
    if (!user?.schoolId) return;
    
    const [studentsRes, attendanceRes] = await Promise.all([
      supabase
        .from('students')
        .select('id, admission_no, name, grade_id, stream_id, school_id')
        .eq('school_id', user.schoolId)
        .eq('grade_id', combo.gradeId)
        .eq('stream_id', combo.streamId)
        .eq('status', 'active'),
      supabase
        .from('attendance')
        .select('*')
        .eq('stream_id', combo.streamId)
        .gte('date', format(addDays(new Date(), -7), 'yyyy-MM-dd'))
        .order('date', { ascending: false }),
    ]);

    if (!studentsRes.error && studentsRes.data) {
      setStudents(studentsRes.data.map(s => ({
        id: s.id,
        admissionNo: s.admission_no,
        name: s.name,
        gradeId: s.grade_id,
        streamId: s.stream_id,
        schoolId: s.school_id
      })));
    }

    if (!attendanceRes.error && attendanceRes.data) {
      setAttendanceRecords(attendanceRes.data.map(a => ({
        id: a.id,
        date: a.date,
        studentId: a.student_id,
        streamId: a.stream_id,
        status: a.status as "Present" | "Absent" | "Late",
        recordedBy: a.recorded_by,
        recordedAt: a.recorded_at,
        locked: a.locked
      })));
    }
  };

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);

  // State for new attendance records
  const [newAttendance, setNewAttendance] = useState<Record<string, "Present" | "Absent" | "Late">>({});

  // Filter combinations based on user role
  const availableCombinations = streamGradeCombinations.filter(combo => {
    if (user?.role === "school_admin") return true;
    if (user?.role === "teacher") {
      const teacher = teachers.find(t => t.email === user.email);
      return combo.teacherId === teacher?.id;
    }
    return false;
  });

  // Get selected combination
  const selectedCombination = streamGradeCombinations.find(c => c.id === selectedCombinationId);

  // Get students for the selected grade-stream combination
  const streamStudents = selectedCombination 
    ? students.filter(student => 
        student.streamId === selectedCombination.streamId && 
        student.gradeId === selectedCombination.gradeId
      )
    : [];
  
  // Format date for display and API calls
  const formattedDate = format(selectedDate, "yyyy-MM-dd");
  
  // Check if attendance has been recorded for this combination on this date
  const hasRecordedAttendance = selectedCombination && attendanceRecords.some(
    record => record.streamId === selectedCombination.streamId && record.date === formattedDate
  );

  // Pre-populate attendance form when records change
  useEffect(() => {
    if (!selectedCombination || attendanceRecords.length === 0) return;
    const existingRecords = attendanceRecords.filter(
      record => record.streamId === selectedCombination.streamId && record.date === formattedDate
    );
    if (existingRecords.length > 0) {
      const statusMap: Record<string, "Present" | "Absent" | "Late"> = {};
      existingRecords.forEach(record => { statusMap[record.studentId] = record.status; });
      setNewAttendance(statusMap);
    }
  }, [attendanceRecords, selectedCombination, formattedDate]);
  
  // Check if records are locked (older than 24 hours)
  const isLocked = isBefore(selectedDate, addDays(new Date(), -1));

  // Get teacher name
  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.name : "Unknown Teacher";
  };
  
  // Initialize attendance form when combination changes
  const handleCombinationChange = async (combinationId: string) => {
    setSelectedCombinationId(combinationId);
    setNewAttendance({});
    
    const combo = streamGradeCombinations.find(c => c.id === combinationId);
    if (!combo) return;
    
    // Load students and attendance for this specific combination
    await loadCombinationData(combo);
    
    // Pre-populate with existing records if any (will use freshly loaded data)
    // Note: This is handled reactively via the state update from loadCombinationData
  };
  
  // Handle status change for a student
  const handleStatusChange = (studentId: string, status: "Present" | "Absent" | "Late") => {
    setNewAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };
  
  // Submit attendance
  const handleSubmitAttendance = async () => {
    if (!selectedCombination) return;
    
    // Validate all students have a status
    const missingStudents = streamStudents.filter(student => !newAttendance[student.id]);
    if (missingStudents.length > 0) {
      toast({
        title: "Incomplete Attendance",
        description: `Please mark attendance for all students (${missingStudents.length} remaining)`,
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const currentTeacher = teachers.find(t => t.email === user?.email);
      const attendanceRecordsToSubmit = [];
      
      // Prepare attendance records for database
      for (const [studentId, status] of Object.entries(newAttendance)) {
        attendanceRecordsToSubmit.push({
          date: formattedDate,
          student_id: studentId,
          stream_id: selectedCombination.streamId,
          status,
          recorded_by: currentTeacher?.id || user?.id,
          recorded_at: new Date().toISOString(),
          locked: false
        });
      }
      
      // Upsert attendance records to database
      console.log('Submitting attendance records:', attendanceRecordsToSubmit);
      const { data, error } = await supabase
        .from('attendance')
        .upsert(attendanceRecordsToSubmit, {
          onConflict: 'date,student_id'
        });
      
      console.log('Upsert result:', { data, error });
      
      if (error) {
        console.error('Upsert error details:', error);
        throw error;
      }
      
      toast({
        title: "Attendance Recorded",
        description: `Attendance for ${selectedCombination.displayName} has been saved.`
      });
      
      // Reload only the current combination's data
      if (selectedCombination) {
        await loadCombinationData(selectedCombination);
      }
      
    } catch (error: any) {
      console.error('Error submitting attendance:', error);
      toast({
        title: "Error",
        description: "Failed to save attendance. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // View attendance for a specific date and combination
  const handleViewAttendance = () => {
    if (!selectedCombination) return;
    
    const records = attendanceRecords.filter(
      record => record.streamId === selectedCombination.streamId && record.date === formattedDate
    );
    
    if (records.length === 0) {
      toast({
        title: "No Records Found",
        description: `No attendance records found for ${selectedCombination.displayName} on ${format(selectedDate, "PP")}.`,
        variant: "destructive"
      });
      return;
    }
    
    setSelectedAttendanceRecords(records);
    setIsViewDialogOpen(true);
  };
  
  // Handle admin override
  const handleAdminOverride = () => {
    if (user?.role !== "school_admin" || !selectedCombination) return;
    
    // Unlock records for the selected date and stream
    const updatedRecords = attendanceRecords.map(record => {
      if (record.streamId === selectedCombination.streamId && record.date === formattedDate) {
        return { ...record, locked: false };
      }
      return record;
    });
    
    setAttendanceRecords(updatedRecords);
    setConfirmOverrideDialogOpen(false);
    
    toast({
      title: "Records Unlocked",
      description: `Attendance records for ${selectedCombination.displayName} on ${format(selectedDate, "PP")} have been unlocked for editing.`
    });
  };

  return (
    <DashboardLayout title="Attendance Management">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Select Date</CardTitle>
              <CardDescription>Choose a date to view or record attendance</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="border rounded-md w-fit"
              />
              
              {isToday(selectedDate) && (
                <div className="mt-4 flex items-center text-green-600">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Today</span>
                </div>
              )}
              
              {isLocked && user?.role !== "school_admin" && (
                <div className="mt-2 flex items-start text-amber-600">
                  <AlertTriangle className="h-4 w-4 mr-2 mt-0.5" />
                  <span className="text-sm">
                    Records for this date are locked. Only admins can modify past records.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Select Grade & Stream</CardTitle>
              <CardDescription>Choose a grade-stream combination</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedCombinationId}
                onValueChange={handleCombinationChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a grade and stream" />
                </SelectTrigger>
                <SelectContent>
                  {availableCombinations.map((combo) => (
                    <SelectItem key={combo.id} value={combo.id}>
                      {combo.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedCombination && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Stream Teacher:</span>
                    <span className="text-sm">
                      {selectedCombination.teacherId 
                        ? getTeacherName(selectedCombination.teacherId) 
                        : "Not Assigned"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Students:</span>
                    <span className="text-sm">{streamStudents.length}</span>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      onClick={handleViewAttendance}
                      className="w-full"
                      variant="outline"
                      disabled={!selectedCombinationId}
                    >
                      View Attendance Records
                    </Button>
                    
                    {isLocked && user?.role === "school_admin" && (
                      <Button 
                        onClick={() => setConfirmOverrideDialogOpen(true)}
                        className="w-full mt-2"
                        variant="outline"
                        disabled={!selectedCombinationId}
                      >
                        <Unlock className="h-4 w-4 mr-2" />
                        Override Lock (Admin)
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <CardTitle>
                    Attendance Sheet
                    {selectedCombination && (
                      <span className="ml-2 text-muted-foreground">
                        - {selectedCombination.displayName}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {format(selectedDate, "PPP")}
                    {hasRecordedAttendance && (
                      <span className="ml-2 text-green-600">
                        • Attendance recorded
                      </span>
                    )}
                  </CardDescription>
                </div>
                
                <div className="flex items-center gap-2">
                  {hasRecordedAttendance && selectedCombination && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const records = attendanceRecords.filter(
                            r => r.streamId === selectedCombination.streamId && r.date === formattedDate
                          );
                          const rows = records.map(r => {
                            const student = students.find(s => s.id === r.studentId);
                            return { admissionNo: student?.admissionNo || "", studentName: student?.name || "", status: r.status };
                          });
                          const present = records.filter(r => r.status === "Present").length;
                          const absent = records.filter(r => r.status === "Absent").length;
                          const late = records.filter(r => r.status === "Late").length;
                          generateAndDownloadDailyAttendance({
                            gradeName: selectedCombination.gradeName,
                            streamName: selectedCombination.streamName,
                            date: format(selectedDate, "yyyy-MM-dd"),
                            records: rows,
                            summary: { present, absent, late, total: records.length },
                          });
                        }}
                      >
                      <Download className="h-4 w-4 mr-1" /> PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const records = attendanceRecords.filter(
                            r => r.streamId === selectedCombination.streamId && r.date === formattedDate
                          );
                          const rows = records.map(r => {
                            const student = students.find(s => s.id === r.studentId);
                            return { admissionNo: student?.admissionNo || "", studentName: student?.name || "", status: r.status };
                          });
                          const present = records.filter(r => r.status === "Present").length;
                          const absent = records.filter(r => r.status === "Absent").length;
                          const late = records.filter(r => r.status === "Late").length;
                          generateAndPrintDailyAttendance({
                            gradeName: selectedCombination.gradeName,
                            streamName: selectedCombination.streamName,
                            date: format(selectedDate, "yyyy-MM-dd"),
                            records: rows,
                            summary: { present, absent, late, total: records.length },
                          });
                        }}
                      >
                        <Printer className="h-4 w-4 mr-1" /> Print
                      </Button>
                    </>
                  )}
                  {user?.schoolId && (
                    <BulkAttendanceDownloadDialog
                      schoolId={user.schoolId}
                      combinations={availableCombinations}
                    />
                  )}
                  {isLocked && (
                    <Badge variant="outline" className="flex items-center gap-1 border-amber-200">
                      <Lock className="h-3 w-3" />
                      <span>Locked</span>
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {!selectedCombinationId ? (
                <div className="text-center py-8 text-gray-500">
                  Please select a grade and stream to view or record attendance
                </div>
              ) : streamStudents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No students found in this grade-stream combination
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Admission No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {streamStudents.map((student) => {
                        // Get existing record if any
                        const existingRecord = selectedCombination && attendanceRecords.find(
                          r => r.streamId === selectedCombination.streamId && 
                               r.date === formattedDate && 
                               r.studentId === student.id
                        );
                        
                        const currentStatus = newAttendance[student.id] || existingRecord?.status;
                        const isRecordLocked = existingRecord?.locked;
                        
                        return (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.admissionNo}</TableCell>
                            <TableCell>{student.name}</TableCell>
                            <TableCell className="text-right">
                              {(isLocked && user?.role !== "school_admin") || isRecordLocked ? (
                                <div className="flex items-center justify-end">
                                  {currentStatus === "Present" && (
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                      <Check className="h-3 w-3 mr-1" /> Present
                                    </Badge>
                                  )}
                                  {currentStatus === "Absent" && (
                                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                                      <X className="h-3 w-3 mr-1" /> Absent
                                    </Badge>
                                  )}
                                  {currentStatus === "Late" && (
                                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                      <Clock className="h-3 w-3 mr-1" /> Late
                                    </Badge>
                                  )}
                                  {!currentStatus && (
                                    <span className="text-gray-500">Not recorded</span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-end space-x-1">
                                  <Button
                                    size="sm"
                                    variant={currentStatus === "Present" ? "default" : "outline"}
                                    className={currentStatus === "Present" ? "bg-green-600 hover:bg-green-700" : ""}
                                    onClick={() => handleStatusChange(student.id, "Present")}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={currentStatus === "Absent" ? "default" : "outline"}
                                    className={currentStatus === "Absent" ? "bg-red-600 hover:bg-red-700" : ""}
                                    onClick={() => handleStatusChange(student.id, "Absent")}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={currentStatus === "Late" ? "default" : "outline"}
                                    className={currentStatus === "Late" ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                                    onClick={() => handleStatusChange(student.id, "Late")}
                                  >
                                    <Clock className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  
                  {!isLocked || user?.role === "school_admin" ? (
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={handleSubmitAttendance}
                        disabled={streamStudents.length === 0 || isSubmitting || (!selectedCombinationId)}
                        className="bg-school-primary hover:bg-school-secondary"
                      >
                        {isSubmitting ? "Saving..." : "Save Attendance"}
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* View Attendance Records Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Attendance Records</DialogTitle>
            <DialogDescription>
              {selectedCombination && `${selectedCombination.displayName} • ${format(selectedDate, "PPP")}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedAttendanceRecords.map((record) => {
                    const student = students.find(s => s.id === record.studentId);
                    return (
                      <TableRow key={record.id}>
                        <TableCell>{student?.name || "Unknown Student"}</TableCell>
                        <TableCell>
                          {record.status === "Present" && (
                            <Badge className="bg-green-100 text-green-800">
                              <Check className="h-3 w-3 mr-1" /> Present
                            </Badge>
                          )}
                          {record.status === "Absent" && (
                            <Badge className="bg-red-100 text-red-800">
                              <X className="h-3 w-3 mr-1" /> Absent
                            </Badge>
                          )}
                          {record.status === "Late" && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Clock className="h-3 w-3 mr-1" /> Late
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            <div className="text-sm text-gray-500">
              Recorded by: {getTeacherName(selectedAttendanceRecords[0]?.recordedBy || "")}
              <br />
              Time: {selectedAttendanceRecords[0]?.recordedAt ? 
                format(parseISO(selectedAttendanceRecords[0].recordedAt), "p") : "Unknown"}
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirm Override Dialog */}
      <Dialog open={confirmOverrideDialogOpen} onOpenChange={setConfirmOverrideDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Unlock Records</DialogTitle>
            <DialogDescription>
              This will allow editing of locked attendance records. This action should only be used in exceptional circumstances.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-start text-amber-600 mb-4">
            <AlertTriangle className="h-5 w-5 mr-2 mt-0.5" />
            <p className="text-sm">
              Attendance records are locked after 24 hours to maintain accuracy. Unlocking them may affect reporting and analytics.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOverrideDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleAdminOverride}
            >
              Unlock Records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AttendancePage;
