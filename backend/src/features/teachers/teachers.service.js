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

export const createTeacherService = async (teacherData) => {
    const { data, error } = await supabase
        .from('teachers')
        .insert([teacherData])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateTeacherService = async (id, teacherData) => {
    const { data, error } = await supabase
        .from('teachers')
        .update(teacherData)
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