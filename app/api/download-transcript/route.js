import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Missing server keys in environment variables.' },
        { status: 500 }
      );
    }

    const { studentId, serialCode } = await req.json();

    if (!studentId || !serialCode) {
      return NextResponse.json(
        { error: 'Missing student ID or serial code.' },
        { status: 400 }
      );
    }

    const headers = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };

    // 1. Fetch student record via REST
    const fetchUrl = `${supabaseUrl}/rest/v1/students?id_number=ilike.${encodeURIComponent(
      studentId.trim()
    )}&student_id=eq.${encodeURIComponent(serialCode.trim())}&select=*`;

    const fetchRes = await fetch(fetchUrl, { headers });
    const students = await fetchRes.json();

    if (!fetchRes.ok || !students || students.length === 0) {
      return NextResponse.json(
        { error: 'Student record not found.' },
        { status: 404 }
      );
    }

    const student = students[0];

    if (!student.is_paid || (student.download_count || 0) >= 3) {
      return NextResponse.json(
        { error: 'Serial code limit reached or code inactive.' },
        { status: 403 }
      );
    }

    if (!student.transcript_url) {
      return NextResponse.json(
        { error: 'No transcript URL associated with this student record.' },
        { status: 404 }
      );
    }

    // 2. Fetch the file content
    let pdfBuffer;
    let fileRes = await fetch(student.transcript_url);

    if (fileRes.ok) {
      pdfBuffer = await fileRes.arrayBuffer();
    } else {
      // Parse bucket and path from full URL: e.g. .../storage/v1/object/public/transcripts/file.pdf
      const urlWithoutParams = student.transcript_url.split('?')[0];
      const match = urlWithoutParams.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/);

      if (!match) {
        return NextResponse.json(
          { error: `Invalid storage URL format: ${student.transcript_url}` },
          { status: 400 }
        );
      }

      const [, bucket, filePath] = match;

      // Request a fresh Signed URL using Service Role Key
      const signUrl = `${supabaseUrl}/storage/v1/object/sign/${bucket}/${filePath}`;
      const signRes = await fetch(signUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ expiresIn: 60 }),
      });

      const signData = await signRes.json();

      if (!signRes.ok || !signData.signedURL) {
        return NextResponse.json(
          { error: 'Unable to sign storage URL. Please check bucket name and path.' },
          { status: signRes.status }
        );
      }

      // Fetch file using the fresh signed URL
      const fullSignedUrl = `${supabaseUrl}/storage/v1${signData.signedURL}`;
      fileRes = await fetch(fullSignedUrl);

      if (!fileRes.ok) {
        return NextResponse.json(
          { error: `Failed to download file from storage (HTTP ${fileRes.status}).` },
          { status: fileRes.status }
        );
      }

      pdfBuffer = await fileRes.arrayBuffer();
    }

    // 3. Log download record via REST
    await fetch(`${supabaseUrl}/rest/v1/transcript_downloads`, {
      method: 'POST',
      headers,
      body: JSON.stringify([
        {
          student_id: student.id_number,
          serial_code: serialCode.trim(),
          payment_status: 'paid',
          downloaded_at: new Date().toISOString(),
        },
      ]),
    });

    // 4. Update download count via REST
    const newCount = (student.download_count || 0) + 1;
    let updatePayload = { download_count: newCount };

    if (newCount >= 3) {
      const newSerialCode = 'OOTC-' + Math.floor(100000 + Math.random() * 900000);
      updatePayload = {
        download_count: 0,
        is_paid: false,
        student_id: newSerialCode,
      };
    }

    const updateUrl = `${supabaseUrl}/rest/v1/students?id_number=eq.${encodeURIComponent(
      student.id_number
    )}`;

    await fetch(updateUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updatePayload),
    });

    // 5. Stream PDF directly to browser
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Transcript_${student.id_number}.pdf"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}