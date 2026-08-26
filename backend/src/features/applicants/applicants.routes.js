import { Router } from 'express';
import { trackApplicant } from './applicants.controller.js';

const router = Router();

// GET /api/v1/applicants/track/:citizen_id and /api/applicants/track/:citizen_id
router.get('/track/:citizen_id', trackApplicant);

export default router;
