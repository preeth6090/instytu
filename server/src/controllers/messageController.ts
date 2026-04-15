import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Message from '../models/Message';
import User from '../models/User';

// GET /api/messages — inbox + sent
export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;

    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
      institution: req.user!.institution,
    })
      .populate('sender', 'name role avatar')
      .populate('receiver', 'name role avatar')
      .sort({ createdAt: -1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// GET /api/messages/thread/:userId — conversation with specific user
export const getThread = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!._id;
    const other = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: me, receiver: other },
        { sender: other, receiver: me },
      ],
    })
      .populate('sender', 'name role avatar')
      .populate('receiver', 'name role avatar')
      .sort({ createdAt: 1 });

    // Mark unread messages as read
    await Message.updateMany(
      { sender: other, receiver: me, read: false },
      { $set: { read: true } }
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// POST /api/messages
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { receiverId, content, subject } = req.body;

    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ message: 'Recipient not found' });

    const msg = await Message.create({
      sender: req.user!._id,
      receiver: receiverId,
      institution: req.user!.institution,
      content,
      subject,
    });

    await msg.populate('sender', 'name role avatar');
    await msg.populate('receiver', 'name role avatar');
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// GET /api/messages/contacts — list teachers/staff for parent to message
export const getContacts = async (req: AuthRequest, res: Response) => {
  try {
    const roles = req.user!.role === 'parent' ? ['teacher', 'admin'] : ['teacher', 'admin', 'parent'];
    const contacts = await User.find({
      institution: req.user!.institution,
      role: { $in: roles },
      isActive: true,
    }).select('name email role avatar');

    res.json(contacts);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// GET /api/messages/unread-count
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const count = await Message.countDocuments({ receiver: req.user!._id, read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};
