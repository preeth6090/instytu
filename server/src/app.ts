import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import './config/passport';
import passport from 'passport';
import authRoutes from './routes/authRoutes';

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
