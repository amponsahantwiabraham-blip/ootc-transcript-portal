import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function DELETE() {
  try {
    // Delete all rows where id is greater than 0
    const { data, error } = await supabase
      .from('transcript_downloads')
      .delete()
      .gt('id', 0)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `${data?.length || 0} logs cleared.` 
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}