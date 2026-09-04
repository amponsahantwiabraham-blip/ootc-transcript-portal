'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function HomeForm() {
  const searchParams = useSearchParams();
  const [studentId, setStudentId] = useState('');
  const [serialCode, setSerialCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [verifiedRecord, setVerifiedRecord] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-fill studentId from URL query string if present
  useEffect(() => {
    const idFromUrl = searchParams.get('studentId');
    if (idFromUrl) {
      setStudentId(idFromUrl);
    }
  }, [searchParams]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setVerifiedRecord(null);

    const cleanId = studentId.trim();
    const cleanCode = serialCode.trim();

    if (!cleanId || !cleanCode) {
      return setErrorMessage('Please fill in both Student ID Number and Serial Code.');
    }

    setLoading(true);

    try {
      const res = await fetch('/api/verify-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: cleanId, serialCode: cleanCode }),
      });

      const result = await res.json();

      if (!res.ok) {
        setErrorMessage(result.error || 'Verification failed.');
      } else {
        setVerifiedRecord(result.student);
      }
    } catch (err) {
      setErrorMessage('An unexpected network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (e) => {
    if (e) e.preventDefault();

    if (!verifiedRecord) {
      alert('Error: No student record loaded.');
      return;
    }

    setDownloading(true);

    try {
      const response = await fetch('/api/download-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: verifiedRecord.id_number,
          serialCode: serialCode.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error || 'Failed to process download.');
        setDownloading(false);
        return;
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Transcript_${verifiedRecord.id_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setVerifiedRecord((prev) => ({
        ...prev,
        download_count: (prev.download_count || 0) + 1,
      }));
    } catch (err) {
      alert('SYSTEM ERROR: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-white border border-emerald-100 shadow-md rounded-2xl p-6 sm:p-8 space-y-6 transition-all">
      {/* HEADER & BRANDING */}
      <div className="flex flex-col items-center text-center space-y-3">
        <img src="/logo.png" alt="College Logo" className="h-20 w-auto object-contain drop-shadow-sm" />
        
        <div>
          <h1 className="text-xl font-black text-emerald-950 uppercase tracking-tight">
            OTUMFUO OSEI TUTU II COLLEGE
          </h1>
          <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest mt-0.5">
            Official Transcript Portal
          </p>
        </div>

        <a
          href="/user-guide.pdf"
          download="OOTC_Portal_User_Guide.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 border border-yellow-300 text-emerald-950 text-xs font-bold rounded-full hover:bg-yellow-200 transition shadow-sm"
        >
          <span>📥 Download User Guide (PDF)</span>
        </a>

        <div className="text-xs text-slate-500 font-medium bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
          Helpline: <span className="text-emerald-900 font-bold font-mono">0245700033 / 0200500670</span>
        </div>

        <div className="pt-2 text-xs font-semibold text-emerald-950 bg-emerald-50/70 border border-emerald-100 p-2.5 rounded-xl w-full">
          Provide your Student ID and Serial Code below to download and view your transcript
        </div>
      </div>

      {/* VERIFICATION FORM */}
      {!verifiedRecord && (
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-emerald-950 uppercase tracking-wider mb-1">
              Student ID Number
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 250000000000"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full border border-slate-300 p-3 rounded-xl text-sm font-mono focus:ring-2 focus:ring-yellow-400 focus:border-emerald-600 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-950 uppercase tracking-wider mb-1">
              Serial Code
            </label>
            <input
              type="text"
              required
              placeholder="Enter Purchased Serial Code"
              value={serialCode}
              onChange={(e) => setSerialCode(e.target.value)}
              className="w-full border border-slate-300 p-3 rounded-xl text-sm font-mono focus:ring-2 focus:ring-yellow-400 focus:border-emerald-600 outline-none transition"
            />
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium animate-fadeIn">
              ⚠️ {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-800 hover:bg-emerald-900 active:scale-[0.99] text-yellow-300 font-bold py-3 rounded-xl text-sm transition shadow-md flex items-center justify-center space-x-2 disabled:opacity-75"
          >
            {loading ? (
              <span>Verifying Credentials...</span>
            ) : (
              <span>🔍 Access Transcript</span>
            )}
          </button>

          <div className="pt-2 text-center text-xs text-slate-600 font-medium border-t border-slate-100">
            Don't have an active Serial Code?{' '}
            <Link
              href="/buy-code"
              className="text-emerald-800 font-bold hover:underline inline-flex items-center space-x-1"
            >
              <span>Click here to purchase</span>
              <span>→</span>
            </Link>
          </div>
        </form>
      )}

      {/* VERIFIED STUDENT DISPLAY & DIRECT DOWNLOAD */}
      {verifiedRecord && (
        <div className="p-5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-4 animate-fadeIn">
          <div className="text-xs space-y-1.5 border-b border-emerald-200/80 pb-3">
            <span className="text-[10px] bg-emerald-700 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
              Verified Student Record
            </span>
            <p className="font-extrabold text-slate-900 text-lg pt-1">{verifiedRecord.full_name}</p>
            <div className="flex justify-between text-slate-600 font-mono text-xs pt-0.5">
              <span>ID: <strong>{verifiedRecord.id_number}</strong></span>
              <span>Class: <strong>{verifiedRecord.class}</strong></span>
            </div>

            <div className="mt-3 p-3 bg-amber-50 border border-amber-200/80 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-[11px] font-bold text-amber-950">
                <span>Downloads Used</span>
                <span>{verifiedRecord.download_count || 0} / 3</span>
              </div>

              <div className="w-full bg-amber-200/60 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    (verifiedRecord.download_count || 0) === 1
                      ? 'w-1/3 bg-emerald-600'
                      : (verifiedRecord.download_count || 0) === 2
                      ? 'w-2/3 bg-amber-500'
                      : (verifiedRecord.download_count || 0) >= 3
                      ? 'w-full bg-rose-600'
                      : 'w-0'
                  }`}
                />
              </div>

              <p className="text-[10px] text-amber-800 font-medium text-right">
                {3 - (verifiedRecord.download_count || 0)} {3 - (verifiedRecord.download_count || 0) === 1 ? 'download remaining' : 'downloads remaining'}
              </p>
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="block w-full bg-emerald-800 hover:bg-emerald-900 text-yellow-300 font-bold py-3 rounded-xl text-xs text-center transition shadow-md active:scale-[0.99] disabled:opacity-50"
          >
            {downloading ? 'Processing Download...' : '📄 Download Official Transcript (PDF)'}
          </button>
          
          <button
            onClick={() => setVerifiedRecord(null)}
            className="w-full text-xs text-slate-500 hover:text-emerald-900 font-medium underline pt-1 text-center block"
          >
            ← Check a different record
          </button>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-amber-50/40 flex flex-col justify-between p-4 sm:p-8 select-none">
      <main className="max-w-md mx-auto w-full my-auto py-6">
        <Suspense fallback={<div className="text-center text-xs text-slate-500">Loading portal...</div>}>
          <HomeForm />
        </Suspense>
      </main>

      <footer className="text-center text-xs text-slate-400 border-t border-emerald-100/60 pt-4">
        &copy; {new Date().getFullYear()} OTUMFUO OSEI TUTU II COLLEGE. All rights reserved.
      </footer>
    </div>
  );
}