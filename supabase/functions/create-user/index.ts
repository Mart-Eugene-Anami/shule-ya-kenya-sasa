
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the current user from the authorization header
    const authorizationHeader = req.headers.get('Authorization')
    if (!authorizationHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract the token from the Authorization header
    const token = authorizationHeader.replace('Bearer ', '')
    
    // Verify the token and get the user data
    const { data: { user: caller }, error: verifyError } = await supabaseClient.auth.getUser(token)
    
    if (verifyError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify caller's permission
    const { data: callerProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (profileError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Could not verify caller permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the request body
    const { name, email, password, role, schoolId } = await req.json()

    // Validate input
    if (!name || !email || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate password is provided and meets requirements
    if (!password || password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password is required and must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate permissions
    if (callerProfile.role === 'admin' && role === 'admin') {
      return new Response(
        JSON.stringify({ error: 'School admins cannot create other admin accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if ((role === 'teacher' || role === 'student') && !schoolId) {
      return new Response(
        JSON.stringify({ error: 'School ID is required for teacher and student accounts' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If creating an admin, verify that caller is super_admin
    if (role === 'admin' && callerProfile.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Only super admins can create admin accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the user with the admin role
    const { data: userData, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        school_id: schoolId
      }
    })

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the user profile (trigger creates it, we update with role/school)
    const { data: profileData, error: updateProfileError } = await supabaseClient
      .from('profiles')
      .update({
        name,
        role,
        school_id: schoolId
      })
      .eq('id', userData.user.id)
      .select()
      .single()

    if (updateProfileError) {
      return new Response(
        JSON.stringify({ error: updateProfileError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        user: userData.user, 
        profile: profileData,
        message: 'User created successfully with password access'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
