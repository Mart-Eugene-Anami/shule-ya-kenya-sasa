
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.36.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CreateTeacherRequest {
  name: string;
  email: string;
  password: string;
  subject: string;
  subjectsTaught?: string[];
  isStreamTeacher: boolean;
  gradeStreamId?: string;
  schoolId: string;
  existingTeacherId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // ---- AUTH: verify caller JWT ----
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    const token = authHeader.replace('Bearer ', '')
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token)
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, school_id')
      .eq('id', userData.user.id)
      .single()
    if (profileError || !callerProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const requestBody = await req.json() as CreateTeacherRequest
    const {
      name, email, password, subject, subjectsTaught,
      isStreamTeacher, gradeStreamId, schoolId, existingTeacherId,
    } = requestBody

    if (!name || !email || !password || !subject || !schoolId) {
      return new Response(
        JSON.stringify({ success: false, error: 'All required fields must be provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    if (isStreamTeacher && !gradeStreamId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Grade-Stream combination is required for stream teachers' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Authorization: super_admin OR school_admin of target school
    const isSuperAdmin = callerProfile.role === 'super_admin'
    const isSchoolAdminOfTarget =
      callerProfile.role === 'school_admin' && callerProfile.school_id === schoolId
    if (!isSuperAdmin && !isSchoolAdminOfTarget) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to check existing users' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    if (existingUsers.users.some(u => u.email === email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email is already in use' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: 'teacher', school_id: schoolId },
    })
    if (createUserError || !newUser.user) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create teacher user: ${createUserError?.message || 'Unknown error'}` }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    const teacherUserId = newUser.user.id

    let teacherData: any
    if (existingTeacherId) {
      const { data, error: teacherError } = await supabaseAdmin
        .from('teachers')
        .update({
          user_id: teacherUserId,
          email,
          subject,
          subjects_taught: subjectsTaught || [subject],
          is_stream_teacher: isStreamTeacher,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingTeacherId)
        .select()
        .single()
      if (teacherError || !data) {
        await supabaseAdmin.auth.admin.deleteUser(teacherUserId)
        return new Response(
          JSON.stringify({ success: false, error: `Failed to update teacher record: ${teacherError?.message}` }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }
      teacherData = data
    } else {
      const { data, error: teacherError } = await supabaseAdmin
        .from('teachers')
        .insert({
          user_id: teacherUserId,
          name, email, subject,
          subjects_taught: subjectsTaught || [subject],
          is_stream_teacher: isStreamTeacher,
          school_id: schoolId,
        })
        .select()
        .single()
      if (teacherError || !data) {
        await supabaseAdmin.auth.admin.deleteUser(teacherUserId)
        return new Response(
          JSON.stringify({ success: false, error: `Failed to create teacher record: ${teacherError?.message}` }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }
      teacherData = data
    }

    if (isStreamTeacher && gradeStreamId) {
      const { error: gsError } = await supabaseAdmin
        .from('grade_streams')
        .update({ teacher_id: teacherData.id })
        .eq('id', gradeStreamId)
      if (gsError) {
        await supabaseAdmin.from('teachers').delete().eq('id', teacherData.id)
        await supabaseAdmin.auth.admin.deleteUser(teacherUserId)
        return new Response(
          JSON.stringify({ success: false, error: `Failed to assign teacher to grade-stream: ${gsError.message}` }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        teacherUserId,
        message: 'Teacher created successfully',
        teacher: { id: teacherUserId, email, name, subject, role: 'teacher' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error: any) {
    console.error('create-teacher error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'An internal error occurred. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
