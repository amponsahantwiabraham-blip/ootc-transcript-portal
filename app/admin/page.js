'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import QRCode from 'react-qr-code';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// --- GREEN & YELLOW BRAND CONFIGURATION ---
const BRAND_LOGO_URL = '/logo.png'; 
const BRAND_NAME = 'OOTC Transcript Portal';
const BASE_VERIFY_URL = 'https://ootc-transcript-portal.vercel.app';

// Theme styles
const BRAND_BG = 'bg-emerald-700 hover:bg-emerald-800';
const BRAND_TEXT = 'text-emerald-800';
const BRAND_RING = 'focus:ring-yellow-400 focus:border-emerald-600';

const generateSerialCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TRN-${result}`;
};

export default function AdminPage() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingPdfId, setUploadingPdfId] = useState(null);
  const [activeTab, setActiveTab] = useState('single');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');
  const [filterPdfStatus, setFilterPdfStatus] = useState('ALL');

  const classOptions = [
    '1A1', '1A2', '1A3', '1A4', '1A5', '1A6', '1A7', '1A8', '1A9', '1A10', '1A11', '1A12',
    '1B1', '1B2', '1AG1', '1AG2', '1H1', '1H2', '1H3', '1H4', '1S1', '1S2', '1S3', '1S4', '1V1', '1V2', '1V3', '1V4',
    '2A1', '2A2', '2A3', '2A4', '2A5', '2A6', '2A7', '2A8', '2A9', '2A10', '2A11', '2A12',
    '2B1', '2B2', '2AG1', '2AG2', '2H1', '2H2', '2H3', '2H4', '2S1', '2S2', '2S3', '2S4', '2V1', '2V2', '2V3', '2V4',
    '3A1', '3A2', '3A3', '3A4', '3A5', '3A6', '3A7', '3A8', '3A9', '3A10', '3A11', '3A12',
    '3B1', '3B2', '3AG1', '3AG2', '3H1', '3H2', '3H3', '3H4', '3S1', '3S2', '3S3', '3S4', '3V1', '3V2', '3V3', '3V4'
  ];

  const [newStudent, setNewStudent] = useState({
    full_name: '',
    class: classOptions[0],
    id_number: '',
    student_id: '',
  });

  // CHECK AUTHENTICATION ON LOAD
  useEffect(() => {
    const isAuth = localStorage.getItem('ootc_admin_auth');
    if (!isAuth) {
      router.push('/admin/login');
    } else {
      fetchStudents();
      setNewStudent((prev) => ({ ...prev, student_id: generateSerialCode() }));
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('ootc_admin_auth');
    router.push('/admin/login');
  };

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*').order('created_at', { ascending: false });
    if (data) setStudents(data);
  };

  const filteredStudents = useMemo(() => {
    return students.filter((st) => {
      const matchesSearch =
        st.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.id_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.student_id?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClass = filterClass === 'ALL' || st.class === filterClass;

      const matchesPdf =
        filterPdfStatus === 'ALL' ||
        (filterPdfStatus === 'UPLOADED' && !!st.transcript_url) ||
        (filterPdfStatus === 'PENDING' && !st.transcript_url);

      return matchesSearch && matchesClass && matchesPdf;
    });
  }, [students, searchQuery, filterClass, filterPdfStatus]);

  const printableStudents = useMemo(() => {
    if (selectedStudentIds.length > 0) {
      return students.filter((st) => selectedStudentIds.includes(st.id));
    }
    return filteredStudents;
  }, [students, selectedStudentIds, filteredStudents]);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudent.full_name || !newStudent.class || !newStudent.id_number || !newStudent.student_id) {
      return alert('All fields are required.');
    }

    setLoading(true);
    const { error } = await supabase.from('students').insert([newStudent]);
    setLoading(false);

    if (error) {
      alert('Error adding student: ' + error.message);
    } else {
      alert('Student added successfully!');
      setNewStudent({
        full_name: '',
        class: classOptions[0],
        id_number: '',
        student_id: generateSerialCode(),
      });
      fetchStudents();
    }
  };

  const handleDownloadExcelTemplate = () => {
    const templateData = [
      { 'Full Name': 'Kwame Mensah', 'Class': '1A1', 'Student ID': 'STU-1001', 'Serial Code': 'TRN-8A3K9P' },
      { 'Full Name': 'Ama Serwaa', 'Class': '1A2', 'Student ID': 'STU-1002', 'Serial Code': 'TRN-4M9P2Q' }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'Student_Upload_Template.xlsx');
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws);

        const rows = data.map((row) => ({
          full_name: row['Full Name'],
          class: row['Class'],
          id_number: row['Student ID'],
          student_id: row['Serial Code'] || generateSerialCode(),
        }));

        const { error } = await supabase.from('students').insert(rows);
        setLoading(false);

        if (error) {
          alert('Bulk upload failed: ' + error.message);
        } else {
          alert(`Successfully imported ${rows.length} students!`);
          e.target.value = '';
          fetchStudents();
        }
      } catch (err) {
        setLoading(false);
        alert('Error parsing Excel file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handlePdfUpload = async (studentId, e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      return alert('Please select a valid PDF file.');
    }

    setUploadingPdfId(studentId);
    const fileExt = file.name.split('.').pop();
    const filePath = `transcripts/${studentId}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('transcripts')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setUploadingPdfId(null);
      return alert('Failed to upload transcript: ' + uploadError.message);
    }

    const { data: urlData } = supabase.storage.from('transcripts').getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from('students')
      .update({ transcript_url: urlData.publicUrl })
      .eq('id', studentId);

    setUploadingPdfId(null);

    if (updateError) {
      alert('Failed to link PDF: ' + updateError.message);
    } else {
      alert('Transcript uploaded successfully!');
      fetchStudents();
    }
  };

  const handleDeleteSingle = async (id, name) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) {
      alert('Delete failed: ' + error.message);
    } else {
      setSelectedStudentIds((prev) => prev.filter((item) => item !== id));
      fetchStudents();
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudentIds(filteredStudents.map((st) => st.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleSelectStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedStudentIds.length === 0) return;
    if (!confirm(`Delete ${selectedStudentIds.length} student(s)?`)) return;

    const { error } = await supabase.from('students').delete().in('id', selectedStudentIds);
    if (error) {
      alert('Bulk delete failed: ' + error.message);
    } else {
      alert('Selected students deleted!');
      setSelectedStudentIds([]);
      fetchStudents();
    }
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <>
      {/* ----------------- ADMIN DASHBOARD (HIDDEN WHEN PRINTING) ----------------- */}
      <div className="print:hidden min-h-screen bg-amber-50/30 p-6 max-w-6xl mx-auto space-y-8">
        {/* BRAND HEADER & LOGO */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-emerald-200 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <img src={BRAND_LOGO_URL} alt="Brand Logo" className="h-10 w-auto object-contain" />
            <h1 className="text-2xl font-bold text-emerald-950">{BRAND_NAME}</h1>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('single')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                activeTab === 'single' ? `${BRAND_BG} text-yellow-300 shadow-sm` : 'bg-white border border-emerald-200 text-emerald-900 hover:bg-emerald-50'
              }`}
            >
              Add Single Student
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                activeTab === 'bulk' ? `${BRAND_BG} text-yellow-300 shadow-sm` : 'bg-white border border-emerald-200 text-emerald-900 hover:bg-emerald-50'
              }`}
            >
              Bulk Excel Upload
            </button>
            <button
              onClick={handleLogout}
              className="bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 px-3 py-2 rounded-lg font-medium text-sm transition"
            >
              Logout
            </button>
          </div>
        </div>

        {activeTab === 'single' && (
          <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-emerald-900">Add New Student</h2>
            <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kwame Mensah"
                  value={newStudent.full_name}
                  onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
                  className={`w-full border p-2.5 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 ${BRAND_RING}`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Select Class</label>
                <select
                  value={newStudent.class}
                  onChange={(e) => setNewStudent({ ...newStudent, class: e.target.value })}
                  className={`w-full border p-2.5 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 ${BRAND_RING} bg-white`}
                >
                  {classOptions.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Student ID Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STU-1005"
                  value={newStudent.id_number}
                  onChange={(e) => setNewStudent({ ...newStudent, id_number: e.target.value })}
                  className={`w-full border p-2.5 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 ${BRAND_RING}`}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-slate-600">
                    Serial Code <span className="text-emerald-700 font-normal">(Auto-generated)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewStudent({ ...newStudent, student_id: generateSerialCode() })}
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    Regenerate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newStudent.student_id}
                  onChange={(e) => setNewStudent({ ...newStudent, student_id: e.target.value })}
                  className={`w-full border p-2.5 rounded-lg text-sm font-mono font-bold text-emerald-900 bg-yellow-50/60 focus:outline-none focus:ring-2 ${BRAND_RING}`}
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`${BRAND_BG} text-yellow-300 font-bold px-6 py-2.5 rounded-lg text-sm transition shadow-sm`}
                >
                  {loading ? 'Saving...' : 'Save Student'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'bulk' && (
          <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-emerald-900">Bulk Upload Students via Excel</h2>

            <div className="p-4 bg-yellow-50/80 border border-yellow-300 rounded-lg space-y-2">
              <h3 className="font-semibold text-amber-900 text-sm">Step 1: Download Format</h3>
              <p className="text-xs text-amber-800">Get the formatted Excel sheet pre-configured with column headers.</p>
              <button
                onClick={handleDownloadExcelTemplate}
                className="bg-emerald-700 text-yellow-300 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-800 transition"
              >
                Download Excel Template (.xlsx)
              </button>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
              <h3 className="font-semibold text-emerald-900 text-sm">Step 2: Upload Filled File</h3>
              <p className="text-xs text-emerald-800">Select your completed Excel file to import all students at once.</p>
              <label className="inline-block bg-yellow-400 text-emerald-950 font-bold px-5 py-2.5 rounded-lg text-xs cursor-pointer hover:bg-yellow-500 transition shadow-sm">
                {loading ? 'Uploading...' : 'Select & Upload Excel File'}
                <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} disabled={loading} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {/* STUDENT ROSTER LIST & FILTERS */}
        <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-emerald-900">
                Existing Students ({filteredStudents.length} / {students.length})
              </h2>
              <p className="text-xs text-slate-500">Filter, search, and print student verification slips</p>
            </div>

            <div className="flex items-center gap-2">
              {/* PRINT SLIPS BUTTON */}
              <button
                onClick={handleTriggerPrint}
                className="bg-emerald-800 text-yellow-300 border border-yellow-400/30 px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-900 transition flex items-center gap-1.5 shadow-sm"
              >
                🖨️ Print Slips ({printableStudents.length})
              </button>

              {selectedStudentIds.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="bg-rose-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-rose-700 transition flex items-center gap-1"
                >
                  Delete ({selectedStudentIds.length})
                </button>
              )}
            </div>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
            <div>
              <label className="block text-xs font-medium text-emerald-950 mb-1">Search Name or ID</label>
              <input
                type="text"
                placeholder="Search by name, student ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full border p-2 rounded-md text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 ${BRAND_RING}`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-emerald-950 mb-1">Filter by Class</label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className={`w-full border p-2 rounded-md text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 ${BRAND_RING}`}
              >
                <option value="ALL">All Classes</option>
                {classOptions.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-emerald-950 mb-1">Filter by PDF Status</label>
              <select
                value={filterPdfStatus}
                onChange={(e) => setFilterPdfStatus(e.target.value)}
                className={`w-full border p-2 rounded-md text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 ${BRAND_RING}`}
              >
                <option value="ALL">All PDF Statuses</option>
                <option value="UPLOADED">Uploaded Only</option>
                <option value="PENDING">Pending Only</option>
              </select>
            </div>
          </div>

          {/* ROSTER TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b bg-emerald-50/60 text-emerald-950 font-semibold">
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={
                        filteredStudents.length > 0 &&
                        selectedStudentIds.length === filteredStudents.length
                      }
                      className="rounded border-emerald-300 text-emerald-600 focus:ring-yellow-400"
                    />
                  </th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Class</th>
                  <th className="p-3">Student ID</th>
                  <th className="p-3">Serial Code</th>
                  <th className="p-3">PDF Status</th>
                  <th className="p-3">Upload Transcript</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500">
                      No matching students found.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => {
                    const isSelected = selectedStudentIds.includes(st.id);
                    const isUploaded = !!st.transcript_url;

                    return (
                      <tr key={st.id} className={`border-b hover:bg-yellow-50/30 ${isSelected ? 'bg-yellow-50' : ''}`}>
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectStudent(st.id)}
                            className="rounded border-emerald-300 text-emerald-600 focus:ring-yellow-400"
                          />
                        </td>
                        <td className="p-3 font-medium text-slate-800">{st.full_name}</td>
                        <td className="p-3 text-emerald-900 font-semibold">{st.class}</td>
                        <td className={`p-3 font-mono font-bold ${BRAND_TEXT}`}>{st.id_number || 'N/A'}</td>
                        <td className="p-3 font-mono text-amber-700 font-semibold">{st.student_id}</td>

                        <td className="p-3">
                          {isUploaded ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              Uploaded
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              Pending
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <label className="cursor-pointer bg-emerald-50 border border-emerald-200 text-emerald-900 hover:bg-emerald-100 px-3 py-1.5 rounded-md text-xs font-medium transition">
                              {uploadingPdfId === st.id ? 'Uploading...' : isUploaded ? 'Replace PDF' : 'Upload PDF'}
                              <input
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => handlePdfUpload(st.id, e)}
                                disabled={uploadingPdfId === st.id}
                                className="hidden"
                              />
                            </label>

                            {isUploaded && (
                              <a
                                href={st.transcript_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-xs underline font-bold ${BRAND_TEXT}`}
                              >
                                View
                              </a>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteSingle(st.id, st.full_name)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-semibold hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ----------------- PRINTABLE STUDENT SLIPS (VISIBLE ONLY WHEN PRINTING) ----------------- */}
      <div className="hidden print:grid print:grid-cols-2 print:gap-4 print:p-2 bg-white text-black font-sans">
        {printableStudents.map((st) => {
          const verifyUrl = `${BASE_VERIFY_URL}/verify?code=${st.student_id}&id=${st.id_number}`;

          return (
            <div
              key={st.id}
              className="border-2 border-emerald-800 rounded-lg p-4 flex flex-col justify-between space-y-3 bg-white page-break-inside-avoid"
            >
              {/* SLIP HEADER */}
              <div className="flex items-center justify-between border-b border-emerald-800/30 pb-2">
                <div className="flex items-center gap-2">
                  <img src={BRAND_LOGO_URL} alt="Logo" className="h-7 w-auto object-contain" />
                  <span className="font-bold text-xs text-emerald-950 uppercase tracking-wide">
                    {BRAND_NAME}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-yellow-100 px-2 py-0.5 rounded border border-yellow-300">
                  OFFICIAL ACCESS CARD
                </span>
              </div>

              {/* SLIP BODY */}
              <div className="flex justify-between items-center gap-2">
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-gray-500 block font-semibold">Student Name</span>
                    <span className="font-bold text-sm text-gray-900">{st.full_name}</span>
                  </div>

                  <div className="flex gap-4">
                    <div>
                      <span className="text-[10px] uppercase text-gray-500 block font-semibold">Class</span>
                      <span className="font-bold text-emerald-900">{st.class}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-gray-500 block font-semibold">Student ID</span>
                      <span className="font-mono font-bold text-gray-800">{st.id_number || 'N/A'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-gray-500 block font-semibold">Verification Serial Code</span>
                    <span className="font-mono font-black text-amber-800 text-sm">{st.student_id}</span>
                  </div>
                </div>

                {/* QR CODE GENERATOR */}
                <div className="flex flex-col items-center justify-center p-1.5 bg-gray-50 border rounded-md">
                  <QRCode value={verifyUrl} size={82} />
                  <span className="text-[8px] font-semibold text-gray-500 mt-1">SCAN TO ACCESS</span>
                </div>
              </div>

              {/* SLIP FOOTER */}
              <div className="border-t border-dashed border-gray-300 pt-1.5 text-[9px] text-gray-500 text-center">
                Scan QR Code or visit <span className="font-bold text-emerald-900">{BASE_VERIFY_URL}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}