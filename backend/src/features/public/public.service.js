import { supabase } from '../../config/supabase.js';
import postalData from '../../data/thaiPostalCodes.json' with { type: 'json' };

const GROUP_SELECT = `
  id, group_code, group_name, status, max_seats, current_seats, room_code,
  tuition_fee, application_fee, is_waived_fee, is_ac_maintenance_fee,
  air_con_rate_per_hour, tuition_rate_per_hour, has_footnote, footnote_text,
  study_days, time_slot_id, custom_start_time, custom_end_time,
  total_hours, study_dates_description, schedule_description,
  start_date, end_date, registration_start_date, registration_end_date,
  major_id, batch_id, teacher_id, joint_location_id,
  time_slots:time_slot_id ( id, time_code, time_name, time_range ),
  academic_majors:major_id ( id, name_th, short_name_th ),
  teachers:teacher_id ( id, first_name_th, last_name_th, prefixes:prefix_id ( short_name ) ),
  locations:joint_location_id ( id, name ),
  study_group_subjects (
    id, subject_id, sequence_order, moe_code,
    subjects:subject_id ( id, subject_code, name_th, total_hours )
  ),
  batches:batch_id ( id, batch_name, status, academic_year, term, batch_no )
`;

const mapGroup = (row) => {
    // Parse study days safely
    let studyDays = [];
    if (Array.isArray(row.study_days)) {
        studyDays = row.study_days;
    } else if (typeof row.study_days === 'string') {
        try {
            studyDays = JSON.parse(row.study_days);
        } catch {
            studyDays = row.study_days.split(',').map((s) => s.trim()).filter(Boolean);
        }
    }

    // Map all subjects sorted by sequence_order
    const subjects = (row.study_group_subjects || [])
        .slice()
        .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))
        .map((s) => ({
            id: s.id,
            subject_id: s.subject_id,
            subject_code: s.subjects?.subject_code || '',
            name_th: s.subjects?.name_th || '',
            total_hours: s.subjects?.total_hours || 0,
            moe_code: s.moe_code || '',
        }));

    const primarySubject = subjects[0] || null;
    const moeCode = primarySubject?.moe_code || '';
    const subjectCount = Math.max(1, subjects.length);

    // Derived Time & Schedule formatting
    const timeCodeMatch = row.group_code ? /[ชบคพ]/.exec(row.group_code) : null;
    const derivedTimeCode = row.time_slots?.time_code || (timeCodeMatch ? timeCodeMatch[0] : '');
    const shiftName = row.time_slots?.time_name || '';

    // Standard 24h custom time format
    let customTimeRange = '';
    if (row.custom_start_time && row.custom_end_time) {
        const format24h = (t) => {
            const parts = String(t).split(':');
            return `${parts[0].padStart(2, '0')}:${(parts[1] || '00').padStart(2, '0')}`;
        };
        customTimeRange = `${format24h(row.custom_start_time)} - ${format24h(row.custom_end_time)} น.`;
    } else if (row.time_slots?.time_range) {
        customTimeRange = row.time_slots.time_range;
    }

    // Fee calculation: Application fee 10 THB per subject (unless explicitly customized)
    const baseAppFee = row.application_fee !== null && row.application_fee !== undefined
        ? Number(row.application_fee)
        : subjectCount * 10;
    const tuitionFee = Number(row.tuition_fee || 0);
    const isWaived = Boolean(row.is_waived_fee);
    const fee = isWaived ? 0 : tuitionFee + baseAppFee;

    const teacherPrefix = row.teachers?.prefixes?.short_name || '';
    const teacherFullName = row.teachers
        ? [teacherPrefix, row.teachers.first_name_th, row.teachers.last_name_th].filter(Boolean).join(' ')
        : '';

    return {
        id: row.id,
        group_code: row.group_code,
        group_name: row.group_name,
        moe_code: moeCode,
        time_code: derivedTimeCode,
        time_name: shiftName,
        time_range: customTimeRange,
        custom_start_time: row.custom_start_time,
        custom_end_time: row.custom_end_time,
        study_days: studyDays,
        status: row.status,
        max_seats: row.max_seats,
        current_seats: row.current_seats,
        paid_count: row.paid_count || row.current_seats || 0,
        remaining_seats: Math.max(0, (row.max_seats || 0) - (row.current_seats || 0)),
        fee,
        tuition_fee: tuitionFee,
        application_fee: baseAppFee,
        is_free: isWaived,
        is_waived_fee: isWaived,
        is_ac_maintenance_fee: Boolean(row.is_ac_maintenance_fee),
        has_footnote: Boolean(row.has_footnote),
        footnote_text: row.footnote_text || '',
        total_hours: row.total_hours,
        schedule_description: row.schedule_description || row.study_dates_description || '',
        study_dates_description: row.study_dates_description || '',
        start_date: row.start_date,
        end_date: row.end_date,
        registration_start_date: row.registration_start_date,
        registration_end_date: row.registration_end_date,
        major_id: row.major_id,
        batch_id: row.batch_id,
        batch_name: row.batches?.batch_name || '',
        batch_status: row.batches?.status || '',
        academic_year: row.batches?.academic_year || '',
        term: row.batches?.term || '',
        batch_no: row.batches?.batch_no || '',
        major_name: row.academic_majors?.name_th || '',
        major_short_name: row.academic_majors?.short_name_th || '',
        teacher_name: teacherFullName,
        location_name: row.locations?.name || '',
        room_code: row.room_code || '',
        subjects,
        primary_subject: primarySubject,
    };
};

export const getOpenStudyGroupsService = async ({ search, majorId, batchId } = {}) => {
    let query = supabase.from('study_groups').select(GROUP_SELECT).eq('status', 'open').order('id', { ascending: false });
    if (majorId) query = query.eq('major_id', majorId);
    if (batchId) query = query.eq('batch_id', batchId);

    const { data, error } = await query;
    if (error) throw error;

    // Study groups should only be visible to the public if their parent Batch has status === "admitting" OR "studying"
    // If a batch is planning, ended, or cancelled, its study groups must not appear in the public enrollment selection.
    const activeBatchesOnly = (data || []).filter((row) => {
        const batchStatus = row.batches?.status;
        return batchStatus === 'admitting' || batchStatus === 'studying';
    });

    if (activeBatchesOnly.length === 0) return [];

    // Strictly count confirmed/paid enrollments
    const groupIds = activeBatchesOnly.map((g) => g.id);
    const { data: paidEnrollments } = await supabase
        .from('enrollments')
        .select('study_group_id')
        .eq('status', 'paid')
        .in('study_group_id', groupIds);

    const paidCountMap = {};
    (paidEnrollments || []).forEach((e) => {
        paidCountMap[e.study_group_id] = (paidCountMap[e.study_group_id] || 0) + 1;
    });

    let mapped = activeBatchesOnly.map((row) => {
        const paidCount = paidCountMap[row.id] || 0;
        return mapGroup({
            ...row,
            current_seats: paidCount,
            paid_count: paidCount,
        });
    });

    if (search?.trim()) {
        const q = search.trim().toLowerCase();
        mapped = mapped.filter(
            (g) =>
                g.group_name.toLowerCase().includes(q) ||
                g.group_code.toLowerCase().includes(q) ||
                g.subjects.some((s) => s.name_th?.toLowerCase().includes(q))
        );
    }
    return mapped;
};

export const getStudyGroupDetailService = async (id) => {
    const { data, error } = await supabase.from('study_groups').select(GROUP_SELECT).eq('id', id).single();
    if (error) throw error;
    if (!data) {
        const notFoundErr = new Error('ไม่พบข้อมูลกลุ่มเรียน');
        notFoundErr.status = 404;
        throw notFoundErr;
    }

    // Check parent batch status: only allow admitting or studying
    const batchStatus = data.batches?.status;
    if (batchStatus !== 'admitting' && batchStatus !== 'studying') {
        const err = new Error('วิชา/กลุ่มเรียนนี้ไม่อยู่ในช่วงเปิดรับสมัครหรือกำลังเรียน');
        err.status = 404;
        throw err;
    }

    const { count } = await supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('study_group_id', id)
        .eq('status', 'paid');

    const paidCount = count || 0;

    return mapGroup({
        ...data,
        current_seats: paidCount,
        paid_count: paidCount,
    });
};

export const lookupPostalCodeService = (code) => {
    const matches = postalData.filter((row) => row.postal_code === String(code));
    return matches;
};

export const getActivePaymentMethodsService = async () => {
    const { data, error } = await supabase
        .from('payment_methods')
        .select('id, bank_name, account_name, account_number, qr_code_url')
        .eq('is_active', true);
    if (error) throw error;
    return data;
};

export const sanitizeAndNormalizeApplicant = (data) => {
    if (!data || typeof data !== 'object') return data;
    const isSame = data.is_same_address !== false;
    const houseNo = (data.house_no || '').trim();
    const moo = (data.moo || '').trim();
    const soi = (data.soi || '').trim();
    const road = (data.road || '').trim();
    const subdistrict = (data.subdistrict || '').trim();
    const district = (data.district || '').trim();
    const province = (data.province || '').trim();
    const postalCode = (data.postal_code || '').trim();

    const registeredAddress = [
        houseNo,
        moo && `หมู่ ${moo}`,
        soi && `ซอย ${soi}`,
        road && `ถนน ${road}`,
        subdistrict && `ต.${subdistrict}`,
        district && `อ.${district}`,
        province && `จ.${province}`,
        postalCode,
    ].filter(Boolean).join(' ') || data.registered_address || '-';

    const currentHouseNo = isSame ? houseNo : (data.current_house_no || '').trim();
    const currentMoo = isSame ? moo : (data.current_moo || '').trim();
    const currentSoi = isSame ? soi : (data.current_soi || '').trim();
    const currentRoad = isSame ? road : (data.current_road || '').trim();
    const currentSubdistrict = isSame ? subdistrict : (data.current_subdistrict || '').trim();
    const currentDistrict = isSame ? district : (data.current_district || '').trim();
    const currentProvince = isSame ? province : (data.current_province || '').trim();
    const currentPostalCode = isSame ? postalCode : (data.current_postal_code || '').trim();

    const currentAddress = isSame
        ? registeredAddress
        : ([
            currentHouseNo,
            currentMoo && `หมู่ ${currentMoo}`,
            currentSoi && `ซอย ${currentSoi}`,
            currentRoad && `ถนน ${currentRoad}`,
            currentSubdistrict && `ต.${currentSubdistrict}`,
            currentDistrict && `อ.${currentDistrict}`,
            currentProvince && `จ.${currentProvince}`,
            currentPostalCode,
        ].filter(Boolean).join(' ') || data.current_address || '-');

    return {
        ...data,
        is_same_address: isSame,
        house_no: houseNo,
        moo,
        soi,
        road,
        subdistrict,
        district,
        province,
        postal_code: postalCode,
        registered_address: registeredAddress,
        current_house_no: currentHouseNo,
        current_moo: currentMoo,
        current_soi: currentSoi,
        current_road: currentRoad,
        current_subdistrict: currentSubdistrict,
        current_district: currentDistrict,
        current_province: currentProvince,
        current_postal_code: currentPostalCode,
        current_address: currentAddress,
    };
};

const upsertApplicant = async (applicantData) => {
    const normalized = sanitizeAndNormalizeApplicant(applicantData);
    const { citizen_id } = normalized;
    const { data: existing, error: findErr } = await supabase
        .from('applicants')
        .select('id, student_type')
        .eq('citizen_id', citizen_id)
        .maybeSingle();
    if (findErr) throw findErr;

    const payload = {
        ...normalized,
        student_type: existing ? 'นักศึกษาเก่า' : (normalized.student_type || 'นักศึกษาใหม่'),
    };

    if (existing) {
        const { data, error } = await supabase
            .from('applicants')
            .update(payload)
            .eq('id', existing.id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    const { data, error } = await supabase.from('applicants').insert([payload]).select().single();
    if (error) throw error;
    return data;
};

const ensureNoDuplicateEnrollment = async (applicantId, studyGroupId) => {
    const { data, error } = await supabase
        .from('enrollments')
        .select('id, status')
        .eq('applicant_id', applicantId)
        .eq('study_group_id', studyGroupId)
        .neq('status', 'cancelled')
        .maybeSingle();
    if (error) throw error;
    if (data) {
        const err = new Error('ผู้สมัครท่านนี้ได้ลงทะเบียนในกลุ่มเรียนนี้เรียบร้อยแล้ว ไม่สามารถสมัครซ้ำได้');
        err.status = 409;
        throw err;
    }
};

export const createOnlineApplicationService = async ({ applicant, study_group_id, slip_url, payment_method = 'online_transfer' }) => {
    const savedApplicant = await upsertApplicant(applicant);

    await ensureNoDuplicateEnrollment(savedApplicant.id, study_group_id);

    const group = await getStudyGroupDetailService(study_group_id);
    const total_amount = group.fee;

    const now = new Date().toISOString();
    const { data: enrollment, error } = await supabase
        .from('enrollments')
        .insert([
            {
                applicant_id: savedApplicant.id,
                study_group_id,
                status: 'pending_verification',
                total_amount,
                slip_url,
                payment_method,
                apply_date: now,
                payment_date: now,
            },
        ])
        .select()
        .single();
    if (error) throw error;

    if (enrollment && !enrollment.application_no) {
        const appNo = String(enrollment.id).padStart(5, '0');
        const { data: updatedEnrollment } = await supabase
            .from('enrollments')
            .update({ application_no: appNo })
            .eq('id', enrollment.id)
            .select()
            .single();
        return { applicant: savedApplicant, enrollment: updatedEnrollment || enrollment };
    }

    return { applicant: savedApplicant, enrollment };
};

export const getStatusByCitizenIdService = async (citizenId) => {
    const { data: applicant, error } = await supabase
        .from('applicants')
        .select('*')
        .eq('citizen_id', citizenId)
        .maybeSingle();
    if (error) throw error;
    if (!applicant) return null;

    const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select(
            `id, application_no, status, total_amount, slip_url, receipt_number, receipt_book_no, apply_date, payment_date, receipt_date,
       rejection_reason,
       study_groups:study_group_id (
         id, group_code, group_name, room_code, tuition_fee, application_fee, is_waived_fee, is_ac_maintenance_fee,
         has_footnote, footnote_text, total_hours, start_date, end_date, schedule_description, study_dates_description,
         study_days, custom_start_time, custom_end_time,
         academic_majors:major_id ( id, name_th, short_name_th ),
         teachers:teacher_id ( id, first_name_th, last_name_th, prefixes:prefix_id ( short_name ) ),
         locations:joint_location_id ( id, name ),
         batches:batch_id ( id, batch_name, status, academic_year, term, batch_no ),
         study_group_subjects (
           id, subject_id, sequence_order, moe_code,
           subjects:subject_id ( id, subject_code, name_th, total_hours )
         )
       )`
        )
        .eq('applicant_id', applicant.id)
        .order('apply_date', { ascending: false });
    if (enrollError) throw enrollError;

    return { applicant, enrollments: enrollments || [] };
};

/**
 * Self-service correction: applicant edits & resubmits a REJECTED application.
 * Identity is verified server-side by matching citizen_id — no auth required.
 */
export const lookupApplicantByCitizenIdService = async (citizenId) => {
    if (!citizenId || citizenId.length !== 13) {
        const err = new Error('เลขประจำตัวประชาชนไม่ถูกต้อง (ต้องมี 13 หลัก)');
        err.status = 400;
        throw err;
    }

    const { data, error } = await supabase
        .from('applicants')
        .select('*')
        .eq('citizen_id', citizenId)
        .maybeSingle();

    if (error) throw error;
    return data || null;
};

export const resubmitApplicationService = async (enrollmentId, { citizen_id, slip_url, applicant }) => {
    const { data: enrollment, error: findErr } = await supabase
        .from('enrollments')
        .select('id, status, applicant_id, applicants:applicant_id ( citizen_id )')
        .eq('id', enrollmentId)
        .single();
    if (findErr) throw findErr;

    if (enrollment.applicants?.citizen_id !== citizen_id) {
        const err = new Error('ไม่พบใบสมัครนี้ หรือเลขประจำตัวประชาชนไม่ตรงกัน');
        err.status = 403;
        throw err;
    }
    if (enrollment.status !== 'rejected') {
        const err = new Error('สามารถแก้ไขได้เฉพาะใบสมัครที่ถูกปฏิเสธเท่านั้น');
        err.status = 409;
        throw err;
    }

    if (applicant && Object.keys(applicant).length > 0) {
        const { error: appErr } = await supabase.from('applicants').update(applicant).eq('id', enrollment.applicant_id);
        if (appErr) throw appErr;
    }

    const updatePayload = {
        status: 'pending_verification',
        rejection_reason: null,
        rejected_at: null,
        rejected_by_user_id: null,
    };
    if (slip_url) updatePayload.slip_url = slip_url;

    const { data: updated, error } = await supabase
        .from('enrollments')
        .update(updatePayload)
        .eq('id', enrollmentId)
        .select()
        .single();
    if (error) throw error;
    return updated;
};
