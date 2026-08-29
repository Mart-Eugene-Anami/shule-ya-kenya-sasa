/**
 * Bulk Mark Upload Service
 * 
 * Processes CSV files with student marks row-by-row for a specific exam and stream.
 * CSV format: admission_number, name, Subject1, Subject2, ...
 * Each row is uploaded individually for speed and granular error tracking.
 */
import { supabase } from "@/integrations/supabase/client";
import { BulkUploadResult } from "@/types";

interface BulkMarkUploadCallbacks {
  onParsingStart: () => void;
  onParsingComplete: (totalRows: number) => void;
  onChunkComplete: (processedRows: number, successful: number, failed: number) => void;
  onComplete: (result: BulkUploadResult) => void;
  onError: (error: string) => void;
  onCancelled?: (result: BulkUploadResult) => void;
  isCancelled?: () => boolean;
}

interface BulkMarkUploadParams {
  examId: string;
  streamId: string;
  subjects: string[];
  recordedBy: string;
}

const parseCsvRows = (csvText: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (char === '"') {
      if (inQuotes && csvText[i + 1] === '"') {
        currentCell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && csvText[i + 1] === "\n") i += 1;
      currentRow.push(currentCell.trim());
      currentCell = "";
      if (currentRow.some((c) => c.length > 0)) rows.push(currentRow);
      currentRow = [];
      continue;
    }
    currentCell += char;
  }
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) rows.push(currentRow);
  }
  return rows;
};

const normalizeHeader = (h: string) =>
  h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const ADMISSION_ALIASES = new Set([
  "admission_number", "admission_no", "adm_no", "adm", "admissionno", "admission_number",
]);
const NAME_ALIASES = new Set([
  "name", "student_name", "student", "full_name", "name_of_student",
]);

export async function chunkedBulkMarkUpload(
  file: File,
  params: BulkMarkUploadParams,
  callbacks: BulkMarkUploadCallbacks,
) {
  const { examId, streamId, subjects, recordedBy } = params;

  try {
    callbacks.onParsingStart();

    // Read file
    const csvText = await file.text();
    const rows = parseCsvRows(csvText);

    if (rows.length < 2) {
      callbacks.onError("CSV file must have a header row and at least one data row.");
      return;
    }

    const headerRow = rows[0];
    const normalizedHeaders = headerRow.map(normalizeHeader);

    // Find admission and name columns
    let admissionIdx = -1;
    let nameIdx = -1;
    const subjectIndexes: { subject: string; index: number }[] = [];

    normalizedHeaders.forEach((h, i) => {
      if (ADMISSION_ALIASES.has(h) && admissionIdx === -1) {
        admissionIdx = i;
      } else if (NAME_ALIASES.has(h) && nameIdx === -1) {
        nameIdx = i;
      }
    });

    if (nameIdx === -1) {
      callbacks.onError("CSV must have a 'Name' or 'Student Name' column.");
      return;
    }

    // Map subject columns - match by normalized name
    const normalizedSubjects = subjects.map((s) => ({
      original: s,
      normalized: normalizeHeader(s),
    }));

    normalizedHeaders.forEach((h, i) => {
      if (i === admissionIdx || i === nameIdx) return;
      const match = normalizedSubjects.find((s) => s.normalized === h);
      if (match) {
        subjectIndexes.push({ subject: match.original, index: i });
      }
    });

    if (subjectIndexes.length === 0) {
      callbacks.onError(
        `No matching subject columns found. Expected columns: ${subjects.join(", ")}`,
      );
      return;
    }

    // Load students for this stream
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, name, admission_no")
      .eq("stream_id", streamId);

    if (studentsError) {
      callbacks.onError(`Failed to load students: ${studentsError.message}`);
      return;
    }

    if (!students || students.length === 0) {
      callbacks.onError("No students found in this stream.");
      return;
    }

    // Build lookup maps
    const studentByAdmission = new Map<string, { id: string; name: string }>();
    const studentByName = new Map<string, { id: string; name: string }>();
    students.forEach((s) => {
      if (s.admission_no) {
        studentByAdmission.set(s.admission_no.trim().toLowerCase(), { id: s.id, name: s.name });
      }
      studentByName.set(s.name.trim().toLowerCase(), { id: s.id, name: s.name });
    });

    const dataRows = rows.slice(1);
    const totalRows = dataRows.length;
    callbacks.onParsingComplete(totalRows);

    let successful = 0;
    let failed = 0;
    const errors: BulkUploadResult["errors"] = [];

    for (let i = 0; i < dataRows.length; i++) {
      // Check cancellation
      if (callbacks.isCancelled?.()) {
        const result: BulkUploadResult = { successful, failed, errors };
        callbacks.onCancelled?.(result);
        return;
      }

      const row = dataRows[i];
      const rowNumber = i + 2; // 1-indexed + header
      const name = row[nameIdx]?.trim() || "";
      const admNo = admissionIdx >= 0 ? row[admissionIdx]?.trim() || "" : "";

      if (!name && !admNo) {
        failed++;
        errors.push({
          row: rowNumber,
          reason: "Missing student name and admission number",
          data: { name, admissionNo: admNo },
        });
        callbacks.onChunkComplete(i + 1, successful, failed);
        continue;
      }

      // Resolve student - try admission number first, then name
      let student: { id: string; name: string } | undefined;
      if (admNo) {
        student = studentByAdmission.get(admNo.toLowerCase());
      }
      if (!student && name) {
        student = studentByName.get(name.toLowerCase());
      }

      if (!student) {
        failed++;
        errors.push({
          row: rowNumber,
          reason: `Student not found in stream: "${name}" (${admNo || "no adm no"})`,
          data: { name, admissionNo: admNo },
        });
        callbacks.onChunkComplete(i + 1, successful, failed);
        continue;
      }

      // Collect marks for this student
      const marksToInsert: Array<{
        exam_id: string;
        student_id: string;
        subject: string;
        score: number;
        out_of: number;
        recorded_by: string;
      }> = [];

      let rowHasError = false;
      for (const { subject, index } of subjectIndexes) {
        const rawValue = row[index]?.trim() || "";
        if (rawValue === "" || rawValue === "-" || rawValue.toLowerCase() === "abs") {
          // Skip absent/empty marks
          continue;
        }

        const score = parseFloat(rawValue);
        if (isNaN(score) || score < 0 || score > 100) {
          failed++;
          errors.push({
            row: rowNumber,
            reason: `Invalid mark "${rawValue}" for subject "${subject}". Must be 0-100.`,
            data: { name: student.name, admissionNo: admNo },
          });
          rowHasError = true;
          break;
        }

        marksToInsert.push({
          exam_id: examId,
          student_id: student.id,
          subject,
          score,
          out_of: 100,
          recorded_by: recordedBy,
        });
      }

      if (rowHasError) {
        callbacks.onChunkComplete(i + 1, successful, failed);
        continue;
      }

      if (marksToInsert.length === 0) {
        // No marks to insert for this student (all empty)
        callbacks.onChunkComplete(i + 1, successful, failed);
        continue;
      }

      // Upsert marks: delete existing for this student/exam/subjects, then insert
      try {
        // Delete existing marks for these subjects
        const subjectsToDelete = marksToInsert.map((m) => m.subject);
        await supabase
          .from("marks")
          .delete()
          .eq("exam_id", examId)
          .eq("student_id", student.id)
          .in("subject", subjectsToDelete);

        // Insert new marks
        const { error: insertError } = await supabase
          .from("marks")
          .insert(marksToInsert);

        if (insertError) {
          failed++;
          errors.push({
            row: rowNumber,
            reason: `Database error: ${insertError.message}`,
            data: { name: student.name, admissionNo: admNo },
          });
        } else {
          successful++;
        }
      } catch (err: any) {
        failed++;
        errors.push({
          row: rowNumber,
          reason: `Unexpected error: ${err?.message || "Unknown"}`,
          data: { name: student.name, admissionNo: admNo },
        });
      }

      callbacks.onChunkComplete(i + 1, successful, failed);
    }

    const result: BulkUploadResult = { successful, failed, errors };
    callbacks.onComplete(result);
  } catch (err: any) {
    callbacks.onError(err?.message || "An unexpected error occurred during upload.");
  }
}

/**
 * Generate a sample CSV for bulk mark upload
 */
export function generateSampleMarksCsv(
  students: Array<{ name: string; admissionNo: string }>,
  subjects: string[],
): string {
  const header = ["Admission Number", "Name", ...subjects].join(",");
  const rows = students.map((s) => {
    const marks = subjects.map(() => "");
    return [s.admissionNo, s.name, ...marks].join(",");
  });
  return [header, ...rows].join("\n");
}
