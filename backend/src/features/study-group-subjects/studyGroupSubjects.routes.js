import { Router } from 'express';
import {
    getSubjectsInGroup,
    addSubjectToGroup,
    updateSubjectInGroup,
    removeSubjectFromGroup,
} from './studyGroupSubjects.controller.js';

const router = Router();

router.get('/', getSubjectsInGroup);       // รองรับ ?study_group_id=
router.post('/', addSubjectToGroup);
router.put('/:id', updateSubjectInGroup);
router.delete('/:id', removeSubjectFromGroup);

export default router;
