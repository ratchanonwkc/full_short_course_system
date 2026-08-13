import axiosInstance from "../../../config/axiosInstance";

/**
 * publicApi
 * ---------------------------------------------------------------------------
 *   GET  /public/study-groups/open           -> getOpenStudyGroups({ search, major_id })
 *   GET  /public/study-groups/open/:id        -> getStudyGroupDetail(id)
 *   GET  /public/postal-code/:code            -> lookupPostalCode(code)
 *   GET  /public/payment-methods/active       -> getActivePaymentMethods()
 *   POST /public/upload-slip (multipart)      -> uploadSlip(file)
 *   POST /public/applications                 -> submitApplication(payload)
 *   GET  /public/applications/status/:citizenId -> checkApplicationStatus(citizenId)
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
    return data; // Array<{ postal_code, subdistrict, district, province }>
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

export const submitApplication = async (payload) => {
    const { data } = await axiosInstance.post("/public/applications", payload);
    return data;
};

export const checkApplicationStatus = async (citizenId) => {
    const { data } = await axiosInstance.get(`/public/applications/status/${citizenId}`);
    return data;
};
