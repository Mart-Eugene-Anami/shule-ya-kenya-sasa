import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, X, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  term: { name: string } | null;
}

interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}

interface Term {
  id: string;
  name: string;
}

const StudentAttendance = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 });
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>("all");

  useEffect(() => {
    if (user?.id) {
      fetchStudentAndAttendance();
    }
  }, [user?.id]);

  useEffect(() => {
    if (studentId) {
      fetchAttendance();
    }
  }, [studentId, selectedTerm]);

  const fetchStudentAndAttendance = async () => {
    try {
      // Get student ID from user
      const { data: student } = await supabase
        .from('students')
        .select('id, school_id')
        .eq('user_id', user?.id)
        .single();

      if (student) {
        setStudentId(student.id);
        
        // Fetch terms for filter
        const { data: termsData } = await supabase
          .from('terms')
          .select('id, name')
          .eq('school_id', student.school_id)
          .order('start_date', { ascending: false });
        
        if (termsData) {
          setTerms(termsData);
        }
      }
    } catch (error) {
      console.error("Error fetching student:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    if (!studentId) return;
    
    try {
      let query = supabase
        .from('attendance')
        .select(`
          id,
          date,
          status,
          terms!attendance_term_id_fkey(name)
        `)
        .eq('student_id', studentId)
        .order('date', { ascending: false });

      if (selectedTerm !== "all") {
        query = query.eq('term_id', selectedTerm);
      }

      const { data } = await query;

      if (data) {
        const records = data.map((record: any) => ({
          id: record.id,
          date: record.date,
          status: record.status,
          term: record.terms
        }));
        
        setAttendance(records);
        
        // Calculate summary
        const total = records.length;
        const present = records.filter(a => a.status === 'present').length;
        const absent = records.filter(a => a.status === 'absent').length;
        const late = records.filter(a => a.status === 'late').length;
        
        setSummary({
          total,
          present,
          absent,
          late,
          percentage: total > 0 ? Math.round((present / total) * 100) : 100
        });
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" /> Present</Badge>;
      case 'absent':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> Absent</Badge>;
      case 'late':
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" /> Late</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="My Attendance">
        <div className="flex items-center justify-center min-h-[400px]">
          <Clock className="h-12 w-12 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Attendance">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg p-3 bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-2xl">{summary.total}</h3>
                  <p className="text-sm text-muted-foreground">Total Days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg p-3 bg-green-100">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-2xl">{summary.present}</h3>
                  <p className="text-sm text-muted-foreground">Present</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg p-3 bg-red-100">
                  <X className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-medium text-2xl">{summary.absent}</h3>
                  <p className="text-sm text-muted-foreground">Absent</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg p-3 bg-blue-100">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-2xl">{summary.percentage}%</h3>
                  <p className="text-sm text-muted-foreground">Attendance Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Attendance Records</CardTitle>
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {terms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {attendance.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No attendance records found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{format(new Date(record.date), 'EEEE')}</TableCell>
                      <TableCell>{record.term?.name || '-'}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentAttendance;
