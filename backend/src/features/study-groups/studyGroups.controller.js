import {
    getAllStudyGroupsService,
    getStudyGroupByIdService,
    createStudyGroupService,
    updateStudyGroupService,
    deleteStudyGroupService,
    getNextRoomSequenceService,
    getNextMoeSequenceService,
    generateNextMoeCodeService,
    getStudyGroupRosterBySubjectService,
} from './studyGroups.service.js';

export const getStudyGroups = async (req, res, next) => {
    try {
        const { batch_id, major_id, time_slot } = req.query;
        const groups = await getAllStudyGroupsService({
            batchId: batch_id,
            majorId: major_id,
            timeSlot: time_slot,
        });
        res.json(groups);
    } catch (error) {
        next(error);
    }
};

export const getStudyGroupById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const group = await getStudyGroupByIdService(id);
        res.json(group);
    } catch (error) {
        next(error);
    }
};

export const getNextRoomSequence = async (req, res, next) => {
    try {
        const { department_prefix } = req.query;
        const result = await getNextRoomSequenceService(department_prefix);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const getNextMoeSequence = async (req, res, next) => {
    try {
        const { year_prefix, department_id } = req.query;
        const result = await getNextMoeSequenceService(year_prefix, department_id);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const getNextMoeCode = async (req, res, next) => {
    try {
        const { academic_year, major_id } = req.query;
        if (!academic_year || !major_id) {
            return res.status(400).json({ message: 'กรุณาระบุ academic_year และ major_id' });
        }
        const moeCode = await generateNextMoeCodeService(academic_year, major_id);
        res.json({ moe_code: moeCode });
    } catch (error) {
        next(error);
    }
};

export const createStudyGroup = async (req, res, next) => {
    try {
        const {
            id,
            created_at,
            academic_majors,
            teachers,
            locations,
            time_slots,
            study_group_subjects,
            major_name,
            major_short_name_th,
            major_full_code,
            major_department_id,
            major_level_id,
            major_subject_type_id,
            teacher_name,
            location_name,
            time_slot_name,
            time_slot_code,
            time_slot_range,
            time_code,
            subjects_in_group,
            subjects_total_hours,
            ...insertData
        } = req.body;
        const group = await createStudyGroupService(insertData);
        res.status(201).json(group);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'รหัสกลุ่มเรียนนี้มีอยู่แล้วในระบบ' });
        }
        next(error);
    }
};

export const updateStudyGroup = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            id: _,
            created_at,
            academic_majors,
            teachers,
            locations,
            time_slots,
            study_group_subjects,
            major_name,
            major_short_name_th,
            major_full_code,
            major_department_id,
            major_level_id,
            major_subject_type_id,
            teacher_name,
            location_name,
            time_slot_name,
            time_slot_code,
            time_slot_range,
            time_code,
            subjects_in_group,
            subjects_total_hours,
            ...updateData
        } = req.body;
        const group = await updateStudyGroupService(id, updateData);
        res.json(group);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'รหัสกลุ่มเรียนนี้มีอยู่แล้วในระบบ' });
        }
        next(error);
    }
};

export const deleteStudyGroup = async (req, res, next) => {
    try {
        const { id } = req.params;
        await deleteStudyGroupService(id);
        res.json({ message: 'ลบกลุ่มเรียนเรียบร้อยแล้ว' });
    } catch (error) {
        if (error.code === '23503') {
            return res.status(409).json({ message: 'ไม่สามารถลบได้เนื่องจากมีข้อมูลอ้างอิงกลุ่มเรียนนี้อยู่' });
        }
        next(error);
    }
};

export const getStudyGroupRosterBySubject = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await getStudyGroupRosterBySubjectService(id);
        res.json(result);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        next(error);
    }
};

