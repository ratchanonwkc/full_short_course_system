import axiosInstance from "../../../config/axiosInstance";

/**
 * registrarApi
 * ---------------------------------------------------------------------------
 *   PUT  /enrollments/:id/reassign-group -> reassignStudyGroup(id, { study_group_id })
 *   PUT  /enrollments/:id/applicant      -> updateApplicantDetails(id, { applicant, study_group_id })
 *   POST /enrollments/:id/send-email     -> sendConfirmationEmail(id)
 */

export const getEnrollmentById = async (enrollmentId) => {
    const { data } = await axiosInstance.get(`/enrollments/${enrollmentId}`);
    return data;
};

export const reassignStudyGroup = async (enrollmentId, payload) => {
    const { data } = await axiosInstance.put(`/enrollments/${enrollmentId}/reassign-group`, payload);
    return data;
};

export const updateApplicantDetails = async (enrollmentId, payload) => {
    const { data } = await axiosInstance.put(`/enrollments/${enrollmentId}/applicant`, payload);
    return data;
};

export const sendConfirmationEmail = async (enrollmentId) => {
    const { data } = await axiosInstance.post(`/enrollments/${enrollmentId}/send-email`);
    return data;
};
