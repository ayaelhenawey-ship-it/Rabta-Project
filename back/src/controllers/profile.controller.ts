import { Request, Response, NextFunction } from 'express';
import { User } from '../models/user';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';

// 1. جلب بيانات البروفايل الشخصي (لليوزر اللي عامل لوجين)
export const getMyProfile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // سحر الميدل وير بتاعك: req.user شايل كل بيانات اليوزر وجاهز!
  res.status(200).json({
    status: 'success',
    data: { user: req.user }
  });
});

// 2. تحديث بيانات البروفايل
export const updateMyProfile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // 1. نمنع اليوزر يغير بيانات حساسة من هنا (رقم التليفون، الإيميل، أو الباسورد ليهم مسارات حماية خاصة)
  if (req.body.password || req.body.email || req.body.phoneNumber) {
    return next(new AppError('The password, email, or phone number cannot be updated from this path.', 400));
  }

  // 2. نفلتر الداتا عشان الهاكرز ميرفعوش الـ role بتاعهم لـ Admin مثلاً!
  let normalizedSkills;
  
  if (req.body.skills && Array.isArray(req.body.skills)) {
    // ليه بنعمل normalization:
    // عشان نوحد شكل البيانات في الداتا بيز (كله حروف صغيرة ومن غير مسافات زيادة)
    // ده بيحسن جداً من كفاءة البحث وبيمنع تكرار نفس المهارة بأشكال مختلفة (مثلاً React و react و  React)
    const uniqueSkills = [...new Set(
      req.body.skills.map((skill: string) => skill.toLowerCase().trim())
    )];

    // ليه حاطين limit:
    // عشان نحمي الداتا بيز من أحجام البيانات الضخمة (الـ Payload) ونمنع اليوزر إنه يضيف مهارات عشوائية بلا نهاية فده بيحسن الأداء
    if (uniqueSkills.length > 15) {
      return next(new AppError('You cannot add more than 15 skills.', 400));
    }
    normalizedSkills = uniqueSkills;
  }

  const allowedUpdates: any = {
    fullName: req.body.fullName,
    bioHeadline: req.body.bioHeadline,
    jobTitle: req.body.jobTitle,
    about: req.body.about,
    location: req.body.location,
    skills: normalizedSkills !== undefined ? normalizedSkills : req.body.skills,
    portfolio: req.body.portfolio,
    companyName: req.body.companyName,
    industry: req.body.industry,
    status: req.body.status,
    profileComplete: req.body.profileComplete,
    settings: req.body.settings
  };

  // تنظيف الأوبجكت من أي قيم undefined عشان منمسحش داتا قديمة
  Object.keys(allowedUpdates).forEach(key => allowedUpdates[key] === undefined && delete allowedUpdates[key]);

  // 3. التحديث في قاعدة البيانات
  const updatedUser = await User.findByIdAndUpdate((req.user as any)._id, allowedUpdates, {
    new: true, // يرجع الداتا الجديدة بعد التحديث
    runValidators: true // يتأكد إن الداتا مطابقة لشروط الـ Schema
  });

  res.status(200).json({
    status: 'success',
    message: 'The profile has been updated successfully',
    data: { user: updatedUser }
  });
});

// 3. جلب بروفايل مستخدم آخر (عشان لو حد عايز يفتح بروفايل زميله)
export const getUserProfile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return next(new AppError('This user was not found.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

// 4. حذف الحساب الشخصي
export const deleteMyAccount = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  await User.findByIdAndDelete(req.user!._id);
  
  res.status(204).json({ // 204 No Content
    status: 'success',
    data: null
  });
});

// ==========================================
// 👇 الإضافة الجديدة الخاصة برفع الصورة الشخصية
// ==========================================

// 5. تحديث الصورة الشخصية (Avatar)
export const uploadProfileAvatar = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. لو اليوزر مبعتش صورة أو الميدل وير رفضها
    if (!req.file) {
      return next(new AppError('Please upload an image file.', 400));
    }

    console.log('📸 Uploading file:', req.file.filename);

    // 2. ده المسار اللي اتسيف فيه الملف على السيرفر
    // بنحول الـ Backslashes لـ Forward Slashes عشان الـ URL يشتغل صح في كل الأنظمة
    const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/avatars/${req.file.filename}`;

console.log('🔗 Generated URL:', avatarUrl);
    // 3. تحديث اليوزر باللينك الجديد في قاعدة البيانات
    const updatedUser = await User.findByIdAndUpdate(
      (req.user as any)._id, 
      { avatar: avatarUrl }, 
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Avatar uploaded successfully',
      data: { user: updatedUser }
    });
  } catch (error: any) {
    console.error('❌ Upload Controller Error:', error);
    return next(new AppError(error.message || 'Error updating avatar', 500));
  }
});

// 6. البحث عن المستخدمين (للتوظيف أو التواصل)
export const searchUsers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // 1. تجهيز أوبجكت الفلترة الفاضي
  const queryObj: any = {};

  // أ. البحث بكلمة مفتاحية (Keyword) في الاسم أو المهارات أو النبذة
  if (req.query.keyword) {
    // استخدمنا Regex عشان نبحث عن جزء من الكلمة (حتى لو مش الكلمة كاملة)
    // حرف الـ 'i' معناه (Case-insensitive) عشان يتجاهل الحروف الكابيتال والسمول
    const searchRegex = new RegExp(req.query.keyword as string, 'i');
    
    queryObj.$or = [
      { fullName: searchRegex },
      { skills: searchRegex },
      { bio: searchRegex }
    ];
  }

  // ب. الفلترة المباشرة باسم المسمى الوظيفي
  if (req.query.jobTitle) {
    queryObj.jobTitle = req.query.jobTitle;
  }

  // 2. إعدادات تقسيم الصفحات (Pagination)
  const page = parseInt(req.query.page as string) || 1; // الصفحة الافتراضية 1
  const limit = parseInt(req.query.limit as string) || 10; // عدد اليوزرز في الصفحة 10
  const skip = (page - 1) * limit; // هنفوت كام يوزر عشان نجيب الصفحة اللي بعدها

  // 3. تنفيذ البحث في قاعدة البيانات
  const users = await User.find(queryObj)
    // حماية: بنحدد الداتا اللي هترجع عشان منبعتش الباسورد أو بيانات حساسة
    .select('fullName avatar jobTitle skills bio companyName status role') 
    .skip(skip)
    .limit(limit)
    .sort('-createdAt'); // ترتيب من الأحدث للأقدم

  // 4. حساب العدد الكلي (مهم جداً للفرونت إند عشان يعمل زراير الـ Next و الـ Prev)
  const totalUsers = await User.countDocuments(queryObj);

  res.status(200).json({
    status: 'success',
    results: users.length, // عدد اليوزرز في الصفحة دي
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers: totalUsers
    },
    data: { users }
  });
});