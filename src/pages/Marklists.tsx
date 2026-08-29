import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, FileText, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurriculumTerminology } from "@/hooks/useCurriculumTerminology";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Mark {
  id: string;
  score: number;
  subject: string;
  grade: string | null;
  out_of: number;
  student_id: string;
  students: { id: string; name: string; admission_no: string };
}

interface Exam {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  subjects: string[];
}

interface StreamOption { 
  id: string; 
  name: string; 
  displayName: string;
}

interface Grade { id: string; name: string }

const Marklists = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { terminology } = useCurriculumTerminology();

  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [streamOptions, setStreamOptions] = useState<StreamOption[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [teacherStreamIds, setTeacherStreamIds] = useState<string[]>([]);
  const [teacherGradeIds, setTeacherGradeIds] = useState<string[]>([]);
  
  const [selectedGrade, setSelectedGrade] = useState<string>(searchParams.get('gradeId') || '');
  const [selectedStream, setSelectedStream] = useState<string>(searchParams.get('streamId') || '');
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  const isTeacher = user?.role === 'teacher';

  useEffect(() => { fetchInitialData(); }, [user?.schoolId]);
  useEffect(() => { if (selectedGrade) fetchStreamOptions(); }, [selectedGrade, teacherStreamIds]);
  useEffect(() => { if (selectedGrade) fetchExams(); }, [selectedGrade]);
  useEffect(() => { if (selectedExam && selectedStream) fetchMarks(); }, [selectedExam, selectedStream, selectedSubject]);

  const fetchInitialData = async () => {
    if (!user?.schoolId) return;
    try {
      if (isTeacher) {
        // Get teacher info
        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (teacher) {
          // Get streams from grade_streams via teacher_subject_assignments
          const { data: assignments } = await supabase
            .from('teacher_subject_assignments')
            .select(`
              grade_streams!teacher_subject_assignments_grade_stream_id_fkey(
                grade_id,
                stream_id
              )
            `)
            .eq('teacher_id', teacher.id);

          const streamIds: string[] = [];
          const gradeIds: string[] = [];
          
          if (assignments) {
            assignments.forEach((a: any) => {
              if (a.grade_streams?.stream_id && !streamIds.includes(a.grade_streams.stream_id)) {
                streamIds.push(a.grade_streams.stream_id);
              }
              if (a.grade_streams?.grade_id && !gradeIds.includes(a.grade_streams.grade_id)) {
                gradeIds.push(a.grade_streams.grade_id);
              }
            });
          }
          
          setTeacherStreamIds(streamIds);
          setTeacherGradeIds(gradeIds);

          // Fetch only grades the teacher is assigned to
          if (gradeIds.length > 0) {
            const { data: gradeData } = await supabase
              .from('grades')
              .select('id, name')
              .in('id', gradeIds)
              .order('level');
            setGrades(gradeData || []);
          }
        }
      } else {
        // Admin can see all grades
        const { data: gradeData } = await supabase
          .from('grades')
          .select('id, name')
          .eq('school_id', user.schoolId)
          .order('level');
        setGrades(gradeData || []);
      }
    } catch (error) { 
      console.error("Error fetching initial data:", error); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchStreamOptions = async () => {
    if (!selectedGrade || !user?.schoolId) return;
    
    try {
      const streamMap = new Map<string, StreamOption>();
      
      // Get grade_streams for the selected grade to find associated streams
      const { data: gradeStreams } = await supabase
        .from('grade_streams')
        .select(`
          stream_id,
          streams!grade_streams_stream_id_fkey(id, name)
        `)
        .eq('grade_id', selectedGrade);
      
      // Add streams from grade_streams junction
      if (gradeStreams) {
        gradeStreams.forEach((gs: any) => {
          if (gs.streams) {
            const stream = gs.streams;
            if (isTeacher && teacherStreamIds.length > 0 && !teacherStreamIds.includes(stream.id)) {
              return;
            }
            streamMap.set(stream.id, {
              id: stream.id,
              name: stream.name,
              displayName: stream.name
            });
          }
        });
      }

      // Also find streams that have students in the selected grade
      // This handles the case where streams have null grade_id but students have grade_id set
      const { data: studentsWithStreams } = await supabase
        .from('students')
        .select('stream_id, streams!students_stream_id_fkey(id, name)')
        .eq('grade_id', selectedGrade)
        .eq('school_id', user.schoolId);
      
      if (studentsWithStreams) {
        studentsWithStreams.forEach((s: any) => {
          if (s.streams && !streamMap.has(s.streams.id)) {
            if (isTeacher && teacherStreamIds.length > 0 && !teacherStreamIds.includes(s.streams.id)) {
              return;
            }
            streamMap.set(s.streams.id, {
              id: s.streams.id,
              name: s.streams.name,
              displayName: s.streams.name
            });
          }
        });
      }

      const options = Array.from(streamMap.values());
      setStreamOptions(options);
      
      // Auto-select if only one stream
      if (options.length === 1 && !selectedStream) {
        setSelectedStream(options[0].id);
      }
    } catch (error) {
      console.error("Error fetching streams:", error);
    }
  };

  const fetchExams = async () => {
    if (!selectedGrade || !user?.schoolId) return;
    try {
      const { data } = await supabase
        .from('exams')
        .select('id, name, start_date, end_date, subjects')
        .eq('school_id', user.schoolId)
        .contains('grades', [selectedGrade])
        .order('start_date', { ascending: false });
      setExams(data || []);
    } catch (error) {
      console.error("Error fetching exams:", error);
    }
  };

  const fetchMarks = async () => {
    if (!selectedExam || !selectedStream || !selectedGrade) return;
    try {
      // Get students in this stream AND grade
      const { data: students } = await supabase
        .from('students')
        .select('id, name, admission_no')
        .eq('stream_id', selectedStream)
        .eq('grade_id', selectedGrade)
        .order('name');
      
      if (!students?.length) { 
        setMarks([]); 
        return; 
      }
      
      const studentIds = students.map(s => s.id);
      let query = supabase
        .from('marks')
        .select('id, score, subject, grade, out_of, student_id')
        .eq('exam_id', selectedExam)
        .in('student_id', studentIds);
      
      if (selectedSubject !== 'all') {
        query = query.eq('subject', selectedSubject);
      }
      
      const { data: marksData } = await query;
      setMarks((marksData || []).map(mark => ({
        ...mark,
        students: students.find(s => s.id === mark.student_id)!
      })));
    } catch (error) {
      console.error("Error fetching marks:", error);
      toast({
        title: "Error",
        description: "Failed to load marks",
        variant: "destructive"
      });
    }
  };

  const selectedExamData = exams.find(e => e.id === selectedExam);
  const availableSubjects = selectedExamData?.subjects || [];
  
  const calculateStats = (subjectMarks: Mark[]) => {
    if (subjectMarks.length === 0) return { avg: 0, highest: 0, lowest: 0, count: 0 };
    const scores = subjectMarks.map(m => m.score);
    return { 
      avg: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1), 
      highest: Math.max(...scores), 
      lowest: Math.min(...scores), 
      count: subjectMarks.length 
    };
  };

  const marksBySubject: { [subject: string]: Mark[] } = {};
  marks.forEach(mark => { 
    if (!marksBySubject[mark.subject]) marksBySubject[mark.subject] = []; 
    marksBySubject[mark.subject].push(mark); 
  });

  if (loading) {
    return (
      <DashboardLayout title="Marklists">
        <div className="flex justify-center items-center h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Marklists">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              View Marklists by Stream and Subject
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{terminology.gradeSingular}</label>
                <Select 
                  value={selectedGrade} 
                  onValueChange={(v) => { 
                    setSelectedGrade(v); 
                    setSelectedStream(''); 
                    setSelectedExam('');
                    setStreamOptions([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${terminology.gradeSingular}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Stream</label>
                <Select 
                  value={selectedStream} 
                  onValueChange={setSelectedStream} 
                  disabled={!selectedGrade || streamOptions.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={streamOptions.length === 0 ? "No streams" : "Select Stream"} />
                  </SelectTrigger>
                  <SelectContent>
                    {streamOptions.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Exam</label>
                <Select 
                  value={selectedExam} 
                  onValueChange={setSelectedExam} 
                  disabled={!selectedGrade}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Exam" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Select 
                  value={selectedSubject} 
                  onValueChange={setSelectedSubject} 
                  disabled={!selectedExam}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {availableSubjects.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedExam || !selectedStream ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Select Filters</h3>
              <p className="text-muted-foreground">
                Choose a {terminology.gradeSingular.toLowerCase()}, stream, and exam to view marks
              </p>
            </CardContent>
          </Card>
        ) : marks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Marks Found</h3>
              <p className="text-muted-foreground mb-4">
                No marks have been entered for this selection
              </p>
              <Button onClick={() => navigate('/mark-entry')}>
                <FileText className="mr-2 h-4 w-4" />
                Enter Marks
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {selectedExamData?.name} - {streamOptions.find(s => s.id === selectedStream)?.displayName}
                  </span>
                  <Badge variant="secondary">{marks.length} marks recorded</Badge>
                </CardTitle>
              </CardHeader>
            </Card>
            
            {selectedSubject === 'all' ? (
              <Tabs defaultValue={Object.keys(marksBySubject)[0]} className="space-y-4">
                <TabsList className="flex-wrap">
                  {Object.keys(marksBySubject).map(subject => (
                    <TabsTrigger key={subject} value={subject}>{subject}</TabsTrigger>
                  ))}
                </TabsList>
                {Object.entries(marksBySubject).map(([subject, subjectMarks]) => (
                  <TabsContent key={subject} value={subject}>
                    <SubjectMarklistTable 
                      subject={subject} 
                      marks={subjectMarks} 
                      stats={calculateStats(subjectMarks)} 
                    />
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <SubjectMarklistTable 
                subject={selectedSubject} 
                marks={marks} 
                stats={calculateStats(marks)} 
              />
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

const SubjectMarklistTable = ({ 
  subject, 
  marks, 
  stats 
}: { 
  subject: string; 
  marks: Mark[]; 
  stats: { avg: number | string; highest: number; lowest: number; count: number } 
}) => {
  const sortedMarks = [...marks].sort((a, b) => b.score - a.score);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{subject}</span>
          <div className="flex gap-4 text-sm font-normal text-muted-foreground">
            <span>Students: {stats.count}</span>
            <span>Avg: {stats.avg}</span>
            <span>High: {stats.highest}</span>
            <span>Low: {stats.lowest}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Admission No</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead className="text-center">Out Of</TableHead>
              <TableHead className="text-center">%</TableHead>
              <TableHead className="text-center">Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMarks.map((mark, index) => {
              const percentage = ((mark.score / mark.out_of) * 100).toFixed(1);
              return (
                <TableRow key={mark.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{mark.students.admission_no}</TableCell>
                  <TableCell className="font-medium">{mark.students.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={mark.score >= (mark.out_of * 0.5) ? "default" : "destructive"}>
                      {mark.score}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{mark.out_of}</TableCell>
                  <TableCell className="text-center">{percentage}%</TableCell>
                  <TableCell className="text-center">{mark.grade || 'N/A'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default Marklists;
