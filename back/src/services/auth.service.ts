import jwt from 'jsonwebtoken';
import { User } from '../models/user';
import { AppError } from '../utils/AppError';

export const signToken = (id: string) => {
  return jwt.sign(
    { id }, 
    process.env.JWT_SECRET as string, 
    { expiresIn: (process.env.JWT_EXPIRES_IN || '90d') as any }
  );
};

export const loginUser = async (email: string, password: string) => {
  if (!email || !password) throw new AppError('Please enter the data', 400);
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password, user.password as string))) {
    throw new AppError('The data is incorrect', 401);
  }
  const token = signToken(user._id.toString());
  const profileComplete = user.profileComplete;
  user.password = undefined;
  return { user, token, profileComplete };
};

export const registerUser = async (userData: any) => {
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) throw new AppError('The user already exists', 400);
  const newUser = await User.create(userData);
  const token = signToken(newUser._id.toString());
  newUser.password = undefined;
  return { user: newUser, token };
};

export const forgotPassword = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError('No user found with that email address', 404);
  
  // In a real app, generate a token, save it to DB with expiry, and send email.
  // For now, we simulate success as per requirement.
  return true;
};