import { Router } from 'express';
import { getBlankTemplate } from './print.controller.js';

const router = Router();

// GET /api/v1/print/blank-template and /api/v1/print/blank-template/:study_group_id
router.get('/blank-template', getBlankTemplate);
router.get('/blank-template/:study_group_id', getBlankTemplate);

export default router;
