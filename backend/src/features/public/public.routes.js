import { Router } from 'express';
import {
    getOpenStudyGroups,
    getStudyGroupDetail,
    lookupPostalCode,
    getActivePaymentMethods,
    createOnlineApplication,
    getStatusByCitizenId,
    resubmitApplication,
} from './public.controller.js';
import { uploadSlipMemory, uploadToSupabaseStorage } from '../../middlewares/supabaseUpload.middleware.js';

const router = Router();

router.get('/study-groups/open', getOpenStudyGroups);
router.get('/study-groups/open/:id', getStudyGroupDetail);
router.get('/postal-code/:code', lookupPostalCode);
router.get('/payment-methods/active', getActivePaymentMethods);

// Upload slip directly to Supabase Storage bucket "slips" — only the public URL is persisted
router.post('/upload-slip', uploadSlipMemory.single('slip'), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'กรุณาอัปโหลดไฟล์สลิป' });
        const slip_url = await uploadToSupabaseStorage(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            'slip'
        );
        res.status(201).json({ slip_url });
    } catch (error) {
        next(error);
    }
});

// Citizen ID card image upload (reference only) — bucket "slips", prefix "idcard"
router.post('/upload-id-card', uploadSlipMemory.single('id_card'), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'กรุณาอัปโหลดรูปบัตรประชาชน' });
        const id_card_url = await uploadToSupabaseStorage(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            'idcard'
        );
        res.status(201).json({ id_card_url });
    } catch (error) {
        next(error);
    }
});

router.post('/applications', createOnlineApplication);
router.get('/applications/status/:citizen_id', getStatusByCitizenId);
// Self-service correction/resubmit for rejected applications
router.put('/applications/:id/resubmit', resubmitApplication);

export default router;
