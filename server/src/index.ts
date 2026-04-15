import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import './config/passport'; // registers the Google strategy
import passport from 'passport';
import authRoutes from './routes/authRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Core middleware ─────────────────────────────────────────────────────────
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

// express-session is required by passport for the OAuth 2.0 handshake flow
// We still issue JWTs after auth — sessions are not used beyond that
app.use(
  session({
    secret: process.env.JWT_SECRET as string,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

app.get('/', (_req, res) => {
  res.json({ message: 'Instytu API running ✅' });
});

// ─── Database + server ───────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => {
    console.log('MongoDB connected ✅');
    app.listen(PORT, () => console.log(`Server running on port ${PORT} ✅`));
  })
  .catch((err) => console.error('MongoDB connection error:', err));
