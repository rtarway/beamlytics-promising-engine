import { Router } from 'express';
import { PromiseController } from '../controllers/promise.controller';

const router = Router();

router.post('/promise', PromiseController.promiseOrder);

export default router;
