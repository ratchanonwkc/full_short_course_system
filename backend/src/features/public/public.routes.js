import { Router } from 'express';
import {
    getOpenStudyGroups,
    getStudyGroupDetail,
    lookupPostalCode,
    getActivePaymentMethods,
    uploadSlipFile,
    createOnlineApplication,
    getStatusByCitizenId,
} from './public.controller.js';
import { uploadSlip } from '../../middlewares/upload.middleware.js';

const router = Router();

router.get('/study-groups/open', getOpenStudyGroups);
router.get('/study-groups/open/:id', getStudyGroupDetail);
router.get('/postal-code/:code', lookupPostalCode);
router.get('/payment-methods/active', getActivePaymentMethods);
router.post('/upload-slip', uploadSlip.single('slip'), uploadSlipFile);
router.post('/applications', createOnlineApplication);
router.get('/applications/status/:citizen_id', getStatusByCitizenId);

export default router;
