import axiosInstance from "../../../config/axiosInstance";

/**
 * subjectApi
 * ---------------------------------------------------------------------------
 *   GET    /subjects                -> getSubjects(params)  รองรับ filter/search/pagination
 *   GET    /subjects/next-sequence  -> getNextSequence({ minor_id, duration_group })
 *   POST   /subjects                -> createSubject(payload)
 *   PUT    /subjects/:id            -> updateSubject(id, payload)
 *   DELETE /subjects/:id            -> deleteSubject(id)
 */

// params: { level_id, subject_type_id, major_id, minor_id, search, page, pageSize }
export const getSubjects = async (params = {}) => {
    const { data } = await axiosInstance.get("/subjects", { params });
    return data; // { data: Subject[], pagination: {...} }
};

export const getNextSequence = async (minorId, durationGroup) => {
    const { data } = await axiosInstance.get("/subjects/next-sequence", {
        params: { minor_id: minorId, duration_group: durationGroup },
    });
    return data; // { sequence: "05" } | { sequence: null, message }
};

export const createSubject = async (payload) => {
    const { data } = await axiosInstance.post("/subjects", payload);
    return data;
};

export const updateSubject = async (id, payload) => {
    const { data } = await axiosInstance.put(`/subjects/${id}`, payload);
    return data;
};

export const deleteSubject = async (id) => {
    const { data } = await axiosInstance.delete(`/subjects/${id}`);
    return data;
};
