import { Router } from 'express';
import {
    getPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
} from './paymentMethods.controller.js';
import { uploadSlip, toPublicSlipUrl } from '../../middlewares/upload.middleware.js';

const router = Router();

router.get('/', getPaymentMethods);
router.post('/', createPaymentMethod);
router.put('/:id', updatePaymentMethod);
router.delete('/:id', deletePaymentMethod);
// อัปโหลดรูป QR Code ของบัญชีธนาคาร (ใช้ storage เดียวกับสลิป เพื่อลด boilerplate)
router.post('/upload-qr', uploadSlip.single('qr'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'กรุณาอัปโหลดไฟล์ QR Code' });
    res.status(201).json({ qr_code_url: toPublicSlipUrl(req.file.filename) });
});

export default router;
