import { supabase } from '../../config/supabase.js';

/**
 * studyGroupSubjects.service.js
 * ─────────────────────────────────────────────────────────────────────────
 * จัดการ "รายวิชาย่อยในกลุ่มเรียน" (study_group_subjects) — ใช้กรณีกลุ่มเรียน
 * เป็น "ชุดวิชา" ที่ประกอบด้วยหลายรายวิชาย่อย แต่ละแถวมี moe_code (เลข ศธ.) ของตัวเอง
 */

export const getSubjectsInGroupService = async (studyGroupId) => {
    const { data, error } = await supabase
        .from('study_group_subjects')
        .select(`
      *,
      subjects:subject_id ( id, subject_code, name_th, total_hours )
    `)
        .eq('study_group_id', studyGroupId)
        .order('sequence_order', { ascending: true });

    if (error) throw error;

    return data.map((row) => ({
        ...row,
        subject_code: row.subjects?.subject_code || '',
        name_th: row.subjects?.name_th || '',
        total_hours: row.subjects?.total_hours || 0,
    }));
};

export const addSubjectToGroupService = async (payload) => {
    const { data, error } = await supabase
        .from('study_group_subjects')
        .insert([payload])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateSubjectInGroupService = async (id, payload) => {
    const { data, error } = await supabase
        .from('study_group_subjects')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const removeSubjectFromGroupService = async (id) => {
    const { error } = await supabase.from('study_group_subjects').delete().eq('id', id);
    if (error) throw error;
    return true;
};
