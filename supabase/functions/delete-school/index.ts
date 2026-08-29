import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteSchoolRequest {
  schoolId: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the authorization header to verify the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify the calling user is a super admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is super admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "super_admin") {
      throw new Error("Only super admins can delete schools");
    }

    const { schoolId }: DeleteSchoolRequest = await req.json();

    if (!schoolId) {
      throw new Error("School ID is required");
    }

    console.log(`Deleting school: ${schoolId}`);

    // Step 1: Get all user IDs associated with this school (teachers, students, admin)
    const [teachersResult, studentsResult, profilesResult, schoolResult] = await Promise.all([
      supabaseAdmin.from("teachers").select("user_id").eq("school_id", schoolId).not("user_id", "is", null),
      supabaseAdmin.from("students").select("user_id").eq("school_id", schoolId).not("user_id", "is", null),
      supabaseAdmin.from("profiles").select("id").eq("school_id", schoolId),
      supabaseAdmin.from("schools").select("admin_id").eq("id", schoolId).single(),
    ]);

    // Collect all user IDs to delete
    const userIdsToDelete = new Set<string>();

    // Add teacher user IDs
    if (teachersResult.data) {
      teachersResult.data.forEach((t) => {
        if (t.user_id) userIdsToDelete.add(t.user_id);
      });
    }

    // Add student user IDs
    if (studentsResult.data) {
      studentsResult.data.forEach((s) => {
        if (s.user_id) userIdsToDelete.add(s.user_id);
      });
    }

    // Add profile user IDs (school members)
    if (profilesResult.data) {
      profilesResult.data.forEach((p) => {
        if (p.id) userIdsToDelete.add(p.id);
      });
    }

    // Add school admin ID
    if (schoolResult.data?.admin_id) {
      userIdsToDelete.add(schoolResult.data.admin_id);
    }

    console.log(`Found ${userIdsToDelete.size} user accounts to delete`);

    // Step 2: Call the cascade delete function to remove all school data
    const { error: cascadeError } = await supabaseAdmin.rpc("delete_school_cascade", {
      p_school_id: schoolId,
    });

    if (cascadeError) {
      console.error("Error in cascade delete:", cascadeError);
      throw new Error(`Failed to delete school data: ${cascadeError.message}`);
    }

    console.log("School data deleted successfully, now deleting user accounts...");

    // Step 3: Delete all associated auth users (excluding the caller)
    const deletionResults = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const userId of userIdsToDelete) {
      // Don't delete the super admin who is performing the deletion
      if (userId === user.id) {
        console.log(`Skipping deletion of caller's account: ${userId}`);
        continue;
      }

      try {
        const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        
        if (deleteUserError) {
          console.error(`Failed to delete user ${userId}:`, deleteUserError);
          deletionResults.failed++;
          deletionResults.errors.push(`User ${userId}: ${deleteUserError.message}`);
        } else {
          console.log(`Deleted user account: ${userId}`);
          deletionResults.successful++;
        }
      } catch (err: any) {
        console.error(`Exception deleting user ${userId}:`, err);
        deletionResults.failed++;
        deletionResults.errors.push(`User ${userId}: ${err.message}`);
      }
    }

    console.log(`Deletion complete. Successful: ${deletionResults.successful}, Failed: ${deletionResults.failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "School and all associated data deleted successfully",
        details: {
          usersDeleted: deletionResults.successful,
          usersFailed: deletionResults.failed,
          errors: deletionResults.errors.length > 0 ? deletionResults.errors : undefined,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in delete-school function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: error.message === "Unauthorized" || error.message === "Only super admins can delete schools" ? 403 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
