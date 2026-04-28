import { Request, Response, NextFunction } from 'express';
import Community from '../models/Community';
import Post from '../models/Post';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';
import * as aiService from '../services/ai.service';
import Chat from '../models/chat';

export const listCommunities = catchAsync(async (req: Request, res: Response) => {
  const { category } = req.query;
  const filter: any = {};
  if (category) filter.category = category;
  
  const communities = await Community.find(filter).populate('members', 'fullName');
  res.status(200).json({
    status: 'success',
    data: { communities }
  });
});

export const createCommunity = catchAsync(async (req: Request, res: Response) => {
  const { name, description, category, tags, isPublic } = req.body;
  const owner = (req.user as any)._id;

  const communityChat = await Chat.create({
    isGroup: true,
    groupName: name,
    users: [owner],
    admins: [owner]
  });

  const community = await Community.create({
    name,
    description,
    category,
    tags,
    isPublic,
    owner,
    admins: [owner],
    members: [owner],
    chatId: communityChat._id
  });

  res.status(201).json({
    status: 'success',
    data: { community }
  });
});

export const joinCommunity = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const community = await Community.findById(req.params.id);
  if (!community) return next(new AppError('Community not found', 404));

  const userId = (req.user as any)._id;
  if (community.members.includes(userId)) {
    return next(new AppError('You are already a member of this community', 400));
  }

  community.members.push(userId);
  await community.save();

  if (community.chatId) {
    await Chat.findByIdAndUpdate(community.chatId, {
      $addToSet: { users: userId }
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Joined community successfully'
  });
});

export const getCommunityFeed = catchAsync(async (req: Request, res: Response) => {
  const posts = await Post.find({ communityId: req.params.id })
    .populate('authorId', 'fullName avatar jobTitle')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    data: { posts }
  });
});

export const aiQuery = catchAsync(async (req: Request, res: Response) => {
  const { question } = req.body;
  const id = req.params.id as string;

  const result = await aiService.ragQuery(id, question);

  res.status(200).json({
    status: 'success',
    data: result
  });
});
