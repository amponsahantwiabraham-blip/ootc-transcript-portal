import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('SERVER ERROR: Missing environment variables.');
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase keys.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${supabaseServiceKey}` } },
    });

    const body = await req.json();
    const { studentId, serialCode } = body;

    if (!studentId || !serialCode) {
      return NextResponse.json(
        { error: 'Please enter both Student ID and Serial Code.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('students')
      .select('*')
      .ilike('id_number', studentId.trim())
      .eq('student_id', serialCode.trim())
      .maybeSingle();

    if (error) {
      console.error('DATABASE ERROR:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Invalid Student ID or Serial Code combination.' },
        { status: 404 }
      );
    }

    if (!data.is_paid) {
      return NextResponse.json(
        { error: 'This serial code is inactive or has expired. Please purchase a new serial code.' },
        { status: 403 }
      );
    }

    if ((data.download_count || 0) >= 3) {
      return NextResponse.json(
        { error: 'This serial code has reached its maximum download limit (3/3). Please buy a new code.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, student: data });
  } catch (err) {
    console.error('CATCH ERROR:', err);
    return NextResponse.json(
      { error: `Internal server error: ${err.message}` },
      { status: 500 }
    );
  }
}