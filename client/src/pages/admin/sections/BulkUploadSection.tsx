import React, { useCallback, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../../../api/axios';
import Spinner from '../../../components/Spinner';

/* ── Column definitions ──────────────────────────────────────── */
const STUDENT_COLS = [
  { key: 'name',        label: 'Name',           required: true,  note: 'Full name' },
  { key: 'email',       label: 'Email',          required: true,  note: 'Unique email' },
  { key: 'password',    label: 'Password',       required: true,  note: 'Min 8 chars' },
  { key: 'rollNumber',  label: 'Roll Number',    required: true,  note: 'Unique within class' },
  { key: 'className',   label: 'Class Name',     required: true,  note: 'e.g. 5-A, 10-B' },
  { key: 'admissionNo', label: 'Admission No',   required: false, note: 'e.g. ADM-001' },
  { key: 'gender',      label: 'Gender',         required: false, note: 'male / female / other' },
  { key: 'dateOfBirth', label: 'Date of Birth',  required: false, note: 'YYYY-MM-DD' },
  { key: 'phone',       label: 'Phone',          required: false, note: '10-digit mobile' },
  { key: 'bloodGroup',  label: 'Blood Group',    required: false, note: 'A+ / B- / O+ etc.' },
  { key: 'busRoute',    label: 'Bus Route',      required: false, note: 'Route number / area' },
  { key: 'address',     label: 'Address',        required: false, note: 'Home address' },
];

const STAFF_COLS = [
  { key: 'name',     label: 'Name',     required: true,  note: 'Full name' },
  { key: 'email',    label: 'Email',    required: true,  note: 'Unique email' },
  { key: 'password', label: 'Password', required: true,  note: 'Min 8 chars' },
  { key: 'role',     label: 'Role',     required: true,  note: 'teacher / admin / staff' },
  { key: 'phone',    label: 'Phone',    required: false, note: '10-digit mobile' },
];

const SAMPLE_STUDENTS = [
  ['Arjun Singh', 'arjun@school.edu', 'Pass@1234', '101', '5-A', 'ADM-101', 'male', '2014-06-15', '9876543210', 'O+', 'Route 3', '12 MG Road Bangalore'],
  ['Priya Sharma', 'priya@school.edu', 'Pass@1234', '102', '5-A', 'ADM-102', 'female', '2014-03-22', '9876543211', 'B+', 'Route 1', '45 Brigade Road'],
  ['Rahul Patel', 'rahul@school.edu', 'Pass@1234', '103', '6-A', 'ADM-103', 'male', '2013-11-10', '9876543212', 'A+', 'Route 2', '7 Indiranagar'],
];

const SAMPLE_STAFF = [
  ['Sunita Rao', 'sunita@school.edu', 'Pass@1234', 'teacher', '9876540001'],
  ['Anil Verma', 'anil@school.edu', 'Pass@1234', 'teacher', '9876540002'],
  ['Deepa Nair', 'deepa@school.edu', 'Pass@1234', 'admin', '9876540003'],
];

type UploadType = 'students' | 'staff';
type RowStatus = 'pending' | 'uploading' | 'success' | 'error';

interface RowResult {
  row: number;
  data: Record<string, string>;
  status: RowStatus;
  message: string;
}

/* ── Download template ───────────────────────────────────────── */
function downloadTemplate(type: UploadType) {
  const isStudent = type === 'students';
  const cols = isStudent ? STUDENT_COLS : STAFF_COLS;
  const sample = isStudent ? SAMPLE_STUDENTS : SAMPLE_STAFF;

  const wb = XLSX.utils.book_new();

  // Sheet 1: Data entry
  const headers = cols.map(c => c.label);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);

  // Style header row (bold + background — basic xlsx coloring)
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cell = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[cell]) continue;
    ws[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: '4F46E5' } } };
  }

  // Set column widths
  ws['!cols'] = cols.map(() => ({ wch: 20 }));

  XLSX.utils.book_append_sheet(wb, ws, isStudent ? 'Students' : 'Staff');

  // Sheet 2: Instructions
  const instructions = [
    ['INSTRUCTIONS'],
    [''],
    ['1. Fill in the data starting from row 2 (row 1 is the header — do not change it)'],
    ['2. Required columns are marked with * in the column key list below'],
    ['3. Delete the sample rows before uploading'],
    [''],
    ['COLUMNS:'],
    ...cols.map(c => [`${c.label}${c.required ? ' *' : ''}`, c.note]),
    [''],
    ['NOTES:'],
    ['• Date of Birth format: YYYY-MM-DD (e.g. 2014-06-15)'],
    ['• Gender values: male, female, other'],
    ['• Blood Group values: A+, A-, B+, B-, AB+, AB-, O+, O-'],
    ['• Role values (staff only): teacher, admin, staff'],
    ['• Class Name must exactly match an existing class (e.g. 5-A, 10-B)'],
    ['• Passwords must be at least 8 characters'],
  ];
  const wsInst = XLSX.utils.aoa_to_sheet(instructions);
  wsInst['!cols'] = [{ wch: 35 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instructions');

  XLSX.writeFile(wb, `instytu-${type}-template.xlsx`);
}

/* ── Main component ──────────────────────────────────────────── */
const BulkUploadSection = ({ role }: { role: string }) => {
  const [type, setType] = useState<UploadType>('students');
  const [rows, setRows] = useState<RowResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const cols = type === 'students' ? STUDENT_COLS : STAFF_COLS;

  const parseFile = (file: File) => {
    setParseError('');
    setDone(false);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (raw.length < 2) { setParseError('File has no data rows.'); return; }

        const header: string[] = raw[0].map((h: any) => String(h).trim());
        const dataRows = raw.slice(1).filter(r => r.some((c: any) => String(c).trim() !== ''));

        if (!dataRows.length) { setParseError('No data rows found (row 1 is header).'); return; }

        // Load classes list for student upload
        let classMap: Record<string, string> = {};
        if (type === 'students') {
          const c = await api.get('/classes').catch(() => ({ data: [] }));
          const classArr = Array.isArray(c.data) ? c.data : [];
          setClasses(classArr);
          classArr.forEach((cls: any) => { classMap[cls.name.toLowerCase()] = cls._id; });
        }

        const results: RowResult[] = dataRows.map((row, i) => {
          const rec: Record<string, string> = {};
          cols.forEach(col => {
            const idx = header.findIndex(h => h.toLowerCase() === col.label.toLowerCase());
            const val = idx >= 0 ? String(row[idx] ?? '').trim() : '';
            rec[col.key] = val;
          });
          // Pre-resolve classId for students
          if (type === 'students' && rec.className) {
            rec._classId = classMap[rec.className.toLowerCase()] || '';
          }
          return { row: i + 2, data: rec, status: 'pending', message: '' };
        });

        setRows(results);
      } catch {
        setParseError('Could not read file. Make sure it is a valid .xlsx or .xls file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const upload = async () => {
    setUploading(true); setDone(false);
    const updated = [...rows];

    for (let i = 0; i < updated.length; i++) {
      const r = updated[i];
      if (r.status === 'success') continue;

      // Validate required fields
      const missing = cols.filter(c => c.required && !r.data[c.key]);
      if (missing.length) {
        updated[i] = { ...r, status: 'error', message: `Missing: ${missing.map(m => m.label).join(', ')}` };
        setRows([...updated]);
        continue;
      }

      updated[i] = { ...r, status: 'uploading', message: '' };
      setRows([...updated]);

      try {
        if (type === 'students') {
          if (!r.data._classId) throw new Error(`Class "${r.data.className}" not found`);
          await api.post('/students', {
            name: r.data.name, email: r.data.email, password: r.data.password,
            rollNumber: r.data.rollNumber, classId: r.data._classId,
            admissionNo: r.data.admissionNo || undefined,
            gender: r.data.gender || undefined,
            dateOfBirth: r.data.dateOfBirth || undefined,
            phone: r.data.phone || undefined,
            bloodGroup: r.data.bloodGroup || undefined,
            busRoute: r.data.busRoute || undefined,
            address: r.data.address || undefined,
          });
        } else {
          await api.post('/users', {
            name: r.data.name, email: r.data.email, password: r.data.password,
            role: r.data.role || 'teacher',
            phone: r.data.phone || undefined,
          });
        }
        updated[i] = { ...r, status: 'success', message: 'Uploaded' };
      } catch (e: any) {
        updated[i] = { ...r, status: 'error', message: e.response?.data?.message || e.message || 'Failed' };
      }
      setRows([...updated]);
    }

    setUploading(false);
    setDone(true);
  };

  const reset = () => { setRows([]); setFileName(''); setDone(false); setParseError(''); if (fileRef.current) fileRef.current.value = ''; };

  const successCount = rows.filter(r => r.status === 'success').length;
  const errorCount   = rows.filter(r => r.status === 'error').length;
  const pendingCount = rows.filter(r => r.status === 'pending').length;
  const uploadingRow = rows.findIndex(r => r.status === 'uploading');
  const progress     = rows.length ? Math.round((successCount + errorCount) / rows.length * 100) : 0;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Bulk Upload</h2>
        <p className="text-sm text-gray-500 mt-1">Import students or staff from an Excel file</p>
      </div>

      {/* Type selector */}
      <div className="flex gap-2">
        {(['students', 'staff'] as UploadType[]).map(t => (
          <button key={t} onClick={() => { setType(t); reset(); }}
            className={`px-5 py-2 rounded-xl text-sm font-semibold border transition-all ${type === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
            {t === 'students' ? '🎒 Students' : '👩‍🏫 Staff'}
          </button>
        ))}
      </div>

      {/* Template download card */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-indigo-900 text-sm">Download Template</p>
          <p className="text-xs text-indigo-600 mt-1">
            {type === 'students'
              ? `${STUDENT_COLS.length} columns — Name, Email, Password, Roll No, Class, Gender, DOB and more`
              : `${STAFF_COLS.length} columns — Name, Email, Password, Role, Phone`}
          </p>
          <p className="text-xs text-indigo-400 mt-1">Includes 3 sample rows and an Instructions sheet</p>
        </div>
        <button onClick={() => downloadTemplate(type)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 flex items-center gap-2 whitespace-nowrap">
          <span>⬇</span> Download .xlsx Template
        </button>
      </div>

      {/* Column reference */}
      <details className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <summary className="px-5 py-3 text-sm font-semibold text-gray-700 cursor-pointer select-none">
          Column reference ({cols.length} columns)
        </summary>
        <div className="overflow-x-auto px-5 pb-4">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="text-xs text-gray-400 uppercase border-b">
                <th className="py-2 text-left font-semibold">Column</th>
                <th className="py-2 text-left font-semibold">Required</th>
                <th className="py-2 text-left font-semibold">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cols.map(c => (
                <tr key={c.key}>
                  <td className="py-2 font-medium text-gray-800">{c.label}</td>
                  <td className="py-2">
                    {c.required
                      ? <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Required</span>
                      : <span className="text-xs text-gray-400">Optional</span>}
                  </td>
                  <td className="py-2 text-gray-500 text-xs">{c.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Upload zone */}
      {!rows.length && (
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}
        >
          <div className="text-4xl mb-3">📂</div>
          <p className="font-semibold text-gray-700">Drop your Excel file here</p>
          <p className="text-sm text-gray-400 mt-1">or click to browse — .xlsx or .xls</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileChange} />
        </div>
      )}

      {parseError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{parseError}</div>
      )}

      {/* Preview + upload */}
      {rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {/* Toolbar */}
          <div className="px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{fileName}</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{rows.length} rows</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={reset} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">
                Clear
              </button>
              {!done && (
                <button onClick={upload} disabled={uploading}
                  className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2">
                  {uploading && <Spinner size="sm" />}
                  {uploading ? `Uploading row ${uploadingRow + 1} of ${rows.length}…` : `Upload ${rows.length} records`}
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {(uploading || done) && (
            <div className="px-5 py-3 border-b bg-gray-50 space-y-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{uploading ? 'Uploading…' : 'Complete'}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-2 bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex gap-4 text-xs mt-1">
                <span className="text-green-600 font-medium">✓ {successCount} succeeded</span>
                {errorCount > 0 && <span className="text-red-500 font-medium">✗ {errorCount} failed</span>}
                {pendingCount > 0 && <span className="text-gray-400">{pendingCount} pending</span>}
              </div>
            </div>
          )}

          {/* Rows table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: `${200 + cols.length * 130}px` }}>
              <thead className="bg-gray-50 text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-4 py-2 text-left w-12">Row</th>
                  <th className="px-4 py-2 text-left w-24">Status</th>
                  {cols.map(c => (
                    <th key={c.key} className="px-3 py-2 text-left whitespace-nowrap">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r) => (
                  <tr key={r.row}
                    className={r.status === 'success' ? 'bg-green-50' : r.status === 'error' ? 'bg-red-50' : r.status === 'uploading' ? 'bg-indigo-50' : ''}>
                    <td className="px-4 py-2 text-gray-400">{r.row}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {r.status === 'pending'    && <span className="text-gray-400">—</span>}
                      {r.status === 'uploading'  && <span className="flex items-center gap-1 text-indigo-600"><Spinner size="sm" /> Uploading</span>}
                      {r.status === 'success'    && <span className="text-green-600 font-medium">✓ Done</span>}
                      {r.status === 'error'      && <span className="text-red-500 font-medium" title={r.message}>✗ {r.message.slice(0, 30)}{r.message.length > 30 ? '…' : ''}</span>}
                    </td>
                    {cols.map(c => (
                      <td key={c.key} className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[160px] truncate">
                        {c.key === 'password' ? '••••••••' : (r.data[c.key] || <span className="text-gray-300">—</span>)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {done && (
            <div className="px-5 py-4 border-t bg-gray-50 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-600">
                <span className="text-green-600 font-semibold">{successCount}</span> uploaded
                {errorCount > 0 && <>, <span className="text-red-500 font-semibold">{errorCount}</span> failed</>}
              </p>
              <button onClick={reset} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700">
                Upload another file
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkUploadSection;
