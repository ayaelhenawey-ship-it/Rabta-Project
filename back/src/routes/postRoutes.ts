import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import {
  getPostDetail,
  toggleLike,
  addComment,
  createPost
} from '../controllers/post.controller';

const router = Router();

router.use(protect);

router.post('/', createPost);
router.get('/:id', getPostDetail);
router.post('/:id/like', toggleLike);
router.post('/:id/comments', addComment);

export default router;
