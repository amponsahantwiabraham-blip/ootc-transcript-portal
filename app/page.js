'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function StudentPortal() {
  const [serialCodeInput, setSerialCodeInput] = useState('');
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setStudent(null);
    setLoading(true);

    const formattedCode = serialCodeInput.trim().toUpperCase();

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', formattedCode)
      .single();

    if (error || !data) {
      setErrorMsg('Serial Code not found. Please verify your code or contact administration.');
    } else {
      setStudent(data);
    }
    setLoading(false);
  };

  const handleDownloadPDF = async () => {
    if (!student?.student_id) return;
    setDownloading(true);

    try {
      const { data } = supabase.storage
        .from('transcripts')
        .getPublicUrl(`${student.student_id}.pdf`);

      const fileUrl = `${data.publicUrl}?t=${new Date().getTime()}`;
      const res = await fetch(fileUrl);

      if (!res.ok) {
        alert('Transcript PDF has not been uploaded yet. Please contact administration.');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${student.student_id}_Transcript.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert('Error fetching transcript: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md border-t-4 border-green-800 p-8">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <Image src="/logo.png" alt="Logo" width={80} height={80} className="object-contain mb-2" />
          <h1 className="text-xl font-bold text-green-900 uppercase text-center">
            Otumfuo Osei Tutu II College
          </h1>
          <p className="text-xs text-yellow-600 font-semibold uppercase">Official Transcript Portal</p>
          <p className="text-xs text-gray-500 mt-1">
            Helpline: <span className="font-bold text-gray-700">0245700033</span> | <span className="font-bold text-gray-700">0200500670</span>
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Enter Serial Code
            </label>
            <input
              type="text"
              required
              value={serialCodeInput}
              onChange={(e) => setSerialCodeInput(e.target.value)}
              placeholder="e.g. OOTC-2026-123456"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-800 text-sm font-mono uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-800 hover:bg-green-900 text-yellow-400 font-bold py-2.5 rounded transition text-sm shadow"
          >
            {loading ? 'Searching Record...' : 'Access Transcript'}
          </button>
        </form>

        {errorMsg && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-xs text-center mb-4">
            {errorMsg}
          </div>
        )}

        {/* Display Result */}
        {student && (
          <div className="bg-green-50 border border-green-200 rounded p-4 text-center space-y-3">
            <div>
              <h2 className="text-base font-bold text-green-900">{student.full_name}</h2>
              <p className="text-xs text-gray-600">Class: <span className="font-semibold">{student.class}</span></p>
              <p className="text-xs text-gray-600">Serial Code: <span className="font-mono font-bold">{student.student_id}</span></p>
            </div>

            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-green-950 font-bold py-2 rounded text-xs shadow transition"
            >
              {downloading ? 'Downloading...' : 'Download Official Transcript (PDF)'}
            </button>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <Link href="/admin" className="text-xs text-gray-500 font-semibold hover:text-green-800">
            🔒 Admin Access
          </Link>
        </div>

      </div>
    </div>
  );
}