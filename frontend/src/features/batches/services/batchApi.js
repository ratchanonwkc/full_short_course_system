import axiosInstance from "../../../config/axiosInstance";

/**
 * batchApi
 * ---------------------------------------------------------------------------
 * รวมฟังก์ชันเรียก REST API ของ Batches Module ไว้ที่เดียว (service layer)
 * เพื่อให้ BatchesPage.jsx / BatchFormModal.jsx ไม่ต้องยุ่งกับ axios โดยตรง
 * และ endpoint ทุกจุดตรงกับ batches.routes.js ฝั่ง backend:
 *
 *   GET    /batches                 -> getBatches(params)
 *   GET    /batches/latest-personnel-> getLatestPersonnel()
 *   POST   /batches                 -> createBatch(payload)
 *   POST   /batches/bulk-year       -> createBulkYearBatches(payloadArray)
 *   PUT    /batches/:id             -> updateBatch(id, payload)
 *   DELETE /batches/:id             -> deleteBatch(id)
 */

// ดึงรายการรุ่นการเรียนทั้งหมด (รองรับ filter year / term ผ่าน query string)
export const getBatches = async (params = {}) => {
    const { data } = await axiosInstance.get("/batches", { params });
    return data;
};

// ดึงรายชื่อผู้บริหาร/หัวหน้างาน 9 ตำแหน่งจากรุ่นล่าสุด (ใช้กับปุ่ม Auto-fill)
export const getLatestPersonnel = async () => {
    const { data } = await axiosInstance.get("/batches/latest-personnel");
    return data;
};

// สร้างรุ่นการเรียนใหม่ (โหมด Single Batch)
export const createBatch = async (payload) => {
    const { data } = await axiosInstance.post("/batches", payload);
    return data;
};

// สร้างรุ่นการเรียนยกปี (โหมด Bulk Year Setup) -> ส่ง Array 4 Items ในครั้งเดียว
export const createBulkYearBatches = async (payloadArray) => {
    const { data } = await axiosInstance.post("/batches/bulk-year", payloadArray);
    return data; // { message, count, data: Batch[] }
};

// แก้ไขข้อมูลรุ่นการเรียน
export const updateBatch = async (id, payload) => {
    const { data } = await axiosInstance.put(`/batches/${id}`, payload);
    return data;
};

// ลบรุ่นการเรียน
export const deleteBatch = async (id) => {
    const { data } = await axiosInstance.delete(`/batches/${id}`);
    return data;
};