import { Router } from 'express';
import {
    getMinors,
    createMinor,
    updateMinor,
    deleteMinor
} from './academicMinors.controller.js';

const router = Router();

router.get('/', getMinors);           // รองรับ ?major_id= สำหรับ cascading filter
router.post('/', createMinor);
router.put('/:id', updateMinor);
router.delete('/:id', deleteMinor);

export default router;
