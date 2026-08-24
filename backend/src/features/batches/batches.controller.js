import {
    getAllBatchesService,
    getBatchByIdService,
    getLatestPersonnelService,
    createBatchService,
    createBulkYearBatchesService,
    updateBatchService,
    deleteBatchService,
    getNextBatchDefaultsService
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

export const getBatchById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const batch = await getBatchByIdService(id);
        res.json(batch);
    } catch (error) {
        if (error.code === 'PGRST116') {
            return res.status(404).json({ message: 'ไม่พบข้อมูลรุ่นการเรียน' });
        }
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
        const {
            id,
            created_at,
            director,
            head_registration,
            director_name,
            ...insertData
        } = req.body;
        const batch = await createBatchService(insertData);
        res.status(201).json(batch);
    } catch (error) {
        next(error);
    }
};

export const createBulkYearBatches = async (req, res, next) => {
    try {
        const cleanedBatches = Array.isArray(req.body)
            ? req.body.map(({ id, created_at, director, head_registration, director_name, ...item }) => item)
            : req.body;
        const batches = await createBulkYearBatchesService(cleanedBatches);
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
        const {
            id: _,
            created_at,
            director,
            head_registration,
            director_name,
            ...updateData
        } = req.body;
        const batch = await updateBatchService(id, updateData);
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
export const getNextBatchDefaults = async (req, res, next) => {
    try {
        const defaults = await getNextBatchDefaultsService();
        res.json(defaults);
    } catch (error) {
        next(error);
    }
};