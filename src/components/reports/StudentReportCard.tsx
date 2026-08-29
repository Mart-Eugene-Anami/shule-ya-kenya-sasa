import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
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
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { OverallTrendChart, MultiSubjectTrendChart } from "./ReportLineChart";
import { getFeeSettings, getStudentFees, type FeeSettings, type StudentFeeRecord } from "@/services/feeService";
import { getCommentsForStudent, type ReportComment } from "@/services/reportCommentService";

interface StudentReportCardProps {
  studentId: string;
  examId?: string;
  isPrintable?: boolean;
}

interface SubjectMark {
  subject: string;
  marks: number;
  grade: string;
  points: number;
}

interface NextTermInfo {
  name: string;
  openingDate: string | null;
  closingDate: string | null;
}

interface PerformanceTrendData {
  examName: string;
  average: number;
  classAverage?: number;
}

interface SubjectTrendData {
  examName: string;
  subjects: Record<string, number>;
}

interface ReportData {
  studentName: string;
  admissionNumber: string;
  grade: string;
  stream: string;
  term: string;
  year: string;
  subjects: SubjectMark[];
  totalMarks: number;
  totalPoints: number;
  meanGrade: string;
  meanPoints: number;
  position: number;
  attendance: {
    present: number;
    absent: number;
    total: number;
    percentage: number;
  };
  schoolName: string;
  schoolLogoUrl: string | null;
  schoolMotto: string | null;
  schoolAddress: string | null;
  schoolPhone: string | null;
  nextTerm: NextTermInfo | null;
  principalName: string | null;
  performanceTrend: PerformanceTrendData[];
  subjectTrend: SubjectTrendData[];
  feeSettings: FeeSettings | null;
  feeRecord: StudentFeeRecord | null;
  comments: ReportComment[];
}

const getGradeAndPoints = (marks: number) => {
  if (marks >= 80) return { grade: "A", points: 12 };
  if (marks >= 75) return { grade: "A-", points: 11 };
  if (marks >= 70) return { grade: "B+", points: 10 };
  if (marks >= 65) return { grade: "B", points: 9 };
  if (marks >= 60) return { grade: "B-", points: 8 };
  if (marks >= 55) return { grade: "C+", points: 7 };
  if (marks >= 50) return { grade: "C", points: 6 };
  if (marks >= 45) return { grade: "C-", points: 5 };
  if (marks >= 40) return { grade: "D+", points: 4 };
  if (marks >= 35) return { grade: "D", points: 3 };
  if (marks >= 30) return { grade: "D-", points: 2 };
  return { grade: "E", points: 1 };
};

const getMeanGrade = (meanPoints: number) => {
  if (meanPoints >= 11.5) return "A";
  if (meanPoints >= 10.5) return "A-";
  if (meanPoints >= 9.5) return "B+";
  if (meanPoints >= 8.5) return "B";
  if (meanPoints >= 7.5) return "B-";
  if (meanPoints >= 6.5) return "C+";
  if (meanPoints >= 5.5) return "C";
  if (meanPoints >= 4.5) return "C-";
  if (meanPoints >= 3.5) return "D+";
  if (meanPoints >= 2.5) return "D";
  if (meanPoints >= 1.5) return "D-";
  return "E";
};

export function StudentReportCard({
  studentId,
  examId,
  isPrintable = true,
}: StudentReportCardProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, [studentId, examId]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const { data: student } = await supabase
        .from("students")
        .select(`
          id, name, admission_no, school_id,
          grade:grades!students_grade_id_fkey(name),
          stream:streams!students_stream_id_fkey(name),
          school:schools!students_school_id_fkey(name, logo_url, motto, address, phone, principal_name)
        `)
        .eq("id", studentId)
        .single();

      if (!student) return;

      const schoolData: any = student.school;

      let marksQuery = supabase
        .from("marks")
        .select("subject, score, out_of, grade")
        .eq("student_id", studentId);

      if (examId) marksQuery = marksQuery.eq("exam_id", examId);
      
      const { data: marks } = await marksQuery;

      const subjects: SubjectMark[] = (marks || []).map((mark) => {
        const percentage = (mark.score / mark.out_of) * 100;
        const { grade, points } = getGradeAndPoints(percentage);
        return { subject: mark.subject, marks: percentage, grade: mark.grade || grade, points };
      });

      const totalMarks = subjects.reduce((sum, s) => sum + s.marks, 0);
      const totalPoints = subjects.reduce((sum, s) => sum + s.points, 0);
      const meanPoints = subjects.length > 0 ? totalPoints / subjects.length : 0;

      const { data: attendance } = await supabase
        .from("attendance")
        .select("status")
        .eq("student_id", studentId);

      const present = attendance?.filter(a => a.status.toLowerCase() === "present").length || 0;
      const total = attendance?.length || 0;

      // Fetch current active term and next term
      const { data: terms } = await supabase
        .from("terms")
        .select("id, name, start_date, end_date, is_active")
        .eq("school_id", student.school_id)
        .order("start_date", { ascending: true });

      let currentTermName = "Current Term";
      let nextTermInfo: NextTermInfo | null = null;

      if (terms && terms.length > 0) {
        const activeTerm = terms.find(t => t.is_active);
        if (activeTerm) {
          currentTermName = activeTerm.name;
          // Find the next term (the one after the active term)
          const activeIndex = terms.findIndex(t => t.id === activeTerm.id);
          if (activeIndex >= 0 && activeIndex < terms.length - 1) {
            const nextTerm = terms[activeIndex + 1];
            nextTermInfo = {
              name: nextTerm.name,
              openingDate: nextTerm.start_date,
              closingDate: nextTerm.end_date,
            };
          }
        }
      }

      // Fetch historical exam performance for trend charts
      const { data: allExams } = await supabase
        .from("exams")
        .select("id, name, start_date")
        .eq("school_id", student.school_id)
        .order("start_date", { ascending: true })
        .limit(10);

      const performanceTrend: PerformanceTrendData[] = [];
      const subjectTrend: SubjectTrendData[] = [];

      if (allExams && allExams.length > 0) {
        // Fetch all marks for this student across exams
        const { data: allMarks } = await supabase
          .from("marks")
          .select("exam_id, subject, score, out_of")
          .eq("student_id", studentId)
          .in("exam_id", allExams.map(e => e.id));

        if (allMarks && allMarks.length > 0) {
          // Group marks by exam
          const marksByExam = allMarks.reduce((acc, mark) => {
            if (!acc[mark.exam_id]) acc[mark.exam_id] = [];
            acc[mark.exam_id].push(mark);
            return acc;
          }, {} as Record<string, typeof allMarks>);

          // Build trend data for each exam
          for (const exam of allExams) {
            const examMarks = marksByExam[exam.id];
            if (examMarks && examMarks.length > 0) {
              // Calculate overall average for this exam
              const avgScore = examMarks.reduce((sum, m) => sum + (m.score / m.out_of) * 100, 0) / examMarks.length;
              
              performanceTrend.push({
                examName: exam.name,
                average: Math.round(avgScore * 10) / 10,
              });

              // Build subject-wise scores
              const subjectScores: Record<string, number> = {};
              examMarks.forEach(m => {
                subjectScores[m.subject] = Math.round((m.score / m.out_of) * 100 * 10) / 10;
              });

              if (Object.keys(subjectScores).length > 0) {
                subjectTrend.push({
                  examName: exam.name,
                  subjects: subjectScores,
                });
              }
            }
          }
        }
      }

      // Fetch fee data
      let feeSettingsData: FeeSettings | null = null;
      let feeRecordData: StudentFeeRecord | null = null;
      try {
        feeSettingsData = await getFeeSettings(student.school_id);
        if (feeSettingsData?.is_enabled && feeSettingsData?.show_on_report_card) {
          feeRecordData = await getStudentFees(studentId);
        }
      } catch {}

      // Fetch report card comments
      let commentsData: ReportComment[] = [];
      try {
        if (examId) {
          commentsData = await getCommentsForStudent(studentId, examId);
        }
      } catch {}

      const gradeData: any = student.grade;
      const streamData: any = student.stream;

      setReportData({
        studentName: student.name,
        admissionNumber: student.admission_no,
        grade: gradeData?.name || "",
        stream: streamData?.name || "",
        term: currentTermName,
        year: new Date().getFullYear().toString(),
        subjects,
        totalMarks,
        totalPoints,
        meanGrade: getMeanGrade(meanPoints),
        meanPoints: Math.round(meanPoints * 100) / 100,
        position: 0,
        attendance: {
          present,
          absent: total - present,
          total,
          percentage: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
        },
        schoolName: schoolData?.name || "School Name",
        schoolLogoUrl: schoolData?.logo_url || null,
        schoolMotto: schoolData?.motto || null,
        schoolAddress: schoolData?.address || null,
        schoolPhone: schoolData?.phone || null,
        nextTerm: nextTermInfo,
        principalName: schoolData?.principal_name || null,
        performanceTrend,
        subjectTrend,
        feeSettings: feeSettingsData,
        feeRecord: feeRecordData,
        comments: commentsData,
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!reportData) return <div className="p-8 text-center">No data available</div>;

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4 flex-1">
            {reportData.schoolLogoUrl && (
              <img 
                src={reportData.schoolLogoUrl} 
                alt="School logo" 
                className="h-20 w-20 object-contain print:h-16 print:w-16"
              />
            )}
            <div className="text-center flex-1">
              <CardTitle className="text-2xl font-bold">{reportData.schoolName}</CardTitle>
              {reportData.schoolMotto && (
                <p className="text-sm italic text-muted-foreground mt-1">"{reportData.schoolMotto}"</p>
              )}
              {reportData.schoolAddress && (
                <p className="text-xs text-muted-foreground mt-1">{reportData.schoolAddress}</p>
              )}
              {reportData.schoolPhone && (
                <p className="text-xs text-muted-foreground">Tel: {reportData.schoolPhone}</p>
              )}
              <p className="text-lg font-semibold mt-2">STUDENT REPORT FORM</p>
              <p className="text-sm text-muted-foreground">{reportData.term} - {reportData.year}</p>
            </div>
          </div>
          {isPrintable && (
            <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 border-y py-4">
          <div>
            <p className="text-sm text-muted-foreground">Student Name</p>
            <p className="font-semibold">{reportData.studentName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Admission Number</p>
            <p className="font-semibold">{reportData.admissionNumber}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Class</p>
            <p className="font-semibold">{reportData.grade} {reportData.stream}</p>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-lg mb-3">ACADEMIC PERFORMANCE</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">SUBJECT</TableHead>
                <TableHead className="font-bold text-center">MARKS (%)</TableHead>
                <TableHead className="font-bold text-center">GRADE</TableHead>
                <TableHead className="font-bold text-center">POINTS</TableHead>
                <TableHead className="font-bold">TEACHER REMARKS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.subjects.map((subject, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{subject.subject}</TableCell>
                  <TableCell className="text-center">{Math.round(subject.marks)}</TableCell>
                  <TableCell className="text-center font-bold">{subject.grade}</TableCell>
                  <TableCell className="text-center">{subject.points}</TableCell>
                  <TableCell className="text-sm text-muted-foreground min-w-[150px]">
                    {(() => {
                      const subjectComment = reportData.comments.find(
                        c => c.comment_type === 'subject_teacher' && c.subject === subject.subject
                      );
                      return subjectComment ? (
                        <span className="italic">{subjectComment.comment}</span>
                      ) : (
                        <div className="border-b border-dashed border-muted-foreground/30 h-6 print:border-muted-foreground/40" />
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted font-semibold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-center">{Math.round(reportData.totalMarks)}</TableCell>
                <TableCell className="text-center">{reportData.meanGrade}</TableCell>
                <TableCell className="text-center">{reportData.totalPoints}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-3">
            <p className="text-sm text-muted-foreground">Mean Grade</p>
            <p className="text-2xl font-bold">{reportData.meanGrade}</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-sm text-muted-foreground">Mean Points</p>
            <p className="text-2xl font-bold">{reportData.meanPoints}</p>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">ATTENDANCE SUMMARY</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Present</p>
              <p className="text-xl font-semibold">{reportData.attendance.present}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Absent</p>
              <p className="text-xl font-semibold">{reportData.attendance.absent}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-xl font-semibold">{reportData.attendance.total}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Percentage</p>
              <p className="text-xl font-semibold">{reportData.attendance.percentage}%</p>
            </div>
          </div>
        </div>

        {/* Performance Trends Charts */}
        {(reportData.performanceTrend.length > 1 || reportData.subjectTrend.length > 1) && (
          <div className="border rounded-lg p-4 space-y-4 print:break-inside-avoid print:border-gray-400 print:bg-white">
            <h3 className="font-semibold text-lg print:text-black">PERFORMANCE TRENDS</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
              {reportData.performanceTrend.length > 1 && (
                <div className="border rounded-lg p-3 print:border-gray-300 print:bg-white">
                  <OverallTrendChart 
                    data={reportData.performanceTrend} 
                    height={180}
                    printOptimized
                  />
                </div>
              )}
              {reportData.subjectTrend.length > 1 && (
                <div className="border rounded-lg p-3 print:border-gray-300 print:bg-white">
                  <MultiSubjectTrendChart 
                    data={reportData.subjectTrend} 
                    height={180}
                    printOptimized
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Class Teacher Comments */}
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-semibold">CLASS TEACHER'S COMMENTS</h3>
          <div className="space-y-2">
            {(() => {
              const classComment = reportData.comments.find(c => c.comment_type === 'class_teacher');
              return classComment ? (
                <p className="italic text-sm min-h-[24px]">{classComment.comment}</p>
              ) : (
                <>
                  <div className="border-b border-dashed border-muted-foreground/30 h-6 print:border-muted-foreground/40" />
                  <div className="border-b border-dashed border-muted-foreground/30 h-6 print:border-muted-foreground/40" />
                </>
              );
            })()}
          </div>
          <div className="flex justify-between items-end pt-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Name:</p>
              <div className="border-b border-muted-foreground/50 w-48 h-6 print:border-gray-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Signature:</p>
              <div className="border-b border-muted-foreground/50 w-32 h-6 print:border-gray-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Date:</p>
              <div className="border-b border-muted-foreground/50 w-28 h-6 print:border-gray-400" />
            </div>
          </div>
        </div>

        {/* Principal/Head Teacher Comments */}
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-semibold">HEAD TEACHER / PRINCIPAL'S COMMENTS</h3>
          <div className="space-y-2">
            {(() => {
              const headComment = reportData.comments.find(c => c.comment_type === 'head_teacher');
              return headComment ? (
                <p className="italic text-sm min-h-[24px]">{headComment.comment}</p>
              ) : (
                <>
                  <div className="border-b border-dashed border-muted-foreground/30 h-6 print:border-muted-foreground/40" />
                  <div className="border-b border-dashed border-muted-foreground/30 h-6 print:border-muted-foreground/40" />
                </>
              );
            })()}
          </div>
          <div className="flex justify-between items-end pt-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Name:</p>
              {reportData.principalName ? (
                <p className="font-medium h-6">{reportData.principalName}</p>
              ) : (
                <div className="border-b border-muted-foreground/50 w-48 h-6 print:border-gray-400" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Signature:</p>
              <div className="border-b border-muted-foreground/50 w-32 h-6 print:border-gray-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Date:</p>
              <div className="border-b border-muted-foreground/50 w-28 h-6 print:border-gray-400" />
            </div>
          </div>
          <div className="flex justify-center pt-2">
            <div className="text-center space-y-1">
              <div className="border border-dashed border-muted-foreground/30 w-24 h-24 mx-auto flex items-center justify-center print:border-gray-400">
                <p className="text-xs text-muted-foreground">School Stamp</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fee Information - Only shown if enabled */}
        {reportData.feeSettings?.is_enabled && reportData.feeSettings?.show_on_report_card && reportData.feeRecord && (
          <div className="border rounded-lg p-4 print:break-inside-avoid">
            <h3 className="font-semibold mb-3">FEE STATEMENT</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="flex justify-between border-b border-dashed pb-1">
                <span className="text-muted-foreground">Tuition Balance:</span>
                <span className="font-medium">{reportData.feeRecord.currency_code} {reportData.feeRecord.tuition_balance.toLocaleString()}</span>
              </div>
              {reportData.feeSettings.is_boarding_school && (
                <div className="flex justify-between border-b border-dashed pb-1">
                  <span className="text-muted-foreground">Boarding Fee:</span>
                  <span className="font-medium">{reportData.feeRecord.currency_code} {reportData.feeRecord.boarding_fee_balance.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-dashed pb-1">
                <span className="text-muted-foreground">Lunch Fee:</span>
                <span className="font-medium">{reportData.feeRecord.currency_code} {reportData.feeRecord.lunch_fee_balance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-dashed pb-1">
                <span className="text-muted-foreground">Transport Fee:</span>
                <span className="font-medium">{reportData.feeRecord.currency_code} {reportData.feeRecord.transport_fee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-dashed pb-1">
                <span className="text-muted-foreground">Activity Fee:</span>
                <span className="font-medium">{reportData.feeRecord.currency_code} {reportData.feeRecord.activity_fee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-dashed pb-1">
                <span className="text-muted-foreground">SMASSE:</span>
                <span className="font-medium">{reportData.feeRecord.currency_code} {reportData.feeRecord.smasse_fee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-dashed pb-1">
                <span className="text-muted-foreground">Admin Fee:</span>
                <span className="font-medium">{reportData.feeRecord.currency_code} {reportData.feeRecord.administration_fee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-dashed pb-1">
                <span className="text-muted-foreground">Exam Fee:</span>
                <span className="font-medium">{reportData.feeRecord.currency_code} {reportData.feeRecord.exam_fee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-dashed pb-1">
                <span className="text-muted-foreground">Development Fund:</span>
                <span className="font-medium">{reportData.feeRecord.currency_code} {reportData.feeRecord.development_fund.toLocaleString()}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3 pt-2 border-t text-sm">
              <div className="flex justify-between font-semibold">
                <span>Total Outstanding:</span>
                <span className="text-destructive">{reportData.feeRecord.currency_code} {reportData.feeRecord.total_outstanding.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total Paid:</span>
                <span className="text-primary">{reportData.feeRecord.currency_code} {reportData.feeRecord.total_paid.toLocaleString()}</span>
              </div>
              {reportData.feeRecord.payment_reference && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Ref:</span>
                  <span className="font-medium">{reportData.feeRecord.payment_reference}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Next Term Information */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-4">
            NEXT TERM INFORMATION
            {reportData.nextTerm && (
              <span className="font-normal text-muted-foreground ml-2">({reportData.nextTerm.name})</span>
            )}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Opening Date:</p>
              {reportData.nextTerm?.openingDate ? (
                <p className="font-semibold text-sm border-b border-transparent h-6">
                  {format(new Date(reportData.nextTerm.openingDate), "dd MMM yyyy")}
                </p>
              ) : (
                <div className="border-b border-muted-foreground/50 h-6 print:border-gray-400" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Closing Date:</p>
              {reportData.nextTerm?.closingDate ? (
                <p className="font-semibold text-sm border-b border-transparent h-6">
                  {format(new Date(reportData.nextTerm.closingDate), "dd MMM yyyy")}
                </p>
              ) : (
                <div className="border-b border-muted-foreground/50 h-6 print:border-gray-400" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Fees Balance:</p>
              {reportData.feeRecord ? (
                <p className="font-semibold text-sm border-b border-transparent h-6">
                  {reportData.feeRecord.currency_code} {reportData.feeRecord.total_outstanding.toLocaleString()}
                </p>
              ) : (
                <div className="border-b border-muted-foreground/50 h-6 print:border-gray-400" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Fees Required:</p>
              <div className="border-b border-muted-foreground/50 h-6 print:border-gray-400" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-sm text-muted-foreground">Special Requirements / Items Needed:</p>
            <div className="border-b border-dashed border-muted-foreground/30 h-6 print:border-gray-400" />
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          <p>This report card is the property of {reportData.schoolName}.</p>
          <p>Parents/Guardians are advised to keep this document safely.</p>
        </div>
      </CardContent>
    </Card>
  );
}
