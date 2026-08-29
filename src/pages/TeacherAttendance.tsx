import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, Check, X, Clock, Download, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurriculumTerminology } from "@/hooks/useCurriculumTerminology";
import {
  generateAndPrintDailyAttendance,
  generateAndDownloadDailyAttendance,
  generateAndPrintPeriodAttendance,
  generateAndDownloadPeriodAttendance,
} from "@/utils/attendanceExport";

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  student_id: string;
  students: { id: string; name: string; admission_no: string };
}

interface StreamOption {
  streamId: string;
  streamName: string;
  gradeId: string;
  gradeName: string;
}

const TeacherAttendance = () => {
  const { user } = useAuth();
  const { terminology } = useCurriculumTerminology();
  
  const [loading, setLoading] = useState(true);
  const [streamOptions, setStreamOptions] = useState<StreamOption[]>([]);
  const [selectedStream, setSelectedStream] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [dateRange, setDateRange] = useState<string>('7'); // Days to show

  useEffect(() => {
    if (user?.id) {
      fetchTeacherStreams();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedStream) {
      fetchAttendance();
    }
  }, [selectedStream, dateRange]);

  const fetchTeacherStreams = async () => {
    try {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!teacher) {
        setLoading(false);
        return;
      }

      // Get streams from teacher assignments
      const { data: assignments } = await supabase
        .from('teacher_subject_assignments')
        .select(`
          grade_streams!teacher_subject_assignments_grade_stream_id_fkey(
            grade_id,
            stream_id,
            grades!grade_streams_grade_id_fkey(id, name),
            streams!grade_streams_stream_id_fkey(id, name)
          )
        `)
        .eq('teacher_id', teacher.id);

      const streamsMap = new Map<string, StreamOption>();
      
      if (assignments) {
        assignments.forEach((a: any) => {
          const gs = a.grade_streams;
          if (gs && gs.grades && gs.streams) {
            const key = `${gs.grade_id}-${gs.stream_id}`;
            if (!streamsMap.has(key)) {
              streamsMap.set(key, {
                streamId: gs.stream_id,
                streamName: gs.streams.name,
                gradeId: gs.grade_id,
                gradeName: gs.grades.name
              });
            }
          }
        });
      }

      const options = Array.from(streamsMap.values());
      setStreamOptions(options);
      
      if (options.length > 0) {
        setSelectedStream(`${options[0].gradeId}-${options[0].streamId}`);
      }
    } catch (error) {
      console.error("Error fetching teacher streams:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    if (!selectedStream) return;
    
    const [gradeId, streamId] = selectedStream.split('-');
    const fromDate = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');

    try {
      // Get students in this stream and grade
      const { data: students } = await supabase
        .from('students')
        .select('id, name, admission_no')
        .eq('stream_id', streamId)
        .eq('grade_id', gradeId)
        .order('name');

      if (!students?.length) {
        setAttendanceRecords([]);
        return;
      }

      const studentIds = students.map(s => s.id);

      // Get attendance records
      const { data: records } = await supabase
        .from('attendance')
        .select('id, date, status, student_id')
        .in('student_id', studentIds)
        .gte('date', fromDate)
        .order('date', { ascending: false });

      const enrichedRecords = (records || []).map(record => ({
        ...record,
        students: students.find(s => s.id === record.student_id)!
      }));

      setAttendanceRecords(enrichedRecords);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Present':
        return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" />Present</Badge>;
      case 'Absent':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Absent</Badge>;
      case 'Late':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Late</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Group records by date
  const recordsByDate: { [date: string]: AttendanceRecord[] } = {};
  attendanceRecords.forEach(record => {
    if (!recordsByDate[record.date]) {
      recordsByDate[record.date] = [];
    }
    recordsByDate[record.date].push(record);
  });

  const currentStreamOption = streamOptions.find(
    s => `${s.gradeId}-${s.streamId}` === selectedStream
  );

  if (loading) {
    return (
      <DashboardLayout title="Attendance Records">
        <div className="flex justify-center items-center h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Attendance Records">
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              View Attendance by Stream
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-2 block">{terminology.gradeSingular} / Stream</label>
                <Select value={selectedStream} onValueChange={setSelectedStream}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stream" />
                  </SelectTrigger>
                  <SelectContent>
                    {streamOptions.map(option => (
                      <SelectItem 
                        key={`${option.gradeId}-${option.streamId}`} 
                        value={`${option.gradeId}-${option.streamId}`}
                      >
                        {option.gradeName} - {option.streamName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="14">Last 14 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Download/Print for full period */}
              {currentStreamOption && Object.keys(recordsByDate).length > 0 && (
                <div className="md:col-span-2 flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const dates = Object.keys(recordsByDate).sort();
                      // Get all unique students
                      const studentMap = new Map<string, { admissionNo: string; name: string }>();
                      Object.values(recordsByDate).flat().forEach(r => {
                        if (!studentMap.has(r.student_id)) {
                          studentMap.set(r.student_id, { admissionNo: r.students.admission_no, name: r.students.name });
                        }
                      });
                      const students = Array.from(studentMap.entries()).map(([id, info]) => {
                        const dailyStatuses = dates.map(d => {
                          const rec = recordsByDate[d]?.find(r => r.student_id === id);
                          return { date: d, status: rec?.status || "-" };
                        });
                        const presentCount = dailyStatuses.filter(s => s.status === "Present").length;
                        const absentCount = dailyStatuses.filter(s => s.status === "Absent").length;
                        const lateCount = dailyStatuses.filter(s => s.status === "Late").length;
                        const totalRecorded = presentCount + absentCount + lateCount;
                        return {
                          admissionNo: info.admissionNo, studentName: info.name,
                          dailyStatuses, presentCount, absentCount, lateCount,
                          attendanceRate: totalRecorded > 0 ? Math.round((presentCount / totalRecorded) * 100) : 0,
                        };
                      });
                      generateAndDownloadPeriodAttendance({
                        gradeName: currentStreamOption.gradeName, streamName: currentStreamOption.streamName,
                        startDate: dates[0], endDate: dates[dates.length - 1], students, dates,
                      });
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" /> Download Period PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const dates = Object.keys(recordsByDate).sort();
                      const studentMap = new Map<string, { admissionNo: string; name: string }>();
                      Object.values(recordsByDate).flat().forEach(r => {
                        if (!studentMap.has(r.student_id)) {
                          studentMap.set(r.student_id, { admissionNo: r.students.admission_no, name: r.students.name });
                        }
                      });
                      const students = Array.from(studentMap.entries()).map(([id, info]) => {
                        const dailyStatuses = dates.map(d => {
                          const rec = recordsByDate[d]?.find(r => r.student_id === id);
                          return { date: d, status: rec?.status || "-" };
                        });
                        const presentCount = dailyStatuses.filter(s => s.status === "Present").length;
                        const absentCount = dailyStatuses.filter(s => s.status === "Absent").length;
                        const lateCount = dailyStatuses.filter(s => s.status === "Late").length;
                        const totalRecorded = presentCount + absentCount + lateCount;
                        return {
                          admissionNo: info.admissionNo, studentName: info.name,
                          dailyStatuses, presentCount, absentCount, lateCount,
                          attendanceRate: totalRecorded > 0 ? Math.round((presentCount / totalRecorded) * 100) : 0,
                        };
                      });
                      generateAndPrintPeriodAttendance({
                        gradeName: currentStreamOption.gradeName, streamName: currentStreamOption.streamName,
                        startDate: dates[0], endDate: dates[dates.length - 1], students, dates,
                      });
                    }}
                  >
                    <Printer className="h-4 w-4 mr-1" /> Print Period Report
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {streamOptions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Streams Assigned</h3>
              <p className="text-muted-foreground">
                You don't have any stream assignments yet
              </p>
            </CardContent>
          </Card>
        ) : Object.keys(recordsByDate).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Attendance Records</h3>
              <p className="text-muted-foreground">
                No attendance records found for {currentStreamOption?.gradeName} - {currentStreamOption?.streamName}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(recordsByDate).map(([date, records]) => {
              const presentCount = records.filter(r => r.status === 'Present').length;
              const absentCount = records.filter(r => r.status === 'Absent').length;
              const lateCount = records.filter(r => r.status === 'Late').length;
              
              return (
                <Card key={date}>
                  <CardHeader>
                    <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-base">{format(new Date(date), 'EEEE, MMMM d, yyyy')}</span>
                      <div className="flex flex-wrap gap-2 items-center">
                        <Badge className="bg-green-100 text-green-800">{presentCount} Present</Badge>
                        <Badge variant="destructive">{absentCount} Absent</Badge>
                        {lateCount > 0 && (
                          <Badge className="bg-yellow-100 text-yellow-800">{lateCount} Late</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const rows = records.map(r => ({
                              admissionNo: r.students.admission_no,
                              studentName: r.students.name,
                              status: r.status,
                            }));
                            generateAndDownloadDailyAttendance({
                              gradeName: currentStreamOption?.gradeName || "",
                              streamName: currentStreamOption?.streamName || "",
                              date,
                              records: rows,
                              summary: { present: presentCount, absent: absentCount, late: lateCount, total: records.length },
                            });
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const rows = records.map(r => ({
                              admissionNo: r.students.admission_no,
                              studentName: r.students.name,
                              status: r.status,
                            }));
                            generateAndPrintDailyAttendance({
                              gradeName: currentStreamOption?.gradeName || "",
                              streamName: currentStreamOption?.streamName || "",
                              date,
                              records: rows,
                              summary: { present: presentCount, absent: absentCount, late: lateCount, total: records.length },
                            });
                          }}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Admission No</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.map(record => (
                          <TableRow key={record.id}>
                            <TableCell>{record.students.admission_no}</TableCell>
                            <TableCell className="font-medium">{record.students.name}</TableCell>
                            <TableCell className="text-center">
                              {getStatusBadge(record.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherAttendance;
