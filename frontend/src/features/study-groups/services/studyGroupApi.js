import axiosInstance from "../../../config/axiosInstance";

/**
 * studyGroupApi
 * ---------------------------------------------------------------------------
 *   GET    /study-groups                    -> getStudyGroups({ batch_id, major_id })
 *   GET    /study-groups/:id                 -> getStudyGroupById(id)
 *   GET    /study-groups/next-room-sequence  -> getNextRoomSequence(departmentPrefix)
 *   GET    /study-groups/next-moe-sequence   -> getNextMoeSequence(yearPrefix, departmentId)
 *   POST   /study-groups                     -> createStudyGroup(payload)
 *   PUT    /study-groups/:id                 -> updateStudyGroup(id, payload)
 *   DELETE /study-groups/:id                 -> deleteStudyGroup(id)
 *
 *   Study group subjects (รายวิชาย่อยในกลุ่มเรียน):
 *   GET    /study-group-subjects             -> getSubjectsInGroup(studyGroupId)
 *   POST   /study-group-subjects             -> addSubjectToGroup(payload)
 *   PUT    /study-group-subjects/:id         -> updateSubjectInGroup(id, payload)
 *   DELETE /study-group-subjects/:id         -> removeSubjectFromGroup(id)
 *
 *   Locations (สถานที่จัดเรียนร่วม) ใช้ endpoint generic เดียวกับ masterData.routes.js
 *   Time slots (รอบเรียน) เช่นกัน — read-only จากฝั่ง UI ของฟอร์มกลุ่มเรียน
 */

// ─── Study groups ────────────────────────────────────────────────────────────
export const getStudyGroups = async (params = {}) => {
    const { data } = await axiosInstance.get("/study-groups", { params });
    return data;
};

export const getStudyGroupById = async (id) => {
    const { data } = await axiosInstance.get(`/study-groups/${id}`);
    return data;
};

export const getStudyGroupRosterBySubject = async (id) => {
    const { data } = await axiosInstance.get(`/v1/study-groups/${id}/roster-by-subject`);
    return data;
};

export const getBlankPrintTemplate = async (studyGroupId = "") => {
    const path = studyGroupId ? `/v1/print/blank-template/${studyGroupId}` : `/v1/print/blank-template`;
    const { data } = await axiosInstance.get(path);
    return data;
};

export const getNextRoomSequence = async (departmentPrefix) => {
    const { data } = await axiosInstance.get("/study-groups/next-room-sequence", {
        params: { department_prefix: departmentPrefix },
    });
    return data; // { sequence: "0001" } | { sequence: null, message }
};

export const getNextMoeSequence = async (yearPrefix, departmentId) => {
    const { data } = await axiosInstance.get("/study-groups/next-moe-sequence", {
        params: { year_prefix: yearPrefix, department_id: departmentId },
    });
    return data; // { sequence: "001" } | { sequence: null, message }
};

export const createStudyGroup = async (payload) => {
    const { data } = await axiosInstance.post("/study-groups", payload);
    return data;
};

export const updateStudyGroup = async (id, payload) => {
    const { data } = await axiosInstance.put(`/study-groups/${id}`, payload);
    return data;
};

export const deleteStudyGroup = async (id) => {
    const { data } = await axiosInstance.delete(`/study-groups/${id}`);
    return data;
};

// ─── Study group subjects (ชุดวิชา / รายวิชาย่อยในกลุ่ม) ─────────────────────
export const getSubjectsInGroup = async (studyGroupId) => {
    const { data } = await axiosInstance.get("/study-group-subjects", {
        params: { study_group_id: studyGroupId },
    });
    return data;
};

export const addSubjectToGroup = async (payload) => {
    const { data } = await axiosInstance.post("/study-group-subjects", payload);
    return data;
};

export const updateSubjectInGroup = async (id, payload) => {
    const { data } = await axiosInstance.put(`/study-group-subjects/${id}`, payload);
    return data;
};

export const removeSubjectFromGroup = async (id) => {
    const { data } = await axiosInstance.delete(`/study-group-subjects/${id}`);
    return data;
};

// ─── Locations (สถานที่จัดเรียนร่วม) ──────────────────────────────────────────
export const getLocations = async (params = {}) => {
    const { data } = await axiosInstance.get("/locations", { params });
    return data;
};
export const createLocation = async (payload) => {
    const { data } = await axiosInstance.post("/locations", payload);
    return data;
};
export const updateLocation = async (id, payload) => {
    const { data } = await axiosInstance.put(`/locations/${id}`, payload);
    return data;
};
export const deleteLocation = async (id) => {
    const { data } = await axiosInstance.delete(`/locations/${id}`);
    return data;
};

// ─── Time slots (รอบเรียน: ช/บ/ค/พ) — read-only จาก UI ───────────────────────
export const getTimeSlots = async (params = {}) => {
    const { data } = await axiosInstance.get("/time-slots", { params });
    return data;
};