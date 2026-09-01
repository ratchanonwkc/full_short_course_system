import axiosInstance from '../../config/axiosInstance';

/**
 * userService
 * ─────────────────────────────────────────────────────────────
 * Real database and Supabase Auth user management API client.
 * Connects directly to backend endpoints under /api/admin/users.
 */
export const userService = {
    // 1. Get all users
    getUsers: async () => {
        const { data } = await axiosInstance.get('/admin/users');
        return Array.isArray(data) ? data : data.users || [];
    },

    // 2. Create new user
    createUser: async (payload) => {
        const { data } = await axiosInstance.post('/admin/users', payload);
        return data;
    },

    // 3. Update existing user
    updateUser: async (id, payload) => {
        const { data } = await axiosInstance.put(`/admin/users/${id}`, payload);
        return data;
    },

    // 4. Reset password
    resetPassword: async (id, newPassword) => {
        const { data } = await axiosInstance.post(`/admin/users/${id}/reset-password`, {
            password: newPassword,
        });
        return data;
    },

    // 5. Delete user
    deleteUser: async (id) => {
        const { data } = await axiosInstance.delete(`/admin/users/${id}`);
        return data;
    },

    // 6. Toggle active status
    toggleStatus: async (id, is_active) => {
        const { data } = await axiosInstance.patch(`/admin/users/${id}/status`, { is_active });
        return data;
    },
};

export default userService;
