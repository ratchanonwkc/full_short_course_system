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
        const {
            id,
            created_at,
            prefixes,
            positions,
            sub_positions,
            prefix_name,
            position_name,
            sub_position_name,
            ...insertData
        } = req.body;
        const teacher = await createTeacherService(insertData);
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
        const {
            id: _,
            created_at,
            prefixes,
            positions,
            sub_positions,
            prefix_name,
            position_name,
            sub_position_name,
            ...updateData
        } = req.body;
        const teacher = await updateTeacherService(id, updateData);
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
