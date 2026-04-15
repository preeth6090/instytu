import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import './config/passport';
import passport from 'passport';
import authRoutes from './routes/authRoutes';
import studentRoutes from './routes/studentRoutes';
import classRoutes from './routes/classRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import gradeRoutes from './routes/gradeRoutes';
import homeworkRoutes from './routes/homeworkRoutes';
import noticeRoutes from './routes/noticeRoutes';
import leaveRoutes from './routes/leaveRoutes';
import feeRoutes from './routes/feeRoutes';
import messageRoutes from './routes/messageRoutes';
import timetableRoutes from './routes/timetableRoutes';
import ptmRoutes from './routes/ptmRoutes';

dotenv.config();

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());

app.use(session({
  secret: process.env.JWT_SECRET as string,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' },
}));

app.use(passport.initialize());
app.use(passport.session());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/ptm', ptmRoutes);

app.get('/', (_req, res) => {
  res.json({ message: 'Instytu API running ✅' });
});

// ─── MongoDB (cached for serverless) ─────────────────────────────────────────
let connected = false;
export const connectDB = async () => {
  if (connected) return;
  await mongoose.connect(process.env.MONGODB_URI as string);
  connected = true;
  console.log('MongoDB connected ✅');
};

export default app;
