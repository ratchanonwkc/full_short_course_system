import {
    getAllSubjectsService,
    getSubjectByIdService,
    createSubjectService,
    updateSubjectService,
    deleteSubjectService,
    getNextSequenceService
} from './subjects.service.js';

export const getSubjects = async (req, res, next) => {
    try {
        const { level_id, subject_type_id, major_id, minor_id, department_id, search, page, pageSize, all } = req.query;
        const result = await getAllSubjectsService({
            levelId: level_id,
            subjectTypeId: subject_type_id,
            majorId: major_id,
            minorId: minor_id,
            departmentId: department_id,
            search,
            page: page || 1,
            pageSize: pageSize || 20,
            all: all === 'true' || all === true,
        });
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const getSubjectById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const subject = await getSubjectByIdService(id);
        res.json(subject);
    } catch (error) {
        next(error);
    }
};

export const getNextSequence = async (req, res, next) => {
    try {
        const { minor_id, duration_group } = req.query;
        const result = await getNextSequenceService(minor_id, duration_group);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

const sanitizeSubjectBody = (body) => {
    if (!body || typeof body !== 'object') return body;
    const sanitized = { ...body };
    if (!sanitized.minor_id || sanitized.minor_id === '' || sanitized.minor_id === 0 || sanitized.minor_id === '0') {
        sanitized.minor_id = null;
    }
    if (!sanitized.major_id || sanitized.major_id === '' || sanitized.major_id === 0 || sanitized.major_id === '0') {
        sanitized.major_id = null;
    }
    return sanitized;
};

export const createSubject = async (req, res, next) => {
    try {
        const payload = sanitizeSubjectBody(req.body);
        const subject = await createSubjectService(payload);
        res.status(201).json(subject);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'รหัสวิชานี้มีอยู่แล้วในระบบ กรุณาตรวจสอบรหัสวิชา' });
        }
        next(error);
    }
};

export const updateSubject = async (req, res, next) => {
    try {
        const { id } = req.params;
        const payload = sanitizeSubjectBody(req.body);
        const subject = await updateSubjectService(id, payload);
        res.json(subject);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'รหัสวิชานี้มีอยู่แล้วในระบบ กรุณาตรวจสอบรหัสวิชา' });
        }
        next(error);
    }
};

export const deleteSubject = async (req, res, next) => {
    try {
        const { id } = req.params;
        await deleteSubjectService(id);
        res.json({ message: 'ลบรายวิชาเรียบร้อยแล้ว' });
    } catch (error) {
        next(error);
    }
};
