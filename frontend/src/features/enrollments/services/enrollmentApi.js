import axiosInstance from "../../../config/axiosInstance";

/**
 * enrollmentApi
 * ---------------------------------------------------------------------------
 *   GET  /enrollments                     -> getEnrollments({ study_group_id, status, batch_id })
 *   POST /enrollments/walkin              -> createWalkinEnrollment(payload)
 *   PUT  /enrollments/:id/confirm-payment -> confirmPayment(id, { receipt_book_no, receipt_number })
 *   PUT  /enrollments/:id/cancel          -> cancelEnrollment(id)
 */

export const getEnrollments = async (params = {}) => {
    const { data } = await axiosInstance.get("/enrollments", { params });
    return data;
};

export const createWalkinEnrollment = async (payload) => {
    const { data } = await axiosInstance.post("/enrollments/walkin", payload);
    return data;
};

export const confirmPayment = async (id, payload) => {
    const { data } = await axiosInstance.put(`/enrollments/${id}/confirm-payment`, payload);
    return data;
};

export const cancelEnrollment = async (id) => {
    const { data } = await axiosInstance.put(`/enrollments/${id}/cancel`);
    return data;
};
