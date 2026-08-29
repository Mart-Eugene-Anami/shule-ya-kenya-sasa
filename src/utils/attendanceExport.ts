import { format } from "date-fns";
import { downloadHtmlAsPdf, htmlToPdfBlob } from "@/utils/pdfGenerator";
import { escapeHtml as e } from "@/utils/escapeHtml";

interface AttendanceRow {
  admissionNo: string;
  studentName: string;
  status: string;
}

export interface DailyAttendanceData {
  schoolName?: string;
  gradeName: string;
  streamName: string;
  date: string;
  records: AttendanceRow[];
  summary: { present: number; absent: number; late: number; total: number };
  recordedBy?: string;
}

export interface PeriodAttendanceData {
  schoolName?: string;
  gradeName: string;
  streamName: string;
  startDate: string;
  endDate: string;
  students: {
    admissionNo: string;
    studentName: string;
    dailyStatuses: { date: string; status: string }[];
    presentCount: number;
    absentCount: number;
    lateCount: number;
    attendanceRate: number;
  }[];
  dates: string[];
}

function generateDailyHTML(data: DailyAttendanceData): string {
  const { present, absent, late, total } = data.summary;

  const rows = data.records
    .map(
      (r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${e(r.admissionNo)}</td>
      <td>${e(r.studentName)}</td>
      <td class="status-${e(r.status.toLowerCase())}">${e(r.status)}</td>
    </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1a1a1a; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 16px; }
    .header h1 { font-size: 18px; margin-bottom: 4px; }
    .header h2 { font-size: 14px; font-weight: normal; color: #555; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 13px; }
    .summary { display: flex; gap: 16px; margin-bottom: 16px; font-size: 13px; }
    .summary span { padding: 4px 10px; border-radius: 4px; font-weight: 600; }
    .summary .present { background: #dcfce7; color: #166534; }
    .summary .absent { background: #fee2e2; color: #991b1b; }
    .summary .late { background: #fef3c7; color: #92400e; }
    .summary .total { background: #f3f4f6; color: #374151; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f8f9fa; text-align: left; padding: 8px 10px; border: 1px solid #ddd; font-weight: 600; }
    td { padding: 6px 10px; border: 1px solid #ddd; }
    tr:nth-child(even) { background: #fafafa; }
    .status-present { color: #166534; font-weight: 600; }
    .status-absent { color: #991b1b; font-weight: 600; }
    .status-late { color: #92400e; font-weight: 600; }
    .footer { margin-top: 24px; font-size: 11px; color: #888; text-align: center; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    ${data.schoolName ? `<h1>${e(data.schoolName)}</h1>` : ""}
    <h2>Daily Attendance Register</h2>
  </div>
  <div class="meta">
    <div><strong>Class:</strong> ${e(data.gradeName)} - ${e(data.streamName)}</div>
    <div><strong>Date:</strong> ${e(data.date)}</div>
  </div>
  <div class="summary">
    <span class="total">Total: ${total}</span>
    <span class="present">Present: ${present}</span>
    <span class="absent">Absent: ${absent}</span>
    ${late > 0 ? `<span class="late">Late: ${late}</span>` : ""}
  </div>
  <table>
    <thead>
      <tr><th>#</th><th>Adm No</th><th>Student Name</th><th>Status</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  ${data.recordedBy ? `<div class="footer">Recorded by: ${e(data.recordedBy)}</div>` : ""}
  <div class="footer">Generated on ${format(new Date(), "PPpp")}</div>
</body>
</html>`;
}

function generatePeriodHTML(data: PeriodAttendanceData): string {
  const dateHeaders = data.dates
    .map((d) => `<th class="date-col">${e(format(new Date(d), "dd/MM"))}</th>`)
    .join("");

  const rows = data.students
    .map(
      (s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${e(s.admissionNo)}</td>
      <td>${e(s.studentName)}</td>
      ${s.dailyStatuses
        .map(
          (ds) =>
            `<td class="date-col status-${e(ds.status.toLowerCase())}">${ds.status === "Present" ? "P" : ds.status === "Absent" ? "A" : ds.status === "Late" ? "L" : "-"}</td>`
        )
        .join("")}
      <td>${s.presentCount}</td>
      <td>${s.absentCount}</td>
      <td>${s.lateCount}</td>
      <td>${s.attendanceRate}%</td>
    </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1a1a1a; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 16px; }
    .header h1 { font-size: 18px; margin-bottom: 4px; }
    .header h2 { font-size: 14px; font-weight: normal; color: #555; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f8f9fa; text-align: center; padding: 6px 4px; border: 1px solid #ddd; font-weight: 600; }
    td { padding: 4px 6px; border: 1px solid #ddd; text-align: center; }
    td:nth-child(2), td:nth-child(3), th:nth-child(2), th:nth-child(3) { text-align: left; }
    tr:nth-child(even) { background: #fafafa; }
    .date-col { min-width: 32px; }
    .status-present { color: #166534; font-weight: 600; }
    .status-absent { color: #991b1b; font-weight: 600; }
    .status-late { color: #92400e; font-weight: 600; }
    .footer { margin-top: 24px; font-size: 11px; color: #888; text-align: center; }
    @media print { 
      body { padding: 0; font-size: 10px; } 
      .no-print { display: none; }
      @page { size: landscape; margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    ${data.schoolName ? `<h1>${e(data.schoolName)}</h1>` : ""}
    <h2>Attendance Register</h2>
  </div>
  <div class="meta">
    <div><strong>Class:</strong> ${e(data.gradeName)} - ${e(data.streamName)}</div>
    <div><strong>Period:</strong> ${e(data.startDate)} to ${e(data.endDate)}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Adm No</th><th>Student Name</th>
        ${dateHeaders}
        <th>P</th><th>A</th><th>L</th><th>%</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Generated on ${format(new Date(), "PPpp")}</div>
</body>
</html>`;
}

export function printAttendance(html: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}

function downloadPDF(html: string, filename: string, landscape = false) {
  void downloadHtmlAsPdf(html, {
    filename,
    margin: 10,
    orientation: landscape ? "landscape" : "portrait",
    format: "a4",
  });
}

export function generateAndPrintDailyAttendance(data: DailyAttendanceData) {
  const html = generateDailyHTML(data);
  printAttendance(html);
}

export function generateAndDownloadDailyAttendance(data: DailyAttendanceData) {
  const html = generateDailyHTML(data);
  const filename = `attendance_${data.gradeName}_${data.streamName}_${data.date}.pdf`;
  downloadPDF(html, filename);
}

export function generateAndPrintPeriodAttendance(data: PeriodAttendanceData) {
  const html = generatePeriodHTML(data);
  printAttendance(html);
}

export function generateAndDownloadPeriodAttendance(data: PeriodAttendanceData) {
  const html = generatePeriodHTML(data);
  const filename = `attendance_${data.gradeName}_${data.streamName}_${data.startDate}_to_${data.endDate}.pdf`;
  downloadPDF(html, filename, true);
}

// Generate multiple PDFs as a zip for bulk download
export async function generateBulkAttendancePDFs(
  items: PeriodAttendanceData[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (let i = 0; i < items.length; i++) {
    const data = items[i];
    onProgress?.(i + 1, items.length);

    const html = generatePeriodHTML(data);
    try {
      const pdfBlob = await htmlToPdfBlob(html, {
        margin: 10,
        orientation: "landscape",
        format: "a4",
      });
      const filename = `attendance_${data.gradeName}_${data.streamName}_${data.startDate}_to_${data.endDate}.pdf`;
      zip.file(filename, pdfBlob);
    } catch (err) {
      console.error("Bulk PDF gen failed for item", i, err);
    }
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `attendance_bulk_${format(new Date(), "yyyy-MM-dd")}.zip`;
  link.click();
  URL.revokeObjectURL(url);
}
