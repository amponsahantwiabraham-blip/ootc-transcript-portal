import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Missing server keys in environment variables.' },
        { status: 500 }
      );
    }

    const headers = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    };

    // 1. Fetch transcript download logs from Supabase via REST
    const logsRes = await fetch(
      `${supabaseUrl}/rest/v1/transcript_downloads?select=*&order=downloaded_at.desc`,
      { headers }
    );
    const logs = await logsRes.json();

    if (!logsRes.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch transcript download audit logs.' },
        { status: logsRes.status }
      );
    }

    // 2. Fetch all student records to match names and classes
    const studentsRes = await fetch(
      `${supabaseUrl}/rest/v1/students?select=*`,
      { headers }
    );
    const students = await studentsRes.json();

    // Map student records by id_number and student_id for fast lookup
    const studentMap = {};
    if (Array.isArray(students)) {
      students.forEach((st) => {
        if (st.id_number) studentMap[st.id_number.trim().toLowerCase()] = st;
        if (st.student_id) studentMap[st.student_id.trim().toLowerCase()] = st;
      });
    }

    // 3. Build CSV rows with Name & Class included
    const csvHeaders = ['ID', 'Student Name', 'Class', 'Student ID', 'Serial Code', 'Payment Status', 'Downloaded At'];
    
    const csvRows = logs.map((log) => {
      const lookupKey = (log.student_id || '').trim().toLowerCase();
      const matchedStudent = studentMap[lookupKey];

      const studentName = log.student_name || matchedStudent?.full_name || 'N/A';
      const studentClass = matchedStudent?.class || 'N/A';

      return [
        `"${log.id || ''}"`,
        `"${studentName}"`,
        `"${studentClass}"`,
        `"${log.student_id || ''}"`,
        `"${log.serial_code || ''}"`,
        `"${log.payment_status || 'paid'}"`,
        `"${log.downloaded_at || ''}"`,
      ].join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

    // 4. Return CSV attachment
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="Transcript_Audit_Report_${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Failed to export audit report.' },
      { status: 500 }
    );
  }
}