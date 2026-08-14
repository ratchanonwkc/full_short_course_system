import { Router } from 'express';
import {
    getPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
} from './paymentMethods.controller.js';
import { uploadSlipMemory, uploadToSupabaseStorage } from '../../middlewares/supabaseUpload.middleware.js';

const router = Router();

router.get('/', getPaymentMethods);
router.post('/', createPaymentMethod);
router.put('/:id', updatePaymentMethod);
router.delete('/:id', deletePaymentMethod);

// อัปโหลดรูป QR Code ของบัญชีธนาคาร -> Supabase Storage bucket "slips"
router.post('/upload-qr', uploadSlipMemory.single('qr'), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'กรุณาอัปโหลดไฟล์ QR Code' });
        const qr_code_url = await uploadToSupabaseStorage(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            'qr'
        );
        res.status(201).json({ qr_code_url });
    } catch (error) {
        next(error);
    }
});

export default router;
