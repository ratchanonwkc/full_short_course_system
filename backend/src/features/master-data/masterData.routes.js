import { Router } from 'express';
import {
    getMasterData,
    createMasterData,
    updateMasterData,
    deleteMasterData
} from './masterData.controller.js';

const router = Router();

router.get('/:type', getMasterData);
router.post('/:type', createMasterData);
router.put('/:type/:id', updateMasterData);
router.delete('/:type/:id', deleteMasterData);

export default router;