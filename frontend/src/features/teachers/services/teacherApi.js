import axiosInstance from "../../../config/axiosInstance";

/**
 * teacherApi
 * ---------------------------------------------------------------------------
 * รวมฟังก์ชันเรียก REST API ของ Teachers Module (เดียวกับแนวทาง batchApi.js)
 * ใช้ axiosInstance ตัวเดิม (src/config/axiosInstance.js) ตัวเดียวกับ Batches Module
 *
 * ฝั่ง backend คาดหวัง endpoint ตามรูปแบบเดียวกับ batches.routes.js:
 *
 *   Teachers:
 *     GET    /teachers          -> getTeachers(params)
 *     POST   /teachers          -> createTeacher(payload)
 *     PUT    /teachers/:id      -> updateTeacher(id, payload)
 *     DELETE /teachers/:id      -> deleteTeacher(id)
 *
 *   Master data (คำนำหน้าชื่อ / ตำแหน่งหลัก / หน้าที่พิเศษ):
 *     GET    /prefixes | /positions | /sub-positions        -> getMasterItems(type)
 *     POST   /prefixes | /positions | /sub-positions        -> createMasterItem(type, payload)
 *     PUT    /prefixes/:id | /positions/:id | /sub-positions/:id -> updateMasterItem(type, id, payload)
 *     DELETE /prefixes/:id | /positions/:id | /sub-positions/:id -> deleteMasterItem(type, id)
 *     (ลบไม่สำเร็จเพราะติด FK -> backend ควรตอบ 409 Conflict)
 */

// map "type" ภายใน component (prefix / position / sub_position) -> ชื่อ resource บน URL จริง
const MASTER_ENDPOINT = {
    prefix: "prefixes",
    position: "positions",
    sub_position: "sub-positions",
};

const resolveMasterPath = (type) => {
    const resource = MASTER_ENDPOINT[type];
    if (!resource) throw new Error(`Unknown master data type: ${type}`);
    return resource;
};

// ─── Teachers ────────────────────────────────────────────────────────────────

// ดึงรายชื่ออาจารย์ทั้งหมด (รองรับส่ง query params เช่น { status } ในอนาคตได้)
export const getTeachers = async (params = {}) => {
    const { data } = await axiosInstance.get("/teachers", { params });
    return data;
};

// สร้างอาจารย์ใหม่
export const createTeacher = async (payload) => {
    const { data } = await axiosInstance.post("/teachers", payload);
    return data;
};

// แก้ไขข้อมูลอาจารย์
export const updateTeacher = async (id, payload) => {
    const { data } = await axiosInstance.put(`/teachers/${id}`, payload);
    return data;
};

// ลบอาจารย์
export const deleteTeacher = async (id) => {
    const { data } = await axiosInstance.delete(`/teachers/${id}`);
    return data;
};

// ─── Master data: prefixes / positions / sub_positions ─────────────────────

// ดึงรายการ master data ตาม type ("prefix" | "position" | "sub_position")
export const getMasterItems = async (type) => {
    const { data } = await axiosInstance.get(`/${resolveMasterPath(type)}`);
    return data;
};

// เพิ่มรายการ master data ใหม่ (ใช้ทั้งจาก Quick Add ในฟอร์ม และจาก ManageMasterModal)
export const createMasterItem = async (type, payload) => {
    const { data } = await axiosInstance.post(`/${resolveMasterPath(type)}`, payload);
    return data;
};

// แก้ไขรายการ master data
export const updateMasterItem = async (type, id, payload) => {
    const { data } = await axiosInstance.put(`/${resolveMasterPath(type)}/${id}`, payload);
    return data;
};

// ลบรายการ master data (ถ้ามีอาจารย์อ้างอิงอยู่ backend ควรตอบ 409)
export const deleteMasterItem = async (type, id) => {
    const { data } = await axiosInstance.delete(`/${resolveMasterPath(type)}/${id}`);
    return data;
};