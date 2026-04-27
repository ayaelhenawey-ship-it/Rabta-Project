import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import { restrictTo } from '../middlewares/authorize.middleware';
import {
  listCommunities,
  createCommunity,
  joinCommunity,
  getCommunityFeed,
  aiQuery
} from '../controllers/community.controller';

const router = Router();

router.use(protect);

router.get('/', listCommunities);
router.post('/', restrictTo('employer'), createCommunity);
router.post('/:id/join', joinCommunity);
router.get('/:id/feed', getCommunityFeed);
router.post('/:id/ai/query', aiQuery);

export default router;
