'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

function VerifyContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const initialId = searchParams.get('id') || '';

  const [serialCode, setSerialCode] = useState(initialCode);
  const [studentId, setStudentId] = useState(initialId);
  const [loading, setLoading] = useState(false);
  const [verifiedRecord, setVerifiedRecord] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setVerifiedRecord(null);

    if (!serialCode.trim() || !studentId.trim()) {
      return setErrorMessage('Please provide both Serial Code and Student ID.');
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .ilike('id_number', studentId.trim())
      .eq('student_id', serialCode.trim())
      .maybeSingle();

    setLoading(false);

    if (error) {
      setErrorMessage('Database error during verification.');
    } else if (!data) {
      setErrorMessage('Invalid Serial Code or Student ID combination.');
    } else {
      setVerifiedRecord(data);
    }
  };

  useEffect(() => {
    if (initialCode && initialId) {
      handleVerify();
    }
  }, []);

  return (
    <div className="min-h-screen bg-amber-50/30 flex flex-col justify-between p-4 sm:p-8">
      <main className="max-w-md mx-auto w-full my-auto py-6">
        <div className="bg-white border border-emerald-100 shadow-sm rounded-xl p-6 sm:p-8 space-y-6">
          
          {/* LOGO & HEADING */}
          <div className="flex flex-col items-center text-center space-y-3">
            <img src="/logo.png" alt="College Logo" className="h-20 w-auto object-contain" />
            
            <div>
              <h1 className="text-xl font-bold text-emerald-950 uppercase tracking-tight">
                OTUMFUO OSEI TUTU II COLLEGE
              </h1>
              <p className="text-sm font-semibold text-emerald-800">
                Transcript Portal
              </p>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Verify your Serial Code to access and download your official transcript
            </p>

            <div className="pt-1 text-xs text-slate-500 font-semibold">
              Helpline: <span className="text-emerald-900 font-mono">0245700033 / 0200500670</span>
            </div>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-emerald-950 mb-1">
                Student ID Number
              </label>
              <input
                type="text"
                required
                placeholder="e.g. STU-1001"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full border p-2.5 rounded-lg text-sm font-mono focus:ring-2 focus:ring-yellow-400 focus:border-emerald-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-950 mb-1">
                Serial Code
              </label>
              <input
                type="text"
                required
                placeholder="Enter Serial Code"
                value={serialCode}
                onChange={(e) => setSerialCode(e.target.value)}
                className="w-full border p-2.5 rounded-lg text-sm font-mono focus:ring-2 focus:ring-yellow-400 focus:border-emerald-600 outline-none"
              />
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-yellow-300 font-bold py-2.5 rounded-lg text-sm transition shadow-sm"
            >
              {loading ? 'Verifying...' : 'Verify Serial Code'}
            </button>
          </form>

          {/* VERIFIED RECORD DISPLAY */}
          {verifiedRecord && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-4">
              <div className="text-xs space-y-1 border-b border-emerald-200 pb-3">
                <span className="text-[10px] text-emerald-800 uppercase font-bold">Verified Record</span>
                <p className="font-bold text-slate-900 text-base">{verifiedRecord.full_name}</p>
                <p className="text-slate-600 font-mono">ID: {verifiedRecord.id_number}</p>
                <p className="text-slate-600 font-mono">Class: {verifiedRecord.class}</p>
              </div>

              {verifiedRecord.transcript_url ? (
                <a
                  href={verifiedRecord.transcript_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-yellow-400 hover:bg-yellow-500 text-emerald-950 font-bold py-2.5 rounded-lg text-xs text-center transition shadow-sm"
                >
                  📄 Download Official Transcript (PDF)
                </a>
              ) : (
                <div className="p-3 bg-amber-100 border border-amber-300 text-amber-900 text-xs rounded-lg">
                  Transcript document is currently being updated. Please contact the administrative helpline.
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="text-center text-xs text-slate-400 border-t border-emerald-100 pt-4">
        &copy; {new Date().getFullYear()} OTUMFUO OSEI TUTU II COLLEGE. All rights reserved.
      </footer>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-amber-50/30 flex items-center justify-center text-xs text-slate-500">Loading portal...</div>}>
      <VerifyContent />
    </Suspense>
  );
}