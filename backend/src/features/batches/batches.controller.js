import {
    getAllBatchesService,
    getLatestPersonnelService,
    createBatchService,
    createBulkYearBatchesService,
    updateBatchService,
    deleteBatchService
} from './batches.service.js';

export const getBatches = async (req, res, next) => {
    try {
        const { year, term } = req.query;
        const batches = await getAllBatchesService(year, term);
        res.json(batches);
    } catch (error) {
        next(error);
    }
};

export const getLatestPersonnel = async (req, res, next) => {
    try {
        const personnel = await getLatestPersonnelService();
        res.json(personnel);
    } catch (error) {
        next(error);
    }
};

export const createBatch = async (req, res, next) => {
    try {
        const batch = await createBatchService(req.body);
        res.status(201).json(batch);
    } catch (error) {
        next(error);
    }
};

export const createBulkYearBatches = async (req, res, next) => {
    try {
        const batches = await createBulkYearBatchesService(req.body);
        res.status(201).json({
            message: 'สร้างรุ่นการเรียนประจำปีการศึกษาสำเร็จ',
            count: batches.length,
            data: batches
        });
    } catch (error) {
        next(error);
    }
};

export const updateBatch = async (req, res, next) => {
    try {
        const { id } = req.params;
        const batch = await updateBatchService(id, req.body);
        res.json(batch);
    } catch (error) {
        next(error);
    }
};

export const deleteBatch = async (req, res, next) => {
    try {
        const { id } = req.params;
        await deleteBatchService(id);
        res.json({ message: 'ลบรุ่นการเรียนเรียบร้อยแล้ว' });
    } catch (error) {
        next(error);
    }
};