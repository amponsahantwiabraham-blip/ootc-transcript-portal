import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { reference, studentId } = await request.json();

    if (!reference || !studentId) {
      return NextResponse.json(
        { error: 'Missing reference or student ID' },
        { status: 400 }
      );
    }

    // 1. Verify environment variables and initialize Supabase Admin safely
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error: missing Supabase credentials' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Verify payment directly with Paystack API
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    
    if (!paystackSecret) {
      return NextResponse.json(
        { error: 'Server configuration error: missing secret key' },
        { status: 500 }
      );
    }

    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const paystackData = await paystackRes.json();

    if (!paystackData.status || paystackData.data.status !== 'success') {
      return NextResponse.json(
        { error: 'Payment verification failed or incomplete' },
        { status: 400 }
      );
    }

    // 3. Activate payment status & reset download counter to 0 upon successful payment
    const { data: student, error: dbError } = await supabaseAdmin
      .from('students')
      .update({ 
        is_paid: true,
        download_count: 0 
      })
      .ilike('id_number', studentId)
      .select('student_id')
      .maybeSingle();

    if (dbError || !student) {
      return NextResponse.json(
        { error: 'Student record not found or update failed' },
        { status: 404 }
      );
    }

    // 4. Return the active serial code to the student
    return NextResponse.json({
      success: true,
      serialCode: student.student_id,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error during verification' },
      { status: 500 }
    );
  }
}