import axiosInstance from "../../../config/axiosInstance";

/**
 * enrollmentApi
 * ---------------------------------------------------------------------------
 *   GET  /enrollments                     -> getEnrollments({ study_group_id, status, batch_id })
 *   POST /enrollments/walkin              -> createWalkinEnrollment(payload)
 *   PUT  /enrollments/:id/confirm-payment -> confirmPayment(id, { receipt_book_no, receipt_number })
 *   PUT  /enrollments/:id/reject          -> rejectPayment(id, { reason })
 *   PUT  /enrollments/:id/cancel          -> cancelEnrollment(id)
 *
 * NOTE: `rejectPayment` is a new endpoint — add to enrollments.routes.js:
 *   router.put('/:id/reject', rejectPayment);
 * Backend should set status='rejected', persist `reason`, and stamp
 * rejected_by_user_id / rejected_at for the audit log.
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

export const rejectPayment = async (id, payload) => {
    const { data } = await axiosInstance.put(`/enrollments/${id}/reject`, payload);
    return data;
};

export const cancelEnrollment = async (id) => {
    const { data } = await axiosInstance.put(`/enrollments/${id}/cancel`);
    return data;
};