'use client';

import { useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function BuyCodePage() {
  const [studentIdInput, setStudentIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentRecord, setStudentRecord] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

  const handleSearch = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setStudentRecord(null);
    setPaymentSuccess(false);

    if (!studentIdInput.trim()) {
      return setErrorMessage('Please enter your Student ID Number.');
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .ilike('id_number', studentIdInput.trim())
      .maybeSingle();

    setLoading(false);

    if (error) {
      setErrorMessage('Database connection error.');
    } else if (!data) {
      setErrorMessage('No student record found with this ID.');
    } else {
      setStudentRecord(data);
    }
  };

  const handlePayClick = () => {
    setErrorMessage('');

    // Simulation mode fallback
    if (!paystackPublicKey || paystackPublicKey.includes('pk_test_xxxxxxxx')) {
      setPaymentSuccess(true);
      return;
    }

    // Direct Inline Paystack Trigger
    if (typeof window !== 'undefined' && window.PaystackPop) {
      const handler = window.PaystackPop.setup({
        key: paystackPublicKey,
        email: studentRecord?.email || `${studentRecord?.id_number?.toLowerCase()}@student.otumfuo.edu.gh`,
        amount: 1500, // 15 GHS
        currency: 'GHS',
        ref: '' + Math.floor(Math.random() * 1000000000 + 1),
        onClose: function () {
          setErrorMessage('Payment process was cancelled.');
        },
        callback: function (response) {
          if (response.status === 'success' || response.reference) {
            setPaymentSuccess(true);
          }
        },
      });
      handler.openIframe();
    } else {
      setErrorMessage('Paystack service is loading. Please try clicking pay again in 3 seconds.');
    }
  };

  return (
    <div className="min-h-screen bg-amber-50/30 flex flex-col justify-between p-4 sm:p-8">
      {/* Official Paystack Inline SDK Script */}
      <Script src="https://js.paystack.co/v1/inline.js" strategy="lazyOnload" />

      <main className="max-w-md mx-auto w-full my-auto py-6">
        <div className="bg-white border border-emerald-100 shadow-sm rounded-xl p-6 sm:p-8 space-y-6">
          
          {/* HEADER & LOGO */}
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
              Enter your Student ID to purchase a Serial Code
            </p>

            <div className="pt-1 text-xs text-slate-500 font-semibold">
              Helpline: <span className="text-emerald-900 font-mono">0245700033 / 0200500670</span>
            </div>
          </div>

          {/* STUDENT SEARCH FORM */}
          {!paymentSuccess && (
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1">
                  Student ID Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STU-1001"
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
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
                {loading ? 'Searching...' : 'Find Student Record'}
              </button>
            </form>
          )}

          {/* STUDENT RECORD & PAYMENT BUTTON */}
          {studentRecord && !paymentSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
              <div className="text-xs space-y-1 border-b border-emerald-200 pb-2">
                <span className="text-[10px] text-emerald-800 uppercase font-bold">Student Record Found</span>
                <p className="font-bold text-slate-900 text-sm">{studentRecord.full_name}</p>
                <p className="text-slate-600 font-mono">Class: {studentRecord.class}</p>
              </div>

              <button
                onClick={handlePayClick}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-emerald-950 font-bold py-2.5 rounded-lg text-xs transition shadow-sm"
              >
                💳 Pay GHS 15 to buy Serial Code
              </button>
            </div>
          )}

          {/* SUCCESSFUL PAYMENT DISPLAY WITH INSTRUCTIONS */}
          {paymentSuccess && (
            <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg space-y-4 text-center">
              <div className="space-y-2">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                  🎉 Payment Successful!
                </span>
                
                <p className="text-xs text-slate-700">
                  Here is your Serial Code:
                </p>

                <div className="p-3 bg-white border border-amber-300 rounded-lg font-mono font-black text-xl text-amber-800 tracking-wider shadow-inner select-all">
                  {studentRecord.student_id}
                </div>

                <div className="p-3 bg-amber-100/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 font-medium text-left leading-relaxed">
                  ⚠️ <strong>Important Note:</strong> Please copy or write down this Serial Code carefully. You will need it together with your Student ID on the home page to access and download your transcript.
                </div>
              </div>

              <Link
                href="/"
                className="block w-full bg-emerald-700 hover:bg-emerald-800 text-yellow-300 font-bold py-3 rounded-lg text-xs transition text-center shadow-sm"
              >
                🏠 Proceed to Home Page to Download
              </Link>
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