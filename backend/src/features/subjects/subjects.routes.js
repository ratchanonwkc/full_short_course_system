import { Router } from 'express';
import {
    getSubjects,
    getSubjectById,
    getNextSequence,
    createSubject,
    updateSubject,
    deleteSubject
} from './subjects.controller.js';

const router = Router();

// หมายเหตุ: ต้องประกาศ /next-sequence ก่อน /:id ไม่งั้น Express จะจับ "next-sequence" เป็น :id
router.get('/next-sequence', getNextSequence);
router.get('/', getSubjects);
router.get('/:id', getSubjectById);
router.post('/', createSubject);
router.put('/:id', updateSubject);
router.delete('/:id', deleteSubject);

export default router;
