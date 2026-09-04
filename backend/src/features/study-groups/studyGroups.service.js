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
  academic_majors:major_id ( id, name_th, short_name_th, full_major_code, department_id, level_id, subject_type_id ),
  teachers:teacher_id ( id, first_name_th, last_name_th, phone, prefixes:prefix_id (short_name) ),
  locations:joint_location_id ( id, name ),
  time_slots:time_slot_id ( id, time_code, time_name, time_range ),
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
    const timeSlot = row.time_slots;
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

    const hasFootnote = Boolean(row.has_footnote || (row.fee_exception_type && row.fee_exception_type !== 'none') || row.footnote_text);
    let footnoteText = row.footnote_text || '';
    if (!footnoteText && row.fee_exception_type && row.fee_exception_type !== 'none') {
        const legacyNotes = {
            note_1: 'การจัดการเรียนการสอนร่วมกับเรือนจำกลางอุดรธานี',
            note_2: 'การจัดการเรียนการสอนร่วมกับโรงเรียนประสาทคณานุกิจ วัดพุทธนิมิต',
            note_3: 'การจัดการเรียนการสอนร่วมกับเรือนจำชั่วคราวโคกก่อง',
        };
        footnoteText = legacyNotes[row.fee_exception_type] || row.fee_exception_type;
    }

    return {
        ...row,
        application_fee: row.application_fee !== undefined && row.application_fee !== null ? Number(row.application_fee) : 10,
        tuition_rate_per_hour: row.tuition_rate_per_hour !== undefined && row.tuition_rate_per_hour !== null ? Number(row.tuition_rate_per_hour) : 1,
        air_con_rate_per_hour: row.air_con_rate_per_hour !== undefined && row.air_con_rate_per_hour !== null ? Number(row.air_con_rate_per_hour) : 5,
        is_waived_fee: Boolean(row.is_waived_fee || row.is_free_tuition),
        study_days: Array.isArray(row.study_days) ? row.study_days : (typeof row.study_days === 'string' ? row.study_days.split(',').map((s) => s.trim()).filter(Boolean) : []),
        custom_start_time: row.custom_start_time || '',
        custom_end_time: row.custom_end_time || '',
        major_name: major?.name_th || '',
        major_short_name_th: major?.short_name_th || '',
        major_full_code: major?.full_major_code || '',
        major_department_id: major?.department_id || '',
        major_level_id: major?.level_id || '',
        major_subject_type_id: major?.subject_type_id || '',
        teacher_name: teacher
            ? `${teacher.prefixes?.short_name || ''}${teacher.first_name_th} ${teacher.last_name_th}`.trim()
            : '',
        teacher_first_name: teacher?.first_name_th || '',
        teacher_phone: teacher?.phone || '',
        location_name: location?.name || '',
        time_slot_id: row.time_slot_id || null,
        time_slot_name: timeSlot?.time_name || '',
        time_slot_code: timeSlot?.time_code || '',
        time_slot_range: timeSlot?.time_range || '',
        time_slots: timeSlot || null,
        fee_exception_type: row.fee_exception_type || (hasFootnote ? (footnoteText || 'custom') : 'none'),
        has_footnote: hasFootnote,
        footnote_text: footnoteText,
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

    if (!data || data.length === 0) return [];

    // Strictly count confirmed/paid enrollments
    const groupIds = data.map((g) => g.id);
    const { data: paidEnrollments } = await supabase
        .from('enrollments')
        .select('study_group_id')
        .eq('status', 'paid')
        .in('study_group_id', groupIds);

    const paidCountMap = {};
    (paidEnrollments || []).forEach((e) => {
        paidCountMap[e.study_group_id] = (paidCountMap[e.study_group_id] || 0) + 1;
    });

    return data.map((row) => {
        const paidCount = paidCountMap[row.id] || 0;
        const maxSeats = Number(row.max_seats) || 0;
        return flatten({
            ...row,
            current_seats: paidCount,
            paid_count: paidCount,
            remaining_seats: Math.max(0, maxSeats - paidCount),
            is_full: maxSeats > 0 && paidCount >= maxSeats,
        });
    });
};

export const getStudyGroupByIdService = async (id) => {
    const { data, error } = await supabase.from('study_groups').select(SELECT_WITH_JOINS).eq('id', id).single();
    if (error) throw error;

    const { count } = await supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('study_group_id', id)
        .eq('status', 'paid');

    const paidCount = count || 0;
    const maxSeats = Number(data.max_seats) || 0;

    return flatten({
        ...data,
        current_seats: paidCount,
        paid_count: paidCount,
        remaining_seats: Math.max(0, maxSeats - paidCount),
        is_full: maxSeats > 0 && paidCount >= maxSeats,
    });
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
 * คำนวณ "ลำดับ 3 หลัก" ของ moe_code (เลข ศธ.) ถัดไป
 * ภายใต้ ปี พ.ศ. (2 หลัก) + รหัสแผนก เดียวกัน โดยอ่านจาก study_group_subjects.moe_code
 * รูปแบบ moe_code: {ปี 2 หลัก}{รหัสแผนก}{ลำดับ 3 หลัก}
 */
export const getNextMoeSequenceService = async (yearPrefix, departmentId) => {
    if (!yearPrefix || !departmentId) return { sequence: '001' };

    const year2 = String(yearPrefix).slice(-2);
    const prefix = `${year2}${departmentId}`;

    const { data, error } = await supabase
        .from('study_group_subjects')
        .select('moe_code')
        .like('moe_code', `${prefix}%`);

    if (error) throw error;

    const sequences = (data || [])
        .map((row) => {
            const raw = (row.moe_code || '').trim();
            if (!raw.startsWith(prefix)) return null;
            const tail = raw.slice(prefix.length);
            const n = parseInt(tail, 10);
            return Number.isNaN(n) ? null : n;
        })
        .filter((n) => n !== null);

    const maxSeq = sequences.length > 0 ? Math.max(...sequences) : 0;
    const nextN = maxSeq + 1;
    if (nextN > 999) {
        return { sequence: null, message: 'ลำดับเลข ศธ. ในแผนกนี้/ปีนี้เต็ม (001-999) กรุณาตรวจสอบข้อมูล' };
    }
    return { sequence: String(nextN).padStart(3, '0') };
};

/**
 * Intelligent Next-Code Generator สำหรับเลข ศธ. 9 หลัก
 * รูปแบบ: [ปี พ.ศ. 2 หลัก][รหัสแผนก][ลำดับ 3 หลัก] (เช่น 691041001)
 * ดึงรหัสที่มีอยู่ทั้งหมดในฐานข้อมูล แล้วหา sequence สูงสุด (Max) + 1 เพื่อรองรับทั้ง Manual Override และ Migration
 */
export const generateNextMoeCodeService = async (academicYear, majorId) => {
    if (!academicYear || !majorId) {
        throw new Error('academicYear and majorId are required');
    }

    try {
        const year2 = String(academicYear).slice(-2);

        // 1. ดึงข้อมูลแผนกวิชาเพื่อนำ full_major_code มาเป็น prefix
        const { data: major, error: majorErr } = await supabase
            .from('academic_majors')
            .select('id, full_major_code, department_id, level_id, subject_type_id')
            .eq('id', majorId)
            .maybeSingle();

        if (majorErr) throw majorErr;

        const deptCode = major?.full_major_code || `${major?.level_id || '1'}${major?.subject_type_id || '1'}${major?.department_id || '01'}`;
        const prefix = `${year2}${deptCode}`;

        // 2. ดึงรายการ moe_code ทั้งหมดที่ขึ้นต้นด้วย prefix เดียวกันใน study_group_subjects
        const { data: existing, error: codeErr } = await supabase
            .from('study_group_subjects')
            .select('moe_code')
            .like('moe_code', `${prefix}%`);

        if (codeErr) throw codeErr;

        // 3. แยกเฉพาะตัวเลขลำดับ 3 หลักท้าย แล้วหาค่าสูงสุด (Max Sequence)
        const sequences = (existing || [])
            .map((row) => {
                const raw = (row.moe_code || '').trim();
                if (!raw.startsWith(prefix)) return null;
                const tail = raw.slice(prefix.length);
                const n = parseInt(tail, 10);
                return Number.isNaN(n) ? null : n;
            })
            .filter((n) => n !== null);

        const maxSeq = sequences.length > 0 ? Math.max(...sequences) : 0;
        const nextSeq = maxSeq + 1;

        return `${prefix}${String(nextSeq).padStart(3, '0')}`;
    } catch (err) {
        console.warn('generateNextMoeCodeService direct query failed, trying RPC fallback:', err.message);
        // Fallback to RPC if available
        const { data: rpcData, error: rpcErr } = await supabase.rpc('generate_next_moe_code', {
            p_academic_year: String(academicYear),
            p_major_id: Number(majorId),
        });
        if (rpcErr) throw rpcErr;
        return rpcData;
    }
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
            tuition_fee,
            application_fee,
            is_waived_fee,
            total_hours,
            schedule_description,
            start_date,
            end_date,
            batches:batch_id ( id, batch_name, academic_year, term, batch_no, study_open_date, study_close_date ),
            teachers:teacher_id ( id, first_name_th, last_name_th, phone, prefixes:prefix_id ( short_name ) ),
            study_group_subjects (
                id,
                subject_id,
                moe_code,
                sequence_order,
                subjects:subject_id ( id, subject_code, name_th, name_en, total_hours )
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

    // 2. Fetch enrolled students for this study group (non-cancelled) with full applicant profile
    const { data: enrollments, error: enrollErr } = await supabase
        .from('enrollments')
        .select(`
            id,
            application_no,
            status,
            apply_date,
            payment_date,
            receipt_date,
            receipt_book_no,
            receipt_number,
            total_amount,
            applicants:applicant_id (
                id, citizen_id, student_type, title_name, full_name, gender, birth_date, marital_status,
                house_no, moo, soi, road, occupation, nationality, religion,
                highest_education, previous_school, school_province,
                is_same_address, current_house_no, current_moo, current_soi, current_road,
                current_subdistrict, current_district, current_province, current_postal_code,
                phone, email, postal_code, subdistrict, district, province, id_card_url
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
            enrollment_id: row.id,
            application_no: row.application_no || String(row.id).padStart(5, '0'),
            citizen_id: app?.citizen_id || '',
            full_name: fullName,
            phone: app?.phone || '',
            status: row.status,
            apply_date: row.apply_date,
            payment_date: row.payment_date,
            receipt_date: row.receipt_date,
            receipt_book_no: row.receipt_book_no || '',
            receipt_number: row.receipt_number || '',
            total_amount: row.total_amount,
            applicant_profile: app || null,
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
            id: sgs.subjects?.id || sgs.id,
            subject_code: sgs.subjects?.subject_code || '',
            moe_code: sgs.moe_code || '',
            subject_name: sgs.subjects?.name_th || '',
            total_hours: sgs.subjects?.total_hours || 0,
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
                total_hours: group.total_hours || 0,
                teacher_name: teacherName,
                students: students,
            },
        ];
    }

    const totalFee = group.is_waived_fee ? 0 : Number(group.tuition_fee || 0) + Number(group.application_fee || 0);

    return {
        group_id: Number(group.id),
        group_code: group.group_code,
        group_name: group.group_name,
        batch_id: group.batches?.id,
        batch_name: group.batches?.batch_name || '',
        academic_year: group.batches?.academic_year || '',
        term: group.batches?.term || '',
        batch_no: group.batches?.batch_no || '',
        study_open_date: group.batches?.study_open_date || null,
        start_date: group.start_date || null,
        schedule_description: group.schedule_description || '',
        total_hours: group.total_hours || 0,
        total_amount: totalFee,
        teacher_name: teacherName,
        subjects,
    };
};

