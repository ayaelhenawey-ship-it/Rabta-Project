import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import {
  getMessageHistory,
  accessChat,
  getMyChats,
  createGroup,
  addToGroup,
  removeFromGroup,
  leaveGroupChat,
  sendMessage,
  getSharedContent
} from '../controllers/chat.controller';

const router = Router();

// ==========================================
// 🔒 كل المسارات محمية - لازم اليوزر يكون عامل لوجين
// ==========================================
router.use(protect);

// ==========================================
// 💬 مسارات الشات (Chat Routes)
// ==========================================
// جلب كل محادثات اليوزر
router.get('/', getMyChats);

// إنشاء أو فتح محادثة فردية مع يوزر تاني
router.post('/', accessChat);

// إرسال رسالة لشات معين
router.post('/:id/send', sendMessage);

// جلب المحتوى المشارك في شات معين
router.get('/:id/shared', getSharedContent);

// ==========================================
// 📜 مسار تاريخ الرسائل (History)
// ==========================================
// جلب رسائل شات معين (مع limit و cursor pagination)
// مثال: GET /api/v1/chats/abc123/messages?limit=30&before=xyz789
router.get('/:chatId/messages', getMessageHistory);

// ==========================================
// 👥 مسارات الجروبات (Group Routes)
// ==========================================
// إنشاء جروب جديد
router.post('/group', createGroup);

// إضافة عضو للجروب (Admin Only)
router.put('/group/add', addToGroup);

// إزالة عضو من الجروب (Admin Only)
router.put('/group/remove', removeFromGroup);

// مغادرة جروب
router.put('/group/:chatId/leave', leaveGroupChat);

export default router;
