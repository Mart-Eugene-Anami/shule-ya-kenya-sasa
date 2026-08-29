import { supabase } from "@/integrations/supabase/client";
import { BulkUploadResult } from "@/types";

const CHUNK_SIZE = 20;
const ACCOUNT_TIMEOUT_MS = 20_000;

const VALID_PATHWAYS = new Set(["stem", "arts_sports", "social_sciences"]);

type UploadHeaderField =
  | "admission_number"
  | "name"
  | "date_of_birth"
  | "grade"
  | "stream"
  | "grade_stream"
  | "contact"
  | "pathway"
  | "track"
  | "email";

interface ParsedStudent {
  admissionNo: string;
  name: string;
  dateOfBirth: string | null;
  gradeId: string;
  streamId: string;
  contact: string | null;
  pathway: string | null;
  trackId: string | null;
  rowNumber: number;
  email?: string;
}

interface ChunkedUploadCallbacks {
  onParsingStart: () => void;
  onParsingComplete: (totalRows: number) => void;
  onChunkComplete: (
    processedRows: number,
    successful: number,
    failed: number,
  ) => void;
  onComplete: (result: BulkUploadResult) => void;
  onError: (error: string) => void;
  onCancelled?: (result: BulkUploadResult) => void;
  isCancelled?: () => boolean;
}

interface BulkUploadOptions {
  createAccounts?: boolean;
}

interface ImportReferenceData {
  gradeLookup: Map<string, string>;
  streamsByGrade: Map<string, Map<string, string>>;
  globalStreams: Map<string, string>;
  tracksByPathway: Map<string, Map<string, string>>;
}

const HEADER_ALIASES: Record<UploadHeaderField, string[]> = {
  admission_number: [
    "admission_number",
    "admission number",
    "admissionno",
    "admission no",
    "adm no",
    "adm_no",
    "adm",
  ],
  name: [
    "name",
    "name of student",
    "student name",
    "student_name",
    "full name",
    "full_name",
    "student",
  ],
  date_of_birth: [
    "date_of_birth",
    "date of birth",
    "dob",
    "birth date",
    "birthdate",
    "birth_date",
    "dateofbirth",
  ],
  grade: ["grade", "grade_level", "grade level", "class", "form", "form_level", "level"],
  stream: ["stream", "section", "class_stream", "class stream"],
  grade_stream: [
    "grade_stream",
    "grade-stream",
    "class_section",
    "form_stream",
    "form-stream",
    "grade stream",
    "grade stream combination",
    "gradestream",
    "class section",
    "form stream",
    "grade/stream",
    "class/stream",
  ],
  contact: [
    "contact",
    "contact (guardian phone)",
    "guardian_phone",
    "guardian phone",
    "phone",
    "guardian_contact",
    "parent phone",
    "parent_phone",
    "guardian contact",
    "phone number",
    "tel",
    "mobile",
  ],
  pathway: [
    "pathway",
    "specialization",
    "cbc_pathway",
    "cbc pathway",
    "cbe_pathway",
    "cbe pathway",
    "senior pathway",
  ],
  track: [
    "track",
    "track_name",
    "track name",
    "subject_track",
    "subject track",
    "combination",
  ],
  email: ["email", "student_email", "student email", "email address", "email_address"],
};

const normalizeToken = (value: string) => value.trim().toLowerCase();

const normalizeHeader = (header: string) =>
  header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const toStudentDuplicateKey = ({
  admissionNo,
  name,
  gradeId,
  streamId,
}: {
  admissionNo: string;
  name: string;
  gradeId: string;
  streamId: string;
}) => `${normalizeToken(admissionNo)}|${normalizeName(name)}|${gradeId}|${streamId}`;

const normalizeAliasConfig = () => {
  const normalized = {} as Record<UploadHeaderField, string[]>;

  (Object.keys(HEADER_ALIASES) as UploadHeaderField[]).forEach((field) => {
    normalized[field] = HEADER_ALIASES[field].map(normalizeHeader);
  });

  return normalized;
};

const NORMALIZED_HEADER_ALIASES = normalizeAliasConfig();

const withTimeout = async <T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out. Please retry.`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const parseFlexibleDate = (dateStr: string): string | null => {
  if (!dateStr || dateStr.trim() === "") return null;

  const trimmed = dateStr.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const isoDate = new Date(trimmed);
    return Number.isNaN(isoDate.getTime()) ? null : trimmed;
  }

  const mmddyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyyMatch) {
    const [, month, day, year] = mmddyyyyMatch;
    const formatted = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const parsed = new Date(formatted);
    return Number.isNaN(parsed.getTime()) ? null : formatted;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseCsvRows = (csvText: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];

    if (char === '"') {
      const escapedQuote = inQuotes && csvText[i + 1] === '"';
      if (escapedQuote) {
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
      if (char === "\r" && csvText[i + 1] === "\n") {
        i += 1;
      }

      currentRow.push(currentCell.trim());
      currentCell = "";

      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
};

const mapHeaderIndexes = (headerRow: string[]) => {
  const headerIndexes = new Map<UploadHeaderField, number>();

  headerRow.forEach((rawHeader, index) => {
    const normalized = normalizeHeader(rawHeader);

    (Object.keys(NORMALIZED_HEADER_ALIASES) as UploadHeaderField[]).some((field) => {
      if (!NORMALIZED_HEADER_ALIASES[field].includes(normalized)) return false;
      if (!headerIndexes.has(field)) {
        headerIndexes.set(field, index);
      }
      return true;
    });
  });

  const hasAdmissionNumber = headerIndexes.has("admission_number");
  const hasName = headerIndexes.has("name");
  const hasGradeStream =
    headerIndexes.has("grade_stream") ||
    (headerIndexes.has("grade") && headerIndexes.has("stream"));

  const missingFields: string[] = [];
  if (!hasAdmissionNumber) missingFields.push("admission_number");
  if (!hasName) missingFields.push("name");
  if (!hasGradeStream) {
    missingFields.push("grade_stream (or separate grade and stream columns)");
  }

  if (missingFields.length > 0) {
    throw new Error(`Missing required columns: ${missingFields.join(", ")}`);
  }

  return {
    headerIndexes,
    useSeparateGradeStream: headerIndexes.has("grade") && headerIndexes.has("stream"),
  };
};


const loadReferenceData = async (schoolId: string): Promise<ImportReferenceData> => {
  const [gradesResult, streamsResult, tracksResult] = await Promise.all([
    supabase.from("grades").select("id, name").eq("school_id", schoolId),
    supabase.from("streams").select("id, name, grade_id").eq("school_id", schoolId),
    supabase
      .from("cbc_senior_tracks")
      .select("id, name, pathway")
      .eq("school_id", schoolId)
      .eq("is_active", true),
  ]);

  if (gradesResult.error) {
    throw new Error(`Failed to fetch grades: ${gradesResult.error.message}`);
  }

  if (streamsResult.error) {
    throw new Error(`Failed to fetch streams: ${streamsResult.error.message}`);
  }

  if (tracksResult.error) {
    throw new Error(`Failed to fetch tracks: ${tracksResult.error.message}`);
  }

  const gradeLookup = new Map<string, string>();
  gradesResult.data?.forEach((grade) => {
    const normalizedName = normalizeToken(grade.name);
    gradeLookup.set(normalizedName, grade.id);

    const gradeMatch = grade.name.match(/^grade\s*(\d+)$/i);
    const formMatch = grade.name.match(/^form\s*(\d+)$/i);

    if (gradeMatch) {
      const gradeNumber = gradeMatch[1];
      gradeLookup.set(`grade ${gradeNumber}`, grade.id);
      gradeLookup.set(`grade${gradeNumber}`, grade.id);
    }

    if (formMatch) {
      const formNumber = formMatch[1];
      gradeLookup.set(`form ${formNumber}`, grade.id);
      gradeLookup.set(`form${formNumber}`, grade.id);
    }
  });

  const streamsByGrade = new Map<string, Map<string, string>>();
  const globalStreams = new Map<string, string>();

  streamsResult.data?.forEach((stream) => {
    const normalizedStreamName = normalizeToken(stream.name);

    if (stream.grade_id) {
      if (!streamsByGrade.has(stream.grade_id)) {
        streamsByGrade.set(stream.grade_id, new Map());
      }

      const gradeStreamLookup = streamsByGrade.get(stream.grade_id)!;
      gradeStreamLookup.set(normalizedStreamName, stream.id);

      const stripped = normalizedStreamName.replace(/^\d+\s*/, "").trim();
      if (stripped) gradeStreamLookup.set(stripped, stream.id);
      return;
    }

    globalStreams.set(normalizedStreamName, stream.id);
    const stripped = normalizedStreamName.replace(/^\d+\s*/, "").trim();
    if (stripped) globalStreams.set(stripped, stream.id);
  });

  const tracksByPathway = new Map<string, Map<string, string>>();
  tracksResult.data?.forEach((track) => {
    const pathway = normalizeToken(track.pathway);
    if (!tracksByPathway.has(pathway)) {
      tracksByPathway.set(pathway, new Map());
    }
    tracksByPathway.get(pathway)!.set(normalizeToken(track.name), track.id);
  });

  return {
    gradeLookup,
    streamsByGrade,
    globalStreams,
    tracksByPathway,
  };
};

const resolveGradeAndStream = ({
  rowData,
  useSeparateGradeStream,
  gradeLookup,
  streamsByGrade,
  globalStreams,
}: {
  rowData: Record<UploadHeaderField, string>;
  useSeparateGradeStream: boolean;
  gradeLookup: Map<string, string>;
  streamsByGrade: Map<string, Map<string, string>>;
  globalStreams: Map<string, string>;
}):
  | { gradeId: string; streamId: string }
  | {
      error: string;
    } => {
  let gradeName = "";
  let streamName = "";

  if (useSeparateGradeStream) {
    gradeName = rowData.grade;
    streamName = rowData.stream;
  } else {
    const combined = rowData.grade_stream;
    const match = combined.match(/^(grade|form)\s*(\d+)\s*[-–—:]?\s*(.+)$/i);

    if (!match) {
      return {
        error:
          `Invalid grade_stream format "${combined}". Use format like "Grade 5 - Red" or "Form 1 - Blue".`,
      };
    }

    const [, gradeType, gradeNumber, parsedStream] = match;
    gradeName = `${gradeType.charAt(0).toUpperCase()}${gradeType.slice(1).toLowerCase()} ${gradeNumber}`;
    streamName = parsedStream.trim();
  }

  const gradeId = gradeLookup.get(normalizeToken(gradeName));
  if (!gradeId) {
    return { error: `Grade "${gradeName}" not found.` };
  }

  const normalizedStream = normalizeToken(streamName);
  const streamId =
    streamsByGrade.get(gradeId)?.get(normalizedStream) ?? globalStreams.get(normalizedStream);

  if (!streamId) {
    return { error: `Stream "${streamName}" not found for grade "${gradeName}".` };
  }

  return { gradeId, streamId };
};

const parseAndValidateRows = ({
  rows,
  headerIndexes,
  useSeparateGradeStream,
  references,
}: {
  rows: string[][];
  headerIndexes: Map<UploadHeaderField, number>;
  useSeparateGradeStream: boolean;
  references: ImportReferenceData;
}): { students: ParsedStudent[]; errors: BulkUploadResult["errors"] } => {
  const errors: BulkUploadResult["errors"] = [];
  const students: ParsedStudent[] = [];
  const seenKeysInCsv = new Set<string>();

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const rowNumber = rowIndex + 1;

    const getValue = (field: UploadHeaderField): string => {
      const index = headerIndexes.get(field);
      if (index === undefined) return "";
      return row[index]?.trim() ?? "";
    };

    const rowData: Record<UploadHeaderField, string> = {
      admission_number: getValue("admission_number"),
      name: getValue("name"),
      date_of_birth: getValue("date_of_birth"),
      grade: getValue("grade"),
      stream: getValue("stream"),
      grade_stream: getValue("grade_stream"),
      contact: getValue("contact"),
      pathway: getValue("pathway"),
      track: getValue("track"),
      email: getValue("email"),
    };

    const admissionNo = rowData.admission_number;
    const name = rowData.name;

    if (!admissionNo || !name) {
      errors.push({
        row: rowNumber,
        reason: "Missing required fields (admission_number or name).",
        data: { admissionNo, name },
      });
      continue;
    }

    const gradeStreamResolution = resolveGradeAndStream({
      rowData,
      useSeparateGradeStream,
      gradeLookup: references.gradeLookup,
      streamsByGrade: references.streamsByGrade,
      globalStreams: references.globalStreams,
    });

    if ("error" in gradeStreamResolution) {
      errors.push({
        row: rowNumber,
        reason: gradeStreamResolution.error,
        data: { admissionNo, name },
      });
      continue;
    }

    const { gradeId, streamId } = gradeStreamResolution;

    let dateOfBirth: string | null = null;
    if (rowData.date_of_birth) {
      dateOfBirth = parseFlexibleDate(rowData.date_of_birth);
      if (!dateOfBirth) {
        errors.push({
          row: rowNumber,
          reason: "Invalid date_of_birth format.",
          data: { admissionNo, name },
        });
        continue;
      }
    }

    const pathway = rowData.pathway ? normalizeToken(rowData.pathway) : null;
    if (pathway && !VALID_PATHWAYS.has(pathway)) {
      errors.push({
        row: rowNumber,
        reason: `Invalid pathway "${rowData.pathway}".`,
        data: { admissionNo, name },
      });
      continue;
    }

    const trackName = rowData.track ? normalizeToken(rowData.track) : null;
    let trackId: string | null = null;

    if (trackName && !pathway) {
      errors.push({
        row: rowNumber,
        reason: "Track provided without pathway.",
        data: { admissionNo, name },
      });
      continue;
    }

    if (trackName && pathway) {
      trackId = references.tracksByPathway.get(pathway)?.get(trackName) ?? null;
      if (!trackId) {
        errors.push({
          row: rowNumber,
          reason: `Track "${rowData.track}" not found for pathway "${pathway}".`,
          data: { admissionNo, name },
        });
        continue;
      }
    }

    const duplicateKey = toStudentDuplicateKey({
      admissionNo,
      name,
      gradeId,
      streamId,
    });

    if (seenKeysInCsv.has(duplicateKey)) {
      errors.push({
        row: rowNumber,
        reason:
          "Student already uploaded (same admission number, name, grade, and stream).",
        data: { admissionNo, name },
      });
      continue;
    }

    seenKeysInCsv.add(duplicateKey);

    students.push({
      admissionNo,
      name,
      dateOfBirth,
      gradeId,
      streamId,
      contact: rowData.contact || null,
      pathway,
      trackId,
      rowNumber,
      email: rowData.email || undefined,
    });
  }

  return { students, errors };
};

const createStudentAccount = async (student: ParsedStudent, schoolId: string) => {
  if (!student.email) return;

  const password = student.name.toLowerCase().replace(/\s+/g, "");

  const { error } = await withTimeout(
    async () =>
      supabase.functions.invoke("create-user", {
        body: {
          name: student.name,
          email: student.email,
          password,
          role: "student",
          schoolId,
        },
      }),
    ACCOUNT_TIMEOUT_MS,
    `Account creation for row ${student.rowNumber}`,
  );

  if (error) {
    console.warn(`Failed to create account for ${student.name}:`, error.message);
  }
};

export const parseAndValidateCSV = async (
  file: File,
  schoolId: string,
): Promise<{ students: ParsedStudent[]; errors: BulkUploadResult["errors"] }> => {
  const text = await file.text();
  const rows = parseCsvRows(text);

  if (rows.length < 2) {
    throw new Error("CSV file must include a header row and at least one student row.");
  }

  const { headerIndexes, useSeparateGradeStream } = mapHeaderIndexes(rows[0]);
  const references = await loadReferenceData(schoolId);

  return parseAndValidateRows({
    rows,
    headerIndexes,
    useSeparateGradeStream,
    references,
  });
};

type RowUploadValidationResult =
  | { student: ParsedStudent }
  | { error: BulkUploadResult["errors"][number] };

const parseStudentRowForUpload = ({
  row,
  rowNumber,
  headerIndexes,
  useSeparateGradeStream,
  references,
  seenKeysInCsv,
}: {
  row: string[];
  rowNumber: number;
  headerIndexes: Map<UploadHeaderField, number>;
  useSeparateGradeStream: boolean;
  references: ImportReferenceData;
  seenKeysInCsv: Set<string>;
}): RowUploadValidationResult => {
  const getValue = (field: UploadHeaderField): string => {
    const index = headerIndexes.get(field);
    if (index === undefined) return "";
    return row[index]?.trim() ?? "";
  };

  const rowData: Record<UploadHeaderField, string> = {
    admission_number: getValue("admission_number"),
    name: getValue("name"),
    date_of_birth: getValue("date_of_birth"),
    grade: getValue("grade"),
    stream: getValue("stream"),
    grade_stream: getValue("grade_stream"),
    contact: getValue("contact"),
    pathway: getValue("pathway"),
    track: getValue("track"),
    email: getValue("email"),
  };

  const admissionNo = rowData.admission_number;
  const name = rowData.name;

  if (!admissionNo || !name) {
    return {
      error: {
        row: rowNumber,
        reason: "Missing required fields (admission_number or name).",
        data: { admissionNo, name },
      },
    };
  }

  const gradeStreamResolution = resolveGradeAndStream({
    rowData,
    useSeparateGradeStream,
    gradeLookup: references.gradeLookup,
    streamsByGrade: references.streamsByGrade,
    globalStreams: references.globalStreams,
  });

  if ("error" in gradeStreamResolution) {
    return {
      error: {
        row: rowNumber,
        reason: gradeStreamResolution.error,
        data: { admissionNo, name },
      },
    };
  }

  const { gradeId, streamId } = gradeStreamResolution;

  let dateOfBirth: string | null = null;
  if (rowData.date_of_birth) {
    dateOfBirth = parseFlexibleDate(rowData.date_of_birth);
    if (!dateOfBirth) {
      return {
        error: {
          row: rowNumber,
          reason: "Invalid date_of_birth format.",
          data: { admissionNo, name },
        },
      };
    }
  }

  const pathway = rowData.pathway ? normalizeToken(rowData.pathway) : null;
  if (pathway && !VALID_PATHWAYS.has(pathway)) {
    return {
      error: {
        row: rowNumber,
        reason: `Invalid pathway "${rowData.pathway}".`,
        data: { admissionNo, name },
      },
    };
  }

  const trackName = rowData.track ? normalizeToken(rowData.track) : null;
  let trackId: string | null = null;

  if (trackName && !pathway) {
    return {
      error: {
        row: rowNumber,
        reason: "Track provided without pathway.",
        data: { admissionNo, name },
      },
    };
  }

  if (trackName && pathway) {
    trackId = references.tracksByPathway.get(pathway)?.get(trackName) ?? null;
    if (!trackId) {
      return {
        error: {
          row: rowNumber,
          reason: `Track "${rowData.track}" not found for pathway "${pathway}".`,
          data: { admissionNo, name },
        },
      };
    }
  }

  const duplicateKey = toStudentDuplicateKey({
    admissionNo,
    name,
    gradeId,
    streamId,
  });

  if (seenKeysInCsv.has(duplicateKey)) {
    return {
      error: {
        row: rowNumber,
        reason: "Student already exists in this CSV file.",
        data: { admissionNo, name },
      },
    };
  }

  seenKeysInCsv.add(duplicateKey);

  return {
    student: {
      admissionNo,
      name,
      dateOfBirth,
      gradeId,
      streamId,
      contact: rowData.contact || null,
      pathway,
      trackId,
      rowNumber,
      email: rowData.email || undefined,
    },
  };
};

const doesStudentAlreadyExist = async (schoolId: string, student: ParsedStudent) => {
  const { data, error } = await supabase
    .from("students")
    .select("id")
    .eq("school_id", schoolId)
    .eq("admission_no", student.admissionNo)
    .eq("name", student.name)
    .eq("grade_id", student.gradeId)
    .eq("stream_id", student.streamId)
    .limit(1);

  if (error) {
    throw new Error(`Duplicate check failed for row ${student.rowNumber}: ${error.message}`);
  }

  return (data?.length ?? 0) > 0;
};

export const chunkedBulkUpload = async (
  file: File,
  schoolId: string,
  callbacks: ChunkedUploadCallbacks,
  options: BulkUploadOptions = {},
): Promise<void> => {
  try {
    callbacks.onParsingStart();

    const text = await file.text();
    const rows = parseCsvRows(text);

    if (rows.length < 2) {
      throw new Error("CSV file must include a header row and at least one student row.");
    }

    const { headerIndexes, useSeparateGradeStream } = mapHeaderIndexes(rows[0]);
    const totalRows = rows.length - 1;

    callbacks.onParsingComplete(totalRows);

    const references = await loadReferenceData(schoolId);

    const result: BulkUploadResult = {
      successful: 0,
      failed: 0,
      errors: [],
    };

    let processedRows = 0;
    const seenKeysInCsv = new Set<string>();
    const enrollmentDate = new Date().toISOString().split("T")[0];

    for (let i = 1; i < rows.length; i += CHUNK_SIZE) {
      if (callbacks.isCancelled?.()) {
        callbacks.onCancelled?.(result);
        return;
      }

      const chunk = rows.slice(i, i + CHUNK_SIZE);

      for (let rowOffset = 0; rowOffset < chunk.length; rowOffset += 1) {
        if (callbacks.isCancelled?.()) {
          callbacks.onCancelled?.(result);
          return;
        }

        const row = chunk[rowOffset];
        const rowNumber = i + rowOffset + 1;

        const parsedRow = parseStudentRowForUpload({
          row,
          rowNumber,
          headerIndexes,
          useSeparateGradeStream,
          references,
          seenKeysInCsv,
        });

        if ("error" in parsedRow) {
          result.failed += 1;
          result.errors.push(parsedRow.error);
          processedRows += 1;
          continue;
        }

        const student = parsedRow.student;

        try {
          const existsInDb = await doesStudentAlreadyExist(schoolId, student);
          if (existsInDb) {
            result.failed += 1;
            result.errors.push({
              row: student.rowNumber,
              reason:
                "Student already uploaded (same admission number, name, grade, and stream).",
              data: { admissionNo: student.admissionNo, name: student.name },
            });
            processedRows += 1;
            continue;
          }

          const { error: insertError } = await supabase.from("students").insert({
            admission_no: student.admissionNo,
            name: student.name,
            date_of_birth: student.dateOfBirth,
            grade_id: student.gradeId,
            stream_id: student.streamId,
            school_id: schoolId,
            guardian_phone: student.contact,
            status: "active",
            enrollment_date: enrollmentDate,
            pathway: student.pathway,
            track_id: student.trackId,
            email: student.email,
          });

          if (insertError) {
            result.failed += 1;
            result.errors.push({
              row: student.rowNumber,
              reason: insertError.message,
              data: { admissionNo: student.admissionNo, name: student.name },
            });
          } else {
            result.successful += 1;

            if (options.createAccounts && student.email) {
              await createStudentAccount(student, schoolId);
            }
          }
        } catch (rowError) {
          result.failed += 1;
          result.errors.push({
            row: student.rowNumber,
            reason:
              rowError instanceof Error ? rowError.message : "Failed to process student row.",
            data: { admissionNo: student.admissionNo, name: student.name },
          });
        }

        processedRows += 1;
      }

      callbacks.onChunkComplete(processedRows, result.successful, result.failed);
    }

    callbacks.onComplete(result);
  } catch (error) {
    callbacks.onError(error instanceof Error ? error.message : "Student upload failed.");
  }
};
