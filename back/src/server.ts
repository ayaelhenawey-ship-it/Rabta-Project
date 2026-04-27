// hello test yassa

import dotenv from 'dotenv';
dotenv.config();

console.log("👀 GOOGLE_CLIENT_ID IS:", process.env.GOOGLE_CLIENT_ID);
console.log("👀 GOOGLE_CLIENT_SECRET IS:", process.env.GOOGLE_CLIENT_SECRET);

import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import './config/passport';
import fs from 'fs';
import path from 'path';

// التأكد من وجود مجلد الرفع عند بدء التشغيل
const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Created upload directory at:', uploadDir);
}

import authRoutes from './routes/authRoutes'; 
import apiRoutes from './routes'; 
import { notFound, errorHandler } from './middlewares/errorHandler';

import http from 'http'; 
import { Server } from 'socket.io'; 
import jwt from 'jsonwebtoken';
import Call from './models/Call'; 
import { User } from './models/user';
import * as chatService from './services/chat.service';

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_URL = '/api/v1';

// ==========================================
// 🛡️ الميدلويرز الأساسية (CORS & JSON) - مكانها الصح هنا
// ==========================================
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, 
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// ==========================================
// 🔌 تغليف السيرفر وتهيئة Socket.io (السنترال)
// ==========================================
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  }
});

export const userSocketMap = new Map<string, string>();

// ==========================================
// 🔐 مصادقة اتصال الـ Socket (Socket Authentication Middleware)
// ==========================================
// الفرق بين API auth و socket auth:
// 1. في الـ API العادي: التوكن بييجي في الـ Header مع كل Request (Authorization: Bearer xxx)
//    والميدل وير بيتحقق منه قبل ما يسمح بالوصول للـ endpoint
// 2. في الـ Socket: التوكن بييجي مرة واحدة بس وقت الـ connection (handshake)
//    لأن الاتصال بيفضل مفتوح طول الوقت (persistent connection)
//    فمينفعش نبعت header مع كل event زي الـ REST API
// 3. عشان كده بنستخدم io.use() كـ middleware بيتنفذ قبل ما الاتصال يتم
//    لو التوكن غلط أو مش موجود، بنرفض الاتصال من الأول
io.use(async (socket, next) => {
  try {
    // التوكن ممكن ييجي في الـ auth object أو كـ query parameter
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication error: Token is required'));
    }

    // التحقق من صحة التوكن (نفس اللوجيك بتاع الـ API بالظبط)
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;

    // التأكد إن اليوزر لسه موجود في الداتا بيز
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    // بنحفظ بيانات اليوزر على الـ socket عشان نستخدمها بعد كده في الـ events
    (socket as any).userId = user._id.toString();
    (socket as any).user = user;

    next();
  } catch (error) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  const authenticatedUserId = (socket as any).userId;
  console.log(`🟢 A new device connected to the switchboard, line number: ${socket.id}`);

  // ==========================================
  // 📝 تسجيل اليوزر تلقائياً بعد المصادقة
  // ==========================================
  // بما إن اليوزر اتأكدنا من هويته في الـ middleware
  // بنسجله تلقائياً في الـ userSocketMap
  if (authenticatedUserId) {
    userSocketMap.set(authenticatedUserId, socket.id);
    console.log(`✅ [Auto] The user [${authenticatedUserId}] registered via auth middleware on line [${socket.id}]`);
  }

  // التسجيل اليدوي (للتوافق مع الكود القديم)
  socket.on('register-user', (userId: string) => {
    userSocketMap.set(userId, socket.id);
    console.log(`✅ The user [${userId}] Connected to the socket line [${socket.id}]`);
  });

  // ==========================================
  // 🏠 الانضمام لغرف الشات (Socket Rooms)
  // ==========================================
  // فكرة الـ rooms:
  // بدل ما نبعت الرسالة لكل عضو في الجروب لوحده (يعني 100 emit لـ 100 عضو)
  // بنستخدم الـ rooms عشان نبعت emit واحد بس والـ Socket.io بيوزعها على كل اللي في الغرفة
  // 1. كل شات (سواء فردي أو جماعي) بيكون ليه room باسم الـ chatId
  // 2. لما يوزر يفتح شات، بينضم للـ room بتاعته
  // 3. لما حد يبعت رسالة، بنعمل emit للـ room كلها مش لشخص واحد
  // ليه بنستخدمها بدل ما نبعت لكل واحد لوحده؟
  // - الأداء: emit واحد بدل N emits
  // - التنظيم: كل غرفة مسؤولة عن نفسها
  // - السهولة: مش محتاج نلف على كل الأعضاء ونبعت لكل واحد
  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);
    console.log(`🏠 User [${authenticatedUserId}] joined room [${roomId}]`);
  });

  // مغادرة غرفة (لما اليوزر يقفل الشات)
  socket.on('leave-room', (roomId: string) => {
    socket.leave(roomId);
    console.log(`🚪 User [${authenticatedUserId}] left room [${roomId}]`);
  });

  // ==========================================
  // 💬 إرسال واستقبال الرسائل (Chat Events)
  // ==========================================
  socket.on('send-message', async (data: { chatId: string, content: string, messageType?: string }) => {
    try {
      // حفظ الرسالة في الداتا بيز
      const savedMessage = await chatService.createMessage({
        chatId: data.chatId,
        senderId: authenticatedUserId,
        content: data.content,
        messageType: data.messageType
      });

      // بنبعت الرسالة لكل اللي في الـ room (الشات) - سواء فردي أو جماعي
      // io.to(roomId) بتبعت لكل اللي في الغرفة (بما فيهم المرسل)
      io.to(data.chatId).emit('receive-message', savedMessage);

      console.log(`💬 Message from [${authenticatedUserId}] in chat [${data.chatId}]`);
    } catch (error: any) {
      // لو حصل أي مشكلة (زي إن اليوزر مش عضو في الشات)، نبلغ المرسل بس
      socket.emit('message-error', { message: error.message || 'Failed to send message' });
      console.log("Error sending message:", error);
    }
  });

  // ==========================================
  // ✍️ حالة الكتابة (Typing Indicator)
  // ==========================================
  socket.on('typing', (data: { chatId: string }) => {
    // بنبعت لكل اللي في الغرفة ماعدا المرسل (عشان مش هيعرض لنفسه إنه بيكتب)
    socket.to(data.chatId).emit('user-typing', {
      userId: authenticatedUserId,
      chatId: data.chatId
    });
  });

  socket.on('stop-typing', (data: { chatId: string }) => {
    socket.to(data.chatId).emit('user-stop-typing', {
      userId: authenticatedUserId,
      chatId: data.chatId
    });
  });

  // ==========================================
  // 📞 أحداث المكالمات (Call Events) - موجودة من قبل
  // ==========================================
  socket.on('call-user', async (data: { userToCall: string, signalData: any, from: string, callerName: string }) => {
    console.log("🚨 The server received an event call-user Successfully! And the data is:", data);
    try {
      const newCall = await Call.create({
        caller: data.from,      
        receiver: data.userToCall, 
        type: 'video',
        status: 'missed' 
      });

      const receiverSocketId = userSocketMap.get(data.userToCall);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('incoming-call', {
          signal: data.signalData,
          from: data.from,
          callerName: data.callerName,
          callId: newCall._id 
        });
        console.log(`📞 A ringtone from [${data.from}] to [${data.userToCall}] - Registered`);
      } else {
        socket.emit('user-offline', { message: 'The user is currently offline' });
      }
    } catch (error) {
      console.log("Error saving call:", error);
    }
  });

  socket.on('answer-call', async (data: { to: string, signal: any, callId: string }) => {
    try {
      if (data.callId) {
        await Call.findByIdAndUpdate(data.callId, { status: 'accepted' });
      }
      const callerSocketId = userSocketMap.get(data.to);
      if (callerSocketId) {
        io.to(callerSocketId).emit('call-accepted', data.signal);
        console.log(`✅ The call was opened with [${data.to}] - The status has been updated`);
      }
    } catch (error) {
      console.log("Error updating call:", error);
    }
  });

  socket.on('end-call', (data: { to: string }) => {
    const receiverSocketId = userSocketMap.get(data.to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('call-ended');
      console.log(`🚫 Line lock device: [${data.to}]`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔴 Line disconnected: ${socket.id}`);
    for (let [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        break;
      }
    }
  });
});

// ==========================================
// 🛡️ إعدادات الحماية (Rate Limiting)
// ==========================================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: { 
    status: 'error',
    message: "The allowed request limit has been exceeded, please try again after 15 minutes." 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(BASE_URL, apiLimiter); 

// ==========================================
// 🔑 تهيئة المصادقة عبر Passport
// ==========================================
app.use(passport.initialize());

// ==========================================
// 🗄️ الاتصال بقاعدة البيانات
// ==========================================
mongoose.connect(process.env.MONGO_URI as string)
  .then(() => { 
    console.log('✅ MongoDB Connected');
    console.log('📂 Writing to Database:', mongoose.connection.name);
  })
  .catch(err => console.log('❌ Database Connection Error:', err));

// ==========================================
// 🚀 ربط المسارات بالسيرفر
// ==========================================
app.get('/test', (req: Request, res: Response) => {
  res.send('Server is running');
});

app.use(`${BASE_URL}/auth`, authRoutes);
app.use(BASE_URL, apiRoutes);

// ==========================================
// 🚨 حراس معالجة الأخطاء (Global Error Handlers)
// ==========================================
// دول كفاية جداً ومكانهم هنا صح 100% (في أخر المسارات وقبل تشغيل السيرفر)
app.use(notFound);
app.use(errorHandler);

// ==========================================
// 🌐 تشغيل السيرفر
// ==========================================
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Base URL is ready at: http://localhost:${PORT}${BASE_URL}`);
  console.log(`🔌 Socket.io Central is ready!`);
});