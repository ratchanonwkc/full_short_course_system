import {
    getSubjectsInGroupService,
    addSubjectToGroupService,
    updateSubjectInGroupService,
    removeSubjectFromGroupService,
} from './studyGroupSubjects.service.js';

export const getSubjectsInGroup = async (req, res, next) => {
    try {
        const { study_group_id } = req.query;
        if (!study_group_id) return res.json([]);
        const rows = await getSubjectsInGroupService(study_group_id);
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

export const addSubjectToGroup = async (req, res, next) => {
    try {
        const { id, created_at, subject_code, name_th, total_hours, ...insertData } = req.body;
        const row = await addSubjectToGroupService(insertData);
        res.status(201).json(row);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'มีรายวิชานี้อยู่ในกลุ่มเรียนแล้ว' });
        }
        next(error);
    }
};

export const updateSubjectInGroup = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { id: _, created_at, subject_code, name_th, total_hours, ...updateData } = req.body;
        const row = await updateSubjectInGroupService(id, updateData);
        res.json(row);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'มีรายวิชานี้อยู่ในกลุ่มเรียนแล้ว' });
        }
        next(error);
    }
};

export const removeSubjectFromGroup = async (req, res, next) => {
    try {
        const { id } = req.params;
        await removeSubjectFromGroupService(id);
        res.json({ message: 'ลบรายวิชาออกจากกลุ่มเรียนเรียบร้อยแล้ว' });
    } catch (error) {
        next(error);
    }
};
