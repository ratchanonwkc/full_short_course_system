import { supabase } from '../../config/supabase.js';

/**
 * หมายเหตุ: major_id / minor_id บนตาราง subjects ไม่มี FK constraint ประกาศไว้ใน schema
 * (ต่างจาก level_id / curriculum_id / subject_type_id ที่มี FK ชัดเจน) จึงเลือก "ดึงแยกแล้ว
 * join ฝั่ง JS" ทั้งหมดเพื่อความชัวร์ ไม่พึ่งพา PostgREST embedded resource ที่อาจพังถ้า
 * schema cache ยังไม่รู้จักความสัมพันธ์นั้น ๆ
 */
const attachLookupNames = async (rows) => {
    if (rows.length === 0) return rows;

    const levelIds = [...new Set(rows.map((r) => r.level_id).filter(Boolean))];
    const curriculumIds = [...new Set(rows.map((r) => r.curriculum_id).filter(Boolean))];
    const subjectTypeIds = [...new Set(rows.map((r) => r.subject_type_id).filter(Boolean))];
    const majorIds = [...new Set(rows.map((r) => r.major_id).filter(Boolean))];
    const minorIds = [...new Set(rows.map((r) => r.minor_id).filter(Boolean))];

    const [levelsRes, curriculumsRes, typesRes, majorsRes, minorsRes] = await Promise.all([
        levelIds.length ? supabase.from('academic_levels').select('id, level_name').in('id', levelIds) : { data: [] },
        curriculumIds.length ? supabase.from('curriculums').select('id, curriculum_name').in('id', curriculumIds) : { data: [] },
        subjectTypeIds.length ? supabase.from('subject_types').select('id, name_th').in('id', subjectTypeIds) : { data: [] },
        majorIds.length ? supabase.from('academic_majors').select('id, name_th, department_id').in('id', majorIds) : { data: [] },
        minorIds.length ? supabase.from('academic_minors').select('id, name_th, sub_department_id').in('id', minorIds) : { data: [] },
    ]);

    const byId = (arr) => Object.fromEntries((arr || []).map((x) => [String(x.id), x]));
    const levelMap = byId(levelsRes.data);
    const curriculumMap = byId(curriculumsRes.data);
    const typeMap = byId(typesRes.data);
    const majorMap = byId(majorsRes.data);
    const minorMap = byId(minorsRes.data);

    return rows.map((r) => ({
        ...r,
        level_name: levelMap[String(r.level_id)]?.level_name || '',
        curriculum_name: curriculumMap[String(r.curriculum_id)]?.curriculum_name || '',
        subject_type_name: typeMap[String(r.subject_type_id)]?.name_th || '',
        major_name: majorMap[String(r.major_id)]?.name_th || '',
        minor_name: minorMap[String(r.minor_id)]?.name_th || '',
    }));
};

// ดึงรายวิชาแบบมี Filter + Search + Pagination
export const getAllSubjectsService = async ({
    levelId,
    subjectTypeId,
    majorId,
    minorId,
    search,
    page = 1,
    pageSize = 20,
} = {}) => {
    let query = supabase.from('subjects').select('*', { count: 'exact' }).order('subject_code', { ascending: true });

    if (levelId) query = query.eq('level_id', levelId);
    if (subjectTypeId) query = query.eq('subject_type_id', subjectTypeId);
    if (majorId) query = query.eq('major_id', majorId);
    if (minorId) query = query.eq('minor_id', minorId);
    if (search) {
        // ค้นหาได้ทั้งรหัสวิชาและชื่อวิชา (ไทย/อังกฤษ)
        query = query.or(`subject_code.ilike.%${search}%,name_th.ilike.%${search}%,name_en.ilike.%${search}%`);
    }

    const from = (Number(page) - 1) * Number(pageSize);
    const to = from + Number(pageSize) - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    const rows = await attachLookupNames(data);

    return {
        data: rows,
        pagination: {
            page: Number(page),
            pageSize: Number(pageSize),
            total: count ?? rows.length,
            totalPages: Math.max(1, Math.ceil((count ?? rows.length) / Number(pageSize))),
        },
    };
};

export const getSubjectByIdService = async (id) => {
    const { data, error } = await supabase.from('subjects').select('*').eq('id', id).single();
    if (error) throw error;
    const [row] = await attachLookupNames([data]);
    return row;
};

export const createSubjectService = async (payload) => {
    const { data, error } = await supabase
        .from('subjects')
        .insert([payload])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateSubjectService = async (id, payload) => {
    const { data, error } = await supabase
        .from('subjects')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteSubjectService = async (id) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) throw error;
    return true;
};

/**
 * หาลำดับที่รายวิชาถัดไป (รหัสตัวที่ 7-8, 00-99) ภายใต้ minor_id + duration_group เดียวกัน
 * โดยอ่านจาก 2 ตัวท้ายของ subject_code ที่มีอยู่แล้วในกลุ่มเดียวกัน แล้ว +1
 * คืนค่าเป็นสตริง 2 หลัก (เช่น "01", "02", ... "99")
 */
export const getNextSequenceService = async (minorId, durationGroup) => {
    if (!minorId || !durationGroup) {
        return { sequence: '01' };
    }

    const { data, error } = await supabase
        .from('subjects')
        .select('subject_code')
        .eq('minor_id', minorId)
        .eq('duration_group', durationGroup);

    if (error) throw error;

    const usedSequences = (data || [])
        .map((row) => {
            const tail = (row.subject_code || '').split('-')[1] || '';
            const seqPart = tail.slice(-2); // 2 หลักท้าย = ลำดับที่รายวิชา
            const n = parseInt(seqPart, 10);
            return Number.isNaN(n) ? null : n;
        })
        .filter((n) => n !== null);

    const nextN = usedSequences.length ? Math.max(...usedSequences) + 1 : 1;

    if (nextN > 99) {
        return { sequence: null, message: 'ลำดับที่รายวิชาในกลุ่มนี้เต็ม (00-99) กรุณาตรวจสอบข้อมูล' };
    }

    return { sequence: String(nextN).padStart(2, '0') };
};
