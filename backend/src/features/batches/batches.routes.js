/**
 * Patch for backend/src/features/batches/batches.routes.js
 * ─────────────────────────────────────────────────────────────────────────
 * Add getNextBatchDefaults to the import, and register the route BEFORE
 * '/:id' (same reason as '/latest-personnel' — Express would otherwise
 * treat "next-defaults" as an :id param).
 */

import { Router } from 'express';
import {
    getBatches,
    getBatchById,
    getLatestPersonnel,
    getNextBatchDefaults, // <-- add
    createBatch,
    createBulkYearBatches,
    updateBatch,
    deleteBatch
} from './batches.controller.js';

const router = Router();

router.get('/', getBatches);
router.get('/latest-personnel', getLatestPersonnel);
router.get('/next-defaults', getNextBatchDefaults); // <-- add (before '/:id')
router.get('/:id', getBatchById);
router.post('/', createBatch);
router.post('/bulk-year', createBulkYearBatches);
router.put('/:id', updateBatch);
router.delete('/:id', deleteBatch);

export default router;
