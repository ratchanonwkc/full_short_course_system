import { supabase } from '../../config/supabase.js';

/**
 * studyGroups.service.js
 * ─────────────────────────────────────────────────────────────────────────
 * Service layer สำหรับ "กลุ่มเรียน" (study_groups) — ผูกกับ batch หนึ่งๆ เสมอ
 * (route ฝั่ง frontend คือ /batches/:batchId/groups)
 *
 * ดึงข้อมูลพร้อม Join:
 *   - academic_majors (แผนกวิชา) -> ใช้แสดงชื่อแผนก + department_id (สำหรับ Auto Fill room_code)
 *   - teachers + prefixes (ครูผู้สอน)
 *   - locations (สถานที่จัดเรียนร่วม)
 *   - study_group_subjects + subjects (รายวิชาย่อยในกลุ่ม) -> สำหรับสรุปชั่วโมงรวม
 */

const SELECT_WITH_JOINS = `
  *,
  academic_majors:major_id ( id, name_th, department_id, level_id, subject_type_id ),
  teachers:teacher_id ( id, first_name_th, last_name_th, prefixes:prefix_id (short_name) ),
  locations:joint_location_id ( id, name ),
  study_group_subjects (
    id,
    subject_id,
    moe_code,
    sequence_order,
    subjects:subject_id ( id, subject_code, name_th, total_hours )
  )
`;

const flatten = (row) => {
    if (!row) return row;
    const major = row.academic_majors;
    const teacher = row.teachers;
    const location = row.locations;
    const subjectsInGroup = (row.study_group_subjects || []).map((sgs) => ({
        id: sgs.id,
        subject_id: sgs.subject_id,
        moe_code: sgs.moe_code,
        sequence_order: sgs.sequence_order,
        subject_code: sgs.subjects?.subject_code || '',
        name_th: sgs.subjects?.name_th || '',
        total_hours: sgs.subjects?.total_hours || 0,
    }));
    const totalHoursFromSubjects = subjectsInGroup.reduce((sum, s) => sum + (Number(s.total_hours) || 0), 0);

    return {
        ...row,
        major_name: major?.name_th || '',
        major_department_id: major?.department_id || '',
        major_level_id: major?.level_id || '',
        major_subject_type_id: major?.subject_type_id || '',
        teacher_name: teacher
            ? `${teacher.prefixes?.short_name || ''}${teacher.first_name_th} ${teacher.last_name_th}`
            : '',
        location_name: location?.name || '',
        subjects_in_group: subjectsInGroup,
        subjects_total_hours: totalHoursFromSubjects,
    };
};

export const getAllStudyGroupsService = async ({ batchId, majorId, timeSlot } = {}) => {
    let query = supabase
        .from('study_groups')
        .select(SELECT_WITH_JOINS)
        .order('group_code', { ascending: true });

    if (batchId) query = query.eq('batch_id', batchId);
    if (majorId) query = query.eq('major_id', majorId);
    if (timeSlot) query = query.ilike('group_code', `%${timeSlot}%`); // fallback text filter if needed

    const { data, error } = await query;
    if (error) throw error;
    return data.map(flatten);
};

export const getStudyGroupByIdService = async (id) => {
    const { data, error } = await supabase.from('study_groups').select(SELECT_WITH_JOINS).eq('id', id).single();
    if (error) throw error;
    return flatten(data);
};

export const createStudyGroupService = async (payload) => {
    const { data, error } = await supabase.from('study_groups').insert([payload]).select().single();
    if (error) throw error;
    return data;
};

export const updateStudyGroupService = async (id, payload) => {
    const { data, error } = await supabase.from('study_groups').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
};

export const deleteStudyGroupService = async (id) => {
    const { error } = await supabase.from('study_groups').delete().eq('id', id);
    if (error) throw error;
    return true;
};

/**
 * ใช้สำหรับปุ่ม Auto Fill -> คำนวณ room_code ถัดไปที่ยังไม่ถูกใช้ ภายใต้แผนกวิชาเดียวกัน
 * รูปแบบ: {department_id}{เลขห้อง 4 หลัก} เช่น department_id="01" -> "010001"
 * (สเปกตัวอย่างที่ให้มา "11010001" คือ level+type+dept(2)+running(4) แต่ระบุ "รหัสแผนก" เฉยๆ
 *  ในสเปก ข้อ 5.2 จึงยึด department_id ตรงๆ ต่อด้วยเลขห้อง 4 หลัก ให้ major ส่ง department_id
 *  แบบเต็มมาจาก frontend (รวม level+type ถ้าต้องการ) เพื่อความยืดหยุ่น)
 */
export const getNextRoomSequenceService = async (departmentPrefix) => {
    if (!departmentPrefix) return { sequence: '0001' };

    const { data, error } = await supabase
        .from('study_groups')
        .select('room_code')
        .like('room_code', `${departmentPrefix}%`);

    if (error) throw error;

    const used = (data || [])
        .map((row) => {
            const tail = (row.room_code || '').slice(departmentPrefix.length);
            const n = parseInt(tail, 10);
            return Number.isNaN(n) ? null : n;
        })
        .filter((n) => n !== null);

    const nextN = used.length ? Math.max(...used) + 1 : 1;
    if (nextN > 9999) {
        return { sequence: null, message: 'เลขห้องเรียนในแผนกนี้เต็ม (0001-9999) กรุณาตรวจสอบข้อมูล' };
    }
    return { sequence: String(nextN).padStart(4, '0') };
};

/**
 * ใช้สำหรับปุ่ม Auto Fill -> คำนวณ "ลำดับ 3 หลัก" ของ moe_code (เลข ศธ.) ถัดไป
 * ภายใต้ ปี พ.ศ. (2 หลัก) + รหัสแผนก เดียวกัน โดยอ่านจาก study_group_subjects.moe_code
 * รูปแบบ moe_code: {ปี 2 หลัก}{รหัสแผนก}{ลำดับ 3 หลัก}
 */
export const getNextMoeSequenceService = async (yearPrefix, departmentId) => {
    if (!yearPrefix || !departmentId) return { sequence: '001' };

    const prefix = `${yearPrefix}${departmentId}`;

    const { data, error } = await supabase
        .from('study_group_subjects')
        .select('moe_code')
        .like('moe_code', `${prefix}%`);

    if (error) throw error;

    const used = (data || [])
        .map((row) => {
            const tail = (row.moe_code || '').slice(prefix.length);
            const n = parseInt(tail, 10);
            return Number.isNaN(n) ? null : n;
        })
        .filter((n) => n !== null);

    const nextN = used.length ? Math.max(...used) + 1 : 1;
    if (nextN > 999) {
        return { sequence: null, message: 'ลำดับเลข ศธ. ในแผนกนี้/ปีนี้เต็ม (001-999) กรุณาตรวจสอบข้อมูล' };
    }
    return { sequence: String(nextN).padStart(3, '0') };
};

/**
 * Fetch enrolled students grouped by individual subjects within the study group
 * to support the ศธ.02 official registration reference.
 * GET /api/v1/study-groups/:id/roster-by-subject
 */
export const getStudyGroupRosterBySubjectService = async (groupId) => {
    // 1. Fetch study group header info with relations
    const { data: group, error: groupErr } = await supabase
        .from('study_groups')
        .select(`
            id,
            group_code,
            group_name,
            room_code,
            batches:batch_id ( id, batch_name, academic_year, term, batch_no ),
            teachers:teacher_id ( id, first_name_th, last_name_th, prefixes:prefix_id ( short_name ) ),
            study_group_subjects (
                id,
                subject_id,
                moe_code,
                sequence_order,
                subjects:subject_id ( id, subject_code, name_th, total_hours )
            )
        `)
        .eq('id', groupId)
        .maybeSingle();

    if (groupErr) throw groupErr;
    if (!group) {
        const err = new Error('ไม่พบข้อมูลกลุ่มเรียน');
        err.status = 404;
        throw err;
    }

    // 2. Fetch enrolled students for this study group (non-cancelled)
    const { data: enrollments, error: enrollErr } = await supabase
        .from('enrollments')
        .select(`
            id,
            status,
            apply_date,
            payment_date,
            receipt_date,
            applicants:applicant_id (
                id,
                citizen_id,
                title_name,
                full_name,
                phone
            )
        `)
        .eq('study_group_id', groupId)
        .neq('status', 'cancelled')
        .order('apply_date', { ascending: true });

    if (enrollErr) throw enrollErr;

    // 3. Format enrolled students
    const students = (enrollments || []).map((row, index) => {
        const app = row.applicants;
        const fullName = app ? `${app.title_name || ''}${app.full_name || ''}`.trim() : '';
        return {
            seq_no: index + 1,
            citizen_id: app?.citizen_id || '',
            full_name: fullName,
            phone: app?.phone || '',
            status: row.status,
        };
    });

    const teacher = group.teachers;
    const teacherPrefix = teacher?.prefixes?.short_name || '';
    const teacherName = teacher
        ? `${teacherPrefix}${teacher.first_name_th} ${teacher.last_name_th}`.trim()
        : '';

    // 4. Map subjects in the group
    let subjects = (group.study_group_subjects || [])
        .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))
        .map((sgs) => ({
            subject_code: sgs.subjects?.subject_code || '',
            moe_code: sgs.moe_code || '',
            subject_name: sgs.subjects?.name_th || '',
            teacher_name: teacherName,
            students: students,
        }));

    // Fallback if study group has no study_group_subjects configured
    if (subjects.length === 0) {
        subjects = [
            {
                subject_code: group.group_code || '',
                moe_code: group.room_code || '',
                subject_name: group.group_name || '',
                teacher_name: teacherName,
                students: students,
            },
        ];
    }

    return {
        group_id: Number(group.id),
        group_name: group.group_name,
        batch_name: group.batches?.batch_name || '',
        subjects,
    };
};

