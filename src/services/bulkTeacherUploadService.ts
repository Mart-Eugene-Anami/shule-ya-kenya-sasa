import { supabase } from "@/integrations/supabase/client";
import { BulkUploadResult } from "@/types";
import { withRetry } from "@/utils/retry";

const CHUNK_SIZE = 50;

interface ParsedTeacher {
  name: string;
  email: string;
  subject: string;
  subjectsTaught: string[];
  isStreamTeacher: boolean;
  qualification: string | null;
  employmentType: string | null;
  hireDate: string | null;
  rowNumber: number;
}

interface ChunkedUploadCallbacks {
  onParsingStart: () => void;
  onParsingComplete: (totalRows: number) => void;
  onChunkComplete: (processedRows: number, successful: number, failed: number) => void;
  onComplete: (result: BulkUploadResult) => void;
  onError: (error: string) => void;
  onCancelled?: (result: BulkUploadResult) => void;
  isCancelled?: () => boolean;
}

// Helper function to parse various date formats into YYYY-MM-DD
const parseFlexibleDate = (dateStr: string): string | null => {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const trimmed = dateStr.trim();
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) return trimmed;
    return null;
  }
  
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    const paddedMonth = month.padStart(2, '0');
    const paddedDay = day.padStart(2, '0');
    const formatted = `${year}-${paddedMonth}-${paddedDay}`;
    const date = new Date(formatted);
    if (!isNaN(date.getTime())) return formatted;
    return null;
  }
  
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return null;
};

export const parseAndValidateTeacherCSV = async (
  file: File,
  schoolId: string
): Promise<{ teachers: ParsedTeacher[]; errors: BulkUploadResult['errors'] }> => {
  const text = await file.text();
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  const rawHeaders = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  const headerMappings: Record<string, string[]> = {
    'name': ['name', 'teacher name', 'teacher_name', 'full name', 'full_name'],
    'email': ['email', 'email address', 'email_address', 'e-mail'],
    'subject': ['subject', 'main subject', 'main_subject', 'primary subject', 'primary_subject'],
    'subjects_taught': ['subjects_taught', 'subjects taught', 'other subjects', 'other_subjects', 'additional subjects'],
    'is_stream_teacher': ['is_stream_teacher', 'is stream teacher', 'stream teacher', 'stream_teacher', 'class teacher', 'class_teacher'],
    'qualification': ['qualification', 'qualifications', 'degree', 'education'],
    'employment_type': ['employment_type', 'employment type', 'type', 'contract type', 'contract_type'],
    'hire_date': ['hire_date', 'hire date', 'date hired', 'date_hired', 'start date', 'start_date', 'joining date', 'joining_date'],
  };
  
  const headerMap: Record<number, string> = {};
  rawHeaders.forEach((rawHeader, idx) => {
    for (const [fieldName, possibleNames] of Object.entries(headerMappings)) {
      if (possibleNames.includes(rawHeader)) {
        headerMap[idx] = fieldName;
        break;
      }
    }
  });
  
  const mappedFields = Object.values(headerMap);
  const hasName = mappedFields.includes('name');
  
  if (!hasName) {
    throw new Error(`Missing required column: name`);
  }

  const parsedTeachers: ParsedTeacher[] = [];
  const errors: BulkUploadResult['errors'] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const rowData: Record<string, string> = {};
    
    Object.entries(headerMap).forEach(([idx, fieldName]) => {
      rowData[fieldName] = values[parseInt(idx)] || '';
    });

    const name = rowData['name'];
    const email = rowData['email'];
    const subject = rowData['subject'];
    const subjectsTaughtStr = rowData['subjects_taught'] || '';
    const isStreamTeacherStr = rowData['is_stream_teacher']?.toLowerCase() || '';
    const qualification = rowData['qualification'] || null;
    const employmentType = rowData['employment_type'] || null;
    const hireDateStr = rowData['hire_date'] || '';

    if (!name) {
      errors.push({
        row: i + 1,
        reason: 'Missing required field: name',
        data: { name, email },
      });
      continue;
    }

    // Validate email format only if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push({
          row: i + 1,
          reason: 'Invalid email format',
          data: { name, email },
        });
        continue;
      }
    }

    // Parse subjects taught (comma or semicolon separated within quotes, or pipe separated)
    const subjectsTaught: string[] = subjectsTaughtStr
      ? subjectsTaughtStr.split(/[;|]/).map(s => s.trim()).filter(s => s)
      : [];

    // Parse is_stream_teacher
    const isStreamTeacher = ['true', 'yes', '1', 'stream teacher', 'class teacher'].includes(isStreamTeacherStr);

    // Parse hire date
    let hireDate: string | null = null;
    if (hireDateStr) {
      hireDate = parseFlexibleDate(hireDateStr);
      if (!hireDate) {
        errors.push({
          row: i + 1,
          reason: 'Invalid hire_date format',
          data: { name, email },
        });
        continue;
      }
    }

    parsedTeachers.push({
      name,
      email,
      subject,
      subjectsTaught,
      isStreamTeacher,
      qualification,
      employmentType,
      hireDate,
      rowNumber: i + 1,
    });
  }

  return { teachers: parsedTeachers, errors };
};

export const chunkedTeacherBulkUpload = async (
  file: File,
  schoolId: string,
  callbacks: ChunkedUploadCallbacks
): Promise<void> => {
  try {
    callbacks.onParsingStart();
    
    const { teachers, errors: parseErrors } = await parseAndValidateTeacherCSV(file, schoolId);
    
    const totalRows = teachers.length + parseErrors.length;
    callbacks.onParsingComplete(totalRows);

    const result: BulkUploadResult = {
      successful: 0,
      failed: parseErrors.length,
      errors: [...parseErrors],
    };

    let processedRows = parseErrors.length;

    // Process in chunks using batch inserts for better performance
    for (let i = 0; i < teachers.length; i += CHUNK_SIZE) {
      // Check for cancellation before processing each chunk
      if (callbacks.isCancelled?.()) {
        callbacks.onCancelled?.(result);
        return;
      }

      const chunk = teachers.slice(i, i + CHUNK_SIZE);
      
      // Prepare batch insert data
      const insertData = chunk.map(teacher => {
        const data: Record<string, any> = {
          name: teacher.name,
          school_id: schoolId,
          status: 'active',
          is_stream_teacher: teacher.isStreamTeacher,
        };
        if (teacher.email) data.email = teacher.email;
        if (teacher.subject) data.subject = teacher.subject;
        if (teacher.subjectsTaught.length > 0) data.subjects_taught = teacher.subjectsTaught;
        if (teacher.qualification) data.qualification = teacher.qualification;
        if (teacher.employmentType) data.employment_type = teacher.employmentType;
        if (teacher.hireDate) data.hire_date = teacher.hireDate;
        return data;
      });

      // Batch insert for performance with retry logic
      const insertError = await withRetry(
        async () => {
          const result = await supabase.from('teachers').insert(insertData as any);
          return result.error;
        },
        { maxAttempts: 3, initialDelayMs: 500 }
      );

      if (insertError) {
        // If batch insert fails, fall back to individual inserts with error tracking
        for (const teacher of chunk) {
          const singleData: Record<string, any> = {
            name: teacher.name,
            school_id: schoolId,
            status: 'active',
            is_stream_teacher: teacher.isStreamTeacher,
          };
          if (teacher.email) singleData.email = teacher.email;
          if (teacher.subject) singleData.subject = teacher.subject;
          if (teacher.subjectsTaught.length > 0) singleData.subjects_taught = teacher.subjectsTaught;
          if (teacher.qualification) singleData.qualification = teacher.qualification;
          if (teacher.employmentType) singleData.employment_type = teacher.employmentType;
          if (teacher.hireDate) singleData.hire_date = teacher.hireDate;

          const { error: singleError } = await supabase
            .from('teachers')
            .insert(singleData as any);

          if (singleError) {
            result.failed++;
            result.errors.push({
              row: teacher.rowNumber,
              reason: singleError.message.includes('duplicate') 
                ? 'Duplicate email address' 
                : singleError.message,
              data: { name: teacher.name, email: teacher.email },
            });
          } else {
            result.successful++;
          }
          processedRows++;
        }
      } else {
        // Batch insert succeeded
        result.successful += chunk.length;
        processedRows += chunk.length;
      }

      // Report progress after each chunk
      callbacks.onChunkComplete(processedRows, result.successful, result.failed);
      
      // Small delay between chunks to prevent overwhelming the database
      if (i + CHUNK_SIZE < teachers.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    callbacks.onComplete(result);
  } catch (error) {
    callbacks.onError(error instanceof Error ? error.message : 'An error occurred');
  }
};
