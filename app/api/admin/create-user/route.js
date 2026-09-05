import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase Admin Client using the Service Role Key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req) {
  try {
    const { email, password, permissions } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' }, 
        { status: 400 }
      );
    }

    // 1. Create the user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;

    // 2. Insert into admin_users table with custom permissions
    const { error: dbError } = await supabaseAdmin
      .from('admin_users')
      .insert([
        {
          id: authUser.user.id,
          email,
          role: 'sub_admin',
          permissions: permissions || {
            can_add_students: false,
            can_view_student_name: true,
            can_view_student_class: true,
            can_view_student_id: true,
            can_view_downloads: false,
            can_view_serial_codes: false,
            can_view_pdf_status: false,
            can_view_uploaded_transcript: false,
            can_delete_students: false,
            can_view_download_logs: false,
          },
        },
      ]);

    if (dbError) throw dbError;

    return NextResponse.json(
      { message: 'Sub-admin account created successfully!' }, 
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    );
  }
}