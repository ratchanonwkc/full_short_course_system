import {
    getAllTeachersService,
    createTeacherService,
    updateTeacherService,
    deleteTeacherService
} from './teachers.service.js';

export const getTeachers = async (req, res, next) => {
    try {
        const teachers = await getAllTeachersService();
        res.json(teachers);
    } catch (error) {
        next(error);
    }
};

export const createTeacher = async (req, res, next) => {
    try {
        const teacher = await createTeacherService(req.body);
        res.status(201).json(teacher);
    } catch (error) {
        // ดักจับกรณีเลขบัตรประชาชน หรือ อีเมล ซ้ำกัน (Unique Violation)
        if (error.code === '23505') {
            return res.status(400).json({ message: 'เลขบัตรประชาชนหรืออีเมลนี้มีในระบบแล้ว' });
        }
        next(error);
    }
};

export const updateTeacher = async (req, res, next) => {
    try {
        const { id } = req.params;
        const teacher = await updateTeacherService(id, req.body);
        res.json(teacher);
    } catch (error) {
        next(error);
    }
};

export const deleteTeacher = async (req, res, next) => {
    try {
        const { id } = req.params;
        await deleteTeacherService(id);
        res.json({ message: 'Teacher deleted successfully' });
    } catch (error) {
        next(error);
    }
};
