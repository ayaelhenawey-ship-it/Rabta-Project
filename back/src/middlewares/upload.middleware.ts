import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from '../utils/AppError';

// التأكد من وجود مجلد الرفع بمسار مطلق
const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
console.log('📂 Initializing Upload Directory at:', uploadDir);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 1. إعداد التخزين المحلي (Disk Storage)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // تسمية الملف: userId + الوقت الحالي + الامتداد الأصلي
    const userId = (req as any).user?._id || 'unknown';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `avatar-${userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// 2. فلتر الأمان
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

// 3. تصدير الميدل وير
export const uploadAvatar = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});