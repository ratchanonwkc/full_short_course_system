import { Router } from 'express';
import {
    getEnrollments,
    createWalkinEnrollment,
    confirmPayment,
    rejectPayment,
    cancelEnrollment,
    reassignGroup,
    sendConfirmationEmail,
} from './enrollments.controller.js';

const router = Router();

router.get('/', getEnrollments);
router.post('/walkin', createWalkinEnrollment);
router.put('/:id/confirm-payment', confirmPayment);
router.put('/:id/reject', rejectPayment);
router.put('/:id/cancel', cancelEnrollment);
router.put('/:id/reassign-group', reassignGroup);
router.post('/:id/send-email', sendConfirmationEmail);

export default router;