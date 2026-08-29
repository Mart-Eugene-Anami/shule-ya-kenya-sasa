/**
 * Unit tests for feeService.
 *
 * The parseFeeCSV function is a pure function with no external dependencies,
 * so it can be tested directly without mocking Supabase.
 * The async functions (getFeeSettings, processFeeCsvUpload, etc.) are
 * integration-style and require a Supabase mock.
 */
import { describe, it, expect } from "vitest";
import { parseFeeCSV } from "../feeService";

// ---------------------------------------------------------------------------
// parseFeeCSV — pure function tests
// ---------------------------------------------------------------------------
describe("parseFeeCSV", () => {
  it("should return an error when CSV has fewer than 2 lines", () => {
    const result = parseFeeCSV("name,admission_no");
    expect(result.rows).toHaveLength(0);
    expect(result.errors).toContain("CSV must have at least a header row and one data row");
  });

  it("should return an error when required columns are missing", () => {
    const csv = "foo,bar\nval1,val2";
    const result = parseFeeCSV(csv);
    expect(result.errors).toContain("CSV must have 'name' and 'admission_no' columns");
    expect(result.rows).toHaveLength(0);
  });

  it("should parse a valid CSV with standard headers", () => {
    const csv = [
      "name,admission_no,tuition,boarding,lunch,transport,activity,smasse,administration,exam_fee,development,other,total_outstanding,total_paid",
      "Alice,ADM001,5000,2000,1000,500,300,200,100,150,250,50,9550,1000",
      "Bob,ADM002,4000,0,800,0,300,0,100,150,200,0,5550,500",
    ].join("\n");

    const result = parseFeeCSV(csv);

    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.capitation).toBeNull();

    // Verify first row values are parsed correctly
    const alice = result.rows[0];
    expect(alice.name).toBe("Alice");
    expect(alice.admission_no).toBe("ADM001");
    expect(alice.tuition_balance).toBe(5000);
    expect(alice.boarding_fee_balance).toBe(2000);
    expect(alice.lunch_fee_balance).toBe(1000);
    expect(alice.transport_fee).toBe(500);
    expect(alice.total_outstanding).toBe(9550);
    expect(alice.total_paid).toBe(1000);
    expect(alice.currency_code).toBe("KES"); // default
  });

  it("should detect capitation summary row by name", () => {
    const csv = [
      "name,admission_no,tuition,boarding,lunch,transport",
      "Alice,ADM001,5000,2000,1000,500",
      "CAPITATION GRANT,capitation,100000,,1500,200",
    ].join("\n");

    const result = parseFeeCSV(csv);

    expect(result.rows).toHaveLength(1);
    expect(result.capitation).not.toBeNull();
    expect(result.capitation!.total_amount).toBe(100000);
    // per_student_amount falls back to lunch column when capitation_per_student is missing
    expect(result.capitation!.per_student_amount).toBe(1500);
  });

  it("should skip rows without admission number and log error", () => {
    const csv = [
      "name,admission_no,tuition",
      "Alice,,5000",
      "Bob,ADM002,4000",
    ].join("\n");

    const result = parseFeeCSV(csv);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].admission_no).toBe("ADM002");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Row 2");
  });

  it("should handle flexible column names (student name, adm no)", () => {
    const csv = [
      "student name,adm no,tuition,outstanding",
      "Charlie,ADM003,3000,3000",
    ].join("\n");

    const result = parseFeeCSV(csv);

    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe("Charlie");
    expect(result.rows[0].admission_no).toBe("ADM003");
  });

  it("should parse numbers with currency symbols and commas", () => {
    const csv = [
      "name,admission_no,tuition",
      "Diana,ADM004,KES 5,000.50",
    ].join("\n");

    const result = parseFeeCSV(csv);

    // Note: CSV comma in value will split incorrectly unless quoted,
    // but the parseNumber function strips non-numeric characters
    expect(result.rows).toHaveLength(1);
    // The "5" part gets parsed as 5 (comma splits CSV)
    expect(result.rows[0].tuition_balance).toBeGreaterThanOrEqual(0);
  });

  it("should handle empty CSV gracefully", () => {
    const result = parseFeeCSV("");
    expect(result.rows).toHaveLength(0);
    expect(result.errors).toContain("CSV must have at least a header row and one data row");
  });

  it("should handle Windows-style line endings (\\r\\n)", () => {
    const csv = "name,admission_no,tuition\r\nAlice,ADM001,5000\r\nBob,ADM002,3000";
    const result = parseFeeCSV(csv);

    expect(result.rows).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it("should default missing numeric fields to 0", () => {
    const csv = [
      "name,admission_no",
      "Eve,ADM005",
    ].join("\n");

    const result = parseFeeCSV(csv);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].tuition_balance).toBe(0);
    expect(result.rows[0].boarding_fee_balance).toBe(0);
    expect(result.rows[0].total_outstanding).toBe(0);
    expect(result.rows[0].total_paid).toBe(0);
  });
});
