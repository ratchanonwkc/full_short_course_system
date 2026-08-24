import { supabase } from '../../config/supabase.js';

// ดึงรายการรุ่นการเรียนทั้งหมด (พร้อม Join รายชื่อ ผอ. และ หัวหน้าทะเบียน)
export const getAllBatchesService = async (academicYear, term) => {
    let query = supabase
        .from('batches')
        .select(`
      *,
      director:director_id (id, prefix_id, first_name_th, last_name_th, prefixes:prefix_id(short_name)),
      head_registration:head_registration_id (id, prefix_id, first_name_th, last_name_th, prefixes:prefix_id(short_name))
    `)
        .order('academic_year', { ascending: false })
        .order('term', { ascending: true })
        .order('batch_no', { ascending: true });

    if (academicYear) query = query.eq('academic_year', academicYear);
    if (term) query = query.eq('term', term);

    const { data, error } = await query;
    if (error) throw error;

    // Transform Data ให้เป็น Format ที่อ่านง่ายสำหรับ AG Grid
    return data.map((b) => {
        const dirPrefix = b.director?.prefixes?.short_name || '';
        const dirName = b.director ? `${dirPrefix}${b.director.first_name_th} ${b.director.last_name_th}` : '-';

        return {
            ...b,
            director_name: dirName,
        };
    });
};

// ดึงรุ่นการเรียนตาม ID (สำหรับ StudyGroupsPage breadcrumb)
export const getBatchByIdService = async (id) => {
    const { data, error } = await supabase
        .from('batches')
        .select(`
      *,
      director:director_id (id, prefix_id, first_name_th, last_name_th, prefixes:prefix_id(short_name)),
      head_registration:head_registration_id (id, prefix_id, first_name_th, last_name_th, prefixes:prefix_id(short_name))
    `)
        .eq('id', id)
        .single();

    if (error) throw error;
    const b = data;
    const dirPrefix = b.director?.prefixes?.short_name || '';
    const dirName = b.director ? `${dirPrefix}${b.director.first_name_th} ${b.director.last_name_th}` : '-';
    return { ...b, director_name: dirName };
};

// ดึงรายชื่อผู้บริหารและหัวหน้างาน 9 ตำแหน่งจาก "รุ่นล่าสุด" (สำหรับทำ Auto-fill)
export const getLatestPersonnelService = async () => {
    const { data, error } = await supabase
        .from('batches')
        .select(`
      director_id,
      deputy_academic_id,
      deputy_resources_id,
      deputy_planning_id,
      deputy_activities_id,
      head_registration_id,
      head_curriculum_id,
      head_planning_id,
      head_evaluation_id
    `)
        .order('id', { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 คือกรณีตารางว่างเปล่า
    return data || {};
};

// สร้างรุ่นการเรียนแบบ Single
export const createBatchService = async (batchData) => {
    const { data, error } = await supabase
        .from('batches')
        .insert([batchData])
        .select()
        .single();

    if (error) throw error;
    return data;
};

// สร้างรุ่นการเรียนแบบ Bulk Year (Insert ทีเดียว 4 Records)
export const createBulkYearBatchesService = async (batchesArray) => {
    const { data, error } = await supabase
        .from('batches')
        .insert(batchesArray)
        .select();

    if (error) throw error;
    return data;
};

// อัปเดตข้อมูลรุ่นการเรียน
export const updateBatchService = async (id, batchData) => {
    const { data, error } = await supabase
        .from('batches')
        .update(batchData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

// ลบรุ่นการเรียน
export const deleteBatchService = async (id) => {
    const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
};

const FALLBACK_DEFAULTS = {
    batch_sequence: 139,
    iteration: 1,
    academic_year: '2569',
    semester: 1,
};

export const getNextBatchDefaultsService = async () => {
    // Most recently created batch (assumes batches.created_at or serial id ordering)
    const { data, error } = await supabase
        .from('batches')
        .select('batch_sequence, batch_no, term, academic_year, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;

    if (!data) {
        return FALLBACK_DEFAULTS;
    }

    // Derive iteration from batch_no parity (odd -> 1, even -> 2), same rule as
    // frontend utils/batchName.js#getIteration. If batch_sequence is null on
    // legacy rows, fall back to batch_no as the sequence base.
    const lastSequence = data.batch_sequence ?? Number(data.batch_no) ?? 139;
    const lastIteration = Number(data.batch_no) % 2 === 0 ? 2 : 1;
    const lastSemester = Number(data.term) || 1;
    const lastYear = Number(data.academic_year) || 2569;

    let next;
    if (lastIteration === 1 && lastSemester === 1) {
        // Case A
        next = { batch_sequence: lastSequence, iteration: 2, semester: 1, academic_year: lastYear };
    } else if (lastIteration === 2 && lastSemester === 1) {
        // Case B
        next = { batch_sequence: lastSequence + 1, iteration: 1, semester: 2, academic_year: lastYear };
    } else if (lastIteration === 2 && lastSemester === 2) {
        // Case C - end of academic year
        next = { batch_sequence: lastSequence + 1, iteration: 1, semester: 1, academic_year: lastYear + 1 };
    } else {
        // lastIteration === 1 && lastSemester === 2 (mid second-semester state)
        next = { batch_sequence: lastSequence, iteration: 2, semester: 2, academic_year: lastYear };
    }

    return { ...next, academic_year: String(next.academic_year) };
};
