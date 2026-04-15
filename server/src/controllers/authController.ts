import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import User from '../models/User';

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
};

// @desc    Register user
// @route   POST /api/auth/register
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    console.log('Register attempt:', email);
    console.log('Password received:', password);

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Hashed password generated:', hashedPassword ? 'yes' : 'no');

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'student'
    });

    console.log('User created, password in DB:', user.password ? 'yes' : 'no');

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id.toString())
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', email);

    const user = await User.findOne({ email }).select('+password');
    console.log('User found:', user ? 'yes' : 'no');
    console.log('User has password:', user?.password ? 'yes' : 'no');

    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.password) return res.status(400).json({ message: 'Please use Google login' });

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);

    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      institution: user.institution,
      token: generateToken(user._id.toString())
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// @desc    Google OAuth login
// @route   POST /api/auth/google
export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { googleId, name, email, avatar } = req.body;
    console.log('Google auth attempt:', email);

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        avatar,
        role: 'student',
        isActive: true
      });
      console.log('New user created via Google:', email);
    } else {
      user.googleId = googleId;
      user.avatar = avatar;
      await user.save();
      console.log('Existing user logged in via Google:', email);
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      institution: user.institution,
      token: generateToken(user._id.toString())
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
export const getMe = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user._id).select('-password').populate('institution');
    res.json(user);
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
export const logout = async (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
};