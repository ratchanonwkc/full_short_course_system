import axiosInstance from "../../../config/axiosInstance";

/**
 * publicApi
 * ---------------------------------------------------------------------------
 *   GET  /public/study-groups/open           -> getOpenStudyGroups({ search, major_id, batch_id })
 *   GET  /public/study-groups/open/:id        -> getStudyGroupDetail(id)
 *   GET  /public/postal-code/:code            -> lookupPostalCode(code)
 *   GET  /public/payment-methods/active       -> getActivePaymentMethods()
 *   POST /public/upload-slip (multipart)      -> uploadSlip(file)
 *   POST /public/upload-id-card (multipart)   -> uploadIdCard(file)
 *   POST /public/applications                 -> submitApplication(payload)
 *   GET  /public/applications/status/:citizenId -> checkApplicationStatus(citizenId)
 *   PUT  /public/applications/:id/resubmit    -> resubmitApplication(id, payload)
 */

export const getOpenStudyGroups = async (params = {}) => {
    const { data } = await axiosInstance.get("/public/study-groups/open", { params });
    return data;
};

export const getStudyGroupDetail = async (id) => {
    const { data } = await axiosInstance.get(`/public/study-groups/open/${id}`);
    return data;
};

export const lookupPostalCode = async (code) => {
    const { data } = await axiosInstance.get(`/public/postal-code/${code}`);
    return data;
};

export const getActivePaymentMethods = async () => {
    const { data } = await axiosInstance.get("/public/payment-methods/active");
    return data;
};

export const uploadSlip = async (file) => {
    const formData = new FormData();
    formData.append("slip", file);
    const { data } = await axiosInstance.post("/public/upload-slip", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data; // { slip_url }
};

export const uploadIdCard = async (file) => {
    const formData = new FormData();
    formData.append("id_card", file);
    const { data } = await axiosInstance.post("/public/upload-id-card", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data; // { id_card_url }
};

export const submitApplication = async (payload) => {
    const { data } = await axiosInstance.post("/public/applications", payload);
    return data;
};

export const lookupApplicantByCitizenId = async (citizenId) => {
    const { data } = await axiosInstance.get(`/public/applicants/lookup/${citizenId}`);
    return data;
};

export const checkApplicationStatus = async (citizenId) => {
    const { data } = await axiosInstance.get(`/public/applications/status/${citizenId}`);
    return data;
};

export const trackApplicant = async (citizenId) => {
    const { data } = await axiosInstance.get(`/v1/applicants/track/${citizenId}`);
    return data;
};

export const updateApplicantEnrollment = async (enrollmentId, payload) => {
    const { data } = await axiosInstance.put(`/v1/enrollments/${enrollmentId}/applicant-update`, payload);
    return data;
};

export const getBlankPrintTemplate = async (studyGroupId = "") => {
    const path = studyGroupId ? `/v1/print/blank-template/${studyGroupId}` : `/v1/print/blank-template`;
    const { data } = await axiosInstance.get(path);
    return data;
};

export const resubmitApplication = async (enrollmentId, payload) => {
    const { data } = await axiosInstance.put(`/public/applications/${enrollmentId}/resubmit`, payload);
    return data;
};

