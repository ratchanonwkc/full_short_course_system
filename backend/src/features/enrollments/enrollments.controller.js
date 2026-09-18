import {
    getEnrollmentsService,
    getEnrollmentByIdService,
    createWalkinEnrollmentService,
    confirmPaymentService,
    rejectPaymentService,
    cancelEnrollmentService,
    reassignGroupService,
    sendConfirmationEmailService,
    updateApplicantDetailsService,
    updateApplicantSelfService,
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

export const getEnrollmentById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const enrollment = await getEnrollmentByIdService(id);
        res.json(enrollment);
    } catch (error) {
        next(error);
    }
};

const isDuplicateEnrollmentError = (error) => {
    if (!error) return false;
    const str = `${error.message || ''} ${error.details || ''} ${error.hint || ''} ${error.constraint || ''}`;
    return (
        error.constraint === 'enrollments_applicant_group_unique' ||
        str.includes('enrollments_applicant_group_unique') ||
        (str.includes('applicant_id') && str.includes('study_group_id'))
    );
};

export const createWalkinEnrollment = async (req, res, next) => {
    try {
        const { applicant, study_group_id, payment_method } = req.body;
        if (!applicant?.citizen_id || applicant.citizen_id.length !== 13) {
            return res.status(400).json({ message: 'เลขประจำตัวประชาชนไม่ถูกต้อง (ต้องมี 13 หลัก)' });
        }
        if (!study_group_id) {
            return res.status(400).json({ message: 'กรุณาเลือกกลุ่มเรียน' });
        }
        const result = await createWalkinEnrollmentService({ applicant, study_group_id, paymentMethod: payment_method });
        res.status(201).json(result);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        if (error.code === '23505') {
            if (isDuplicateEnrollmentError(error)) {
                return res.status(400).json({ message: 'ผู้สมัครท่านนี้ได้ลงทะเบียนในกลุ่มเรียนนี้เรียบร้อยแล้ว ไม่สามารถสมัครซ้ำได้' });
            }
            return res.status(400).json({ message: 'เลขประจำตัวประชาชนนี้มีอยู่แล้วในระบบ' });
        }
        next(error);
    }
};

export const confirmPayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { receipt_number, receipt_book_no } = req.body;
        const approvedByUserId = req.user?.id || null;
        const updated = await confirmPaymentService(id, { receipt_number, receipt_book_no, approvedByUserId });
        res.json(updated);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        next(error);
    }
};

export const rejectPayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        if (!reason?.trim()) {
            return res.status(400).json({ message: 'กรุณาระบุเหตุผลในการปฏิเสธ' });
        }
        const rejectedByUserId = req.user?.id || null;
        const updated = await rejectPaymentService(id, { reason: reason.trim(), rejectedByUserId });
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

export const reassignGroup = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { study_group_id } = req.body;
        if (!study_group_id) {
            return res.status(400).json({ message: 'กรุณาเลือกกลุ่มเรียนใหม่' });
        }
        const updated = await reassignGroupService(id, study_group_id);
        res.json(updated);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        if (error.code === '23505' && isDuplicateEnrollmentError(error)) {
            return res.status(400).json({ message: 'ผู้สมัครท่านนี้ได้ลงทะเบียนในกลุ่มเรียนนี้เรียบร้อยแล้ว ไม่สามารถสมัครซ้ำได้' });
        }
        next(error);
    }
};

export const sendConfirmationEmail = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await sendConfirmationEmailService(id);
        res.json(result);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        next(error);
    }
};

export const updateApplicantDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { applicant, study_group_id } = req.body;
        const updated = await updateApplicantDetailsService(id, { applicant, study_group_id });
        res.json(updated);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        if (error.code === '23505' && isDuplicateEnrollmentError(error)) {
            return res.status(400).json({ message: 'ผู้สมัครท่านนี้ได้ลงทะเบียนในกลุ่มเรียนนี้เรียบร้อยแล้ว ไม่สามารถสมัครซ้ำได้' });
        }
        next(error);
    }
};

export const applicantUpdate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { applicant, slip_url, payment_method } = req.body;
        const result = await updateApplicantSelfService(id, { applicant, slip_url, payment_method });
        res.json(result);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        next(error);
    }
};

