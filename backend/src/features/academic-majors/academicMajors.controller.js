import {
    getAllMajorsService,
    createMajorService,
    updateMajorService,
    deleteMajorService
} from './academicMajors.service.js';

export const getMajors = async (req, res, next) => {
    try {
        const { level_id, subject_type_id } = req.query;
        const majors = await getAllMajorsService({ levelId: level_id, subjectTypeId: subject_type_id });
        res.json(majors);
    } catch (error) {
        next(error);
    }
};

export const createMajor = async (req, res, next) => {
    try {
        const major = await createMajorService(req.body);
        res.status(201).json(major);
    } catch (error) {
        // department_id ซ้ำกันภายใต้ level/subject_type เดียวกัน (ถ้ามี unique constraint) หรือ full_major_code ซ้ำ
        if (error.code === '23505') {
            return res.status(400).json({ message: 'รหัสสาขาวิชานี้มีอยู่แล้วในระบบ' });
        }
        next(error);
    }
};

export const updateMajor = async (req, res, next) => {
    try {
        const { id } = req.params;
        const major = await updateMajorService(id, req.body);
        res.json(major);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'รหัสสาขาวิชานี้มีอยู่แล้วในระบบ' });
        }
        next(error);
    }
};

export const deleteMajor = async (req, res, next) => {
    try {
        const { id } = req.params;
        await deleteMajorService(id);
        res.json({ message: 'ลบสาขาวิชาเรียบร้อยแล้ว' });
    } catch (error) {
        // ติด FK เพราะมี academic_minors หรือ subjects อ้างอิงอยู่
        if (error.code === '23503') {
            return res.status(409).json({ message: 'ไม่สามารถลบได้เนื่องจากมีข้อมูลสาขางาน/รายวิชาใช้งานอยู่' });
        }
        next(error);
    }
};
