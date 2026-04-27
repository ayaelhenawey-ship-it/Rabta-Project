import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import { restrictTo } from '../middlewares/authorize.middleware';
import {
  listJobs,
  getJobDetail,
  applyToJob,
  createJob,
  getApplicants
} from '../controllers/job.controller';

const router = Router();

router.use(protect);

router.get('/', listJobs);
router.get('/:id', getJobDetail);
router.post('/:id/apply', applyToJob);
router.post('/', restrictTo('employer'), createJob);
router.get('/:id/applicants', restrictTo('employer'), getApplicants);

export default router;
