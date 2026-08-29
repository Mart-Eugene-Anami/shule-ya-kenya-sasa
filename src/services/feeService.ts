/**
 * Fee Management Service
 *
 * Handles all fee-related operations including:
 * - Fee settings (enable/disable, boarding school flag, report card visibility)
 * - Student fee records (per-student balances across vote heads)
 * - Capitation grant tracking (government per-student allocations)
 * - CSV upload & parsing (bulk fee data import with flexible column matching)
 *
 * The CSV parser supports multiple column name variants to accommodate
 * different school accounting systems (e.g., "admission_no", "adm no", "adm").
 */
import { supabase } from "@/integrations/supabase/client";

export interface FeeSettings {
  id: string;
  school_id: string;
  is_enabled: boolean;
  show_on_report_card: boolean;
  is_boarding_school: boolean;
  currency_code: string;
}

export interface StudentFeeRecord {
  id: string;
  student_id: string;
  school_id: string;
  term_id: string | null;
  upload_id: string | null;
  tuition_balance: number;
  boarding_fee_balance: number;
  lunch_fee_balance: number;
  transport_fee: number;
  activity_fee: number;
  smasse_fee: number;
  administration_fee: number;
  exam_fee: number;
  development_fund: number;
  other_charges: number;
  total_outstanding: number;
  total_paid: number;
  last_payment_date: string | null;
  payment_reference: string | null;
  currency_code: string;
  created_at: string;
  updated_at: string;
}

export interface CapitationRecord {
  id: string;
  school_id: string;
  term_id: string | null;
  total_amount: number;
  per_student_amount: number;
  student_count: number;
}

export interface FeeUpload {
  id: string;
  school_id: string;
  term_id: string | null;
  file_name: string;
  records_processed: number;
  records_matched: number;
  records_failed: number;
  uploaded_by: string;
  uploaded_at: string;
  status: string;
  error_log: any[];
}

export interface ParsedFeeRow {
  name: string;
  admission_no: string;
  tuition_balance: number;
  boarding_fee_balance: number;
  lunch_fee_balance: number;
  transport_fee: number;
  activity_fee: number;
  smasse_fee: number;
  administration_fee: number;
  exam_fee: number;
  development_fund: number;
  other_charges: number;
  total_outstanding: number;
  total_paid: number;
  last_payment_date: string | null;
  payment_reference: string | null;
  currency_code: string;
}

export interface ParsedCapitation {
  total_amount: number;
  per_student_amount: number;
  student_count: number;
}

export async function getFeeSettings(schoolId: string): Promise<FeeSettings | null> {
  const { data } = await supabase
    .from("fee_settings")
    .select("*")
    .eq("school_id", schoolId)
    .single();
  return data as FeeSettings | null;
}

export async function upsertFeeSettings(settings: Partial<FeeSettings> & { school_id: string }) {
  const { data, error } = await supabase
    .from("fee_settings")
    .upsert(settings, { onConflict: "school_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getStudentFees(studentId: string, termId?: string): Promise<StudentFeeRecord | null> {
  let query = supabase
    .from("student_fees")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1);
  
  if (termId) query = query.eq("term_id", termId);
  
  const { data } = await query;
  return (data && data.length > 0 ? data[0] : null) as StudentFeeRecord | null;
}

export async function getSchoolFees(schoolId: string, termId?: string) {
  let query = supabase
    .from("student_fees")
    .select("*, students!inner(name, admission_no, grade_id, stream_id)")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  
  if (termId) query = query.eq("term_id", termId);
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getCapitationRecords(schoolId: string, termId?: string) {
  let query = supabase
    .from("capitation_records")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  
  if (termId) query = query.eq("term_id", termId);
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getFeeUploads(schoolId: string) {
  const { data, error } = await supabase
    .from("fee_uploads")
    .select("*")
    .eq("school_id", schoolId)
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

function parseNumber(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.\-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function findColumn(headers: string[], ...candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.findIndex(h => h.toLowerCase().includes(candidate.toLowerCase()));
    if (idx >= 0) return idx;
  }
  return -1;
}

export function parseFeeCSV(csvText: string): { rows: ParsedFeeRow[]; capitation: ParsedCapitation | null; errors: string[] } {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  const errors: string[] = [];
  const rows: ParsedFeeRow[] = [];
  let capitation: ParsedCapitation | null = null;

  if (lines.length < 2) {
    errors.push("CSV must have at least a header row and one data row");
    return { rows, capitation, errors };
  }

  const headers = lines[0].split(",").map(h => h.trim());
  
  const nameIdx = findColumn(headers, "name", "student_name", "student name");
  const admIdx = findColumn(headers, "admission_no", "admission number", "adm_no", "adm no");
  const tuitionIdx = findColumn(headers, "tuition");
  const boardingIdx = findColumn(headers, "boarding");
  const lunchIdx = findColumn(headers, "lunch");
  const transportIdx = findColumn(headers, "transport");
  const activityIdx = findColumn(headers, "activity");
  const smasseIdx = findColumn(headers, "smasse");
  const adminIdx = findColumn(headers, "administration", "admin_fee");
  const examIdx = findColumn(headers, "exam_fee", "exam fee");
  const devIdx = findColumn(headers, "development", "dev_fund");
  const otherIdx = findColumn(headers, "other");
  const totalOutIdx = findColumn(headers, "total_outstanding", "outstanding", "total outstanding");
  const totalPaidIdx = findColumn(headers, "total_paid", "total paid", "amount_paid");
  const lastPayIdx = findColumn(headers, "last_payment", "payment_date", "last payment");
  const refIdx = findColumn(headers, "reference", "mpesa", "bank_ref");
  const currencyIdx = findColumn(headers, "currency");
  const capitationTotalIdx = findColumn(headers, "capitation_total", "capitation total");
  const capitationPerIdx = findColumn(headers, "capitation_per_student", "capitation per student");
  const capitationCountIdx = findColumn(headers, "capitation_student_count", "student_count");

  if (nameIdx < 0 || admIdx < 0) {
    errors.push("CSV must have 'name' and 'admission_no' columns");
    return { rows, capitation, errors };
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim());
    if (!cols[admIdx] && !cols[nameIdx]) continue;

    // Check if this is a capitation summary row
    if (cols[nameIdx]?.toLowerCase().includes("capitation") || cols[admIdx]?.toLowerCase() === "capitation") {
      capitation = {
        total_amount: parseNumber(cols[capitationTotalIdx] ?? cols[tuitionIdx]),
        per_student_amount: parseNumber(cols[capitationPerIdx] ?? cols[lunchIdx]),
        student_count: parseInt(cols[capitationCountIdx] ?? cols[transportIdx] ?? "0") || 0,
      };
      continue;
    }

    if (!cols[admIdx]) {
      errors.push(`Row ${i + 1}: Missing admission number`);
      continue;
    }

    rows.push({
      name: cols[nameIdx] || "",
      admission_no: cols[admIdx] || "",
      tuition_balance: parseNumber(cols[tuitionIdx]),
      boarding_fee_balance: parseNumber(cols[boardingIdx]),
      lunch_fee_balance: parseNumber(cols[lunchIdx]),
      transport_fee: parseNumber(cols[transportIdx]),
      activity_fee: parseNumber(cols[activityIdx]),
      smasse_fee: parseNumber(cols[smasseIdx]),
      administration_fee: parseNumber(cols[adminIdx]),
      exam_fee: parseNumber(cols[examIdx]),
      development_fund: parseNumber(cols[devIdx]),
      other_charges: parseNumber(cols[otherIdx]),
      total_outstanding: parseNumber(cols[totalOutIdx]),
      total_paid: parseNumber(cols[totalPaidIdx]),
      last_payment_date: cols[lastPayIdx] || null,
      payment_reference: cols[refIdx] || null,
      currency_code: cols[currencyIdx] || "KES",
    });
  }

  return { rows, capitation, errors };
}

export async function processFeeCsvUpload(
  schoolId: string,
  termId: string | null,
  fileName: string,
  uploadedBy: string,
  parsedRows: ParsedFeeRow[],
  capitation: ParsedCapitation | null
) {
  // Create upload record
  const { data: upload, error: uploadErr } = await supabase
    .from("fee_uploads")
    .insert({
      school_id: schoolId,
      term_id: termId,
      file_name: fileName,
      records_processed: parsedRows.length,
      uploaded_by: uploadedBy,
      status: "processing",
    })
    .select()
    .single();

  if (uploadErr) throw uploadErr;

  const uploadId = upload.id;
  let matched = 0;
  let failed = 0;
  const errorLog: any[] = [];

  // Get all students for this school
  const { data: students } = await supabase
    .from("students")
    .select("id, name, admission_no")
    .eq("school_id", schoolId);

  const studentMap = new Map<string, string>();
  (students || []).forEach(s => {
    studentMap.set(s.admission_no.toLowerCase().trim(), s.id);
  });

  // Process each row
  for (const row of parsedRows) {
    const studentId = studentMap.get(row.admission_no.toLowerCase().trim());
    if (!studentId) {
      failed++;
      errorLog.push({ admission_no: row.admission_no, name: row.name, error: "Student not found" });
      continue;
    }

    const { error: upsertErr } = await supabase
      .from("student_fees")
      .upsert({
        student_id: studentId,
        school_id: schoolId,
        term_id: termId,
        upload_id: uploadId,
        tuition_balance: row.tuition_balance,
        boarding_fee_balance: row.boarding_fee_balance,
        lunch_fee_balance: row.lunch_fee_balance,
        transport_fee: row.transport_fee,
        activity_fee: row.activity_fee,
        smasse_fee: row.smasse_fee,
        administration_fee: row.administration_fee,
        exam_fee: row.exam_fee,
        development_fund: row.development_fund,
        other_charges: row.other_charges,
        total_outstanding: row.total_outstanding,
        total_paid: row.total_paid,
        last_payment_date: row.last_payment_date,
        payment_reference: row.payment_reference,
        currency_code: row.currency_code,
      }, { onConflict: "student_id,term_id" })
      .select();

    // If upsert with onConflict fails (no unique constraint), fall back to insert
    if (upsertErr) {
      // Try a simple insert instead
      const { error: insertErr } = await supabase
        .from("student_fees")
        .insert({
          student_id: studentId,
          school_id: schoolId,
          term_id: termId,
          upload_id: uploadId,
          tuition_balance: row.tuition_balance,
          boarding_fee_balance: row.boarding_fee_balance,
          lunch_fee_balance: row.lunch_fee_balance,
          transport_fee: row.transport_fee,
          activity_fee: row.activity_fee,
          smasse_fee: row.smasse_fee,
          administration_fee: row.administration_fee,
          exam_fee: row.exam_fee,
          development_fund: row.development_fund,
          other_charges: row.other_charges,
          total_outstanding: row.total_outstanding,
          total_paid: row.total_paid,
          last_payment_date: row.last_payment_date,
          payment_reference: row.payment_reference,
          currency_code: row.currency_code,
        });

      if (insertErr) {
        failed++;
        errorLog.push({ admission_no: row.admission_no, error: insertErr.message });
        continue;
      }
    }

    matched++;
  }

  // Save capitation if present
  if (capitation) {
    await supabase.from("capitation_records").insert({
      school_id: schoolId,
      term_id: termId,
      total_amount: capitation.total_amount,
      per_student_amount: capitation.per_student_amount,
      student_count: capitation.student_count,
      upload_id: uploadId,
    });
  }

  // Update upload record
  await supabase
    .from("fee_uploads")
    .update({
      records_matched: matched,
      records_failed: failed,
      status: "completed",
      error_log: errorLog,
    })
    .eq("id", uploadId);

  return { matched, failed, errorLog, uploadId };
}
