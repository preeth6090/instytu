import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import './config/passport';
import passport from 'passport';
import authRoutes from './routes/authRoutes';
import institutionRoutes from './routes/institutionRoutes';
import aiRoutes from './routes/aiRoutes';
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

// ─── CORS CONFIGURATION ──────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'https://instytu.vercel.app',
].filter(Boolean) as string[];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

// Handle preflight requests before all other routes
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

app.use(express.json());

// ─── SESSION CONFIG ──────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.JWT_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: true, // Required for cross-site cookies
    sameSite: 'none', // Required because frontend and backend are on different domains
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/ptm', ptmRoutes);

app.get('/', (_req, res) => {
  res.json({ message: 'Instytu API running ✅' });
});

// ─── MONGODB CONNECTION ──────────────────────────────────────────────────────
let connected = false;
export const connectDB = async () => {
  if (connected) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    connected = true;
    console.log('MongoDB connected ✅');
  } catch (err) {
    console.error('MongoDB connection error ❌:', err);
  }
};

export default app;