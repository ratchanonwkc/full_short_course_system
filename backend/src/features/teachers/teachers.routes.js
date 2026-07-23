import { Router } from 'express';
import {
    getTeachers,
    createTeacher,
    updateTeacher,
    deleteTeacher
} from './teachers.controller.js';

const router = Router();

router.get('/', getTeachers);
router.post('/', createTeacher);
router.put('/:id', updateTeacher);
router.delete('/:id', deleteTeacher);

export default router;