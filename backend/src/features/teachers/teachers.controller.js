import {
    getAllTeachersService,
    createTeacherService,
    updateTeacherService,
    deleteTeacherService
} from './teachers.service.js';

const sanitizeTeacherPayload = (payload) => {
    if (!payload || typeof payload !== 'object') return payload;

    const bigintFields = new Set([
        'prefix_id',
        'position_id',
        'sub_position_id',
        'department_id',
        'user_id',
        'head_teacher_id'
    ]);

    const sanitized = {};
    for (const [key, value] of Object.entries(payload)) {
        if (bigintFields.has(key)) {
            if (value === '' || value === null || value === undefined || value === 'none') {
                sanitized[key] = null;
            } else {
                const num = Number(value);
                sanitized[key] = isNaN(num) ? null : num;
            }
        } else if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed === '' && ['first_name_en', 'last_name_en', 'email', 'phone'].includes(key)) {
                sanitized[key] = null;
            } else {
                sanitized[key] = trimmed;
            }
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
};

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
        const sanitized = sanitizeTeacherPayload(insertData);
        const teacher = await createTeacherService(sanitized);
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
        const sanitized = sanitizeTeacherPayload(updateData);
        const teacher = await updateTeacherService(id, sanitized);
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
