import express from 'express';
import { protect } from '../middleware/auth';
import { getMessages, getThread, sendMessage, getContacts, getUnreadCount } from '../controllers/messageController';

const router = express.Router();

router.use(protect);

router.get('/', getMessages);
router.get('/contacts', getContacts);
router.get('/unread-count', getUnreadCount);
router.get('/thread/:userId', getThread);
router.post('/', sendMessage);

export default router;
