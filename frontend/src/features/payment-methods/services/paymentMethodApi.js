import axiosInstance from "../../../config/axiosInstance";

/**
 * paymentMethodApi — CRUD บัญชีธนาคาร/ QR Code รับเงิน (Finance Settings)
 */
export const getPaymentMethods = async () => {
    const { data } = await axiosInstance.get("/payment-methods");
    return data;
};

export const createPaymentMethod = async (payload) => {
    const { data } = await axiosInstance.post("/payment-methods", payload);
    return data;
};

export const updatePaymentMethod = async (id, payload) => {
    const { data } = await axiosInstance.put(`/payment-methods/${id}`, payload);
    return data;
};

export const deletePaymentMethod = async (id) => {
    const { data } = await axiosInstance.delete(`/payment-methods/${id}`);
    return data;
};

export const uploadQrCode = async (file) => {
    const formData = new FormData();
    formData.append("qr", file);
    const { data } = await axiosInstance.post("/payment-methods/upload-qr", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data; // { qr_code_url }
};
