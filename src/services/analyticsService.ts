import { supabase } from "@/integrations/supabase/client";

export interface SubjectPerformance {
  subject: string;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  studentCount: number;
  passingRate: number;
}

export interface StudentRanking {
  studentId: string;
  studentName: string;
  admissionNo: string;
  averageScore: number;
  totalMarks: number;
  rank: number;
  gradeId: string;
  streamId: string;
}

export interface TrendData {
  examName: string;
  examDate: string;
  averageScore: number;
  subjectAverages: { subject: string; average: number }[];
}

export interface GradeAnalytics {
  gradeId: string;
  gradeName: string;
  studentCount: number;
  overallAverage: number;
  subjectPerformance: SubjectPerformance[];
  streamPerformance: {
    streamId: string;
    streamName: string;
    averageScore: number;
    studentCount: number;
  }[];
  trends: TrendData[];
  topStudents: StudentRanking[];
}

export interface GradeStreamAnalytics {
  streamId: string;
  streamName: string;
  gradeId: string;
  gradeName: string;
  studentCount: number;
  overallAverage: number;
  subjectPerformance: SubjectPerformance[];
  rankings: StudentRanking[];
  trends: TrendData[];
  comparisonWithGrade: {
    gradeAverage: number;
    streamAverage: number;
    difference: number;
  };
}

export interface StudentAnalyticsData {
  studentId: string;
  studentName: string;
  admissionNo: string;
  gradeId: string;
  gradeName: string;
  streamId: string;
  streamName: string;
  overallAverage: number;
  rank: number;
  totalStudentsInStream: number;
  subjectPerformance: {
    subject: string;
    currentScore: number;
    grade: string;
    previousScore?: number;
    change?: number;
    streamAverage: number;
    gradeAverage: number;
  }[];
  trends: {
    examName: string;
    examDate: string;
    averageScore: number;
    rank: number;
  }[];
  attendanceRate: number;
}

export const analyticsService = {
  // Get grade-level analytics
  async getGradeAnalytics(gradeId: string, examId?: string): Promise<GradeAnalytics | null> {
    try {
      console.log('getGradeAnalytics called with:', { gradeId, examId });
      
      // Get grade info
      const { data: grade, error: gradeError } = await supabase
        .from('grades')
        .select('id, name, school_id')
        .eq('id', gradeId)
        .single();

      console.log('Grade fetch result:', { grade, gradeError });
      if (!grade) return null;

      // Get students in this grade
      const { data: gradeStudents } = await supabase
        .from('students')
        .select('id')
        .eq('grade_id', gradeId);
      
      const studentIds = gradeStudents?.map(s => s.id) || [];
      console.log('Student IDs in grade:', studentIds.length);
      
      if (studentIds.length === 0) {
        return {
          gradeId: grade.id,
          gradeName: grade.name,
          studentCount: 0,
          overallAverage: 0,
          subjectPerformance: [],
          streamPerformance: [],
          trends: [],
          topStudents: []
        };
      }

      // Build marks query
      let marksQuery = supabase
        .from('marks')
        .select(`
          id,
          score,
          raw_mark,
          computed_score,
          grade,
          subject,
          exam_id,
          student_id,
          students!marks_student_id_fkey(id, name, admission_no, grade_id, stream_id)
        `)
        .in('student_id', studentIds);

      if (examId) {
        marksQuery = marksQuery.eq('exam_id', examId);
      }

      const { data: marks, error: marksError } = await marksQuery;
      console.log('Marks fetch result:', { marksCount: marks?.length, marksError, examId });

      if (!marks || marks.length === 0) {
        return {
          gradeId: grade.id,
          gradeName: grade.name,
          studentCount: 0,
          overallAverage: 0,
          subjectPerformance: [],
          streamPerformance: [],
          trends: [],
          topStudents: []
        };
      }

      // Calculate subject performance
      const subjectMap = new Map<string, number[]>();
      marks.forEach(mark => {
        const score = mark.computed_score || mark.score;
        if (!subjectMap.has(mark.subject)) {
          subjectMap.set(mark.subject, []);
        }
        subjectMap.get(mark.subject)!.push(score);
      });

      const subjectPerformance: SubjectPerformance[] = Array.from(subjectMap.entries()).map(([subject, scores]) => ({
        subject,
        averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        highestScore: Math.max(...scores),
        lowestScore: Math.min(...scores),
        studentCount: scores.length,
        passingRate: (scores.filter(s => s >= 50).length / scores.length) * 100
      }));

      // Calculate stream performance
      const streamMap = new Map<string, { scores: number[]; name: string }>();
      marks.forEach(mark => {
        const student = mark.students as any;
        const streamId = student.stream_id;
        const score = mark.computed_score || mark.score;
        
        if (!streamMap.has(streamId)) {
          streamMap.set(streamId, { scores: [], name: '' });
        }
        streamMap.get(streamId)!.scores.push(score);
      });

      // Get stream names
      const streamIds = Array.from(streamMap.keys());
      const { data: streams } = await supabase
        .from('streams')
        .select('id, name')
        .in('id', streamIds);

      const streamPerformance = Array.from(streamMap.entries()).map(([streamId, data]) => {
        const stream = streams?.find(s => s.id === streamId);
        return {
          streamId,
          streamName: stream?.name || 'Unknown',
          averageScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
          studentCount: data.scores.length
        };
      });

      // Calculate student rankings
      const studentScores = new Map<string, { total: number; count: number; name: string; admissionNo: string; streamId: string }>();
      marks.forEach(mark => {
        const student = mark.students as any;
        const studentId = student.id;
        const score = mark.computed_score || mark.score;
        
        if (!studentScores.has(studentId)) {
          studentScores.set(studentId, {
            total: 0,
            count: 0,
            name: student.name,
            admissionNo: student.admission_no,
            streamId: student.stream_id
          });
        }
        const entry = studentScores.get(studentId)!;
        entry.total += score;
        entry.count += 1;
      });

      const topStudents: StudentRanking[] = Array.from(studentScores.entries())
        .map(([studentId, data]) => ({
          studentId,
          studentName: data.name,
          admissionNo: data.admissionNo,
          averageScore: data.total / data.count,
          totalMarks: data.total,
          rank: 0,
          gradeId,
          streamId: data.streamId
        }))
        .sort((a, b) => b.averageScore - a.averageScore)
        .map((student, index) => ({ ...student, rank: index + 1 }))
        .slice(0, 10);

      // Calculate overall average
      const allScores = marks.map(m => m.computed_score || m.score);
      const overallAverage = allScores.reduce((a, b) => a + b, 0) / allScores.length;

      // Get unique students
      const uniqueStudents = new Set(marks.map(m => (m.students as any).id));

      // Get trends - historical performance across multiple exams
      const trends = await this.getGradeTrends(gradeId);

      return {
        gradeId: grade.id,
        gradeName: grade.name,
        studentCount: uniqueStudents.size,
        overallAverage,
        subjectPerformance,
        streamPerformance,
        trends,
        topStudents
      };
    } catch (error) {
      console.error('Error fetching grade analytics:', error);
      return null;
    }
  },

  // Get grade-stream analytics
  // IMPORTANT: gradeId is required because streams are school-level templates
  // and the same stream can have students from multiple grades
  async getGradeStreamAnalytics(streamId: string, examId?: string, gradeId?: string): Promise<GradeStreamAnalytics | null> {
    try {
      console.log('getGradeStreamAnalytics called with:', { streamId, examId, gradeId });
      
      // First, get stream info directly
      const { data: streamData, error: streamError } = await supabase
        .from('streams')
        .select('id, name, grade_id')
        .eq('id', streamId)
        .single();

      console.log('Stream data:', { streamData, streamError });
      if (!streamData) return null;

      // Determine the grade to filter by
      // Priority: 1) passed gradeId, 2) stream's grade_id (for legacy grade-specific streams)
      let effectiveGradeId = gradeId || streamData.grade_id;
      let gradeName = '';
      
      // Get grade info if we have a gradeId
      if (effectiveGradeId) {
        const { data: gradeData } = await supabase
          .from('grades')
          .select('id, name')
          .eq('id', effectiveGradeId)
          .single();
        if (gradeData) {
          gradeName = gradeData.name;
        }
      }

      // Get students in this stream AND grade combination
      // This is the key fix: we filter by both stream_id AND grade_id
      let studentsQuery = supabase
        .from('students')
        .select('id, grade_id')
        .eq('stream_id', streamId);
      
      if (effectiveGradeId) {
        studentsQuery = studentsQuery.eq('grade_id', effectiveGradeId);
      }
      
      const { data: streamStudents, error: studentsError } = await studentsQuery;
      
      console.log('Stream students (filtered by grade):', { 
        count: streamStudents?.length, 
        studentsError,
        effectiveGradeId 
      });
      
      const studentIds = streamStudents?.map(s => s.id) || [];
      
      // If no gradeId was provided and no stream.grade_id, try to infer from students
      if (!effectiveGradeId && streamStudents && streamStudents.length > 0) {
        effectiveGradeId = streamStudents[0].grade_id;
        const { data: gradeData } = await supabase
          .from('grades')
          .select('id, name')
          .eq('id', effectiveGradeId)
          .single();
        if (gradeData) {
          gradeName = gradeData.name;
        }
      }

      console.log('Grade info:', { effectiveGradeId, gradeName });
      
      if (studentIds.length === 0) {
        return {
          streamId: streamData.id,
          streamName: streamData.name,
          gradeId: effectiveGradeId || '',
          gradeName: gradeName || 'Unknown',
          studentCount: 0,
          overallAverage: 0,
          subjectPerformance: [],
          rankings: [],
          trends: [],
          comparisonWithGrade: {
            gradeAverage: 0,
            streamAverage: 0,
            difference: 0
          }
        };
      }

      // Get marks for this stream
      let marksQuery = supabase
        .from('marks')
        .select(`
          id,
          score,
          raw_mark,
          computed_score,
          grade,
          subject,
          exam_id,
          student_id,
          students!marks_student_id_fkey(id, name, admission_no, grade_id, stream_id)
        `)
        .in('student_id', studentIds);

      if (examId) {
        marksQuery = marksQuery.eq('exam_id', examId);
      }

      const { data: marks, error: marksError } = await marksQuery;
      console.log('Marks for stream:', { marksCount: marks?.length, marksError, examId });

      if (!marks || marks.length === 0) {
        return {
          streamId: streamData.id,
          streamName: streamData.name,
          gradeId: gradeId || '',
          gradeName: gradeName || 'Unknown',
          studentCount: studentIds.length,
          overallAverage: 0,
          subjectPerformance: [],
          rankings: [],
          trends: [],
          comparisonWithGrade: {
            gradeAverage: 0,
            streamAverage: 0,
            difference: 0
          }
        };
      }

      // Calculate subject performance (same logic as grade analytics)
      const subjectMap = new Map<string, number[]>();
      marks.forEach(mark => {
        const score = mark.computed_score || mark.score;
        if (!subjectMap.has(mark.subject)) {
          subjectMap.set(mark.subject, []);
        }
        subjectMap.get(mark.subject)!.push(score);
      });

      const subjectPerformance: SubjectPerformance[] = Array.from(subjectMap.entries()).map(([subject, scores]) => ({
        subject,
        averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        highestScore: Math.max(...scores),
        lowestScore: Math.min(...scores),
        studentCount: scores.length,
        passingRate: (scores.filter(s => s >= 50).length / scores.length) * 100
      }));

      // Calculate student rankings
      const studentScores = new Map<string, { total: number; count: number; name: string; admissionNo: string }>();
      marks.forEach(mark => {
        const student = mark.students as any;
        const studentId = student.id;
        const score = mark.computed_score || mark.score;
        
        if (!studentScores.has(studentId)) {
          studentScores.set(studentId, {
            total: 0,
            count: 0,
            name: student.name,
            admissionNo: student.admission_no
          });
        }
        const entry = studentScores.get(studentId)!;
        entry.total += score;
        entry.count += 1;
      });

      const rankings: StudentRanking[] = Array.from(studentScores.entries())
        .map(([studentId, data]) => ({
          studentId,
          studentName: data.name,
          admissionNo: data.admissionNo,
          averageScore: data.total / data.count,
          totalMarks: data.total,
          rank: 0,
          gradeId: effectiveGradeId || '',
          streamId
        }))
        .sort((a, b) => b.averageScore - a.averageScore)
        .map((student, index) => ({ ...student, rank: index + 1 }));

      // Calculate overall average
      const allScores = marks.map(m => m.computed_score || m.score);
      const streamAverage = allScores.reduce((a, b) => a + b, 0) / allScores.length;

      // Get grade average for comparison
      const gradeAnalytics = effectiveGradeId ? await this.getGradeAnalytics(effectiveGradeId, examId) : null;
      const gradeAverage = gradeAnalytics?.overallAverage || 0;

      // Get trends - historical performance for this stream (pass gradeId for proper filtering)
      const trends = await this.getStreamTrends(streamId, effectiveGradeId);

      return {
        streamId: streamData.id,
        streamName: streamData.name,
        gradeId: effectiveGradeId || '',
        gradeName: gradeName || 'Unknown',
        studentCount: studentScores.size,
        overallAverage: streamAverage,
        subjectPerformance,
        rankings,
        trends,
        comparisonWithGrade: {
          gradeAverage,
          streamAverage,
          difference: streamAverage - gradeAverage
        }
      };
    } catch (error) {
      console.error('Error fetching grade-stream analytics:', error);
      return null;
    }
  },

  // Get individual student analytics
  async getStudentAnalytics(studentId: string, examId?: string): Promise<StudentAnalyticsData | null> {
    try {
      // Get student info
      const { data: student } = await supabase
        .from('students')
        .select(`
          id,
          name,
          admission_no,
          grade_id,
          stream_id,
          grades(id, name),
          streams(id, name)
        `)
        .eq('id', studentId)
        .single();

      if (!student) return null;

      const grade = student.grades as any;
      const stream = student.streams as any;

      // Get student's marks
      let marksQuery = supabase
        .from('marks')
        .select('*')
        .eq('student_id', studentId);

      if (examId) {
        marksQuery = marksQuery.eq('exam_id', examId);
      }

      const { data: studentMarks } = await marksQuery;

      if (!studentMarks || studentMarks.length === 0) {
        return null;
      }

      // Get stream and grade averages for comparison
      // Pass student.grade_id to get the correct grade-stream combination
      const streamAnalytics = await this.getGradeStreamAnalytics(student.stream_id, examId, student.grade_id);
      const gradeAnalytics = await this.getGradeAnalytics(student.grade_id, examId);

      // Calculate subject performance with comparisons
      const subjectMap = new Map<string, number[]>();
      studentMarks.forEach(mark => {
        const score = mark.computed_score || mark.score;
        if (!subjectMap.has(mark.subject)) {
          subjectMap.set(mark.subject, []);
        }
        subjectMap.get(mark.subject)!.push(score);
      });

      const subjectPerformance = Array.from(subjectMap.entries()).map(([subject, scores]) => {
        const currentScore = scores[scores.length - 1];
        const streamSubject = streamAnalytics?.subjectPerformance.find(s => s.subject === subject);
        const gradeSubject = gradeAnalytics?.subjectPerformance.find(s => s.subject === subject);

        return {
          subject,
          currentScore,
          grade: studentMarks.find(m => m.subject === subject)?.grade || 'N/A',
          previousScore: scores.length > 1 ? scores[scores.length - 2] : undefined,
          change: scores.length > 1 ? currentScore - scores[scores.length - 2] : undefined,
          streamAverage: streamSubject?.averageScore || 0,
          gradeAverage: gradeSubject?.averageScore || 0
        };
      });

      // Calculate overall average
      const allScores = studentMarks.map(m => m.computed_score || m.score);
      const overallAverage = allScores.reduce((a, b) => a + b, 0) / allScores.length;

      // Get rank from stream analytics
      const rank = streamAnalytics?.rankings.findIndex(r => r.studentId === studentId) ?? -1;

      // Get attendance
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentId);

      const attendanceRate = attendanceData && attendanceData.length > 0
        ? (attendanceData.filter(a => a.status.toLowerCase() === 'present').length / attendanceData.length) * 100
        : 0;

      // Get trends - historical performance across multiple exams
      const trends = await this.getStudentTrends(studentId, student.stream_id);

      return {
        studentId: student.id,
        studentName: student.name,
        admissionNo: student.admission_no,
        gradeId: grade.id,
        gradeName: grade.name,
        streamId: stream.id,
        streamName: stream.name,
        overallAverage,
        rank: rank + 1,
        totalStudentsInStream: streamAnalytics?.studentCount || 0,
        subjectPerformance,
        trends,
        attendanceRate
      };
    } catch (error) {
      console.error('Error fetching student analytics:', error);
      return null;
    }
  },

  // Get grade performance trends across multiple exams
  async getGradeTrends(gradeId: string): Promise<TrendData[]> {
    try {
      // Get all exams ordered by date
      const { data: exams } = await supabase
        .from('exams')
        .select('id, name, start_date, end_date')
        .contains('grades', [gradeId])
        .order('start_date', { ascending: true })
        .limit(10);

      if (!exams || exams.length === 0) return [];

      const trends: TrendData[] = [];

      for (const exam of exams) {
        // Get marks for this exam and grade
        const { data: marks } = await supabase
          .from('marks')
          .select(`
            score,
            computed_score,
            subject,
            students!inner(grade_id)
          `)
          .eq('exam_id', exam.id)
          .eq('students.grade_id', gradeId);

        if (!marks || marks.length === 0) continue;

        const scores = marks.map(m => m.computed_score || m.score);
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

        // Calculate subject averages
        const subjectMap = new Map<string, number[]>();
        marks.forEach(mark => {
          const score = mark.computed_score || mark.score;
          if (!subjectMap.has(mark.subject)) {
            subjectMap.set(mark.subject, []);
          }
          subjectMap.get(mark.subject)!.push(score);
        });

        const subjectAverages = Array.from(subjectMap.entries()).map(([subject, scores]) => ({
          subject,
          average: scores.reduce((a, b) => a + b, 0) / scores.length
        }));

        trends.push({
          examName: exam.name,
          examDate: exam.start_date,
          averageScore,
          subjectAverages
        });
      }

      return trends;
    } catch (error) {
      console.error('Error fetching grade trends:', error);
      return [];
    }
  },

  // Get stream performance trends across multiple exams
  // Now accepts gradeId as a required parameter for proper grade-stream filtering
  async getStreamTrends(streamId: string, gradeId?: string): Promise<TrendData[]> {
    try {
      let effectiveGradeId = gradeId;
      
      // If gradeId not provided, try to get it from stream or students
      if (!effectiveGradeId) {
        const { data: stream } = await supabase
          .from('streams')
          .select('grade_id')
          .eq('id', streamId)
          .single();

        if (stream?.grade_id) {
          effectiveGradeId = stream.grade_id;
        } else {
          // If stream doesn't have grade_id, get it from students
          const { data: studentWithGrade } = await supabase
            .from('students')
            .select('grade_id')
            .eq('stream_id', streamId)
            .limit(1)
            .maybeSingle();
          
          effectiveGradeId = studentWithGrade?.grade_id;
        }
      }

      if (!effectiveGradeId) return [];

      // Get all exams that include this grade
      const { data: exams } = await supabase
        .from('exams')
        .select('id, name, start_date, end_date')
        .contains('grades', [effectiveGradeId])
        .order('start_date', { ascending: true })
        .limit(10);

      if (!exams || exams.length === 0) return [];

      const trends: TrendData[] = [];

      for (const exam of exams) {
        // Get marks for this exam filtering by BOTH stream_id AND grade_id
        // This ensures we only get students in this specific grade-stream combination
        const { data: marks } = await supabase
          .from('marks')
          .select(`
            score,
            computed_score,
            subject,
            students!inner(stream_id, grade_id)
          `)
          .eq('exam_id', exam.id)
          .eq('students.stream_id', streamId)
          .eq('students.grade_id', effectiveGradeId);

        if (!marks || marks.length === 0) continue;

        const scores = marks.map(m => m.computed_score || m.score);
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

        // Calculate subject averages
        const subjectMap = new Map<string, number[]>();
        marks.forEach(mark => {
          const score = mark.computed_score || mark.score;
          if (!subjectMap.has(mark.subject)) {
            subjectMap.set(mark.subject, []);
          }
          subjectMap.get(mark.subject)!.push(score);
        });

        const subjectAverages = Array.from(subjectMap.entries()).map(([subject, scores]) => ({
          subject,
          average: scores.reduce((a, b) => a + b, 0) / scores.length
        }));

        trends.push({
          examName: exam.name,
          examDate: exam.start_date,
          averageScore,
          subjectAverages
        });
      }

      return trends;
    } catch (error) {
      console.error('Error fetching stream trends:', error);
      return [];
    }
  },

  // Get student performance trends across multiple exams
  async getStudentTrends(studentId: string, streamId: string): Promise<{ examName: string; examDate: string; averageScore: number; rank: number }[]> {
    try {
      // Get student's grade
      const { data: student } = await supabase
        .from('students')
        .select('grade_id')
        .eq('id', studentId)
        .single();

      if (!student) return [];

      const gradeId = student.grade_id;

      // Get all exams for this grade
      const { data: exams } = await supabase
        .from('exams')
        .select('id, name, start_date, end_date')
        .contains('grades', [gradeId])
        .order('start_date', { ascending: true })
        .limit(10);

      if (!exams || exams.length === 0) return [];

      const trends: { examName: string; examDate: string; averageScore: number; rank: number }[] = [];

      for (const exam of exams) {
        // Get student's marks for this exam
        const { data: studentMarks } = await supabase
          .from('marks')
          .select('score, computed_score')
          .eq('exam_id', exam.id)
          .eq('student_id', studentId);

        if (!studentMarks || studentMarks.length === 0) continue;

        const scores = studentMarks.map(m => m.computed_score || m.score);
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

        // Calculate rank for this exam - filter by BOTH stream_id AND grade_id
        const { data: allStudentMarks } = await supabase
          .from('marks')
          .select(`
            student_id,
            score,
            computed_score,
            students!inner(stream_id, grade_id)
          `)
          .eq('exam_id', exam.id)
          .eq('students.stream_id', streamId)
          .eq('students.grade_id', gradeId);

        let rank = 1;
        if (allStudentMarks && allStudentMarks.length > 0) {
          // Calculate average for each student
          const studentAverages = new Map<string, number[]>();
          allStudentMarks.forEach(mark => {
            const score = mark.computed_score || mark.score;
            if (!studentAverages.has(mark.student_id)) {
              studentAverages.set(mark.student_id, []);
            }
            studentAverages.get(mark.student_id)!.push(score);
          });

          const rankings = Array.from(studentAverages.entries())
            .map(([sid, scores]) => ({
              studentId: sid,
              average: scores.reduce((a, b) => a + b, 0) / scores.length
            }))
            .sort((a, b) => b.average - a.average);

          const studentRank = rankings.findIndex(r => r.studentId === studentId);
          rank = studentRank >= 0 ? studentRank + 1 : 1;
        }

        trends.push({
          examName: exam.name,
          examDate: exam.start_date,
          averageScore,
          rank
        });
      }

      return trends;
    } catch (error) {
      console.error('Error fetching student trends:', error);
      return [];
    }
  }
};
