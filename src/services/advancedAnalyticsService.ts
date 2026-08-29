import { supabase } from "@/integrations/supabase/client";

// ==================== TYPES ====================

export interface AttendanceAnalytics {
  schoolId: string;
  period: string;
  overallAttendanceRate: number;
  gradeAttendance: {
    gradeId: string;
    gradeName: string;
    attendanceRate: number;
    studentCount: number;
  }[];
  streamAttendance: {
    streamId: string;
    streamName: string;
    gradeName: string;
    attendanceRate: number;
    studentCount: number;
  }[];
  dailyTrends: {
    date: string;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    attendanceRate: number;
  }[];
  chronicAbsentees: {
    studentId: string;
    studentName: string;
    admissionNo: string;
    gradeName: string;
    streamName: string;
    totalDays: number;
    presentDays: number;
    attendanceRate: number;
  }[];
  attendanceByDayOfWeek: {
    day: string;
    averageAttendance: number;
  }[];
}

export interface FinancialAnalytics {
  schoolId: string;
  period: string;
  totalFees: number;
  collectedAmount: number;
  outstandingAmount: number;
  collectionRate: number;
  gradeFinancials: {
    gradeId: string;
    gradeName: string;
    totalFees: number;
    collectedAmount: number;
    outstandingAmount: number;
    studentCount: number;
  }[];
  paymentTrends: {
    month: string;
    amount: number;
    transactionCount: number;
  }[];
  overduePayments: {
    studentId: string;
    studentName: string;
    admissionNo: string;
    gradeName: string;
    streamName: string;
    outstandingAmount: number;
    daysOverdue: number;
  }[];
  paymentMethods: {
    method: string;
    amount: number;
    percentage: number;
  }[];
}

export interface TeacherPerformanceAnalytics {
  teacherId: string;
  teacherName: string;
  subjects: string[];
  overallRating: number;
  studentPerformance: {
    subject: string;
    averageScore: number;
    passingRate: number;
    gradeAverage: number;
    improvement: number;
  }[];
  classPerformance: {
    gradeId: string;
    gradeName: string;
    streamName: string;
    averageScore: number;
    studentCount: number;
  }[];
  attendanceCorrelation: {
    subject: string;
    attendanceRate: number;
    averageScore: number;
    correlation: number;
  }[];
  trends: {
    period: string;
    averageScore: number;
    passingRate: number;
  }[];
}

export interface AtRiskStudent {
  studentId: string;
  studentName: string;
  admissionNo: string;
  gradeName: string;
  streamName: string;
  riskFactors: {
    type: 'attendance' | 'academic' | 'behavioral' | 'financial';
    severity: 'high' | 'medium' | 'low';
    description: string;
    value: number;
  }[];
  overallRiskScore: number;
  recommendedActions: string[];
}

export interface PredictiveAnalytics {
  gradeId: string;
  gradeName: string;
  predictedPerformance: {
    subject: string;
    currentAverage: number;
    predictedScore: number;
    confidence: number;
  }[];
  atRiskStudents: AtRiskStudent[];
  retentionRisk: {
    studentId: string;
    studentName: string;
    riskLevel: 'high' | 'medium' | 'low';
    factors: string[];
  }[];
  examPredictions: {
    examName: string;
    predictedAverage: number;
    confidence: number;
  }[];
}

export interface ComparativeAnalytics {
  currentYear: {
    year: string;
    overallAverage: number;
    passingRate: number;
    attendanceRate: number;
  };
  previousYears: {
    year: string;
    overallAverage: number;
    passingRate: number;
    attendanceRate: number;
  }[];
  trends: {
    metric: string;
    current: number;
    previous: number;
    change: number;
    changePercentage: number;
  }[];
  benchmarkComparison: {
    metric: string;
    schoolValue: number;
    benchmarkValue: number;
    difference: number;
    percentile: number;
  }[];
}

// ==================== ATTENDANCE ANALYTICS ====================

export const attendanceAnalyticsService = {
  async getAttendanceAnalytics(
    schoolId: string,
    startDate?: string,
    endDate?: string
  ): Promise<AttendanceAnalytics | null> {
    try {
      const start = startDate || new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString();
      const end = endDate || new Date().toISOString();

      // Get all attendance records for the period
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          *,
          students!inner(id, name, admission_no, grade_id, stream_id, grades!inner(name), streams!inner(name))
        `)
        .eq('school_id', schoolId)
        .gte('date', start)
        .lte('date', end);

      if (attendanceError) throw attendanceError;

      if (!attendance || attendance.length === 0) {
        return this.getEmptyAnalytics(schoolId, `${start} to ${end}`);
      }

      // Calculate overall attendance rate
      const totalRecords = attendance.length;
      const presentRecords = attendance.filter(a => a.status.toLowerCase() === 'present').length;
      const overallAttendanceRate = (presentRecords / totalRecords) * 100;

      // Calculate grade-level attendance
      const gradeMap = new Map<string, { present: number; total: number; name: string; studentCount: Set<string> }>();
      attendance.forEach(record => {
        const student = record.students as any;
        const gradeId = student.grade_id;
        const gradeName = student.grades?.name || 'Unknown';
        
        if (!gradeMap.has(gradeId)) {
          gradeMap.set(gradeId, { present: 0, total: 0, name: gradeName, studentCount: new Set() });
        }
        
        const gradeData = gradeMap.get(gradeId)!;
        gradeData.total++;
        if (record.status.toLowerCase() === 'present') {
          gradeData.present++;
        }
        gradeData.studentCount.add(student.id);
      });

      const gradeAttendance = Array.from(gradeMap.entries()).map(([gradeId, data]) => ({
        gradeId,
        gradeName: data.name,
        attendanceRate: (data.present / data.total) * 100,
        studentCount: data.studentCount.size
      }));

      // Calculate stream-level attendance
      const streamMap = new Map<string, { present: number; total: number; name: string; gradeName: string; studentCount: Set<string> }>();
      attendance.forEach(record => {
        const student = record.students as any;
        const streamId = student.stream_id;
        const streamName = student.streams?.name || 'Unknown';
        const gradeName = student.grades?.name || 'Unknown';
        
        if (!streamMap.has(streamId)) {
          streamMap.set(streamId, { present: 0, total: 0, name: streamName, gradeName, studentCount: new Set() });
        }
        
        const streamData = streamMap.get(streamId)!;
        streamData.total++;
        if (record.status.toLowerCase() === 'present') {
          streamData.present++;
        }
        streamData.studentCount.add(student.id);
      });

      const streamAttendance = Array.from(streamMap.entries()).map(([streamId, data]) => ({
        streamId,
        streamName: data.name,
        gradeName: data.gradeName,
        attendanceRate: (data.present / data.total) * 100,
        studentCount: data.studentCount.size
      }));

      // Calculate daily trends
      const dailyMap = new Map<string, { present: number; absent: number; late: number }>();
      attendance.forEach(record => {
        const date = record.date.split('T')[0];
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { present: 0, absent: 0, late: 0 });
        }
        
        const dayData = dailyMap.get(date)!;
        const status = record.status.toLowerCase();
        if (status === 'present') dayData.present++;
        else if (status === 'absent') dayData.absent++;
        else if (status === 'late') dayData.late++;
      });

      const dailyTrends = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          presentCount: data.present,
          absentCount: data.absent,
          lateCount: data.late,
          attendanceRate: (data.present / (data.present + data.absent + data.late)) * 100
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Identify chronic absentees (attendance < 70%)
      const studentAttendanceMap = new Map<string, { present: number; total: number; name: string; admissionNo: string; gradeName: string; streamName: string }>();
      attendance.forEach(record => {
        const student = record.students as any;
        const studentId = student.id;
        
        if (!studentAttendanceMap.has(studentId)) {
          studentAttendanceMap.set(studentId, {
            present: 0,
            total: 0,
            name: student.name,
            admissionNo: student.admission_no,
            gradeName: student.grades?.name || 'Unknown',
            streamName: student.streams?.name || 'Unknown'
          });
        }
        
        const studentData = studentAttendanceMap.get(studentId)!;
        studentData.total++;
        if (record.status.toLowerCase() === 'present') {
          studentData.present++;
        }
      });

      const chronicAbsentees = Array.from(studentAttendanceMap.entries())
        .filter(([_, data]) => (data.present / data.total) * 100 < 70)
        .map(([studentId, data]) => ({
          studentId,
          studentName: data.name,
          admissionNo: data.admissionNo,
          gradeName: data.gradeName,
          streamName: data.streamName,
          totalDays: data.total,
          presentDays: data.present,
          attendanceRate: (data.present / data.total) * 100
        }))
        .sort((a, b) => a.attendanceRate - b.attendanceRate);

      // Calculate attendance by day of week
      const dayOfWeekMap = new Map<string, number[]>();
      attendance.forEach(record => {
        const date = new Date(record.date);
        const day = date.toLocaleDateString('en-US', { weekday: 'long' });
        
        if (!dayOfWeekMap.has(day)) {
          dayOfWeekMap.set(day, []);
        }
        
        const isPresent = record.status.toLowerCase() === 'present';
        dayOfWeekMap.get(day)!.push(isPresent ? 1 : 0);
      });

      const attendanceByDayOfWeek = Array.from(dayOfWeekMap.entries()).map(([day, values]) => ({
        day,
        averageAttendance: values.reduce((a, b) => a + b, 0) / values.length * 100
      }));

      return {
        schoolId,
        period: `${start} to ${end}`,
        overallAttendanceRate,
        gradeAttendance,
        streamAttendance,
        dailyTrends,
        chronicAbsentees,
        attendanceByDayOfWeek
      };
    } catch (error) {
      console.error('Error fetching attendance analytics:', error);
      return null;
    }
  },

  getEmptyAnalytics(schoolId: string, period: string): AttendanceAnalytics {
    return {
      schoolId,
      period,
      overallAttendanceRate: 0,
      gradeAttendance: [],
      streamAttendance: [],
      dailyTrends: [],
      chronicAbsentees: [],
      attendanceByDayOfWeek: []
    };
  }
};

// ==================== FINANCIAL ANALYTICS ====================

export const financialAnalyticsService = {
  async getFinancialAnalytics(
    schoolId: string,
    startDate?: string,
    endDate?: string
  ): Promise<FinancialAnalytics | null> {
    try {
      const start = startDate || new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString();
      const end = endDate || new Date().toISOString();

      // Get all fee payments for the period
      const { data: payments, error: paymentsError } = await supabase
        .from('fee_payments')
        .select(`
          *,
          students!inner(id, name, admission_no, grade_id, stream_id, grades!inner(name), streams!inner(name))
        `)
        .eq('school_id', schoolId)
        .gte('payment_date', start)
        .lte('payment_date', end);

      if (paymentsError) throw paymentsError;

      // Get total fees for all students
      const { data: students } = await supabase
        .from('students')
        .select('id, grade_id, grades!inner(name)')
        .eq('school_id', schoolId)
        .eq('status', 'active');

      if (!students) return null;

      // Calculate total fees (assuming standard fee structure - adjust as needed)
      const totalFees = students.length * 50000; // Example: 50,000 per student

      // Calculate collected amount
      const collectedAmount = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const outstandingAmount = totalFees - collectedAmount;
      const collectionRate = (collectedAmount / totalFees) * 100;

      // Calculate grade-level financials
      const gradeFinancialMap = new Map<string, { totalFees: number; collected: number; studentCount: number; name: string }>();
      students.forEach(student => {
        const gradeId = student.grade_id;
        const gradeName = (student.grades as any)?.name || 'Unknown';
        
        if (!gradeFinancialMap.has(gradeId)) {
          gradeFinancialMap.set(gradeId, { totalFees: 0, collected: 0, studentCount: 0, name: gradeName });
        }
        
        const gradeData = gradeFinancialMap.get(gradeId)!;
        gradeData.totalFees += 50000;
        gradeData.studentCount++;
      });

      // Add collected amounts to grades
      payments?.forEach(payment => {
        const student = payment.students as any;
        const gradeId = student.grade_id;
        
        if (gradeFinancialMap.has(gradeId)) {
          gradeFinancialMap.get(gradeId)!.collected += payment.amount || 0;
        }
      });

      const gradeFinancials = Array.from(gradeFinancialMap.entries()).map(([gradeId, data]) => ({
        gradeId,
        gradeName: data.name,
        totalFees: data.totalFees,
        collectedAmount: data.collected,
        outstandingAmount: data.totalFees - data.collected,
        studentCount: data.studentCount
      }));

      // Calculate payment trends by month
      const monthMap = new Map<string, { amount: number; count: number }>();
      payments?.forEach(payment => {
        const month = new Date(payment.payment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        
        if (!monthMap.has(month)) {
          monthMap.set(month, { amount: 0, count: 0 });
        }
        
        const monthData = monthMap.get(month)!;
        monthData.amount += payment.amount || 0;
        monthData.count++;
      });

      const paymentTrends = Array.from(monthMap.entries())
        .map(([month, data]) => ({
          month,
          amount: data.amount,
          transactionCount: data.count
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Identify overdue payments
      const studentPaymentMap = new Map<string, { paid: number; name: string; admissionNo: string; gradeName: string; streamName: string }>();
      payments?.forEach(payment => {
        const student = payment.students as any;
        const studentId = student.id;
        
        if (!studentPaymentMap.has(studentId)) {
          studentPaymentMap.set(studentId, {
            paid: 0,
            name: student.name,
            admissionNo: student.admission_no,
            gradeName: (student.grades as any)?.name || 'Unknown',
            streamName: (student.streams as any)?.name || 'Unknown'
          });
        }
        
        studentPaymentMap.get(studentId)!.paid += payment.amount || 0;
      });

      const overduePayments = students
        .filter(student => {
          const paid = studentPaymentMap.get(student.id)?.paid || 0;
          return paid < 50000; // Assuming 50,000 is the required fee
        })
        .map(student => {
          const paymentData = studentPaymentMap.get(student.id);
          const outstanding = 50000 - (paymentData?.paid || 0);
          const lastPayment = payments?.find(p => p.student_id === student.id);
          const daysOverdue = lastPayment 
            ? Math.floor((new Date().getTime() - new Date(lastPayment.payment_date).getTime()) / (1000 * 60 * 60 * 24))
            : 365;

          return {
            studentId: student.id,
            studentName: paymentData?.name || student.name,
            admissionNo: paymentData?.admissionNo || student.admission_no || '',
            gradeName: paymentData?.gradeName || 'Unknown',
            streamName: paymentData?.streamName || 'Unknown',
            outstandingAmount: outstanding,
            daysOverdue
          };
        })
        .sort((a, b) => b.daysOverdue - a.daysOverdue);

      // Calculate payment methods
      const methodMap = new Map<string, number>();
      payments?.forEach(payment => {
        const method = payment.payment_method || 'cash';
        methodMap.set(method, (methodMap.get(method) || 0) + (payment.amount || 0));
      });

      const paymentMethods = Array.from(methodMap.entries()).map(([method, amount]) => ({
        method,
        amount,
        percentage: (amount / collectedAmount) * 100
      }));

      return {
        schoolId,
        period: `${start} to ${end}`,
        totalFees,
        collectedAmount,
        outstandingAmount,
        collectionRate,
        gradeFinancials,
        paymentTrends,
        overduePayments,
        paymentMethods
      };
    } catch (error) {
      console.error('Error fetching financial analytics:', error);
      return null;
    }
  }
};

// ==================== TEACHER PERFORMANCE ANALYTICS ====================

export const teacherAnalyticsService = {
  async getTeacherPerformance(teacherId: string): Promise<TeacherPerformanceAnalytics | null> {
    try {
      // Get teacher info
      const { data: teacher } = await supabase
        .from('teachers')
        .select('*')
        .eq('id', teacherId)
        .single();

      if (!teacher) return null;

      // Get subjects taught by this teacher
      const subjects = teacher.subjects_taught || [];

      // Get teacher's class assignments
      const { data: gradeStreamAssignments } = await supabase
        .from('grade_streams')
        .select('grade_id, stream_id, grades!inner(name), streams!inner(name)')
        .eq('teacher_id', teacherId);

      // Get marks for subjects taught by this teacher
      const { data: marks } = await supabase
        .from('marks')
        .select(`
          *,
          students!inner(grade_id, stream_id, grades!inner(name), streams!inner(name))
        `)
        .in('subject', subjects);

      if (!marks || marks.length === 0) {
        return {
          teacherId,
          teacherName: teacher.name,
          subjects,
          overallRating: 0,
          studentPerformance: [],
          classPerformance: [],
          attendanceCorrelation: [],
          trends: []
        };
      }

      // Calculate student performance by subject
      const subjectMap = new Map<string, number[]>();
      marks.forEach(mark => {
        const score = mark.computed_score || mark.score;
        if (!subjectMap.has(mark.subject)) {
          subjectMap.set(mark.subject, []);
        }
        subjectMap.get(mark.subject)!.push(score);
      });

      const studentPerformance = Array.from(subjectMap.entries()).map(([subject, scores]) => {
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const passingRate = (scores.filter(s => s >= 50).length / scores.length) * 100;
        
        return {
          subject,
          averageScore,
          passingRate,
          gradeAverage: averageScore, // Would compare to school average in real implementation
          improvement: 0 // Would calculate from historical data
        };
      });

      // Calculate class performance
      const classMap = new Map<string, { scores: number[]; gradeName: string; streamName: string; studentCount: Set<string> }>();
      marks.forEach(mark => {
        const student = mark.students as any;
        const key = `${student.grade_id}-${student.stream_id}`;
        
        if (!classMap.has(key)) {
          classMap.set(key, {
            scores: [],
            gradeName: (student.grades as any)?.name || 'Unknown',
            streamName: (student.streams as any)?.name || 'Unknown',
            studentCount: new Set()
          });
        }
        
        const classData = classMap.get(key)!;
        classData.scores.push(mark.computed_score || mark.score);
        classData.studentCount.add(student.id);
      });

      const classPerformance = Array.from(classMap.entries()).map(([_, data]) => ({
        gradeId: _.split('-')[0],
        gradeName: data.gradeName,
        streamName: data.streamName,
        averageScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        studentCount: data.studentCount.size
      }));

      // Calculate overall rating
      const allScores = marks.map(m => m.computed_score || m.score);
      const overallRating = allScores.reduce((a, b) => a + b, 0) / allScores.length;

      return {
        teacherId,
        teacherName: teacher.name,
        subjects,
        overallRating,
        studentPerformance,
        classPerformance,
        attendanceCorrelation: [], // Would correlate with attendance data
        trends: [] // Would calculate from historical data
      };
    } catch (error) {
      console.error('Error fetching teacher performance:', error);
      return null;
    }
  }
};

// ==================== AT-RISK STUDENT ANALYTICS ====================

export const riskAnalyticsService = {
  async identifyAtRiskStudents(schoolId: string, gradeId?: string): Promise<AtRiskStudent[]> {
    try {
      const atRiskStudents: AtRiskStudent[] = [];

      // Get attendance analytics
      const attendanceAnalytics = await attendanceAnalyticsService.getAttendanceAnalytics(schoolId);
      
      // Identify students with poor attendance
      if (attendanceAnalytics) {
        attendanceAnalytics.chronicAbsentees.forEach(absentee => {
          if (gradeId && absentee.gradeName !== gradeId) return;

          atRiskStudents.push({
            studentId: absentee.studentId,
            studentName: absentee.studentName,
            admissionNo: absentee.admissionNo,
            gradeName: absentee.gradeName,
            streamName: absentee.streamName,
            riskFactors: [
              {
                type: 'attendance',
                severity: absentee.attendanceRate < 50 ? 'high' : 'medium',
                description: `Low attendance rate: ${absentee.attendanceRate.toFixed(1)}%`,
                value: absentee.attendanceRate
              }
            ],
            overallRiskScore: 100 - absentee.attendanceRate,
            recommendedActions: [
              'Schedule parent meeting',
              'Implement attendance improvement plan',
              'Provide counseling support'
            ]
          });
        });
      }

      // Get students with poor academic performance
      const { data: students } = await supabase
        .from('students')
        .select('id, name, admission_no, grade_id, stream_id, grades!inner(name), streams!inner(name)')
        .eq('school_id', schoolId)
        .eq('status', 'active');

      if (students) {
        for (const student of students) {
          if (gradeId && student.grade_id !== gradeId) continue;

          // Get student's marks
          const { data: marks } = await supabase
            .from('marks')
            .select('score, computed_score, subject')
            .eq('student_id', student.id);

          if (marks && marks.length > 0) {
            const scores = marks.map(m => m.computed_score || m.score);
            const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

            if (averageScore < 40) {
              const existingStudent = atRiskStudents.find(s => s.studentId === student.id);
              
              if (existingStudent) {
                existingStudent.riskFactors.push({
                  type: 'academic',
                  severity: averageScore < 30 ? 'high' : 'medium',
                  description: `Poor academic performance: ${averageScore.toFixed(1)}% average`,
                  value: averageScore
                });
                existingStudent.overallRiskScore = Math.max(existingStudent.overallRiskScore, 100 - averageScore);
              } else {
                atRiskStudents.push({
                  studentId: student.id,
                  studentName: student.name,
                  admissionNo: student.admission_no || '',
                  gradeName: (student.grades as any)?.name || 'Unknown',
                  streamName: (student.streams as any)?.name || 'Unknown',
                  riskFactors: [
                    {
                      type: 'academic',
                      severity: averageScore < 30 ? 'high' : 'medium',
                      description: `Poor academic performance: ${averageScore.toFixed(1)}% average`,
                      value: averageScore
                    }
                  ],
                  overallRiskScore: 100 - averageScore,
                  recommendedActions: [
                    'Provide academic support',
                    'Arrange tutoring sessions',
                    'Review teaching methods'
                  ]
                });
              }
            }
          }
        }
      }

      // Sort by overall risk score
      return atRiskStudents.sort((a, b) => b.overallRiskScore - a.overallRiskScore);
    } catch (error) {
      console.error('Error identifying at-risk students:', error);
      return [];
    }
  }
};

// ==================== PREDICTIVE ANALYTICS ====================

export const predictiveAnalyticsService = {
  async getPredictiveAnalytics(gradeId: string): Promise<PredictiveAnalytics | null> {
    try {
      // Get grade info
      const { data: grade } = await supabase
        .from('grades')
        .select('*')
        .eq('id', gradeId)
        .single();

      if (!grade) return null;

      // Get current performance data
      const { data: marks } = await supabase
        .from('marks')
        .select('subject, score, computed_score, students!inner(id)')
        .eq('students.grade_id', gradeId);

      // Calculate current averages by subject
      const subjectMap = new Map<string, number[]>();
      marks?.forEach(mark => {
        const score = mark.computed_score || mark.score;
        if (!subjectMap.has(mark.subject)) {
          subjectMap.set(mark.subject, []);
        }
        subjectMap.get(mark.subject)!.push(score);
      });

      const predictedPerformance = Array.from(subjectMap.entries()).map(([subject, scores]) => {
        const currentAverage = scores.reduce((a, b) => a + b, 0) / scores.length;
        // Simple prediction: assume slight improvement based on trend
        const predictedScore = Math.min(currentAverage + 5, 100);
        
        return {
          subject,
          currentAverage,
          predictedScore,
          confidence: 0.75 // 75% confidence
        };
      });

      // Get at-risk students
      const atRiskStudents = await riskAnalyticsService.identifyAtRiskStudents(grade.school_id, gradeId);

      // Calculate retention risk
      const retentionRisk = atRiskStudents
        .filter(student => student.overallRiskScore > 50)
        .map(student => ({
          studentId: student.studentId,
          studentName: student.studentName,
          riskLevel: student.overallRiskScore > 70 ? 'high' : 'medium',
          factors: student.riskFactors.map(f => f.description)
        }));

      return {
        gradeId,
        gradeName: grade.name,
        predictedPerformance,
        atRiskStudents,
        retentionRisk,
        examPredictions: [] // Would predict based on historical exam patterns
      };
    } catch (error) {
      console.error('Error fetching predictive analytics:', error);
      return null;
    }
  }
};

// ==================== COMPARATIVE ANALYTICS ====================

export const comparativeAnalyticsService = {
  async getComparativeAnalytics(schoolId: string): Promise<ComparativeAnalytics | null> {
    try {
      // Get current year data
      const currentYear = new Date().getFullYear().toString();
      
      // Get archived years for comparison
      const { data: archivedYears } = await supabase
        .from('archived_academic_years')
        .select('*')
        .eq('school_id', schoolId)
        .order('archived_at', { ascending: false })
        .limit(3);

      // Get current performance
      const { data: currentMarks } = await supabase
        .from('marks')
        .select('score, computed_score');

      const currentAverage = currentMarks?.reduce((sum, m) => sum + (m.computed_score || m.score), 0) / (currentMarks?.length || 1) || 0;
      const currentPassingRate = currentMarks?.filter(m => (m.computed_score || m.score) >= 50).length / (currentMarks?.length || 1) * 100 || 0;

      // Get current attendance
      const { data: currentAttendance } = await supabase
        .from('attendance')
        .select('status')
        .eq('school_id', schoolId);

      const currentAttendanceRate = currentAttendance?.filter(a => a.status.toLowerCase() === 'present').length / (currentAttendance?.length || 1) * 100 || 0;

      const currentYearData = {
        year: currentYear,
        overallAverage: currentAverage,
        passingRate: currentPassingRate,
        attendanceRate: currentAttendanceRate
      };

      // Extract previous years data from archives
      const previousYears = archivedYears?.map(archive => ({
        year: archive.year,
        overallAverage: archive.archive_data?.stats?.overallAverage || 0,
        passingRate: archive.archive_data?.stats?.passingRate || 0,
        attendanceRate: archive.archive_data?.stats?.attendanceRate || 0
      })) || [];

      // Calculate trends
      const trends = [
        {
          metric: 'Overall Average',
          current: currentAverage,
          previous: previousYears[0]?.overallAverage || 0,
          change: currentAverage - (previousYears[0]?.overallAverage || 0),
          changePercentage: previousYears[0]?.overallAverage 
            ? ((currentAverage - previousYears[0].overallAverage) / previousYears[0].overallAverage) * 100 
            : 0
        },
        {
          metric: 'Passing Rate',
          current: currentPassingRate,
          previous: previousYears[0]?.passingRate || 0,
          change: currentPassingRate - (previousYears[0]?.passingRate || 0),
          changePercentage: previousYears[0]?.passingRate 
            ? ((currentPassingRate - previousYears[0].passingRate) / previousYears[0].passingRate) * 100 
            : 0
        },
        {
          metric: 'Attendance Rate',
          current: currentAttendanceRate,
          previous: previousYears[0]?.attendanceRate || 0,
          change: currentAttendanceRate - (previousYears[0]?.attendanceRate || 0),
          changePercentage: previousYears[0]?.attendanceRate 
            ? ((currentAttendanceRate - previousYears[0].attendanceRate) / previousYears[0].attendanceRate) * 100 
            : 0
        }
      ];

      // Benchmark comparison (using national/regional averages as benchmarks)
      const benchmarkComparison = [
        {
          metric: 'Overall Average',
          schoolValue: currentAverage,
          benchmarkValue: 65, // Example benchmark
          difference: currentAverage - 65,
          percentile: Math.min(Math.max((currentAverage / 100) * 100, 0), 100)
        },
        {
          metric: 'Passing Rate',
          schoolValue: currentPassingRate,
          benchmarkValue: 75, // Example benchmark
          difference: currentPassingRate - 75,
          percentile: Math.min(Math.max((currentPassingRate / 100) * 100, 0), 100)
        },
        {
          metric: 'Attendance Rate',
          schoolValue: currentAttendanceRate,
          benchmarkValue: 85, // Example benchmark
          difference: currentAttendanceRate - 85,
          percentile: Math.min(Math.max((currentAttendanceRate / 100) * 100, 0), 100)
        }
      ];

      return {
        currentYear: currentYearData,
        previousYears,
        trends,
        benchmarkComparison
      };
    } catch (error) {
      console.error('Error fetching comparative analytics:', error);
      return null;
    }
  }
};
