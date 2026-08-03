import { supabase } from '../../config/supabase.js';

// ดึงรายการสาขาวิชา/แผนกทั้งหมด พร้อม Join ชื่อระดับชั้น, ประเภทวิชา และหัวหน้าแผนก
export const getAllMajorsService = async ({ levelId, subjectTypeId } = {}) => {
    let query = supabase
        .from('academic_majors')
        .select(`
      *,
      academic_levels:level_id ( id, level_name ),
      subject_types:subject_type_id ( id, name_th ),
      teachers:head_teacher_id ( id, first_name_th, last_name_th, prefixes:prefix_id (short_name) )
    `)
        .order('department_id', { ascending: true });

    if (levelId) query = query.eq('level_id', levelId);
    if (subjectTypeId) query = query.eq('subject_type_id', subjectTypeId);

    const { data, error } = await query;
    if (error) throw error;

    return data.map((m) => ({
        ...m,
        level_name: m.academic_levels?.level_name || '',
        subject_type_name: m.subject_types?.name_th || '',
        head_teacher_name: m.teachers
            ? `${m.teachers.prefixes?.short_name || ''}${m.teachers.first_name_th} ${m.teachers.last_name_th}`
            : '',
    }));
};

export const createMajorService = async (payload) => {
    const { data, error } = await supabase
        .from('academic_majors')
        .insert([payload])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateMajorService = async (id, payload) => {
    const { data, error } = await supabase
        .from('academic_majors')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteMajorService = async (id) => {
    const { error } = await supabase
        .from('academic_majors')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
};
