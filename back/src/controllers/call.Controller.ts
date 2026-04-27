import { Request, Response, NextFunction } from 'express';
import Call from '../models/Call';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';

export const getUserCalls = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req.user as any)._id;

  const calls = await Call.find({
    $or: [{ caller: userId }, { receiver: userId }]
  })
  .populate('caller', 'fullName avatar jobTitle')
  .populate('receiver', 'fullName avatar jobTitle')
  .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    data: { calls }
  });
});

export const initiateCall = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { receiverId, type } = req.body;
  const callerId = (req.user as any)._id;

  if (!receiverId || !type) {
    return next(new AppError('receiverId and type are required', 400));
  }

  const call = await Call.create({
    caller: callerId,
    receiver: receiverId,
    type,
    status: 'missed' // Initial status
  });

  res.status(201).json({
    status: 'success',
    data: { call }
  });
});