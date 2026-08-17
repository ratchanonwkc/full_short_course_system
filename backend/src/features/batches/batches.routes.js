import { Router } from 'express';
import {
    getBatches,
    getBatchById,
    getLatestPersonnel,
    createBatch,
    createBulkYearBatches,
    updateBatch,
    deleteBatch
} from './batches.controller.js';

const router = Router();

router.get('/', getBatches);
router.get('/latest-personnel', getLatestPersonnel); // Endpoint สำหรับปุ่ม Auto-fill
router.get('/:id', getBatchById);              // ดึงรุ่นเดียวตาม ID
router.post('/', createBatch);
router.post('/bulk-year', createBulkYearBatches);     // Endpoint สำหรับสร้าง 4 รุ่นยกปี
router.put('/:id', updateBatch);
router.delete('/:id', deleteBatch);

export default router;