import { Request, Response, NextFunction } from 'express';
import Call from '../models/Call';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';

export const getUserCalls = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)._id;

    const Chat = require('../models/chat').default;
    const userChats = await Chat.find({ users: userId }).select('_id');
    const chatIds = userChats.map((c: any) => c._id);

    const rawCalls = await Call.find({
      $or: [
        { caller: userId },
        { receiver: userId },
        { chatId: { $in: chatIds } }
      ]
    }).sort({ createdAt: -1 });

    // =========================================================
    // CRITICAL: Mongoose will throw MissingSchemaError if it
    // tries to populate receiver with refPath='Group' because
    // no Mongoose model named 'Group' exists (the model is 'Chat').
    // Fix: Separate calls by type and populate receiver ONLY for
    // 1-to-1 (User) calls. Group calls use chatId instead.
    // =========================================================

    // Filter out records with no caller (completely corrupted)
    const validRaw = rawCalls.filter(call => !!call.caller);

    const userCalls  = validRaw.filter((c: any) => c.receiverModel !== 'Group');
    const groupCalls = validRaw.filter((c: any) => c.receiverModel === 'Group');

    // Populate 1-to-1 calls safely (receiver is a real User document)
    const populatedUserCalls = await Call.populate(userCalls, [
      { path: 'caller',  select: 'fullName avatar jobTitle' },
      { path: 'receiver', select: 'fullName avatar jobTitle' },
      { path: 'chatId',  select: 'groupName isGroup users groupAvatar' }
    ]);

    // Populate group calls WITHOUT receiver to avoid MissingSchemaError
    const populatedGroupCalls = await Call.populate(groupCalls, [
      { path: 'caller', select: 'fullName avatar jobTitle' },
      { path: 'chatId', select: 'groupName isGroup users groupAvatar' }
    ]);

    // Merge, re-sort by date, and drop any record that has neither receiver nor chatId
    const allCalls = [...populatedUserCalls, ...populatedGroupCalls]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const calls = allCalls.filter((call: any) => call.caller && (call.receiver || call.chatId));

    res.status(200).json({
      status: 'success',
      data: { calls }
    });
  } catch (error: any) {
    console.error('GET CALL HISTORY ERROR:', error.message);
    console.error(error.stack);
    return next(new AppError('Internal Server Error fetching call history', 500));
  }
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
    status: 'missed'
  });

  res.status(201).json({
    status: 'success',
    data: { call }
  });
});

export const deleteCall = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const call = await Call.findById(id);

  if (!call) {
    return next(new AppError('No call found with that ID', 404));
  }

  await Call.findByIdAndDelete(id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});