import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Spinner from '../../../components/Spinner';

/* ── helpers ──────────────────────────────────────────────────────────────── */
const gradeFromPct = (pct: number) =>
  pct >= 91 ? 'A+' : pct >= 81 ? 'A' : pct >= 71 ? 'B+' : pct >= 61 ? 'B' : pct >= 51 ? 'C+' : pct >= 41 ? 'C' : pct >= 32 ? 'D' : 'F';

const gradeColor = (g: string) =>
  g === 'A+' || g === 'A' ? 'bg-green-100 text-green-700' :
  g === 'B+' || g === 'B' ? 'bg-blue-100 text-blue-700' :
  g === 'C+' || g === 'C' ? 'bg-yellow-100 text-yellow-700' :
  g === 'D' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700';

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Mid-Term', 'Final'];
const GRADING_SCALE = [
  { range: '91–100', grade: 'A+' }, { range: '81–90', grade: 'A' },
  { range: '71–80', grade: 'B+' }, { range: '61–70', grade: 'B' },
  { range: '51–60', grade: 'C+' }, { range: '41–50', grade: 'C' },
  { range: '32–40', grade: 'D' },  { range: '0–31',  grade: 'F' },
];

/* ── Report card print ─────────────────────────────────────────────────────── */
const printReportCard = (student: any, gradesForStudent: any[], classObj: any, academicYear: string, institution: any) => {
  const subjects = classObj?.subjects?.length
    ? classObj.subjects
    : Array.from(new Set(gradesForStudent.map((g: any) => g.subject))) as string[];

  const terms = Array.from(new Set(gradesForStudent.map((g: any) => g.term))) as string[];
  terms.sort((a, b) => TERMS.indexOf(a) - TERMS.indexOf(b));

  const thS = 'border:1px solid #93c5fd;padding:6px 8px;text-align:center;background:#dbeafe;font-size:12px;';
  const tdS = 'border:1px solid #e5e7eb;padding:6px 8px;font-size:12px;';

  // Build lookup: subject → term → grade record
  const lookup: Record<string, Record<string, any>> = {};
  for (const g of gradesForStudent) {
    if (!lookup[g.subject]) lookup[g.subject] = {};
    lookup[g.subject][g.term] = g;
  }

  const totalMarksAllSubjects = subjects.reduce((sum: number, subj: string) => {
    return sum + terms.reduce((s: number, term: string) => s + (lookup[subj]?.[term]?.maxMarks || 0), 0);
  }, 0);
  const obtainedMarksAllSubjects = subjects.reduce((sum: number, subj: string) => {
    return sum + terms.reduce((s: number, term: string) => s + (lookup[subj]?.[term]?.marks || 0), 0);
  }, 0);
  const overallPct = totalMarksAllSubjects > 0 ? Math.round((obtainedMarksAllSubjects / totalMarksAllSubjects) * 100) : 0;
  const overallGrade = gradeFromPct(overallPct);

  const studentName = student?.user?.name || student?.name || '—';
  const rollNo = student?.rollNumber || '—';
  const dob = student?.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-IN') : '—';
  const className = classObj?.name || '—';

  const termHeaders = terms.map(t => `<th style="${thS}">${t}<br><small style="font-weight:400;font-size:10px">/ ${100}</small></th>`).join('');
  const subjectRows = subjects.map((subj: string, i: number) => {
    const rowTotal = terms.reduce((s: number, term: string) => s + (lookup[subj]?.[term]?.marks || 0), 0);
    const rowMax = terms.reduce((s: number, term: string) => s + (lookup[subj]?.[term]?.maxMarks || 0), 0);
    const rowPct = rowMax > 0 ? Math.round((rowTotal / rowMax) * 100) : 0;
    const termCells = terms.map(term => {
      const g = lookup[subj]?.[term];
      return `<td style="${tdS}text-align:center">${g ? `${g.marks}/${g.maxMarks}` : '—'}</td>`;
    }).join('');
    return `<tr style="background:${i % 2 === 0 ? '#ffffff' : '#f9fafb'}">
      <td style="${tdS}font-weight:500">${subj}</td>
      ${termCells}
      <td style="${tdS}text-align:center;font-weight:600">${rowTotal}/${rowMax}</td>
      <td style="${tdS}text-align:center">${rowPct}%</td>
      <td style="${tdS}text-align:center"><span style="background:${rowPct>=70?'#dcfce7':rowPct>=50?'#dbeafe':rowPct>=32?'#fef9c3':'#fee2e2'};padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600">${gradeFromPct(rowPct)}</span></td>
    </tr>`;
  }).join('');

  const gradingScaleRows = GRADING_SCALE.map(gs =>
    `<td style="border:1px solid #bfdbfe;padding:4px 8px;text-align:center">${gs.range}</td>`
  ).join('');
  const gradingGradeRows = GRADING_SCALE.map(gs =>
    `<td style="border:1px solid #bfdbfe;padding:4px 8px;text-align:center;font-weight:700;background:${gs.grade==='A+'?'#22c55e':gs.grade==='A'?'#4ade80':gs.grade==='B+'?'#60a5fa':gs.grade==='B'?'#93c5fd':gs.grade==='C'?'#fde68a':'#f87171'};color:${['A+','A','F'].includes(gs.grade)?'#111':'#374151'}">${gs.grade}</td>`
  ).join('');

  const html = `<!DOCTYPE html><html><head><title>Report Card — ${studentName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; padding: 20px; color: #111; font-size: 13px; }
  .border-deco { border: 3px double #1e40af; padding: 16px; min-height: 100vh; }
  .school-name { text-align: center; font-size: 22px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: 1px; }
  .school-sub { text-align: center; font-size: 11px; color: #374151; margin-top: 2px; }
  .title { text-align: center; font-size: 16px; font-weight: 700; color: #1d4ed8; margin: 10px 0 2px; }
  .session { text-align: center; font-size: 13px; color: #374151; }
  .divider { border: none; border-top: 2px solid #1e40af; margin: 8px 0; }
  .stu-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 30px; margin: 8px 0; font-size: 12px; }
  .stu-row { display: flex; gap: 8px; padding: 3px 0; border-bottom: 1px dotted #d1d5db; }
  .stu-lbl { color: #6b7280; min-width: 120px; }
  .stu-val { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  .summary-bar { display: flex; gap: 10px; margin: 10px 0; }
  .summary-box { flex: 1; border: 1px solid #d1d5db; padding: 6px 10px; text-align: center; border-radius: 4px; }
  .summary-lbl { font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
  .summary-val { font-size: 18px; font-weight: 800; color: #1e3a8a; margin-top: 2px; }
  .co-disc { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 10px 0; }
  .area-title { font-size: 12px; font-weight: 700; text-align: center; padding: 4px; color: white; border-radius: 4px 4px 0 0; }
  .sig-row { display: flex; justify-content: space-between; margin-top: 24px; font-size: 11px; }
  .sig-line { border-top: 1px solid #374151; width: 160px; text-align: center; padding-top: 4px; }
  .promoted { font-size: 13px; font-weight: 600; color: #166534; margin: 8px 0; }
  @media print { body { padding: 0; } }
</style></head><body>
<div class="border-deco">
  <div style="display:flex;align-items:center;gap:16px">
    ${institution?.logo ? `<img src="${institution.logo}" style="max-height:60px;max-width:60px;object-fit:contain">` : ''}
    <div style="flex:1">
      <div class="school-name">${institution?.name || 'School Name'}</div>
      ${institution?.tagline ? `<div class="school-sub">${institution.tagline}</div>` : ''}
      <div class="school-sub">
        ${institution?.phone ? `Ph: ${institution.phone}` : ''}
        ${institution?.email ? ` | Email: ${institution.email}` : ''}
      </div>
    </div>
  </div>
  <hr class="divider">
  <div class="title">Academic Record</div>
  <div class="session">Academic Session – ${academicYear}</div>
  <div class="session">Class: ${className}</div>
  <hr class="divider" style="margin-top:8px">

  <div class="stu-grid">
    <div>
      <div class="stu-row"><span class="stu-lbl">Name of Student</span><span class="stu-val">${studentName}</span></div>
      <div class="stu-row"><span class="stu-lbl">Date of Birth</span><span class="stu-val">${dob}</span></div>
    </div>
    <div>
      <div class="stu-row"><span class="stu-lbl">Roll No.</span><span class="stu-val">${rollNo}</span></div>
      <div class="stu-row"><span class="stu-lbl">Class</span><span class="stu-val">${className}</span></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="${thS}text-align:left;min-width:120px">Subject</th>
        ${termHeaders}
        <th style="${thS}">Grand Total</th>
        <th style="${thS}">%</th>
        <th style="${thS}">Grade</th>
      </tr>
    </thead>
    <tbody>${subjectRows}</tbody>
  </table>

  <div class="summary-bar">
    <div class="summary-box">
      <div class="summary-lbl">Overall Marks</div>
      <div class="summary-val">${obtainedMarksAllSubjects}/${totalMarksAllSubjects}</div>
    </div>
    <div class="summary-box">
      <div class="summary-lbl">Percentage</div>
      <div class="summary-val">${overallPct}%</div>
    </div>
    <div class="summary-box">
      <div class="summary-lbl">Grade</div>
      <div class="summary-val">${overallGrade}</div>
    </div>
  </div>

  <div class="co-disc">
    <div>
      <div class="area-title" style="background:#b45309">Co-Scholastic Area</div>
      <table style="margin:0">
        <tr><th style="border:1px solid #d97706;padding:5px 8px;background:#fef3c7;font-size:11px;text-align:left">Activity</th><th style="border:1px solid #d97706;padding:5px 8px;background:#fef3c7;font-size:11px">Grade</th></tr>
        ${['Work Education','Art Education','Health & Physical Education','Social Skills','Sports'].map(a =>
          `<tr><td style="border:1px solid #fde68a;padding:4px 8px;font-size:11px">${a}</td><td style="border:1px solid #fde68a;padding:4px 8px">&nbsp;</td></tr>`
        ).join('')}
      </table>
    </div>
    <div>
      <div class="area-title" style="background:#1d4ed8">Discipline</div>
      <table style="margin:0">
        <tr><th style="border:1px solid #93c5fd;padding:5px 8px;background:#dbeafe;font-size:11px;text-align:left">Activity</th><th style="border:1px solid #93c5fd;padding:5px 8px;background:#dbeafe;font-size:11px">Grade</th></tr>
        ${['Regularity & Punctuality','Sincerity','Behaviour & Values','Respectfulness for Rules','Attitude Towards Teachers','Attitude Towards Society'].map(a =>
          `<tr><td style="border:1px solid #bfdbfe;padding:4px 8px;font-size:11px">${a}</td><td style="border:1px solid #bfdbfe;padding:4px 8px">&nbsp;</td></tr>`
        ).join('')}
      </table>
    </div>
  </div>

  <div class="promoted">Congratulation! Promoted to Class – _______________</div>

  <div style="margin:8px 0">
    <div style="font-size:11px;font-weight:600;margin-bottom:4px;color:#374151">Grading Scale for Scholastic Areas</div>
    <table style="margin:0;width:auto">
      <tr><td style="border:1px solid #bfdbfe;padding:4px 8px;font-weight:600;background:#dbeafe;font-size:11px">Marks Range</td>${gradingScaleRows}</tr>
      <tr><td style="border:1px solid #bfdbfe;padding:4px 8px;font-weight:600;background:#dbeafe;font-size:11px">Grade</td>${gradingGradeRows}</tr>
    </table>
  </div>

  <div class="sig-row">
    <div class="sig-line">Class Teacher's Signature</div>
    <div class="sig-line">Principal's Signature</div>
  </div>
</div>
<script>window.onload = function() { window.print(); }</script>
</body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
};

/* ── Admin gradebook ───────────────────────────────────────────────────────── */
const AdminGrades = () => {
  const [grades, setGrades] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [institution, setInstitution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [filterTerm, setFilterTerm] = useState('Term 1');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [view, setView] = useState<'gradebook' | 'records'>('gradebook');

  // Gradebook editing state: { studentId_subject: marks }
  const [editingMarks, setEditingMarks] = useState<Record<string, string>>({});
  const [editingMax, setEditingMax] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Individual record modal
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({ studentId: '', classId: '', subject: '', marks: '', maxMarks: '100', term: 'Term 1', remarks: '' });
  const [editing, setEditing] = useState<string | null>(null);
  const [saving2, setSaving2] = useState(false);
  const [err2, setErr2] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [g, s, c] = await Promise.all([api.get('/grades'), api.get('/students'), api.get('/classes')]);
      setGrades(Array.isArray(g.data) ? g.data : []);
      setStudents(Array.isArray(s.data) ? s.data : []);
      setClasses(Array.isArray(c.data) ? c.data : []);
      const i = await api.get('/institutions/me').catch(() => ({ data: null }));
      setInstitution(i.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  /* ── Gradebook helpers ── */
  const classStudents = students.filter(s => !filterClass || s.class?._id === filterClass);
  const classObj = classes.find(c => c._id === filterClass);
  const subjectsForClass: string[] = classObj?.subjects?.length
    ? classObj.subjects
    : Array.from(new Set(grades.filter(g => !filterClass || g.class?._id === filterClass).map((g: any) => g.subject)));

  const gradeKey = (studentId: string, subject: string) => `${studentId}__${subject}`;

  // Pre-populate edit state from loaded grades when filter changes
  useEffect(() => {
    const newMarks: Record<string, string> = {};
    const newMax: Record<string, string> = {};
    for (const g of grades) {
      if (filterTerm && g.term !== filterTerm) continue;
      if (filterClass && g.class?._id !== filterClass) continue;
      const key = gradeKey(g.student?._id || g.student, g.subject);
      newMarks[key] = String(g.marks ?? '');
      newMax[key] = String(g.maxMarks ?? 100);
    }
    setEditingMarks(newMarks);
    setEditingMax(newMax);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grades, filterClass, filterTerm]);

  const saveGradebook = async () => {
    setSaving(true); setSaveMsg('');
    try {
      const gradePayloads: any[] = [];
      for (const student of classStudents) {
        for (const subject of subjectsForClass) {
          const key = gradeKey(student._id, subject);
          const marks = parseFloat(editingMarks[key] ?? '');
          if (isNaN(marks)) continue;
          const maxMarks = parseFloat(editingMax[key] ?? '100') || 100;
          gradePayloads.push({
            studentId: student._id,
            classId: filterClass || student.class?._id,
            subject,
            term: filterTerm,
            marks,
            maxMarks,
            academicYear,
          });
        }
      }
      if (!gradePayloads.length) { setSaveMsg('No marks entered'); setSaving(false); return; }
      await api.post('/grades/bulk', { grades: gradePayloads });
      setSaveMsg(`Saved ${gradePayloads.length} grade records`);
      setTimeout(() => setSaveMsg(''), 3000);
      load();
    } catch (e: any) {
      setSaveMsg(e.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  /* ── Individual record modal ── */
  const openAdd = () => { setForm({ studentId: '', classId: '', subject: '', marks: '', maxMarks: '100', term: 'Term 1', remarks: '' }); setEditing(null); setErr2(''); setModal(true); };
  const openEdit = (g: any) => {
    setForm({ studentId: g.student?._id || g.student, classId: g.class?._id || g.class, subject: g.subject, marks: g.marks, maxMarks: g.maxMarks, term: g.term, remarks: g.remarks || '' });
    setEditing(g._id); setErr2(''); setModal(true);
  };
  const saveRecord = async () => {
    if (!form.studentId || !form.subject || form.marks === '') return setErr2('Student, subject and marks are required');
    if (Number(form.marks) < 0) return setErr2('Marks cannot be negative');
    if (Number(form.marks) > Number(form.maxMarks)) return setErr2('Marks cannot exceed total marks');
    setSaving2(true); setErr2('');
    try {
      if (editing) await api.put(`/grades/${editing}`, { marks: Number(form.marks), maxMarks: Number(form.maxMarks) });
      else await api.post('/grades', { ...form, marks: Number(form.marks), maxMarks: Number(form.maxMarks), academicYear });
      setModal(false); load();
    } catch (e: any) { setErr2(e.response?.data?.message || 'Failed to save'); }
    finally { setSaving2(false); }
  };
  const remove = async (id: string) => {
    if (!window.confirm('Delete this grade record?')) return;
    await api.delete(`/grades/${id}`); load();
  };

  const filtered = grades.filter(g => {
    const cls = !filterClass || g.class?._id === filterClass;
    const term = !filterTerm || g.term === filterTerm;
    return cls && term;
  });

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
          <option value="">All Terms</option>
          {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
          {['2024-25', '2025-26', '2026-27'].map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 ml-auto">
          {(['gradebook', 'records'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-1.5 text-xs rounded-lg font-medium capitalize transition ${view === v ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
              {v === 'gradebook' ? 'Gradebook' : 'All Records'}
            </button>
          ))}
        </div>
        <button onClick={openAdd}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 whitespace-nowrap">
          + Add Grade
        </button>
      </div>

      {view === 'gradebook' ? (
        /* ── Gradebook view ── */
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-gray-700">
              {filterClass ? classObj?.name : 'Select a class above'}
              {filterTerm && ` — ${filterTerm}`}
            </p>
            {filterClass && filterTerm && (
              <div className="flex items-center gap-3">
                {saveMsg && <span className={`text-sm font-medium ${saveMsg.includes('failed') || saveMsg.includes('Failed') ? 'text-red-500' : 'text-green-600'}`}>{saveMsg}</span>}
                <button onClick={saveGradebook} disabled={saving}
                  className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2">
                  {saving && <Spinner />}
                  {saving ? 'Saving...' : 'Save All Marks'}
                </button>
              </div>
            )}
          </div>

          {!filterClass ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-3xl mb-2">📋</p>
              <p className="font-medium">Select a class to view the gradebook</p>
            </div>
          ) : classStudents.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No students in this class</div>
          ) : subjectsForClass.length === 0 ? (
            <div className="text-center py-10 text-gray-400 px-6">
              <p className="font-medium mb-1">No subjects defined for this class</p>
              <p className="text-sm">Add subjects to the class in the Classes section first</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: `${200 + subjectsForClass.length * 110}px` }}>
                <thead className="bg-gray-50 text-gray-500 text-xs">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold w-48 sticky left-0 bg-gray-50">Student</th>
                    {subjectsForClass.map((s: string) => (
                      <th key={s} className="text-center px-3 py-3 font-semibold whitespace-nowrap">{s}</th>
                    ))}
                    <th className="text-center px-3 py-3 font-semibold whitespace-nowrap">Total %</th>
                    <th className="text-center px-3 py-3 font-semibold">Grade</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {classStudents.map(stu => {
                    const stuGrades = grades.filter(g =>
                      (g.student?._id || g.student) === stu._id &&
                      (!filterTerm || g.term === filterTerm)
                    );
                    const totalObtained = stuGrades.reduce((s: number, g: any) => s + (g.marks || 0), 0);
                    const totalMax = stuGrades.reduce((s: number, g: any) => s + (g.maxMarks || 100), 0);
                    const pct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
                    const grade = stuGrades.length > 0 ? gradeFromPct(pct) : '—';
                    return (
                      <tr key={stu._id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 sticky left-0 bg-white">
                          <p className="font-medium text-gray-900 text-sm">{stu.user?.name}</p>
                          <p className="text-xs text-gray-400">Roll: {stu.rollNumber}</p>
                        </td>
                        {subjectsForClass.map((subj: string) => {
                          const key = gradeKey(stu._id, subj);
                          return (
                            <td key={subj} className="px-2 py-2 text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <input
                                  type="number" min={0} max={editingMax[key] || 100}
                                  className={`w-14 text-center border rounded-lg px-1.5 py-1 text-sm outline-none focus:border-indigo-400 ${editingMarks[key] ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200'}`}
                                  placeholder="—"
                                  value={editingMarks[key] ?? ''}
                                  onChange={e => setEditingMarks(m => ({ ...m, [key]: e.target.value }))}
                                />
                                <span className="text-gray-400 text-xs">/</span>
                                <input
                                  type="number" min={1}
                                  className="w-12 text-center border border-gray-200 rounded-lg px-1 py-1 text-xs outline-none focus:border-indigo-400 text-gray-500"
                                  value={editingMax[key] ?? 100}
                                  onChange={e => setEditingMax(m => ({ ...m, [key]: e.target.value }))}
                                />
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center text-sm font-medium text-gray-700">
                          {stuGrades.length > 0 ? `${pct}%` : '—'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {grade !== '—' && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${gradeColor(grade)}`}>{grade}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => {
                              const allGrades = grades.filter(g => (g.student?._id || g.student) === stu._id);
                              printReportCard(stu, allGrades, classObj, academicYear, institution);
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-800 whitespace-nowrap font-medium">
                            Report Card
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ── All records view ── */
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b text-xs text-gray-400 font-medium">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</div>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No grade records found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>{['Student', 'Class', 'Subject', 'Marks', 'Grade', 'Term', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(g => {
                    const pct = g.maxMarks > 0 ? Math.round((g.marks / g.maxMarks) * 100) : 0;
                    const grade = gradeFromPct(pct);
                    return (
                      <tr key={g._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{g.student?.user?.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{g.class?.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{g.subject}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-gray-900">{g.marks}</span>
                          <span className="text-gray-400">/{g.maxMarks}</span>
                          <span className="text-gray-400 text-xs ml-1">({pct}%)</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${gradeColor(grade)}`}>{grade}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{g.term}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex gap-3">
                            <button onClick={() => openEdit(g)} className="text-indigo-600 hover:underline text-xs font-medium">Edit</button>
                            <button onClick={() => remove(g._id)} className="text-red-500 hover:underline text-xs font-medium">Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit grade modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">{editing ? 'Edit Grade' : 'Add Grade'}</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              {err2 && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err2}</p>}

              {!editing && <>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Class</label>
                  <select value={form.classId} onChange={e => setForm((f: any) => ({ ...f, classId: e.target.value, studentId: '' }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
                    <option value="">All classes</option>
                    {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Student *</label>
                  <select value={form.studentId} onChange={e => setForm((f: any) => ({ ...f, studentId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
                    <option value="">Select student</option>
                    {students.filter(s => !form.classId || s.class?._id === form.classId).map(s => (
                      <option key={s._id} value={s._id}>{s.user?.name} — {s.class?.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Subject *</label>
                  {classes.find(c => c._id === form.classId)?.subjects?.length ? (
                    <select value={form.subject} onChange={e => setForm((f: any) => ({ ...f, subject: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
                      <option value="">Select subject</option>
                      {classes.find(c => c._id === form.classId)?.subjects.map((s: string) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <input value={form.subject} onChange={e => setForm((f: any) => ({ ...f, subject: e.target.value }))}
                      placeholder="e.g. Mathematics"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
                  )}
                </div>
              </>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Marks Obtained *</label>
                  <input type="number" min={0} value={form.marks} onChange={e => setForm((f: any) => ({ ...f, marks: e.target.value }))}
                    placeholder="85" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Total Marks</label>
                  <input type="number" min={1} value={form.maxMarks} onChange={e => setForm((f: any) => ({ ...f, maxMarks: e.target.value }))}
                    placeholder="100" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
                </div>
              </div>

              {!editing && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Term</label>
                  <select value={form.term} onChange={e => setForm((f: any) => ({ ...f, term: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
                    {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
                <button onClick={saveRecord} disabled={saving2}
                  className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2">
                  {saving2 && <Spinner />}
                  {saving2 ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Student / Parent view ─────────────────────────────────────────────────── */
const StudentGrades = () => {
  const [grades, setGrades] = useState<any[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [institution, setInstitution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterTerm, setFilterTerm] = useState('');
  const [academicYear] = useState('2025-26');

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, iRes, gRes] = await Promise.all([
          api.get('/students/me'),
          api.get('/institutions/me').catch(() => ({ data: null })),
          api.get('/grades/my'),
        ]);
        setStudent(sRes.data);
        setInstitution(iRes.data);
        setGrades(Array.isArray(gRes.data) ? gRes.data : []);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const terms = Array.from(new Set(grades.map((g: any) => g.term))) as string[];
  terms.sort((a, b) => TERMS.indexOf(a) - TERMS.indexOf(b));
  const filtered = !filterTerm ? grades : grades.filter(g => g.term === filterTerm);

  const totalObtained = filtered.reduce((s: number, g: any) => s + (g.marks || 0), 0);
  const totalMax = filtered.reduce((s: number, g: any) => s + (g.maxMarks || 100), 0);
  const overallPct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
  const overallGrade = filtered.length > 0 ? gradeFromPct(overallPct) : '—';

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterTerm('')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${!filterTerm ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>All Terms</button>
          {terms.map(t => (
            <button key={t} onClick={() => setFilterTerm(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterTerm === t ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{t}</button>
          ))}
        </div>
        {grades.length > 0 && (
          <button
            onClick={() => printReportCard(student, grades, student?.class, academicYear, institution)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700">
            Download Report Card
          </button>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-indigo-500 font-medium">Total Marks</p>
            <p className="text-lg font-bold text-indigo-700">{totalObtained}/{totalMax}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-green-500 font-medium">Percentage</p>
            <p className="text-lg font-bold text-green-700">{overallPct}%</p>
          </div>
          <div className={`border rounded-xl px-4 py-3 text-center ${gradeColor(overallGrade).replace('text-', 'border-').replace('bg-', 'bg-')}`}>
            <p className="text-xs font-medium">Grade</p>
            <p className="text-lg font-bold">{overallGrade}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No grades found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['Subject', 'Marks', 'Grade', 'Term', 'Remarks'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(g => {
                  const pct = g.maxMarks > 0 ? Math.round((g.marks / g.maxMarks) * 100) : 0;
                  const grade = gradeFromPct(pct);
                  return (
                    <tr key={g._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{g.subject}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold">{g.marks}</span>
                        <span className="text-gray-400">/{g.maxMarks}</span>
                        <span className="text-gray-400 text-xs ml-1">({pct}%)</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${gradeColor(grade)}`}>{grade}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{g.term}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{g.remarks || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grading scale */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Grading Scale</p>
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <tbody>
              <tr>
                {GRADING_SCALE.map(gs => (
                  <td key={gs.range} className="border border-blue-200 px-3 py-1.5 text-center text-gray-600">{gs.range}</td>
                ))}
              </tr>
              <tr>
                {GRADING_SCALE.map(gs => (
                  <td key={gs.grade} className={`border border-blue-200 px-3 py-1.5 text-center font-bold ${gradeColor(gs.grade)}`}>{gs.grade}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const GradesSection = ({ role }: { role: string }) => {
  if (role === 'student' || role === 'parent') return <StudentGrades />;
  return <AdminGrades />;
};

export default GradesSection;
