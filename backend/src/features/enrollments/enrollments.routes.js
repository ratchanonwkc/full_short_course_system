import { Router } from 'express';
import {
    getEnrollments,
    getEnrollmentById,
    createWalkinEnrollment,
    confirmPayment,
    rejectPayment,
    cancelEnrollment,
    reassignGroup,
    sendConfirmationEmail,
    updateApplicantDetails,
    applicantUpdate,
} from './enrollments.controller.js';

const router = Router();

router.get('/', getEnrollments);
router.get('/:id', getEnrollmentById);
router.post('/walkin', createWalkinEnrollment);
router.put('/:id/confirm-payment', confirmPayment);
router.put('/:id/reject', rejectPayment);
router.put('/:id/cancel', cancelEnrollment);
router.put('/:id/reassign-group', reassignGroup);
router.put('/:id/applicant', updateApplicantDetails);
router.put('/:id/applicant-update', applicantUpdate);
router.post('/:id/send-email', sendConfirmationEmail);

export default router;
