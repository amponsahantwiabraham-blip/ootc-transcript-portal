'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabaseClient';

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [students, setStudents] = useState([]);
  const [uploadedPdfIds, setUploadedPdfIds] = useState(new Set());
  const [selectedClass, setSelectedClass] = useState('');
  const [pdfFilter, setPdfFilter] = useState('ALL'); // 'ALL', 'UPLOADED', 'NOT_UPLOADED'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);

  // Single Add Form State
  const [fullName, setFullName] = useState('');
  const [singleClass, setSingleClass] = useState('');
  const [adding, setAdding] = useState(false);

  // Selection & Batch Delete State
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);

  const ADMIN_SECRET = 'admin123';

  const classesList = [
    '1A1', '1A2', '1A3', '1A4', '1A5', '1A6', '1A7', '1A8', '1A9', '1A10', '1A11', '1A12',
    '1B1', '1B2', '1AG1', '1AG2', '1H1', '1H2', '1H3', '1H4', '1S1', '1S2', '1S3', '1S4',
    '1V1', '1V2', '1V3', '1V4',
    '2A1', '2A2', '2A3', '2A4', '2A5', '2A6', '2A7', '2A8', '2A9', '2A10', '2A11', '2A12',
    '2B1', '2B2', '2AG1', '2AG2', '2H1', '2H2', '2H3', '2H4', '2S1', '2S2', '2S3', '2S4',
    '2V1', '2V2', '2V3', '2V4',
    '3A1', '3A2', '3A3', '3A4', '3A5', '3A6', '3A7', '3A8', '3A9', '3A10', '3A11', '3A12',
    '3B1', '3B2', '3AG1', '3AG2', '3H1', '3H2', '3H3', '3H4', '3S1', '3S2', '3S3', '3S4',
    '3V1', '3V2', '3V3', '3V4'
  ];

  const generateSerialCode = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `OOTC-2026-${randomNum}`;
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPasswordInput === ADMIN_SECRET) {
      setAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Incorrect Admin Password');
    }
  };

  const checkUploadedPdfs = async (studentList) => {
    const { data: files } = await supabase.storage.from('transcripts').list();
    if (files) {
      const fileSet = new Set(files.map(f => f.name.replace('.pdf', '')));
      setUploadedPdfIds(fileSet);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    let query = supabase.from('students').select('*').order('full_name', { ascending: true });
    if (selectedClass) query = query.eq('class', selectedClass);

    const { data } = await query;
    const studentList = data || [];
    setStudents(studentList);
    setSelectedIds([]);
    await checkUploadedPdfs(studentList);
    setLoading(false);
  };

  useEffect(() => {
    if (authenticated) fetchStudents();
  }, [authenticated, selectedClass]);

  // Download Template
  const handleDownloadTemplate = () => {
    const sampleData = [
      { full_name: 'Kofi Mensah', class: '1A1' },
      { full_name: 'Ama Serwaa', class: '2H3' },
      { full_name: 'Kwame Nkrumah', class: '3S1' }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students_Template');
    XLSX.writeFile(workbook, 'OOTC_Student_Import_Template.xlsx');
  };

  // Add Single Student
  const handleAddSingleStudent = async (e) => {
    e.preventDefault();
    if (!fullName || !singleClass) return;
    setAdding(true);

    const serialCode = generateSerialCode();

    const { error } = await supabase.from('students').insert([
      { full_name: fullName, class: singleClass, student_id: serialCode }
    ]);

    if (error) {
      alert('Failed to add student: ' + error.message);
    } else {
      alert(`Student added! Serial Code: ${serialCode}`);
      setFullName('');
      setSingleClass('');
      fetchStudents();
    }
    setAdding(false);
  };

  // Upload Excel Batch
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      if (data.length === 0) {
        alert('The uploaded Excel file is empty.');
        return;
      }

      const formattedRecords = data.map((row) => ({
        full_name: row.full_name || row['Full Name'] || row['Name'],
        class: row.class || row['Class'],
        student_id: generateSerialCode(),
      })).filter((item) => item.full_name && item.class);

      if (formattedRecords.length === 0) {
        alert('Invalid Excel format. Ensure headers are "full_name" and "class".');
        return;
      }

      const { error } = await supabase.from('students').insert(formattedRecords);

      if (error) {
        alert('Failed to import Excel data: ' + error.message);
      } else {
        alert(`Successfully imported ${formattedRecords.length} students with Serial Codes!`);
        fetchStudents();
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  // Upload PDF
  const handleFileUpload = async (e, serialCode) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Please select a valid PDF file.');
      return;
    }

    setUploadingId(serialCode);

    try {
      const { error } = await supabase.storage
        .from('transcripts')
        .upload(`${serialCode}.pdf`, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;
      alert(`Transcript PDF uploaded for Serial Code: ${serialCode}`);
      fetchStudents();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploadingId(null);
    }
  };

  // Delete Single Student
  const handleDeleteSingle = async (id, serialCode, name) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    await supabase.storage.from('transcripts').remove([`${serialCode}.pdf`]);
    await supabase.from('students').delete().eq('id', id);

    alert('Student deleted successfully.');
    fetchStudents();
  };

  // Batch Delete
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected student(s)?`)) return;

    setDeleting(true);
    const selectedStudents = students.filter((st) => selectedIds.includes(st.id));
    const filePaths = selectedStudents.map((st) => `${st.student_id}.pdf`);

    await supabase.storage.from('transcripts').remove(filePaths);
    await supabase.from('students').delete().in('id', selectedIds);

    alert('Selected students deleted successfully.');
    fetchStudents();
    setDeleting(false);
  };

  // Filtering Logic (Search + Class + PDF Status)
  const filteredStudents = students.filter((st) => {
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = st.full_name ? st.full_name.toLowerCase().includes(q) : false;
    const codeMatch = st.student_id ? st.student_id.toLowerCase().includes(q) : false;
    const matchesSearch = nameMatch || codeMatch;

    const hasPdf = uploadedPdfIds.has(st.student_id);
    let matchesPdfFilter = true;
    if (pdfFilter === 'UPLOADED') matchesPdfFilter = hasPdf;
    if (pdfFilter === 'NOT_UPLOADED') matchesPdfFilter = !hasPdf;

    return matchesSearch && matchesPdfFilter;
  });

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md border-t-4 border-green-800 p-8">
          <div className="flex flex-col items-center mb-6">
            <Image src="/logo.png" alt="Logo" width={70} height={70} className="object-contain mb-2" />
            <h1 className="text-xl font-bold text-green-900 uppercase">Admin Access</h1>
          </div>

          {authError && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-xs text-center">{authError}</div>}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <input
              type="password"
              required
              value={adminPasswordInput}
              onChange={(e) => setAdminPasswordInput(e.target.value)}
              placeholder="Enter Admin Password"
              className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:border-green-800"
            />
            <button type="submit" className="w-full bg-green-800 text-yellow-400 font-bold py-2 rounded text-sm">
              Access Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md p-6 border-t-4 border-green-800 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between border-b pb-4">
          <div className="flex items-center space-x-3">
            <Image src="/logo.png" alt="Logo" width={50} height={50} className="object-contain" />
            <h1 className="text-xl font-bold text-green-900 uppercase">Admin Student Management</h1>
          </div>
          <button onClick={() => setAuthenticated(false)} className="text-xs text-red-600 font-bold hover:underline mt-2 md:mt-0">
            Lock Panel
          </button>
        </div>

        {/* Add Student Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-md border">
          
          {/* Manual Add Form */}
          <form onSubmit={handleAddSingleStudent} className="space-y-3">
            <h2 className="text-xs font-bold text-green-900 uppercase">1. Add Single Student</h2>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Full Name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-1/2 px-3 py-1.5 border rounded text-xs focus:outline-none focus:border-green-800"
              />
              <select
                required
                value={singleClass}
                onChange={(e) => setSingleClass(e.target.value)}
                className="w-1/2 px-3 py-1.5 border rounded text-xs bg-white focus:outline-none focus:border-green-800"
              >
                <option value="">Select Class</option>
                {classesList.map((cls) => <option key={cls} value={cls}>{cls}</option>)}
              </select>
            </div>
            <button type="submit" disabled={adding} className="bg-green-800 text-yellow-400 text-xs font-bold py-2 px-4 rounded shadow">
              {adding ? 'Generating Serial Code...' : 'Add Student (Auto Serial Code)'}
            </button>
          </form>

          {/* Excel Import */}
          <div className="space-y-3 border-t md:border-t-0 md:border-l md:pl-6 pt-4 md:pt-0">
            <h2 className="text-xs font-bold text-green-900 uppercase">2. Bulk Import via Excel</h2>
            
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold py-2 px-3 rounded border border-gray-400 shadow transition"
              >
                📥 Download Excel Template
              </button>

              <label className="bg-yellow-500 hover:bg-yellow-600 text-green-950 text-xs font-bold py-2 px-4 rounded cursor-pointer shadow transition inline-block">
                📤 Upload Filled Excel
                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} className="hidden" />
              </label>
            </div>
          </div>

        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between bg-gray-50 p-3 rounded border text-xs gap-3">
          <div className="font-semibold text-gray-700">
            Records Shown: <span className="bg-green-800 text-yellow-400 px-2 py-0.5 rounded-full font-bold ml-1">{filteredStudents.length}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search Input */}
            <input
              type="text"
              placeholder="🔍 Search Name or Serial Code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 border rounded bg-white text-xs focus:outline-none focus:border-green-800"
            />

            {/* Class Filter */}
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-2 py-1.5 border rounded bg-white text-xs focus:outline-none focus:border-green-800"
            >
              <option value="">All Classes</option>
              {classesList.map((cls) => <option key={cls} value={cls}>{cls}</option>)}
            </select>

            {/* PDF Status Filter */}
            <select
              value={pdfFilter}
              onChange={(e) => setPdfFilter(e.target.value)}
              className="px-2 py-1.5 border rounded bg-white text-xs font-semibold focus:outline-none focus:border-green-800"
            >
              <option value="ALL">📄 All PDF Statuses</option>
              <option value="UPLOADED">✅ PDF Uploaded</option>
              <option value="NOT_UPLOADED">❌ PDF Not Uploaded</option>
            </select>

            {/* Batch Delete */}
            {selectedIds.length > 0 && (
              <button onClick={handleBatchDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded whitespace-nowrap">
                Delete Selected ({selectedIds.length})
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-green-800 text-white uppercase">
                <th className="p-2 text-center w-8">
                  <input
                    type="checkbox"
                    onChange={(e) => setSelectedIds(e.target.checked ? filteredStudents.map((s) => s.id) : [])}
                    checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0}
                  />
                </th>
                <th className="p-2 text-center w-8">S/N</th>
                <th className="p-2">Full Name</th>
                <th className="p-2">Class</th>
                <th className="p-2">Serial Code</th>
                <th className="p-2 text-center">PDF Status</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((st, idx) => {
                const isPdfUploaded = uploadedPdfIds.has(st.student_id);

                return (
                  <tr key={st.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(st.id)}
                        onChange={() => setSelectedIds(selectedIds.includes(st.id) ? selectedIds.filter((i) => i !== st.id) : [...selectedIds, st.id])}
                      />
                    </td>
                    <td className="p-2 text-center font-bold text-gray-500">{idx + 1}</td>
                    <td className="p-2 font-semibold text-gray-800">{st.full_name}</td>
                    <td className="p-2 text-gray-600">{st.class}</td>
                    <td className="p-2 font-mono font-bold text-green-900">{st.student_id}</td>
                    <td className="p-2 text-center">
                      {isPdfUploaded ? (
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold text-[10px]">✅ Uploaded</span>
                      ) : (
                        <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold text-[10px]">❌ Pending</span>
                      )}
                    </td>
                    <td className="p-2 text-center space-x-2">
                      <label className="bg-green-800 hover:bg-green-900 text-yellow-400 font-bold py-1 px-2.5 rounded cursor-pointer shadow inline-block">
                        {uploadingId === st.student_id ? 'Uploading...' : 'Upload PDF'}
                        <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, st.student_id)} />
                      </label>

                      <button
                        onClick={() => handleDeleteSingle(st.id, st.student_id, st.full_name)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded shadow text-[10px]"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center p-4 text-gray-500">
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}