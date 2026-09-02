'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function HomePage() {
  const [studentId, setStudentId] = useState('');
  const [serialCode, setSerialCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifiedRecord, setVerifiedRecord] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

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
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .ilike('id_number', cleanId)
        .eq('student_id', cleanCode)
        .maybeSingle();

      if (error) {
        setErrorMessage('Unable to connect to portal records. Please check your network.');
      } else if (!data) {
        setErrorMessage('Invalid Student ID or Serial Code combination. Please check details and try again.');
      } else {
        setVerifiedRecord(data);
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-amber-50/40 flex flex-col justify-between p-4 sm:p-8 select-none">
      <main className="max-w-md mx-auto w-full my-auto py-6">
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

            <p className="text-xs text-slate-600 font-medium max-w-xs">
              Provide your Student ID and Serial Code below to view and download your transcript.
            </p>

            <div className="pt-1 text-xs text-slate-500 font-medium bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
              Helpline: <span className="text-emerald-900 font-bold font-mono">0245700033 / 0200500670</span>
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
                  placeholder="e.g. STU-1001"
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
                  <>
                    <svg className="animate-spin h-4 w-4 text-yellow-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <span>🔍 Access Transcript</span>
                )}
              </button>
            </form>
          )}

          {/* VERIFIED STUDENT DISPLAY */}
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
              </div>

              {verifiedRecord.transcript_url ? (
                <a
                  href={verifiedRecord.transcript_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-yellow-400 hover:bg-yellow-500 text-emerald-950 font-bold py-3 rounded-xl text-xs text-center transition shadow-sm active:scale-[0.99]"
                >
                  📄 Download Official PDF Transcript
                </a>
              ) : (
                <div className="p-3 bg-amber-100/80 border border-amber-300 text-amber-900 text-xs rounded-xl font-medium leading-relaxed">
                  Notice: Your transcript file is currently undergoing administrative updates. Please reach out via the helpline numbers above.
                </div>
              )}
              
              <button
                onClick={() => setVerifiedRecord(null)}
                className="w-full text-xs text-slate-500 hover:text-emerald-900 font-medium underline pt-1 text-center block"
              >
                ← Check a different record
              </button>
            </div>
          )}

          {/* PURCHASE LINK PROMPT */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Don't have a Serial Code?{' '}
              <Link
                href="/buy-code"
                className="text-emerald-800 font-bold hover:underline inline-flex items-center space-x-1"
              >
                <span>Click here to purchase</span>
                <span>→</span>
              </Link>
            </p>
          </div>

        </div>
      </main>

      <footer className="text-center text-xs text-slate-400 border-t border-emerald-100/60 pt-4">
        &copy; {new Date().getFullYear()} OTUMFUO OSEI TUTU II COLLEGE. All rights reserved.
      </footer>
    </div>
  );
}