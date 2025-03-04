// server/routers/crowdsec/index.ts
import { Router } from 'express';
import { getStatus } from './getStatus';

const router = Router();

router.get('/status', getStatus);

export default router;
