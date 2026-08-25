import { supabase } from '../../config/supabase.js';

/**
 * Admin Service using Supabase Service Role Client
 * -------------------------------------------------------------
 * Interacts directly with auth.users (via admin API) and public.users / audit_logs
 */

// 1. Get all users
export const listUsersService = async () => {
    // Query public.users joined with auth data
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        // Fallback: list directly from Supabase Auth Admin
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        return authData.users.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.user_metadata?.full_name || u.user_metadata?.name || u.email.split('@')[0],
            role: u.user_metadata?.role || 'registrar',
            is_active: true,
            created_at: u.created_at,
        }));
    }

    return users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.full_name,
        role: u.role,
        is_active: u.status === 'active',
        created_at: u.created_at,
        updated_at: u.updated_at,
    }));
};

// 2. Create user with credentials & role
export const createUserService = async ({ email, password, name, role, is_active = true }, actor) => {
    // Create user in Supabase Auth via admin API
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            full_name: name,
            name,
            role,
        },
    });

    if (error) throw error;
    const createdUser = data.user;

    // Upsert into public.users
    await supabase.from('users').upsert({
        id: createdUser.id,
        email: createdUser.email,
        full_name: name,
        role,
        status: is_active ? 'active' : 'inactive',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    });

    // Record audit log
    await recordAuditLogService({
        actor_id: actor?.id,
        action_type: 'USER_CREATED',
        target_table: 'users',
        target_id: createdUser.id,
        description: `สร้างบัญชีผู้ใช้งานใหม่ ${name} (${email}) กำหนดสิทธิ์เป็น ${role}`,
        old_data: null,
        new_data: { id: createdUser.id, email, name, role, is_active },
    });

    return {
        id: createdUser.id,
        email: createdUser.email,
        name,
        role,
        is_active,
        created_at: createdUser.created_at,
    };
};

// 3. Update existing user
export const updateUserService = async (id, { name, email, role, is_active, password }, actor) => {
    // Fetch old data for audit
    const { data: oldUser } = await supabase.from('users').select('*').eq('id', id).single();

    const updatePayload = {
        user_metadata: {
            full_name: name,
            name,
            role,
        },
    };
    if (email) updatePayload.email = email;
    if (password) updatePayload.password = password;

    const { error: authError } = await supabase.auth.admin.updateUserById(id, updatePayload);
    if (authError) throw authError;

    const { data: updated, error: dbError } = await supabase
        .from('users')
        .update({
            full_name: name,
            email,
            role,
            status: is_active ? 'active' : 'inactive',
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (dbError) throw dbError;

    // Record audit log
    await recordAuditLogService({
        actor_id: actor?.id,
        action_type: 'USER_UPDATED',
        target_table: 'users',
        target_id: id,
        description: `แก้ไขข้อมูลผู้ใช้งาน ${name} (${email})`,
        old_data: oldUser,
        new_data: updated,
    });

    return {
        id: updated.id,
        email: updated.email,
        name: updated.full_name,
        role: updated.role,
        is_active: updated.status === 'active',
        created_at: updated.created_at,
    };
};

// 4. Reset user password
export const resetUserPasswordService = async (id, newPassword, actor) => {
    const { data, error } = await supabase.auth.admin.updateUserById(id, {
        password: newPassword,
    });
    if (error) throw error;

    await recordAuditLogService({
        actor_id: actor?.id,
        action_type: 'PASSWORD_RESET',
        target_table: 'users',
        target_id: id,
        description: `รีเซ็ตรหัสผ่านสำหรับผู้ใช้ ID: ${id}`,
        old_data: null,
        new_data: { id, reset_at: new Date().toISOString() },
    });

    return { success: true, message: 'Password updated successfully' };
};

// 5. Delete user
export const deleteUserService = async (id, actor) => {
    const { data: oldUser } = await supabase.from('users').select('*').eq('id', id).single();

    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw error;

    await supabase.from('users').delete().eq('id', id);

    await recordAuditLogService({
        actor_id: actor?.id,
        action_type: 'USER_DELETED',
        target_table: 'users',
        target_id: id,
        description: `ลบบัญชีผู้ใช้งาน ID: ${id} (${oldUser?.email || ''})`,
        old_data: oldUser,
        new_data: null,
    });

    return { success: true };
};

// 6. Toggle Status
export const toggleUserStatusService = async (id, is_active, actor) => {
    const status = is_active ? 'active' : 'inactive';
    const { data, error } = await supabase
        .from('users')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    await recordAuditLogService({
        actor_id: actor?.id,
        action_type: 'USER_STATUS_TOGGLED',
        target_table: 'users',
        target_id: id,
        description: `เปลี่ยนสถานะผู้ใช้ ${data.full_name} เป็น ${status}`,
        old_data: { status: is_active ? 'inactive' : 'active' },
        new_data: { status },
    });

    return {
        id: data.id,
        email: data.email,
        name: data.full_name,
        role: data.role,
        is_active: data.status === 'active',
    };
};

// 7. Audit Logs queries & recording
export const getAuditLogsService = async () => {
    let logs = [];
    let errorOccurred = false;

    // Try joining actor from public.users via Supabase PostgREST relations
    try {
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*, actor:users(id, full_name, email, role)')
            .order('created_at', { ascending: false })
            .limit(150);

        if (!error && Array.isArray(data)) {
            logs = data;
        } else {
            errorOccurred = true;
        }
    } catch {
        errorOccurred = true;
    }

    // Fallback: query audit_logs directly and join users manually by actor_id
    if (errorOccurred || logs.length === 0) {
        try {
            const { data: rawLogs, error: rawErr } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(150);

            if (rawErr) throw rawErr;

            const actorIds = [...new Set((rawLogs || []).map((l) => l.actor_id).filter(Boolean))];
            const usersMap = {};

            if (actorIds.length > 0) {
                const { data: userList } = await supabase
                    .from('users')
                    .select('id, full_name, email, role')
                    .in('id', actorIds);

                if (userList) {
                    for (const u of userList) {
                        usersMap[u.id] = u;
                    }
                }
            }

            logs = (rawLogs || []).map((l) => ({
                ...l,
                actor: l.actor || (l.actor_id ? usersMap[l.actor_id] || null : null),
            }));
        } catch (fallbackErr) {
            console.error('Error fetching audit logs fallback:', fallbackErr);
            throw fallbackErr;
        }
    }

    return logs.map((log) => {
        const createdAt = log.created_at || log.timestamp || new Date().toISOString();
        const actorObj = log.actor || null;

        return {
            id: log.id,
            created_at: createdAt,
            timestamp: createdAt,
            actor_id: log.actor_id || actorObj?.id || null,
            actor: actorObj
                ? {
                      id: actorObj.id,
                      full_name: actorObj.full_name || actorObj.name || 'ผู้ใช้งานระบบ',
                      name: actorObj.full_name || actorObj.name || 'ผู้ใช้งานระบบ',
                      email: actorObj.email || '-',
                      role: actorObj.role || 'staff',
                  }
                : null,
            action_type: log.action_type,
            target_entity: log.target_table
                ? `${log.target_table} #${log.target_id || ''}`.trim()
                : (log.target_entity || '-'),
            target_table: log.target_table,
            target_id: log.target_id,
            description: log.description || '-',
            ip_address: log.ip_address || '127.0.0.1',
            user_agent: log.user_agent || 'Web Client',
            metadata: log.new_data || log.metadata || null,
            changes: {
                before: log.old_data || log.changes?.before || null,
                after: log.new_data || log.changes?.after || null,
            },
        };
    });
};

export const recordAuditLogService = async (logEntry) => {
    try {
        const payload = {
            actor_id: logEntry.actor_id || logEntry.actor?.id || null,
            action_type: logEntry.action_type,
            target_table: logEntry.target_table || null,
            target_id: logEntry.target_id ? String(logEntry.target_id) : null,
            description: logEntry.description || '',
            old_data: logEntry.old_data || null,
            new_data: logEntry.new_data || null,
            ip_address: logEntry.ip_address || '127.0.0.1',
            user_agent: logEntry.user_agent || 'Web Client',
            created_at: logEntry.created_at || new Date().toISOString(),
        };
        await supabase.from('audit_logs').insert([payload]);
    } catch (e) {
        console.error('Failed to insert audit log:', e);
    }
};
