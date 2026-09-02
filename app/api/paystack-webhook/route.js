import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(req) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get('x-paystack-signature');
    const secret = process.env.PAYSTACK_SECRET_KEY;

    // Verify webhook signature if secret key is configured
    if (secret && signature) {
      const hash = crypto
        .createHmac('sha512', secret)
        .update(bodyText)
        .digest('hex');

      if (hash !== signature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    const event = JSON.parse(bodyText);

    // Process successful payment event from Paystack
    if (event.event === 'charge.success') {
      const { reference, customer, amount } = event.data;

      await supabase.from('payments').insert([
        {
          reference,
          email: customer.email,
          amount: amount / 100, // Convert pesewas to GHS
          status: 'success',
          created_at: new Date().toISOString(),
        },
      ]);
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}