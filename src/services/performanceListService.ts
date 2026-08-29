import { supabase } from "@/integrations/supabase/client";
import { escapeHtml as e } from "@/utils/escapeHtml";

export interface StudentPerformanceRow {
  studentId: string;
  studentName: string;
  admissionNo: string;
  subjects: { subject: string; score: number; outOf: number; grade: string | null; percentage: number }[];
  totalMarks: number;
  totalOutOf: number;
  averagePercentage: number;
  rank: number;
}

export interface PerformanceListData {
  title: string;
  subtitle: string;
  schoolName: string;
  gradeName: string;
  streamName?: string;
  examNames: string[];
  subjects: string[];
  students: StudentPerformanceRow[];
  generatedAt: string;
  summary: {
    classAverage: number;
    totalStudents: number;
    subjectAverages: { subject: string; average: number }[];
  };
}

export const performanceListService = {
  /**
   * Fetch performance list data for a stream (single or multiple exams)
   */
  async getStreamPerformanceList(
    streamId: string,
    gradeId: string,
    examIds: string[]
  ): Promise<PerformanceListData | null> {
    try {
      // Get school, grade, stream info
      const [gradeRes, streamRes] = await Promise.all([
        supabase.from("grades").select("id, name, school_id").eq("id", gradeId).single(),
        supabase.from("streams").select("id, name").eq("id", streamId).single(),
      ]);

      if (!gradeRes.data || !streamRes.data) return null;

      const { data: school } = await supabase
        .from("schools")
        .select("name")
        .eq("id", gradeRes.data.school_id)
        .single();

      // Get exam names
      const { data: examsData } = await supabase
        .from("exams")
        .select("id, name")
        .in("id", examIds);

      const examNames = examsData?.map((e) => e.name) || [];

      // Get students in this grade+stream
      const { data: students } = await supabase
        .from("students")
        .select("id, name, admission_no")
        .eq("stream_id", streamId)
        .eq("grade_id", gradeId)
        .order("name");

      if (!students || students.length === 0) return null;

      const studentIds = students.map((s) => s.id);

      // Get marks for these students and exams
      const { data: marks } = await supabase
        .from("marks")
        .select("student_id, subject, score, out_of, grade, exam_id")
        .in("student_id", studentIds)
        .in("exam_id", examIds);

      if (!marks || marks.length === 0) return null;

      return this.buildPerformanceList(
        marks,
        students,
        examNames,
        school?.name || "School",
        gradeRes.data.name,
        streamRes.data.name
      );
    } catch (error) {
      console.error("Error fetching stream performance list:", error);
      return null;
    }
  },

  /**
   * Fetch performance list data for an entire grade (single or multiple exams)
   */
  async getGradePerformanceList(
    gradeId: string,
    examIds: string[]
  ): Promise<PerformanceListData | null> {
    try {
      const { data: grade } = await supabase
        .from("grades")
        .select("id, name, school_id")
        .eq("id", gradeId)
        .single();

      if (!grade) return null;

      const { data: school } = await supabase
        .from("schools")
        .select("name")
        .eq("id", grade.school_id)
        .single();

      const { data: examsData } = await supabase
        .from("exams")
        .select("id, name")
        .in("id", examIds);

      const examNames = examsData?.map((e) => e.name) || [];

      const { data: students } = await supabase
        .from("students")
        .select("id, name, admission_no")
        .eq("grade_id", gradeId)
        .order("name");

      if (!students || students.length === 0) return null;

      const studentIds = students.map((s) => s.id);

      // Batch fetch if > 1000 students
      let allMarks: any[] = [];
      for (let i = 0; i < studentIds.length; i += 500) {
        const batch = studentIds.slice(i, i + 500);
        const { data: marks } = await supabase
          .from("marks")
          .select("student_id, subject, score, out_of, grade, exam_id")
          .in("student_id", batch)
          .in("exam_id", examIds);
        if (marks) allMarks = allMarks.concat(marks);
      }

      if (allMarks.length === 0) return null;

      return this.buildPerformanceList(
        allMarks,
        students,
        examNames,
        school?.name || "School",
        grade.name
      );
    } catch (error) {
      console.error("Error fetching grade performance list:", error);
      return null;
    }
  },

  buildPerformanceList(
    marks: any[],
    students: { id: string; name: string; admission_no: string }[],
    examNames: string[],
    schoolName: string,
    gradeName: string,
    streamName?: string
  ): PerformanceListData {
    // Collect all unique subjects
    const subjectSet = new Set<string>();
    marks.forEach((m) => subjectSet.add(m.subject));
    const subjects = Array.from(subjectSet).sort();

    // For aggregate (multiple exams): average the scores per student per subject
    const studentSubjectMap = new Map<
      string,
      Map<string, { scores: number[]; outOfs: number[]; grades: (string | null)[] }>
    >();

    marks.forEach((mark) => {
      if (!studentSubjectMap.has(mark.student_id)) {
        studentSubjectMap.set(mark.student_id, new Map());
      }
      const subjMap = studentSubjectMap.get(mark.student_id)!;
      if (!subjMap.has(mark.subject)) {
        subjMap.set(mark.subject, { scores: [], outOfs: [], grades: [] });
      }
      const entry = subjMap.get(mark.subject)!;
      entry.scores.push(mark.score);
      entry.outOfs.push(mark.out_of);
      entry.grades.push(mark.grade);
    });

    // Build student rows
    const studentRows: StudentPerformanceRow[] = students
      .map((student) => {
        const subjMap = studentSubjectMap.get(student.id);
        if (!subjMap) return null;

        const subjectResults = subjects.map((subject) => {
          const entry = subjMap.get(subject);
          if (!entry || entry.scores.length === 0) {
            return { subject, score: 0, outOf: 0, grade: null, percentage: 0 };
          }
          const avgScore = entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length;
          const avgOutOf = entry.outOfs.reduce((a, b) => a + b, 0) / entry.outOfs.length;
          // Use the latest grade
          const grade = entry.grades[entry.grades.length - 1];
          const percentage = avgOutOf > 0 ? (avgScore / avgOutOf) * 100 : 0;
          return {
            subject,
            score: Math.round(avgScore * 10) / 10,
            outOf: Math.round(avgOutOf),
            grade,
            percentage: Math.round(percentage * 10) / 10,
          };
        });

        const totalMarks = subjectResults.reduce((sum, s) => sum + s.score, 0);
        const totalOutOf = subjectResults.reduce((sum, s) => sum + s.outOf, 0);
        const averagePercentage =
          totalOutOf > 0 ? (totalMarks / totalOutOf) * 100 : 0;

        return {
          studentId: student.id,
          studentName: student.name,
          admissionNo: student.admission_no,
          subjects: subjectResults,
          totalMarks: Math.round(totalMarks * 10) / 10,
          totalOutOf,
          averagePercentage: Math.round(averagePercentage * 10) / 10,
          rank: 0,
        };
      })
      .filter((r): r is StudentPerformanceRow => r !== null && r.totalOutOf > 0);

    // Assign ranks
    studentRows.sort((a, b) => b.averagePercentage - a.averagePercentage);
    studentRows.forEach((s, i) => (s.rank = i + 1));

    // Subject averages for summary
    const subjectAverages = subjects.map((subject) => {
      const scores = studentRows
        .map((s) => s.subjects.find((sub) => sub.subject === subject))
        .filter((s) => s && s.outOf > 0)
        .map((s) => s!.percentage);
      return {
        subject,
        average:
          scores.length > 0
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
            : 0,
      };
    });

    const classAverage =
      studentRows.length > 0
        ? Math.round(
            (studentRows.reduce((sum, s) => sum + s.averagePercentage, 0) /
              studentRows.length) *
              10
          ) / 10
        : 0;

    const isAggregate = examNames.length > 1;
    const title = streamName
      ? `${gradeName} ${streamName} Performance List`
      : `${gradeName} Performance List`;
    const subtitle = isAggregate
      ? `Aggregate: ${examNames.join(" + ")}`
      : examNames[0] || "All Exams";

    return {
      title,
      subtitle,
      schoolName,
      gradeName,
      streamName,
      examNames,
      subjects,
      students: studentRows,
      generatedAt: new Date().toLocaleDateString(),
      summary: {
        classAverage,
        totalStudents: studentRows.length,
        subjectAverages,
      },
    };
  },

  /**
   * Generate print-ready HTML for the performance list
   */
  generatePrintHTML(data: PerformanceListData): string {
    const subjectHeaders = data.subjects
      .map(
        (s) =>
          `<th style="padding:4px 6px;border:1px solid #333;font-size:10px;text-align:center;background:#e8e8e8;white-space:nowrap;">${
            e(s.length > 12 ? s.slice(0, 12) + "…" : s)
          }</th>`
      )
      .join("");

    const studentRows = data.students
      .map((student) => {
        const subjectCells = data.subjects
          .map((subject) => {
            const result = student.subjects.find((s) => s.subject === subject);
            if (!result || result.outOf === 0)
              return `<td style="padding:3px 4px;border:1px solid #999;text-align:center;font-size:9px;">-</td>`;
            const gradeStr = result.grade ? `<br/><span style="font-size:8px;color:#555;">${e(result.grade)}</span>` : "";
            return `<td style="padding:3px 4px;border:1px solid #999;text-align:center;font-size:9px;">${result.score}${gradeStr}</td>`;
          })
          .join("");

        return `<tr>
          <td style="padding:3px 4px;border:1px solid #999;text-align:center;font-size:9px;">${student.rank}</td>
          <td style="padding:3px 4px;border:1px solid #999;font-size:9px;white-space:nowrap;">${e(student.admissionNo)}</td>
          <td style="padding:3px 4px;border:1px solid #999;font-size:9px;">${e(student.studentName)}</td>
          ${subjectCells}
          <td style="padding:3px 4px;border:1px solid #999;text-align:center;font-size:9px;font-weight:bold;">${student.totalMarks}</td>
          <td style="padding:3px 4px;border:1px solid #999;text-align:center;font-size:9px;font-weight:bold;">${student.averagePercentage}%</td>
        </tr>`;
      })
      .join("");

    // Subject averages row
    const avgCells = data.subjects
      .map((subject) => {
        const avg = data.summary.subjectAverages.find((s) => s.subject === subject);
        return `<td style="padding:3px 4px;border:1px solid #333;text-align:center;font-size:9px;font-weight:bold;background:#f0f0f0;">${
          avg ? avg.average + "%" : "-"
        }</td>`;
      })
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${e(data.title)}</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
          table { border-collapse: collapse; width: 100%; }
        </style>
      </head>
      <body>
        <div style="text-align:center;margin-bottom:12px;">
          <h2 style="margin:0;font-size:16px;">${e(data.schoolName)}</h2>
          <h3 style="margin:4px 0;font-size:14px;">${e(data.title)}</h3>
          <p style="margin:2px 0;font-size:11px;color:#555;">${e(data.subtitle)} | Generated: ${e(data.generatedAt)}</p>
          <p style="margin:2px 0;font-size:11px;">Students: ${data.summary.totalStudents} | Class Average: ${data.summary.classAverage}%</p>
        </div>
        <table>
          <thead>
            <tr>
              <th style="padding:4px 6px;border:1px solid #333;font-size:10px;background:#e8e8e8;">#</th>
              <th style="padding:4px 6px;border:1px solid #333;font-size:10px;background:#e8e8e8;">Adm No</th>
              <th style="padding:4px 6px;border:1px solid #333;font-size:10px;background:#e8e8e8;text-align:left;">Student Name</th>
              ${subjectHeaders}
              <th style="padding:4px 6px;border:1px solid #333;font-size:10px;background:#e8e8e8;text-align:center;">Total</th>
              <th style="padding:4px 6px;border:1px solid #333;font-size:10px;background:#e8e8e8;text-align:center;">Avg %</th>
            </tr>
          </thead>
          <tbody>
            ${studentRows}
            <tr style="background:#f0f0f0;">
              <td colspan="3" style="padding:3px 4px;border:1px solid #333;font-size:9px;font-weight:bold;text-align:right;">Subject Average</td>
              ${avgCells}
              <td style="padding:3px 4px;border:1px solid #333;text-align:center;font-size:9px;font-weight:bold;">-</td>
              <td style="padding:3px 4px;border:1px solid #333;text-align:center;font-size:9px;font-weight:bold;">${data.summary.classAverage}%</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;
  },

  /**
   * Download as PDF
   */
  async downloadAsPDF(data: PerformanceListData): Promise<void> {
    const html = this.generatePrintHTML(data);
    const { downloadHtmlAsPdf } = await import("@/utils/pdfGenerator");
    await downloadHtmlAsPdf(html, {
      filename: `${data.title.replace(/\s+/g, "_")}.pdf`,
      margin: 5,
      orientation: "landscape",
      format: "a4",
    });
  },

  /**
   * Open print dialog
   */
  printList(data: PerformanceListData): void {
    const html = this.generatePrintHTML(data);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  },
};
