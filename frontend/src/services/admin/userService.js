import axiosInstance from '../../config/axiosInstance';

const STORAGE_KEY = 'sys_users_store_v1';

// Initial default seed users
const INITIAL_USERS = [
    {
        id: 'usr-001',
        name: 'ผู้ดูแลระบบสูงสุด',
        email: 'admin@institution.ac.th',
        role: 'admin',
        is_active: true,
        created_at: '2026-01-15T08:30:00.000Z',
    },
    {
        id: 'usr-002',
        name: 'สมศรี พัฒนาหลักสูตร (ฝ่ายแผน)',
        email: 'planning@institution.ac.th',
        role: 'planning',
        is_active: true,
        created_at: '2026-02-01T09:00:00.000Z',
    },
    {
        id: 'usr-003',
        name: 'วิชัย ทะเบียนการศึกษา (ฝ่ายทะเบียน)',
        email: 'registrar@institution.ac.th',
        role: 'registrar',
        is_active: true,
        created_at: '2026-02-10T10:15:00.000Z',
    },
    {
        id: 'usr-004',
        name: 'นภาพร บริหารการเงิน (ฝ่ายการเงิน)',
        email: 'finance@institution.ac.th',
        role: 'finance',
        is_active: true,
        created_at: '2026-02-20T11:45:00.000Z',
    },
    {
        id: 'usr-005',
        name: 'อนุชา ธุรการการเงิน',
        email: 'anucha.fin@institution.ac.th',
        role: 'finance',
        is_active: false,
        created_at: '2026-03-01T14:20:00.000Z',
    },
];

const getStoredUsers = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_USERS));
            return INITIAL_USERS;
        }
        return JSON.parse(data);
    } catch {
        return INITIAL_USERS;
    }
};

const setStoredUsers = (users) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
        console.error('Failed to save users into localStorage', e);
    }
};

export const userService = {
    // 1. Get all users
    getUsers: async () => {
        try {
            const { data } = await axiosInstance.get('/users');
            return Array.isArray(data) ? data : data.users || [];
        } catch {
            // Fallback to local storage store
            return getStoredUsers();
        }
    },

    // 2. Create new user
    createUser: async (payload) => {
        try {
            const { data } = await axiosInstance.post('/users', payload);
            return data;
        } catch {
            const current = getStoredUsers();
            if (current.some((u) => u.email.toLowerCase() === payload.email.toLowerCase())) {
                throw new Error('อีเมลนี้ถูกใช้งานในระบบแล้ว');
            }
            const newUser = {
                id: `usr-${Date.now()}`,
                name: payload.name,
                email: payload.email,
                role: payload.role || 'registrar',
                is_active: payload.is_active ?? true,
                created_at: new Date().toISOString(),
            };
            const updated = [newUser, ...current];
            setStoredUsers(updated);
            return newUser;
        }
    },

    // 3. Update existing user
    updateUser: async (id, payload) => {
        try {
            const { data } = await axiosInstance.put(`/users/${id}`, payload);
            return data;
        } catch {
            const current = getStoredUsers();
            const index = current.findIndex((u) => u.id === id);
            if (index === -1) throw new Error('ไม่พบข้อมูลผู้ใช้งาน');

            const isDuplicate = current.some(
                (u) => u.id !== id && u.email.toLowerCase() === payload.email?.toLowerCase()
            );
            if (isDuplicate) throw new Error('อีเมลนี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว');

            const updatedUser = {
                ...current[index],
                ...payload,
                updated_at: new Date().toISOString(),
            };
            current[index] = updatedUser;
            setStoredUsers(current);
            return updatedUser;
        }
    },

    // 4. Reset password
    resetPassword: async (id, newPassword) => {
        try {
            const { data } = await axiosInstance.post(`/users/${id}/reset-password`, {
                password: newPassword,
            });
            return data;
        } catch {
            // Simulated success for demo/offline
            return { message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' };
        }
    },

    // 5. Delete user
    deleteUser: async (id) => {
        try {
            const { data } = await axiosInstance.delete(`/users/${id}`);
            return data;
        } catch {
            const current = getStoredUsers();
            const filtered = current.filter((u) => u.id !== id);
            setStoredUsers(filtered);
            return { success: true };
        }
    },

    // 6. Toggle active status
    toggleStatus: async (id, is_active) => {
        try {
            const { data } = await axiosInstance.patch(`/users/${id}/status`, { is_active });
            return data;
        } catch {
            const current = getStoredUsers();
            const index = current.findIndex((u) => u.id === id);
            if (index !== -1) {
                current[index].is_active = is_active;
                setStoredUsers(current);
                return current[index];
            }
            throw new Error('ไม่พบข้อมูลผู้ใช้');
        }
    },
};

export default userService;
