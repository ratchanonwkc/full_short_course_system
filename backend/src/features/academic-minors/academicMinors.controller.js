import {
    getAllMinorsService,
    createMinorService,
    updateMinorService,
    deleteMinorService
} from './academicMinors.service.js';

export const getMinors = async (req, res, next) => {
    try {
        const { major_id } = req.query;
        const minors = await getAllMinorsService({ majorId: major_id });
        res.json(minors);
    } catch (error) {
        next(error);
    }
};

export const createMinor = async (req, res, next) => {
    try {
        const minor = await createMinorService(req.body);
        res.status(201).json(minor);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'รหัสสาขางานนี้มีอยู่แล้วในสาขาวิชานี้' });
        }
        next(error);
    }
};

export const updateMinor = async (req, res, next) => {
    try {
        const { id } = req.params;
        const minor = await updateMinorService(id, req.body);
        res.json(minor);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'รหัสสาขางานนี้มีอยู่แล้วในสาขาวิชานี้' });
        }
        next(error);
    }
};

export const deleteMinor = async (req, res, next) => {
    try {
        const { id } = req.params;
        await deleteMinorService(id);
        res.json({ message: 'ลบสาขางานเรียบร้อยแล้ว' });
    } catch (error) {
        if (error.code === '23503') {
            return res.status(409).json({ message: 'ไม่สามารถลบได้เนื่องจากมีรายวิชาใช้งานอยู่' });
        }
        next(error);
    }
};
