import axiosInstance from '../../config/axiosInstance';

/**
 * auditLogService
 * ─────────────────────────────────────────────────────────────
 * Real database and Supabase audit logs API client.
 * Connects directly to backend endpoints under /api/admin/audit-logs.
 */
export const auditLogService = {
    // 1. Get all logs
    getLogs: async () => {
        const { data } = await axiosInstance.get('/admin/audit-logs');
        const rawLogs = Array.isArray(data) ? data : data?.logs || [];

        return rawLogs.map((log) => {
            const time = log.created_at || log.timestamp || new Date().toISOString();
            const actorObj = log.actor || null;

            return {
                ...log,
                created_at: time,
                timestamp: time,
                actor: actorObj
                    ? {
                          id: actorObj.id,
                          name: actorObj.full_name || actorObj.name || 'ผู้ใช้งานระบบ',
                          full_name: actorObj.full_name || actorObj.name || 'ผู้ใช้งานระบบ',
                          email: actorObj.email || '',
                          role: actorObj.role || 'staff',
                      }
                    : null,
            };
        });
    },

    // 2. Add log entry
    recordLog: async (entry) => {
        const { data } = await axiosInstance.post('/admin/audit-logs', entry);
        return data;
    },
};

export default auditLogService;
