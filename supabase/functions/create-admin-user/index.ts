
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.36.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CreateAdminRequest {
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  schoolName: string;
  schoolLocation: string;
  schoolPhone?: string;
  schoolEmail?: string;
}

serve(async (req) => {
  console.log(`=== FUNCTION CALLED: ${req.method} ${req.url} ===`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    console.log('=== CREATE ADMIN USER FUNCTION STARTED ===');
    
    // Log request headers for debugging
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    let requestBody: CreateAdminRequest;
    try {
      requestBody = await req.json() as CreateAdminRequest;
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid JSON in request body' 
        }), 
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    console.log('Request received:', { 
      adminEmail: requestBody.adminEmail, 
      schoolName: requestBody.schoolName,
      hasPassword: !!requestBody.adminPassword
    });
    
    const { 
      adminName, 
      adminEmail, 
      adminPassword, 
      schoolName, 
      schoolLocation, 
      schoolPhone, 
      schoolEmail
    } = requestBody;
    
    // Validate required fields
    if (!adminName || !adminEmail || !adminPassword || !schoolName || !schoolLocation) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'All required fields must be provided' 
        }), 
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    if (adminPassword.length < 6) {
      console.error('Password too short');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Password must be at least 6 characters' 
        }), 
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      console.error('Invalid email format:', adminEmail);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid email format' 
        }), 
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Server configuration error' 
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    
    // Check if email already exists
    console.log('Checking for existing users...');
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error checking existing users:', listError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to check existing users' 
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    const emailExists = existingUsers.users.some(user => user.email === adminEmail);
    
    if (emailExists) {
      console.error('Email already exists:', adminEmail);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Email is already in use' 
        }), 
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    // Create the admin user with correct role
    console.log('Creating admin user...');
    const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: adminName,
        role: 'school_admin'
      }
    })
    
    if (createUserError || !userData.user) {
      console.error('Admin user creation error:', createUserError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Failed to create admin user: ${createUserError?.message || 'Unknown error'}` 
        }), 
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    const adminUserId = userData.user.id;
    console.log('Admin user created:', adminUserId);
    
    // Use the database function to create school and update profile
    console.log('Creating school and updating profile...');
    const { data: schoolData, error: schoolError } = await supabaseAdmin.rpc('create_school_with_admin', {
      p_school_name: schoolName,
      p_school_location: schoolLocation,
      p_school_phone: schoolPhone || '',
      p_school_email: schoolEmail || '',
      p_admin_id: adminUserId,
      p_admin_name: adminName,
      p_admin_email: adminEmail
    });
    
    if (schoolError) {
      console.error('School creation error:', schoolError);
      // Cleanup: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(adminUserId);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Failed to create school: ${schoolError.message}` 
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const schoolId = schoolData;
    console.log('School created with ID:', schoolId);
    
    console.log('=== REGISTRATION COMPLETED SUCCESSFULLY ===');
    
    return new Response(
      JSON.stringify({
        success: true,
        schoolId: schoolId,
        adminUserId: adminUserId,
        message: 'School and admin created successfully. Please set up academic year and terms after login.',
        school: {
          id: schoolId,
          name: schoolName,
          location: schoolLocation,
          phone: schoolPhone || '',
          email: schoolEmail || ''
        },
        admin: {
          id: adminUserId,
          email: adminEmail,
          name: adminName,
          role: 'school_admin'
        }
      }), 
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
    
  } catch (error: any) {
    console.error('=== FUNCTION ERROR ===', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
