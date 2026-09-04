import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Missing environment configuration.' }, { status: 500 });
    }

    const bodyText = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    // 1. Verify Paystack signature if secret key is present
    if (paystackSecretKey && signature) {
      const hash = crypto
        .createHmac('sha512', paystackSecretKey)
        .update(bodyText)
        .digest('hex');

      if (hash !== signature) {
        return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
      }
    }

    const event = JSON.parse(bodyText);

    // 2. Handle successful charge event
    if (event.event === 'charge.success') {
      const { reference, customer, amount, metadata } = event.data;

      const headers = {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      };

      // Record payment log via REST
      await fetch(`${supabaseUrl}/rest/v1/payments`, {
        method: 'POST',
        headers,
        body: JSON.stringify([
          {
            reference,
            email: customer?.email || '',
            amount: amount ? amount / 100 : 0,
            status: 'success',
            created_at: new Date().toISOString(),
          },
        ]),
      }).catch(() => null); // Silently pass if payments table log is optional

      // Activate student serial code if student_id is passed in metadata
      const studentId = metadata?.student_id;
      const serialCode = metadata?.serial_code || 'OOTC-' + Math.floor(100000 + Math.random() * 900000);

      if (studentId) {
        const updateUrl = `${supabaseUrl}/rest/v1/students?id_number=eq.${encodeURIComponent(studentId.trim())}`;
        await fetch(updateUrl, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            is_paid: true,
            download_count: 0,
            student_id: serialCode,
          }),
        });
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Webhook processing failed.' }, { status: 500 });
  }
}