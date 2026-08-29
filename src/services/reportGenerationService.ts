import { supabase } from "@/integrations/supabase/client";
import { analyticsService } from "./analyticsService";
import { 
  attendanceAnalyticsService, 
  financialAnalyticsService,
  teacherAnalyticsService,
  riskAnalyticsService,
  comparativeAnalyticsService
} from "./advancedAnalyticsService";

// ==================== TYPES ====================

export interface ReportConfig {
  type: 'performance' | 'attendance' | 'financial' | 'teacher' | 'risk' | 'comparative';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  filters: {
    schoolId: string;
    gradeId?: string;
    streamId?: string;
    studentId?: string;
    teacherId?: string;
    startDate?: string;
    endDate?: string;
    examId?: string;
  };
}

export interface GeneratedReport {
  id: string;
  type: string;
  format: string;
  generatedAt: string;
  generatedBy: string;
  data: any;
  metadata: {
    title: string;
    description: string;
    filters: any;
    recordCount: number;
  };
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  defaultFilters: any;
  sections: ReportSection[];
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'table' | 'chart' | 'summary' | 'text';
  dataSource: string;
  config: any;
}

// ==================== REPORT GENERATION SERVICE ====================

export const reportGenerationService = {
  /**
   * Generate a report based on configuration
   */
  async generateReport(config: ReportConfig, userId: string): Promise<GeneratedReport | null> {
    try {
      let data: any;
      let title = '';
      let description = '';
      let recordCount = 0;

      switch (config.type) {
        case 'performance':
          data = await this.generatePerformanceReport(config.filters);
          title = 'Performance Report';
          description = 'Academic performance analysis';
          break;
        case 'attendance':
          data = await this.generateAttendanceReport(config.filters);
          title = 'Attendance Report';
          description = 'Student attendance analysis';
          break;
        case 'financial':
          data = await this.generateFinancialReport(config.filters);
          title = 'Financial Report';
          description = 'Fee collection and financial analysis';
          break;
        case 'teacher':
          data = await this.generateTeacherReport(config.filters);
          title = 'Teacher Performance Report';
          description = 'Teacher performance evaluation';
          break;
        case 'risk':
          data = await this.generateRiskReport(config.filters);
          title = 'At-Risk Students Report';
          description = 'Students requiring intervention';
          break;
        case 'comparative':
          data = await this.generateComparativeReport(config.filters);
          title = 'Comparative Analysis Report';
          description = 'Year-over-year performance comparison';
          break;
        default:
          throw new Error(`Unknown report type: ${config.type}`);
      }

      // Calculate record count
      recordCount = this.calculateRecordCount(data);

      const report: GeneratedReport = {
        id: crypto.randomUUID(),
        type: config.type,
        format: config.format,
        generatedAt: new Date().toISOString(),
        generatedBy: userId,
        data,
        metadata: {
          title,
          description,
          filters: config.filters,
          recordCount
        }
      };

      // Save report to database
      await this.saveReport(report);

      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      return null;
    }
  },

  /**
   * Generate performance report
   */
  async generatePerformanceReport(filters: any) {
    const { schoolId, gradeId, streamId, studentId, examId } = filters;

    if (studentId) {
      // Individual student performance
      const studentAnalytics = await analyticsService.getStudentAnalytics(studentId, examId);
      return {
        scope: 'student',
        data: studentAnalytics
      };
    } else if (streamId && gradeId) {
      // Stream performance
      const streamAnalytics = await analyticsService.getGradeStreamAnalytics(streamId, examId, gradeId);
      return {
        scope: 'stream',
        data: streamAnalytics
      };
    } else if (gradeId) {
      // Grade performance
      const gradeAnalytics = await analyticsService.getGradeAnalytics(gradeId, examId);
      return {
        scope: 'grade',
        data: gradeAnalytics
      };
    } else {
      // School-wide performance
      const { data: grades } = await supabase
        .from('grades')
        .select('id, name')
        .eq('school_id', schoolId);

      const gradeAnalytics = await Promise.all(
        (grades || []).map(grade => analyticsService.getGradeAnalytics(grade.id, examId))
      );

      return {
        scope: 'school',
        data: {
          grades: gradeAnalytics.filter(g => g !== null)
        }
      };
    }
  },

  /**
   * Generate attendance report
   */
  async generateAttendanceReport(filters: any) {
    const { schoolId, gradeId, startDate, endDate } = filters;

    const attendanceData = await attendanceAnalyticsService.getAttendanceAnalytics(
      schoolId,
      startDate,
      endDate
    );

    if (gradeId && attendanceData) {
      // Filter by grade
      attendanceData.gradeAttendance = attendanceData.gradeAttendance.filter(
        g => g.gradeId === gradeId
      );
      attendanceData.streamAttendance = attendanceData.streamAttendance.filter(
        s => s.gradeName === attendanceData.gradeAttendance[0]?.gradeName
      );
    }

    return attendanceData;
  },

  /**
   * Generate financial report
   */
  async generateFinancialReport(filters: any) {
    const { schoolId, gradeId, startDate, endDate } = filters;

    const financialData = await financialAnalyticsService.getFinancialAnalytics(
      schoolId,
      startDate,
      endDate
    );

    if (gradeId && financialData) {
      // Filter by grade
      financialData.gradeFinancials = financialData.gradeFinancials.filter(
        g => g.gradeId === gradeId
      );
    }

    return financialData;
  },

  /**
   * Generate teacher performance report
   */
  async generateTeacherReport(filters: any) {
    const { schoolId, teacherId } = filters;

    if (teacherId) {
      // Individual teacher performance
      const teacherPerformance = await teacherAnalyticsService.getTeacherPerformance(teacherId);
      return {
        scope: 'teacher',
        data: teacherPerformance
      };
    } else {
      // All teachers in school
      const { data: teachers } = await supabase
        .from('teachers')
        .select('id, name')
        .eq('school_id', schoolId);

      const teacherPerformance = await Promise.all(
        (teachers || []).map(teacher => teacherAnalyticsService.getTeacherPerformance(teacher.id))
      );

      return {
        scope: 'school',
        data: {
          teachers: teacherPerformance.filter(t => t !== null)
        }
      };
    }
  },

  /**
   * Generate at-risk students report
   */
  async generateRiskReport(filters: any) {
    const { schoolId, gradeId } = filters;

    const atRiskStudents = await riskAnalyticsService.identifyAtRiskStudents(schoolId, gradeId);

    return {
      atRiskStudents,
      summary: {
        totalAtRisk: atRiskStudents.length,
        highRisk: atRiskStudents.filter(s => s.overallRiskScore > 70).length,
        mediumRisk: atRiskStudents.filter(s => s.overallRiskScore >= 50 && s.overallRiskScore <= 70).length,
        lowRisk: atRiskStudents.filter(s => s.overallRiskScore < 50).length
      }
    };
  },

  /**
   * Generate comparative analysis report
   */
  async generateComparativeReport(filters: any) {
    const { schoolId } = filters;

    const comparativeData = await comparativeAnalyticsService.getComparativeAnalytics(schoolId);

    return comparativeData;
  },

  /**
   * Calculate record count for report metadata
   */
  calculateRecordCount(data: any): number {
    if (!data) return 0;

    if (Array.isArray(data)) {
      return data.length;
    }

    if (data.data) {
      if (Array.isArray(data.data)) {
        return data.data.length;
      }
      if (data.data.students) {
        return data.data.students.length;
      }
      if (data.data.teachers) {
        return data.data.teachers.length;
      }
      if (data.data.grades) {
        return data.data.grades.length;
      }
      if (data.data.atRiskStudents) {
        return data.data.atRiskStudents.length;
      }
    }

    return 1;
  },

  /**
   * Save report to database
   */
  async saveReport(report: GeneratedReport) {
    try {
      const { error } = await supabase
        .from('generated_reports')
        .insert({
          id: report.id,
          type: report.type,
          format: report.format,
          generated_at: report.generatedAt,
          generated_by: report.generatedBy,
          data: report.data,
          metadata: report.metadata
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving report:', error);
    }
  },

  /**
   * Get saved reports
   */
  async getReports(schoolId: string, type?: string) {
    try {
      let query = supabase
        .from('generated_reports')
        .select('*')
        .eq('school_id', schoolId)
        .order('generated_at', { ascending: false });

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching reports:', error);
      return [];
    }
  },

  /**
   * Delete a report
   */
  async deleteReport(reportId: string) {
    try {
      const { error } = await supabase
        .from('generated_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting report:', error);
      return false;
    }
  },

  /**
   * Export report data to CSV
   */
  exportToCSV(data: any, filename: string): string {
    let csv = '';

    if (Array.isArray(data)) {
      if (data.length === 0) return csv;

      // Get headers from first object
      const headers = Object.keys(data[0]);
      csv += headers.join(',') + '\n';

      // Add data rows
      data.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value).replace(/,/g, ';');
        });
        csv += values.join(',') + '\n';
      });
    } else if (data.data && Array.isArray(data.data)) {
      return this.exportToCSV(data.data, filename);
    }

    return csv;
  },

  /**
   * Export report data to JSON
   */
  exportToJSON(data: any): string {
    return JSON.stringify(data, null, 2);
  },

  /**
   * Get report templates
   */
  async getReportTemplates(): Promise<ReportTemplate[]> {
    return [
      {
        id: 'perf-grade',
        name: 'Grade Performance Report',
        description: 'Comprehensive performance analysis for a specific grade',
        type: 'performance',
        defaultFilters: {
          scope: 'grade'
        },
        sections: [
          {
            id: 'summary',
            title: 'Performance Summary',
            type: 'summary',
            dataSource: 'overallAverage',
            config: {}
          },
          {
            id: 'subject-perf',
            title: 'Subject Performance',
            type: 'table',
            dataSource: 'subjectPerformance',
            config: {}
          },
          {
            id: 'rankings',
            title: 'Student Rankings',
            type: 'table',
            dataSource: 'topStudents',
            config: {}
          },
          {
            id: 'trends',
            title: 'Performance Trends',
            type: 'chart',
            dataSource: 'trends',
            config: { chartType: 'line' }
          }
        ]
      },
      {
        id: 'att-school',
        name: 'School Attendance Report',
        description: 'Attendance analysis for the entire school',
        type: 'attendance',
        defaultFilters: {
          scope: 'school'
        },
        sections: [
          {
            id: 'summary',
            title: 'Attendance Summary',
            type: 'summary',
            dataSource: 'overallAttendanceRate',
            config: {}
          },
          {
            id: 'grade-att',
            title: 'Attendance by Grade',
            type: 'table',
            dataSource: 'gradeAttendance',
            config: {}
          },
          {
            id: 'chronic',
            title: 'Chronic Absentees',
            type: 'table',
            dataSource: 'chronicAbsentees',
            config: {}
          },
          {
            id: 'trends',
            title: 'Daily Attendance Trends',
            type: 'chart',
            dataSource: 'dailyTrends',
            config: { chartType: 'line' }
          }
        ]
      },
      {
        id: 'fin-school',
        name: 'School Financial Report',
        description: 'Fee collection and financial analysis',
        type: 'financial',
        defaultFilters: {
          scope: 'school'
        },
        sections: [
          {
            id: 'summary',
            title: 'Financial Summary',
            type: 'summary',
            dataSource: 'collectionRate',
            config: {}
          },
          {
            id: 'grade-fin',
            title: 'Financials by Grade',
            type: 'table',
            dataSource: 'gradeFinancials',
            config: {}
          },
          {
            id: 'overdue',
            title: 'Overdue Payments',
            type: 'table',
            dataSource: 'overduePayments',
            config: {}
          },
          {
            id: 'trends',
            title: 'Payment Trends',
            type: 'chart',
            dataSource: 'paymentTrends',
            config: { chartType: 'bar' }
          }
        ]
      },
      {
        id: 'risk-students',
        name: 'At-Risk Students Report',
        description: 'Students requiring intervention based on attendance and performance',
        type: 'risk',
        defaultFilters: {
          scope: 'school'
        },
        sections: [
          {
            id: 'summary',
            title: 'Risk Summary',
            type: 'summary',
            dataSource: 'summary',
            config: {}
          },
          {
            id: 'students',
            title: 'At-Risk Students',
            type: 'table',
            dataSource: 'atRiskStudents',
            config: {}
          }
        ]
      },
      {
        id: 'comp-year',
        name: 'Year-over-Year Comparison',
        description: 'Compare current year performance with previous years',
        type: 'comparative',
        defaultFilters: {
          scope: 'school'
        },
        sections: [
          {
            id: 'trends',
            title: 'Performance Trends',
            type: 'chart',
            dataSource: 'trends',
            config: { chartType: 'bar' }
          },
          {
            id: 'benchmark',
            title: 'Benchmark Comparison',
            type: 'table',
            dataSource: 'benchmarkComparison',
            config: {}
          }
        ]
      }
    ];
  },

  /**
   * Schedule recurring report generation
   */
  async scheduleReport(config: ReportConfig, schedule: 'daily' | 'weekly' | 'monthly', userId: string) {
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .insert({
          id: crypto.randomUUID(),
          config,
          schedule,
          created_by: userId,
          next_run: this.calculateNextRunDate(schedule)
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error scheduling report:', error);
      return false;
    }
  },

  /**
   * Calculate next run date for scheduled reports
   */
  calculateNextRunDate(schedule: 'daily' | 'weekly' | 'monthly'): string {
    const now = new Date();
    
    switch (schedule) {
      case 'daily':
        now.setDate(now.getDate() + 1);
        now.setHours(6, 0, 0, 0); // 6 AM
        break;
      case 'weekly':
        now.setDate(now.getDate() + 7);
        now.setHours(6, 0, 0, 0); // 6 AM
        break;
      case 'monthly':
        now.setMonth(now.getMonth() + 1);
        now.setDate(1);
        now.setHours(6, 0, 0, 0); // 6 AM on 1st of month
        break;
    }
    
    return now.toISOString();
  }
};
