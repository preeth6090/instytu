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
