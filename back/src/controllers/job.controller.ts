import { Request, Response, NextFunction } from 'express';
import Job from '../models/Job';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';

export const listJobs = catchAsync(async (req: Request, res: Response) => {
  const { search, types, experience, budget, sort, page = 1 } = req.query;
  const limit = 10;
  const skip = (Number(page) - 1) * limit;

  const filter: any = {};
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (types && typeof types === 'string' && types !== '') {
    const typeArray = types.split(',').map(t => t.toLowerCase().replace('-', '_'));
    filter.jobType = { $in: typeArray };
  }

  const sortOptions: any = {};
  if (sort === 'newest') sortOptions.createdAt = -1;
  else if (sort === 'oldest') sortOptions.createdAt = 1;

  const totalJobs = await Job.countDocuments(filter);
  const jobs = await Job.find(filter)
    .populate('publisherId', 'fullName avatar companyName location')
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);
  
  const jobsForFrontend = jobs.map(job => {
    const jobObj = job.toObject();
    const publisher = (jobObj.publisherId as any) || {};
    const matchPercentage = Math.floor(Math.random() * 40) + 60;

    return {
      _id: jobObj._id,
      title: jobObj.title,
      companyName: publisher.companyName || 'Unknown Company',
      companyLogo: publisher.avatar || '/default-avatar.png',
      location: publisher.location || 'Remote',
      postedAt: jobObj.createdAt,
      description: jobObj.description,
      projectType: (jobObj.jobType || 'freelance').replace('_', '-').toUpperCase(),
      salaryOrBudget: jobObj.budgetOrSalary || 'Negotiable',
      experienceLevel: 'Intermediate', 
      tags: jobObj.requiredSkills || [],
      matchPercentage
    };
  });

  res.status(200).json({
    status: 'success',
    results: jobsForFrontend.length,
    data: { 
      jobs: jobsForFrontend,
      totalPages: Math.ceil(totalJobs / limit),
      currentPage: Number(page)
    }
  });
});

export const getJobDetail = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const job = await Job.findById(req.params.id).populate('publisherId', 'fullName avatar companyName industry location');
  if (!job) return next(new AppError('Job not found', 404));

  const matchPercentage = Math.floor(Math.random() * 40) + 60;

  res.status(200).json({
    status: 'success',
    data: { job, matchPercentage }
  });
});

export const applyToJob = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { proposal, skills } = req.body;
  const job = await Job.findById(req.params.id);
  if (!job) return next(new AppError('Job not found', 404));

  job.applicants?.push({
    userId: (req.user as any)._id,
    proposal: proposal || '',
    status: 'pending',
    appliedAt: new Date()
  });

  await job.save();

  res.status(200).json({
    status: 'success',
    message: 'Applied successfully'
  });
});

export const createJob = catchAsync(async (req: Request, res: Response) => {
  const publisherId = (req.user as any)._id;
  const job = await Job.create({ ...req.body, publisherId });

  res.status(201).json({
    status: 'success',
    data: { job }
  });
});

export const getApplicants = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const job = await Job.findById(req.params.id).populate('applicants.userId', 'fullName avatar jobTitle skills');
  if (!job) return next(new AppError('Job not found', 404));

  if (job.publisherId.toString() !== (req.user as any)._id.toString()) {
    return next(new AppError('You are not authorized to view applicants for this job', 403));
  }

  res.status(200).json({
    status: 'success',
    data: { applicants: job.applicants }
  });
});
