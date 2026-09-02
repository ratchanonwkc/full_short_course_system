import { supabase } from '../../config/supabase.js';

export const getAllTeachersService = async () => {
    // ดึงข้อมูลอาจารย์พร้อม JOIN ตาราง Master Data ที่เกี่ยวข้อง
    const { data, error } = await supabase
        .from('teachers')
        .select(`
      *,
      prefixes:prefix_id (short_name, full_name),
      positions:position_id (position_name),
      sub_positions:sub_position_id (sub_position_name)
    `)
        .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform Data ให้เป็น Flat Object เพื่อให้ AG Grid ฝั่ง React อ่านข้อมูลง่าย
    return data.map((t) => ({
        ...t,
        prefix_name: t.prefixes?.short_name || '',
        position_name: t.positions?.position_name || '',
        sub_position_name: t.sub_positions?.sub_position_name || ''
    }));
};

const sanitizeTeacherData = (teacherData) => {
    if (!teacherData || typeof teacherData !== 'object') return teacherData;
    const bigintFields = new Set(['prefix_id', 'position_id', 'sub_position_id', 'department_id', 'user_id']);
    const sanitized = {};
    for (const [key, value] of Object.entries(teacherData)) {
        if (bigintFields.has(key)) {
            if (value === '' || value === null || value === undefined || value === 'none') {
                sanitized[key] = null;
            } else {
                const num = Number(value);
                sanitized[key] = isNaN(num) ? null : num;
            }
        } else if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed === '' && ['first_name_en', 'last_name_en', 'email', 'phone'].includes(key)) {
                sanitized[key] = null;
            } else {
                sanitized[key] = trimmed;
            }
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
};

export const createTeacherService = async (teacherData) => {
    const cleanData = sanitizeTeacherData(teacherData);
    const { data, error } = await supabase
        .from('teachers')
        .insert([cleanData])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateTeacherService = async (id, teacherData) => {
    const cleanData = sanitizeTeacherData(teacherData);
    const { data, error } = await supabase
        .from('teachers')
        .update(cleanData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteTeacherService = async (id) => {
    const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
};