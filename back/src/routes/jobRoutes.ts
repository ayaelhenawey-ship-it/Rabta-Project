import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import { restrictTo } from '../middlewares/authorize.middleware';
import {
  listJobs,
  getJobDetail,
  applyToJob,
  createJob,
  getApplicants,
  updateJob,
  deleteJob,
  getAppliedJobs
} from '../controllers/job.controller';

const router = Router();

router.use(protect);

router.get('/applied', restrictTo('freelancer'), getAppliedJobs);
router.get('/', listJobs);
router.get('/:id', getJobDetail);
router.post('/:id/apply', applyToJob);
router.post('/', restrictTo('employer'), createJob);
router.patch('/:id', restrictTo('employer'), updateJob);
router.delete('/:id', restrictTo('employer'), deleteJob);
router.get('/:id/applicants', restrictTo('employer'), getApplicants);

export default router;
