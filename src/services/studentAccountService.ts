import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";

interface CreateStudentAccountParams {
  studentId: string;
  email: string;
  password: string;
  name: string;
  schoolId: string;
}

interface CreateStudentAccountResult {
  success: boolean;
  userId?: string;
  error?: string;
}

/**
 * Creates a user account for an existing student and links it to the student record
 */
export async function createStudentAccount(params: CreateStudentAccountParams): Promise<CreateStudentAccountResult> {
  const { studentId, email, password, name, schoolId } = params;

  try {
    // Create the user account via edge function
    let data: { user?: { id?: string } } | null = null;
    try {
      data = await invokeEdgeFunction('create-user', {
        name,
        email,
        password,
        role: 'student',
        schoolId
      });
    } catch (error) {
      console.error("Error creating student account:", error);
      return { success: false, error: error instanceof Error ? error.message : "Failed to create user account" };
    }

    if (!data?.user?.id) {
      return { success: false, error: "Failed to create user account" };
    }

    // Update the student record to link to the new user
    const { error: updateError } = await supabase
      .from('students')
      .update({ user_id: data.user.id, email })
      .eq('id', studentId);

    if (updateError) {
      console.error("Error linking student to user:", updateError);
      return { success: false, error: "Account created but failed to link to student record" };
    }

    return { success: true, userId: data.user.id };
  } catch (err: any) {
    console.error("Error in createStudentAccount:", err);
    return { success: false, error: err.message || "An unexpected error occurred" };
  }
}

/**
 * Creates a student record and optionally a user account
 */
export async function createStudentWithAccount(
  studentData: {
    name: string;
    admissionNo: string;
    email?: string;
    gradeId: string;
    streamId: string;
    schoolId: string;
    pathway?: string;
  },
  createAccount?: {
    password: string;
  }
): Promise<{ success: boolean; studentId?: string; userId?: string; error?: string }> {
  try {
    // First create the student record
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({
        name: studentData.name,
        admission_no: studentData.admissionNo,
        email: studentData.email,
        grade_id: studentData.gradeId,
        stream_id: studentData.streamId,
        school_id: studentData.schoolId,
        pathway: studentData.pathway
      })
      .select()
      .single();

    if (studentError) {
      console.error("Error creating student:", studentError);
      return { success: false, error: studentError.message };
    }

    // If account creation is requested
    if (createAccount && studentData.email) {
      const accountResult = await createStudentAccount({
        studentId: student.id,
        email: studentData.email,
        password: createAccount.password,
        name: studentData.name,
        schoolId: studentData.schoolId
      });

      if (!accountResult.success) {
        // Student was created but account creation failed
        return { 
          success: true, 
          studentId: student.id, 
          error: `Student created but account creation failed: ${accountResult.error}`
        };
      }

      return { 
        success: true, 
        studentId: student.id, 
        userId: accountResult.userId 
      };
    }

    return { success: true, studentId: student.id };
  } catch (err: any) {
    console.error("Error in createStudentWithAccount:", err);
    return { success: false, error: err.message || "An unexpected error occurred" };
  }
}

/**
 * Generates a default password for a student based on their full name
 * Password format: full name in lowercase with no spaces
 */
export function generateDefaultPassword(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '');
}

/**
 * Creates user accounts for multiple students in bulk
 */
export async function createBulkStudentAccounts(
  students: Array<{
    studentId: string;
    name: string;
    email: string;
    schoolId: string;
  }>
): Promise<{ successful: number; failed: number; errors: Array<{ studentId: string; name: string; error: string }> }> {
  const result = {
    successful: 0,
    failed: 0,
    errors: [] as Array<{ studentId: string; name: string; error: string }>
  };

  for (const student of students) {
    const password = generateDefaultPassword(student.name);
    
    const accountResult = await createStudentAccount({
      studentId: student.studentId,
      email: student.email,
      password,
      name: student.name,
      schoolId: student.schoolId
    });

    if (accountResult.success) {
      result.successful++;
    } else {
      result.failed++;
      result.errors.push({
        studentId: student.studentId,
        name: student.name,
        error: accountResult.error || 'Unknown error'
      });
    }
  }

  return result;
}
