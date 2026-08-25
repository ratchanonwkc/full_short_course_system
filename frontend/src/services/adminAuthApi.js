import axiosInstance from '../config/axiosInstance';

/**
 * Admin Authentication & User Management API Service
 * -------------------------------------------------------------
 * Communicates with backend endpoints that securely execute
 * `supabase.auth.admin` operations without exposing the `SERVICE_ROLE_KEY` to the browser.
 */

export const adminAuthApi = {
    /**
     * 1. Retrieve all registered users & profiles
     * @returns {Promise<Array>} Array of user objects
     */
    getUsers: async () => {
        try {
            const { data } = await axiosInstance.get('/admin/users');
            return Array.isArray(data) ? data : data.users || [];
        } catch (error) {
            console.error('adminAuthApi.getUsers error:', error);
            throw new Error(error.response?.data?.message || 'ไม่สามารถดึงข้อมูลรายชื่อผู้ใช้งานได้');
        }
    },

    /**
     * 2. Create a new user with email, initial password, and assigned role
     * @param {Object} payload - { name, email, password, role, is_active }
     * @returns {Promise<Object>} Created user record
     */
    createUser: async ({ name, email, password, role = 'registrar', is_active = true }) => {
        try {
            const { data } = await axiosInstance.post('/admin/users', {
                name: name.trim(),
                email: email.trim(),
                password,
                role,
                is_active,
            });
            return data;
        } catch (error) {
            console.error('adminAuthApi.createUser error:', error);
            throw new Error(error.response?.data?.message || 'สร้างผู้ใช้งานใหม่ไม่สำเร็จ');
        }
    },

    /**
     * 3. Update existing user details (Name, Email, Role, Status, or optional Password)
     * @param {string} id - Target User ID (UUID)
     * @param {Object} payload - { name, email, role, is_active, password }
     * @returns {Promise<Object>} Updated user record
     */
    updateUser: async (id, payload) => {
        try {
            const { data } = await axiosInstance.put(`/admin/users/${id}`, payload);
            return data;
        } catch (error) {
            console.error('adminAuthApi.updateUser error:', error);
            throw new Error(error.response?.data?.message || 'แก้ไขข้อมูลผู้ใช้งานไม่สำเร็จ');
        }
    },

    /**
     * 4. Reset a user's password directly (Admin override)
     * @param {string} id - Target User ID
     * @param {string} newPassword - New password
     * @returns {Promise<Object>}
     */
    resetUserPassword: async (id, newPassword) => {
        try {
            const { data } = await axiosInstance.post(`/admin/users/${id}/reset-password`, {
                password: newPassword,
            });
            return data;
        } catch (error) {
            console.error('adminAuthApi.resetUserPassword error:', error);
            throw new Error(error.response?.data?.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
        }
    },

    /**
     * 5. Delete a user account from auth.users and public.users
     * @param {string} id - Target User ID
     * @returns {Promise<Object>}
     */
    deleteUser: async (id) => {
        try {
            const { data } = await axiosInstance.delete(`/admin/users/${id}`);
            return data;
        } catch (error) {
            console.error('adminAuthApi.deleteUser error:', error);
            throw new Error(error.response?.data?.message || 'ลบผู้ใช้งานไม่สำเร็จ');
        }
    },

    /**
     * 6. Toggle user active / inactive status
     * @param {string} id - Target User ID
     * @param {boolean} is_active
     * @returns {Promise<Object>}
     */
    toggleUserStatus: async (id, is_active) => {
        try {
            const { data } = await axiosInstance.patch(`/admin/users/${id}/status`, { is_active });
            return data;
        } catch (error) {
            console.error('adminAuthApi.toggleUserStatus error:', error);
            throw new Error(error.response?.data?.message || 'เปลี่ยนสถานะผู้ใช้ไม่สำเร็จ');
        }
    },

    /**
     * 7. Fetch system audit logs for compliance review
     * @returns {Promise<Array>} List of audit log entries
     */
    getAuditLogs: async () => {
        try {
            const { data } = await axiosInstance.get('/admin/audit-logs');
            return Array.isArray(data) ? data : data.logs || [];
        } catch (error) {
            console.error('adminAuthApi.getAuditLogs error:', error);
            throw new Error(error.response?.data?.message || 'ไม่สามารถโหลดประวัติการทำงานได้');
        }
    },
};

export default adminAuthApi;
