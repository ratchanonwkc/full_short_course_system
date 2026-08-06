import { Router } from 'express';
import {
    getStudyGroups,
    getStudyGroupById,
    getNextRoomSequence,
    getNextMoeSequence,
    createStudyGroup,
    updateStudyGroup,
    deleteStudyGroup,
} from './studyGroups.controller.js';

const router = Router();

// หมายเหตุ: ต้องประกาศ path เฉพาะ (next-room-sequence / next-moe-sequence) ก่อน /:id
router.get('/next-room-sequence', getNextRoomSequence);
router.get('/next-moe-sequence', getNextMoeSequence);
router.get('/', getStudyGroups);           // รองรับ ?batch_id= & ?major_id= & ?time_slot=
router.get('/:id', getStudyGroupById);
router.post('/', createStudyGroup);
router.put('/:id', updateStudyGroup);
router.delete('/:id', deleteStudyGroup);

export default router;
