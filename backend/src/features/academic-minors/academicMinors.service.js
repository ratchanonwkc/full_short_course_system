import { supabase } from '../../config/supabase.js';

// ดึงรายการสาขางาน/กลุ่มวิชาทั้งหมด พร้อม Join ชื่อสาขาวิชา (major) ต้นสังกัด
export const getAllMinorsService = async ({ majorId } = {}) => {
    let query = supabase
        .from('academic_minors')
        .select(`
      *,
      academic_majors:major_id ( id, name_th, department_id, full_major_code )
    `)
        .order('sub_department_id', { ascending: true });

    if (majorId) query = query.eq('major_id', majorId);

    const { data, error } = await query;
    if (error) throw error;

    return data.map((m) => ({
        ...m,
        major_name: m.academic_majors?.name_th || '',
        major_department_id: m.academic_majors?.department_id || '',
    }));
};

export const createMinorService = async (payload) => {
    const { data, error } = await supabase
        .from('academic_minors')
        .insert([payload])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateMinorService = async (id, payload) => {
    const { data, error } = await supabase
        .from('academic_minors')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteMinorService = async (id) => {
    const { error } = await supabase
        .from('academic_minors')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
};
