import axiosInstance from "../../../config/axiosInstance";

/**
 * academicStructureApi
 * ---------------------------------------------------------------------------
 * รวมฟังก์ชันเรียก REST API ของโครงสร้างหลักสูตร/วิชาการ:
 *
 *   Lookup ธรรมดา (ใช้ endpoint generic เดียวกับ masterData.routes.js ฝั่ง backend):
 *     GET/POST/PUT/DELETE /curriculums          -> curriculums
 *     GET/POST/PUT/DELETE /academic-levels      -> academic_levels
 *     GET                 /subject-types        -> subject_types (อ่านอย่างเดียวจาก UI)
 *
 *   สาขาวิชา/แผนก และ สาขางาน (มี Layer เฉพาะฝั่ง backend เพราะต้อง Join หลายตาราง):
 *     GET/POST/PUT/DELETE /academic-majors      -> academic_majors (?level_id=&subject_type_id=)
 *     GET/POST/PUT/DELETE /academic-minors      -> academic_minors (?major_id=)
 */

// ─── Generic lookup helper (curriculums / academic-levels / subject-types) ──

const genericGet = async (resource) => {
    const { data } = await axiosInstance.get(`/${resource}`);
    return data;
};
const genericCreate = async (resource, payload) => {
    const { data } = await axiosInstance.post(`/${resource}`, payload);
    return data;
};
const genericUpdate = async (resource, id, payload) => {
    const { data } = await axiosInstance.put(`/${resource}/${id}`, payload);
    return data;
};
const genericDelete = async (resource, id) => {
    const { data } = await axiosInstance.delete(`/${resource}/${id}`);
    return data;
};

// ─── Curriculums (หลักสูตร) ──────────────────────────────────────────────────
export const getCurriculums = () => genericGet("curriculums");
export const createCurriculum = (payload) => genericCreate("curriculums", payload);
export const updateCurriculum = (id, payload) => genericUpdate("curriculums", id, payload);
export const deleteCurriculum = (id) => genericDelete("curriculums", id);

// ─── Academic levels (ระดับชั้น) ─────────────────────────────────────────────
export const getAcademicLevels = () => genericGet("academic-levels");
export const createAcademicLevel = (payload) => genericCreate("academic-levels", payload);
export const updateAcademicLevel = (id, payload) => genericUpdate("academic-levels", id, payload);
export const deleteAcademicLevel = (id) => genericDelete("academic-levels", id);

// ─── Subject types (ประเภทวิชา) — read-only ในหน้า UI ────────────────────────
export const getSubjectTypes = () => genericGet("subject-types");

// ─── Academic majors (สาขาวิชา/แผนก) ─────────────────────────────────────────
export const getMajors = async (params = {}) => {
    const { data } = await axiosInstance.get("/academic-majors", { params });
    return data;
};
export const createMajor = async (payload) => {
    const { data } = await axiosInstance.post("/academic-majors", payload);
    return data;
};
export const updateMajor = async (id, payload) => {
    const { data } = await axiosInstance.put(`/academic-majors/${id}`, payload);
    return data;
};
export const deleteMajor = async (id) => {
    const { data } = await axiosInstance.delete(`/academic-majors/${id}`);
    return data;
};

// ─── Academic minors (สาขางาน/กลุ่มวิชา) ─────────────────────────────────────
export const getMinors = async (params = {}) => {
    const { data } = await axiosInstance.get("/academic-minors", { params });
    return data;
};
export const createMinor = async (payload) => {
    const { data } = await axiosInstance.post("/academic-minors", payload);
    return data;
};
export const updateMinor = async (id, payload) => {
    const { data } = await axiosInstance.put(`/academic-minors/${id}`, payload);
    return data;
};
export const deleteMinor = async (id) => {
    const { data } = await axiosInstance.delete(`/academic-minors/${id}`);
    return data;
};
