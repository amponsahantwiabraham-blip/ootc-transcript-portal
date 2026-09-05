import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req) {
  try {
    const { userId, permissions } = await req.json();

    if (!userId || !permissions) {
      return NextResponse.json(
        { error: 'User ID and permissions object are required' },
        { status: 400 }
      );
    }

    // Update the permissions column in the admin_users table
    const { error } = await supabaseAdmin
      .from('admin_users')
      .update({ permissions })
      .eq('id', userId);

    if (error) throw error;

    return NextResponse.json(
      { message: 'Sub-admin permissions updated successfully!' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}