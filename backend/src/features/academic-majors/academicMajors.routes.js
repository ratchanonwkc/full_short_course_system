import { Router } from 'express';
import {
    getMajors,
    createMajor,
    updateMajor,
    deleteMajor
} from './academicMajors.controller.js';

const router = Router();

router.get('/', getMajors);           // รองรับ ?level_id= & ?subject_type_id= สำหรับ cascading filter
router.post('/', createMajor);
router.put('/:id', updateMajor);
router.delete('/:id', deleteMajor);

export default router;
