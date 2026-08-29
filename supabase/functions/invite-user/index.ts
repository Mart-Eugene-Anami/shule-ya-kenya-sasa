
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.36.0'
import { Resend } from 'npm:resend@2.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InviteUserRequest {
  email: string;
  role: 'admin' | 'teacher' | 'student';
  schoolId?: string;
  invitedBy: string;
  schoolName?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseKey || !anonKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Verify caller JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    const token = authHeader.replace('Bearer ', '')
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    const callerId = authData.user.id

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify caller role: only school_admin or super_admin can invite
    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role, school_id')
      .eq('id', callerId)
      .single()
    if (callerProfileError || !callerProfile ||
        !['super_admin', 'school_admin'].includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const { email, role, schoolId, schoolName } = await req.json() as InviteUserRequest
    // invitedBy is derived from verified JWT; ignore client-supplied value
    const invitedBy = callerId

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: 'Email and role are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // school_admins can only invite into their own school
    if (callerProfile.role === 'school_admin' && schoolId && schoolId !== callerProfile.school_id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    // Check if the invited user already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role')
      .eq('email', email)
      .maybeSingle()
    
    if (checkError) {
      console.error('Error checking existing user:', checkError);
      throw checkError
    }
    
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: `User with email ${email} already exists with role ${existingUser.role}` }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    // Get inviter details
    const { data: inviter, error: inviterError } = await supabaseAdmin
      .from('profiles')
      .select('name, email')
      .eq('id', invitedBy)
      .single()
    
    if (inviterError) {
      console.error('Error fetching inviter:', inviterError);
      throw inviterError
    }
    
    // Generate a secure registration token
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    
    // Store invitation in database for validation
    const { error: inviteError } = await supabaseAdmin
      .from('invitations')
      .insert({
        email,
        role,
        school_id: schoolId,
        invited_by: invitedBy,
        token,
        expires_at: expiresAt,
        status: 'pending'
      });
    
    if (inviteError) {
      console.error('Error storing invitation:', inviteError);
      // If table doesn't exist, we'll continue without storing (for now)
    }
    
    // Construct the registration URL
    const baseUrl = Deno.env.get('PUBLIC_APP_URL') || 'https://school-manager.lovabledev.app'
    const registrationUrl = `${baseUrl}/register/invite?email=${encodeURIComponent(email)}&role=${role}&token=${token}${schoolId ? `&schoolId=${schoolId}` : ''}`
    
    // Determine email content based on role
    let emailSubject, emailContent
    
    if (role === 'admin') {
      emailSubject = 'Invitation to Manage Your School on Shule ya Kenya Sasa'
      emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>School Administrator Invitation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Shule ya Kenya Sasa</h1>
            <p style="margin: 10px 0 0 0;">School Management System</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #4F46E5; margin-top: 0;">You've been invited to manage your school!</h2>
            
            <p>Hello,</p>
            
            <p><strong>${inviter.name}</strong> (${inviter.email}) has invited you to register as a school administrator on <strong>Shule ya Kenya Sasa</strong>, our comprehensive school management platform.</p>
            
            <p>As a school administrator, you'll be able to:</p>
            <ul>
              <li>Manage students, teachers, and staff</li>
              <li>Create and oversee academic programs</li>
              <li>Track student performance and generate reports</li>
              <li>Manage school timetables and schedules</li>
              <li>Oversee examinations and assessments</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${registrationUrl}" 
                 style="background-color: #4F46E5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Complete Your Registration
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              <strong>Important:</strong> This invitation link will expire in 7 days for security reasons.
            </p>
            
            <p>If you have any questions about the platform or need assistance with registration, please contact us at <a href="mailto:support@shuleyakenyasasa.com">support@shuleyakenyasasa.com</a></p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="color: #666; font-size: 12px; text-align: center;">
              This invitation was sent to ${email}. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            © 2025 Shule ya Kenya Sasa. All rights reserved.
          </div>
        </body>
        </html>
      `
    } else {
      emailSubject = `Invitation to Join ${schoolName || 'Our School'} on Shule ya Kenya Sasa`
      emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${role === 'teacher' ? 'Teacher' : 'Student'} Invitation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Shule ya Kenya Sasa</h1>
            <p style="margin: 10px 0 0 0;">School Management System</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #4F46E5; margin-top: 0;">Welcome to ${schoolName || 'our school'}!</h2>
            
            <p>Hello,</p>
            
            <p><strong>${inviter.name}</strong> has invited you to join <strong>${schoolName || 'the school'}</strong> as a ${role} on our Shule ya Kenya Sasa platform.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${registrationUrl}" 
                 style="background-color: #4F46E5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Accept Invitation & Register
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              <strong>Important:</strong> This invitation link will expire in 7 days.
            </p>
            
            <p>If you have any questions, please contact your school administrator.</p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="color: #666; font-size: 12px; text-align: center;">
              This invitation was sent to ${email}.
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            © 2025 Shule ya Kenya Sasa. All rights reserved.
          </div>
        </body>
        </html>
      `
    }
    
    // Check if Resend API key is configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Email service not configured. Please contact the system administrator.' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    // Send the invitation email
    console.log('Sending email to:', email);
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Shule ya Kenya Sasa <noreply@shuleyakenyasasa.com>',
      to: [email],
      subject: emailSubject,
      html: emailContent,
    })
    
    if (emailError) {
      console.error('Email sending error:', emailError);
      throw new Error(`Failed to send email: ${emailError.message}`)
    }
    
    console.log('Email sent successfully:', emailData);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation sent successfully to ${email}`,
        emailId: emailData?.id,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('Error in invite-user function:', error)
    return new Response(
      JSON.stringify({ error: 'An internal error occurred. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
