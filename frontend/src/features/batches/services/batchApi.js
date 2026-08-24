import axiosInstance from "../../../config/axiosInstance";

/**
 * batchApi
 * ---------------------------------------------------------------------------
 *   GET    /batches                 -> getBatches(params)
 *   GET    /batches/latest-personnel-> getLatestPersonnel()
 *   GET    /batches/next-defaults   -> getNextBatchDefaults()
 *   POST   /batches                 -> createBatch(payload)
 *   POST   /batches/bulk-year       -> createBulkYearBatches(payloadArray)
 *   PUT    /batches/:id             -> updateBatch(id, payload)
 *   DELETE /batches/:id             -> deleteBatch(id)
 */

export const getBatches = async (params = {}) => {
    const { data } = await axiosInstance.get("/batches", { params });
    return data;
};

export const getBatchById = async (id) => {
    const { data } = await axiosInstance.get(`/batches/${id}`);
    return data;
};

export const getLatestPersonnel = async () => {
    const { data } = await axiosInstance.get("/batches/latest-personnel");
    return data;
};

// ดึงค่า default ถัดไปสำหรับสร้างรุ่นใหม่: { batch_sequence, iteration, semester, academic_year }
// คำนวณจาก batch ล่าสุดตามกฎ increment (ดู backend batches.service.js#getNextBatchDefaultsService)
// ผู้ใช้ยังแก้ไขค่าที่ pre-fill มาได้เองในฟอร์ม
export const getNextBatchDefaults = async () => {
    const { data } = await axiosInstance.get("/batches/next-defaults");
    return data;
};

export const createBatch = async (payload) => {
    const { data } = await axiosInstance.post("/batches", payload);
    return data;
};

export const createBulkYearBatches = async (payloadArray) => {
    const { data } = await axiosInstance.post("/batches/bulk-year", payloadArray);
    return data;
};

export const updateBatch = async (id, payload) => {
    const { data } = await axiosInstance.put(`/batches/${id}`, payload);
    return data;
};

export const deleteBatch = async (id) => {
    const { data } = await axiosInstance.delete(`/batches/${id}`);
    return data;
};
