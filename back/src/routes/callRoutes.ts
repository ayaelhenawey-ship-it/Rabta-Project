import { Router } from 'express';
import { getUserCalls, initiateCall } from '../controllers/call.Controller';
import { protect } from '../middlewares/auth.middleware'; 

const router = Router();

router.use(protect);

router.get('/history', getUserCalls);
router.post('/initiate', initiateCall);

export default router;