import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import User from '../models/User';
import Institution from '../models/Institution';

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
};

// @desc    Register a new institution + admin user
// @route   POST /api/auth/register
export const register = async (req: Request, res: Response) => {
  try {
    const {
      // Institution fields
      institutionName, institutionType, institutionEmail, institutionPhone, institutionAddress,
      // Admin user fields
      name, email, password,
    } = req.body;

    if (!name || !email || !password || !institutionName || !institutionType) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'An account with this email already exists' });

    // Generate unique slug from institution name
    const baseSlug = institutionName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40);
    let slug = baseSlug;
    let counter = 1;
    while (await Institution.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Create institution first
    const institution = await Institution.create({
      name: institutionName,
      slug,
      type: institutionType,
      email: institutionEmail || email,
      phone: institutionPhone,
      address: institutionAddress,
      plan: 'demo',
      isActive: true,
      createdBy: null,   // will be updated after user creation
    });

    // Create admin user linked to institution
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      institution: institution._id,
      isActive: true,
    });

    // Back-fill createdBy
    institution.createdBy = user._id as any;
    await institution.save();

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      institution: { _id: institution._id, name: institution.name, type: institution.type, slug: institution.slug, logo: institution.logo, primaryColor: institution.primaryColor },
      token: generateToken(user._id.toString()),
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

    const user = await User.findOne({ email }).select('+password').populate('institution', 'name slug logo primaryColor tagline type');
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