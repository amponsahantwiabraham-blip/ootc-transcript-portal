'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const BRAND_LOGO_URL = '/logo.png';
const BRAND_NAME = 'OOTC Transcript Portal';

export default function AdminLoginPage() {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = (e) => {
    e.preventDefault();
    
    // Set your admin password here
    const ADMIN_PASSCODE = process.env.NEXT_PUBLIC_ADMIN_PASSCODE || 'GRANAHAMS0011';

    if (passcode === ADMIN_PASSCODE) {
      // Store session in localStorage
      localStorage.setItem('ootc_admin_auth', 'true');
      router.push('/admin');
    } else {
      setError('Invalid admin passcode. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-amber-50/30 flex items-center justify-center p-4">
      <div className="bg-white border border-emerald-100 shadow-sm rounded-xl p-6 sm:p-8 max-w-md w-full space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <img src={BRAND_LOGO_URL} alt="Logo" className="h-12 w-auto object-contain" />
          <h1 className="text-xl font-bold text-emerald-950">{BRAND_NAME}</h1>
          <p className="text-xs text-slate-500">Admin Dashboard Access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-emerald-950 mb-1">
              Admin Access Passcode
            </label>
            <input
              type="password"
              required
              placeholder="Enter passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-emerald-600 outline-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-yellow-300 font-bold py-2.5 rounded-lg text-sm transition shadow-sm"
          >
            Access Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}