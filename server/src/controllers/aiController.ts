import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

async function gemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');

  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data: any = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// POST /api/ai/report-comment
// Generate teacher comment for a student's report card
export const generateReportComment = async (req: AuthRequest, res: Response) => {
  try {
    const { studentName, grades, attendance, behavior } = req.body;
    // grades: [{ subject, marks, maxMarks }]
    const gradeLines = grades.map((g: any) =>
      `${g.subject}: ${g.marks}/${g.maxMarks} (${Math.round((g.marks / g.maxMarks) * 100)}%)`
    ).join(', ');

    const prompt = `Write a concise, professional report card teacher comment (3-4 sentences) for a student named ${studentName}.
Grades: ${gradeLines}.
Attendance: ${attendance}%.
${behavior ? `Behavior note: ${behavior}` : ''}
Keep it encouraging, specific, and actionable. Do not use generic phrases. Write in third person.`;

    const comment = await gemini(prompt);
    res.json({ comment: comment.trim() });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'AI service error' });
  }
};

// POST /api/ai/notice
// Draft a notice from a topic/brief
export const generateNotice = async (req: AuthRequest, res: Response) => {
  try {
    const { topic, type, institutionName, additionalContext } = req.body;

    const prompt = `Write a formal school notice for ${institutionName || 'our institution'}.
Topic: ${topic}
Notice type: ${type || 'general'}
${additionalContext ? `Additional context: ${additionalContext}` : ''}

Format: Start with "NOTICE" as a heading, then the body (2-3 short paragraphs), ending with "By order of the Principal."
Keep it formal, clear, and concise. Return only the notice text.`;

    const notice = await gemini(prompt);
    res.json({ notice: notice.trim() });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'AI service error' });
  }
};

// POST /api/ai/lesson-plan
// Generate a lesson plan for a teacher
export const generateLessonPlan = async (req: AuthRequest, res: Response) => {
  try {
    const { subject, topic, grade, duration, objectives } = req.body;

    const prompt = `Create a detailed lesson plan for a ${grade} class.
Subject: ${subject}
Topic: ${topic}
Duration: ${duration || '45 minutes'}
${objectives ? `Learning objectives: ${objectives}` : ''}

Include: Learning Objectives, Materials Needed, Introduction (5 min), Main Activity (25 min), Practice/Assessment (10 min), Conclusion (5 min), Homework.
Keep it practical and classroom-ready.`;

    const plan = await gemini(prompt);
    res.json({ plan: plan.trim() });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'AI service error' });
  }
};

// POST /api/ai/homework-help
// Student asks for help understanding a concept
export const homeworkHelp = async (req: AuthRequest, res: Response) => {
  try {
    const { question, subject, grade } = req.body;

    const prompt = `You are a helpful tutor for a ${grade || 'school'} student studying ${subject || 'general subjects'}.
The student asks: "${question}"

Explain clearly and simply. Use examples if helpful. Break it into steps if it's a problem. Keep your answer under 200 words. Do not do the homework for them — help them understand how to solve it.`;

    const answer = await gemini(prompt);
    res.json({ answer: answer.trim() });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'AI service error' });
  }
};

// POST /api/ai/leave-reason
// Help a student/parent write a leave reason
export const generateLeaveReason = async (req: AuthRequest, res: Response) => {
  try {
    const { type, days, context } = req.body;

    const prompt = `Write a polite, formal leave application reason (2-3 sentences) for a student.
Leave type: ${type}
Duration: ${days} day(s)
${context ? `Context: ${context}` : ''}
Keep it professional and brief. Return only the reason text, no greeting or signature.`;

    const reason = await gemini(prompt);
    res.json({ reason: reason.trim() });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'AI service error' });
  }
};

// POST /api/ai/attendance-insight
// Analyze attendance data and flag at-risk students
export const attendanceInsight = async (req: AuthRequest, res: Response) => {
  try {
    const { students } = req.body;
    // students: [{ name, present, total, percentage }]

    const atRisk = students.filter((s: any) => s.percentage < 75);
    const lines = students.slice(0, 20).map((s: any) =>
      `${s.name}: ${s.percentage}% (${s.present}/${s.total} days)`
    ).join('\n');

    const prompt = `Analyze this class attendance data and provide actionable insights for a school admin.

${lines}

Provide:
1. Overall class health (1-2 sentences)
2. Students needing immediate attention (those below 75%)
3. One specific recommendation for each at-risk student
4. A suggested action plan

Keep it concise and practical. Total response under 300 words.`;

    const insight = await gemini(prompt);
    res.json({ insight: insight.trim(), atRiskCount: atRisk.length });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'AI service error' });
  }
};

// POST /api/ai/fee-reminder
// Generate personalized fee reminder message
export const generateFeeReminder = async (req: AuthRequest, res: Response) => {
  try {
    const { studentName, parentName, feeTitle, amount, dueDate, institutionName, overdueDays } = req.body;

    const prompt = `Write a polite but firm fee reminder message for a school.
Institution: ${institutionName || 'Our School'}
Student: ${studentName}
Parent/Guardian: ${parentName || 'Parent/Guardian'}
Fee: ${feeTitle} — ₹${amount}
Due date: ${dueDate}
${overdueDays ? `Overdue by: ${overdueDays} days` : ''}

Keep it 3-4 sentences. Professional, friendly tone. Include the amount and due date. Return only the message body, no subject line.`;

    const message = await gemini(prompt);
    res.json({ message: message.trim() });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'AI service error' });
  }
};

// POST /api/ai/ptm-summary
// Summarize a student's performance before a PTM
export const ptmSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { studentName, grades, attendance, homework, leaveCount } = req.body;

    const gradeLines = grades?.map((g: any) =>
      `${g.subject}: ${g.marks}/${g.maxMarks}`
    ).join(', ') || 'No grade data';

    const prompt = `Prepare a brief PTM (Parent-Teacher Meeting) summary for a teacher to discuss with a parent.
Student: ${studentName}
Grades: ${gradeLines}
Attendance: ${attendance}%
Homework completion: ${homework}%
Leaves taken: ${leaveCount || 0}

Write 3-4 talking points the teacher can use in the meeting. Include positives and areas for improvement. Keep it factual and constructive.`;

    const summary = await gemini(prompt);
    res.json({ summary: summary.trim() });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'AI service error' });
  }
};

// POST /api/ai/generate-widget
// Generate a widget config (type, title, query) from a freeform prompt
export const generateWidget = async (req: AuthRequest, res: Response) => {
  try {
    const { prompt: userPrompt } = req.body;

    const systemPrompt = `You are a dashboard widget generator for a school fee management system.
Given a user request, respond with a valid JSON object (no markdown, no code fences) describing a dashboard widget.

The widget object must have:
- "type": one of "stat", "chart", "table", "text"
- "title": concise display title (max 40 chars)
- "query": a short internal query string describing what data to fetch (e.g. "fees_today_by_mode", "pending_dues_all", "top_defaulters_10")
- "size": one of "small", "medium", "large"

Supported query values and what they return:
- fees_today_by_mode → { byMode: { cash: N, upi: N, ... } }
- fees_week_by_mode → same but last 7 days
- fees_month_by_mode → same but last 30 days
- fees_today_total → { value: N, label: "Collected today" }
- fees_week_total → { value: N }
- fees_month_total → { value: N }
- pending_dues_total → { value: N, label: "Total outstanding" }
- pending_dues_by_campus → { byCampus: { campus_name: N, ... } }
- top_defaulters_10 → { rows: [{ name, class, campus, balance }] }
- fees_by_campus_today → { byCampus: { ... } }
- fees_by_day_month → { byDay: { "YYYY-MM-DD": N, ... } }
- collection_summary → { total, count, byMode }

User request: "${userPrompt}"

Respond with ONLY valid JSON. No explanation.`;

    const raw = await gemini(systemPrompt);
    // Strip markdown code fences if any
    const cleaned = raw.replace(/```json?/gi, '').replace(/```/g, '').trim();
    const widget = JSON.parse(cleaned);
    res.json(widget);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to generate widget' });
  }
};

// POST /api/ai/widget-data
// Execute a widget query and return real data
export const getWidgetData = async (req: AuthRequest, res: Response) => {
  try {
    const { query } = req.body;
    const institution = req.user?.institution;

    // Lazy import models
    const Invoice = (await import('../models/Invoice')).default;
    const Fee = (await import('../models/Fee')).default;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now); startOfMonth.setDate(now.getDate() - 30);

    const baseMatch: any = { institution, isVoid: { $ne: true } };

    const aggregateByMode = async (from: Date) => {
      const result = await Invoice.aggregate([
        { $match: { ...baseMatch, createdAt: { $gte: from } } },
        { $group: { _id: '$paymentMode', total: { $sum: '$amountPaid' } } },
      ]);
      return Object.fromEntries(result.map((r: any) => [r._id, r.total]));
    };

    const totalInRange = async (from: Date) => {
      const r = await Invoice.aggregate([
        { $match: { ...baseMatch, createdAt: { $gte: from } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' }, count: { $sum: 1 } } },
      ]);
      return r[0] || { total: 0, count: 0 };
    };

    switch (query) {
      case 'fees_today_by_mode': return res.json({ byMode: await aggregateByMode(startOfToday) });
      case 'fees_week_by_mode':  return res.json({ byMode: await aggregateByMode(startOfWeek) });
      case 'fees_month_by_mode': return res.json({ byMode: await aggregateByMode(startOfMonth) });

      case 'fees_today_total': {
        const r = await totalInRange(startOfToday);
        return res.json({ value: `₹${r.total.toLocaleString('en-IN')}`, label: 'Collected today' });
      }
      case 'fees_week_total': {
        const r = await totalInRange(startOfWeek);
        return res.json({ value: `₹${r.total.toLocaleString('en-IN')}`, label: 'Last 7 days' });
      }
      case 'fees_month_total': {
        const r = await totalInRange(startOfMonth);
        return res.json({ value: `₹${r.total.toLocaleString('en-IN')}`, label: 'Last 30 days' });
      }

      case 'pending_dues_total': {
        const r = await Fee.aggregate([
          { $match: { institution, status: { $in: ['pending', 'partial', 'overdue'] } } },
          { $group: { _id: null, total: { $sum: { $subtract: ['$amount', { $ifNull: ['$amountPaid', 0] }] } } } },
        ]);
        return res.json({ value: `₹${(r[0]?.total || 0).toLocaleString('en-IN')}`, label: 'Pending dues' });
      }

      case 'pending_dues_by_campus': {
        const r = await Fee.aggregate([
          { $match: { institution, status: { $in: ['pending', 'partial', 'overdue'] } } },
          { $lookup: { from: 'campuses', localField: 'campus', foreignField: '_id', as: 'campusData' } },
          { $group: {
            _id: { $ifNull: [{ $arrayElemAt: ['$campusData.name', 0] }, 'No Campus'] },
            total: { $sum: { $subtract: ['$amount', { $ifNull: ['$amountPaid', 0] }] } },
          }},
        ]);
        return res.json({ byCampus: Object.fromEntries(r.map((x: any) => [x._id, x.total])) });
      }

      case 'top_defaulters_10': {
        const r = await Fee.aggregate([
          { $match: { institution, status: { $in: ['pending', 'partial', 'overdue'] } } },
          { $group: { _id: '$student', balance: { $sum: { $subtract: ['$amount', { $ifNull: ['$amountPaid', 0] }] } } } },
          { $sort: { balance: -1 } },
          { $limit: 10 },
          { $lookup: { from: 'students', localField: '_id', foreignField: '_id', as: 'st' } },
          { $lookup: { from: 'users', localField: 'st.user', foreignField: '_id', as: 'usr' } },
          { $project: {
            name: { $ifNull: [{ $arrayElemAt: ['$usr.name', 0] }, 'Unknown'] },
            balance: 1,
          }},
        ]);
        return res.json({ rows: r.map((x: any) => ({ Name: x.name, Balance: `₹${x.balance.toLocaleString('en-IN')}` })) });
      }

      case 'fees_by_campus_today': {
        const r = await Invoice.aggregate([
          { $match: { ...baseMatch, createdAt: { $gte: startOfToday } } },
          { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'st' } },
          { $lookup: { from: 'campuses', localField: 'st.campus', foreignField: '_id', as: 'cam' } },
          { $group: {
            _id: { $ifNull: [{ $arrayElemAt: ['$cam.name', 0] }, 'No Campus'] },
            total: { $sum: '$amountPaid' },
          }},
        ]);
        return res.json({ byCampus: Object.fromEntries(r.map((x: any) => [x._id, x.total])) });
      }

      case 'fees_by_day_month': {
        const r = await Invoice.aggregate([
          { $match: { ...baseMatch, createdAt: { $gte: startOfMonth } } },
          { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: '$amountPaid' },
          }},
          { $sort: { _id: 1 } },
        ]);
        return res.json({ byDay: Object.fromEntries(r.map((x: any) => [x._id, x.total])) });
      }

      case 'collection_summary': {
        const [totals, byMode] = await Promise.all([
          totalInRange(startOfMonth),
          aggregateByMode(startOfMonth),
        ]);
        return res.json({ total: totals.total, count: totals.count, byMode });
      }

      default:
        return res.status(400).json({ message: `Unknown widget query: ${query}` });
    }
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Widget data error' });
  }
};
