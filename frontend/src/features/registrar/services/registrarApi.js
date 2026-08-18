import axiosInstance from "../../../config/axiosInstance";

/**
 * registrarApi
 * ---------------------------------------------------------------------------
 * Registrar-specific extensions on top of enrollments/study-groups:
 *
 *   PUT /enrollments/:id/reassign-group -> reassignStudyGroup(id, { study_group_id })
 *   POST /enrollments/:id/send-email    -> sendConfirmationEmail(id)
 *
 * NOTE: these two endpoints are new — add matching routes/controller/service
 * on the backend (enrollments.routes.js) mirroring the pattern of
 * confirm-payment / cancel:
 *
 *   router.put('/:id/reassign-group', reassignGroup);
 *   router.post('/:id/send-email', sendConfirmationEmail);
 */

export const reassignStudyGroup = async (enrollmentId, payload) => {
    const { data } = await axiosInstance.put(`/enrollments/${enrollmentId}/reassign-group`, payload);
    return data;
};

export const sendConfirmationEmail = async (enrollmentId) => {
    const { data } = await axiosInstance.post(`/enrollments/${enrollmentId}/send-email`);
    return data;
};