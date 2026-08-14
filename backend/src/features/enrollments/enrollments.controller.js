import {
    getEnrollmentsService,
    createWalkinEnrollmentService,
    confirmPaymentService,
    cancelEnrollmentService,
} from './enrollments.service.js';

export const getEnrollments = async (req, res, next) => {
    try {
        const { study_group_id, status, batch_id } = req.query;
        const enrollments = await getEnrollmentsService({
            studyGroupId: study_group_id,
            status,
            batchId: batch_id,
        });
        res.json(enrollments);
    } catch (error) {
        next(error);
    }
};

export const createWalkinEnrollment = async (req, res, next) => {
    try {
        const { applicant, study_group_id } = req.body;
        if (!applicant?.citizen_id || applicant.citizen_id.length !== 13) {
            return res.status(400).json({ message: 'เลขประจำตัวประชาชนไม่ถูกต้อง (ต้องมี 13 หลัก)' });
        }
        if (!study_group_id) {
            return res.status(400).json({ message: 'กรุณาเลือกกลุ่มเรียน' });
        }
        const result = await createWalkinEnrollmentService({ applicant, study_group_id });
        res.status(201).json(result);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        if (error.code === '23505') {
            return res.status(400).json({ message: 'เลขประจำตัวประชาชนนี้มีอยู่แล้วในระบบ' });
        }
        next(error);
    }
};

export const confirmPayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { receipt_number, receipt_book_no } = req.body;
        const updated = await confirmPaymentService(id, { receipt_number, receipt_book_no });
        res.json(updated);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        next(error);
    }
};

export const cancelEnrollment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updated = await cancelEnrollmentService(id);
        res.json(updated);
    } catch (error) {
        next(error);
    }
};
