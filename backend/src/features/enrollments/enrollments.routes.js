import { Router } from 'express';
import {
    getEnrollments,
    createWalkinEnrollment,
    confirmPayment,
    cancelEnrollment,
} from './enrollments.controller.js';

const router = Router();

router.get('/', getEnrollments);
router.post('/walkin', createWalkinEnrollment);
router.put('/:id/confirm-payment', confirmPayment);
router.put('/:id/cancel', cancelEnrollment);

export default router;
