import { supabase } from '../../config/supabase.js';

/**
 * SCHEMA NOTE: This service assumes the following columns have been added to
 * `public.enrollments` (migration; not included in the read-only
 * database_schema.sql context):
 *
 *   ALTER TABLE public.enrollments
 *     ADD COLUMN payment_method varchar DEFAULT 'online_transfer',
 *     ADD COLUMN rejection_reason text,
 *     ADD COLUMN rejected_at timestamptz,
 *     ADD COLUMN rejected_by_user_id uuid;
 *
 * ALSO NOTE: `public.applicants` requires:
 *   ALTER TABLE public.applicants ADD COLUMN email varchar;
 *   ALTER TABLE public.applicants ADD COLUMN id_card_url text;
 *
 * `approved_by_name` / `rejected_by_name` in the flattened response are
 * resolved from Supabase Auth (auth.users) via confirmed_by_user_id /
 * rejected_by_user_id — falling back to the raw id if lookup fails, so the
 * UI never breaks on a missing join.
 */

// Full applicant column set — needed so the Registrar's Applicant Detail
// Full applicant column set — needed so the Registrar's Applicant Detail
// Drawer can render/edit the entire profile (personal, address, education),
// not just name/citizen_id/phone/email.
const ENROLLMENT_SELECT = `
  id, status, total_amount, slip_url, receipt_number, receipt_book_no, apply_date, payment_date, receipt_date,
  study_group_id, applicant_id, payment_method, rejection_reason, rejected_at,
  application_no,
  confirmed_by_user_id, rejected_by_user_id,
  applicants:applicant_id (
    id, citizen_id, student_type, title_name, full_name, gender, birth_date, marital_status,
    house_no, moo, soi, road, occupation, nationality, religion,
    highest_education, previous_school, school_province,
    is_same_address, current_house_no, current_moo, current_soi, current_road,
    current_subdistrict, current_district, current_province, current_postal_code,
    phone, email, postal_code, subdistrict, district, province, id_card_url
  ),
  study_groups:study_group_id (
    id, group_code, group_name, room_code, max_seats, current_seats, tuition_fee, application_fee, is_waived_fee, is_ac_maintenance_fee, batch_id,
    total_hours, schedule_description, start_date,
    batches:batch_id ( id, batch_name, academic_year, term, batch_no, study_open_date ),
    teachers:teacher_id ( id, first_name_th, last_name_th, prefixes:prefix_id (short_name) ),
    locations:joint_location_id ( id, name ),
    time_slots:time_slot_id ( id, time_code, time_name, time_range ),
    study_group_subjects ( id, moe_code, sequence_order, subjects:subject_id ( id, subject_code, name_th, total_hours ) )
  )
`;

const flatten = (row) => {
    const studyGroup = row.study_groups;
    const batch = studyGroup?.batches;
    const firstSubject = studyGroup?.study_group_subjects?.[0]?.subjects;
    const subjectCode = firstSubject?.subject_code || studyGroup?.study_group_subjects?.[0]?.moe_code || '';
    const subjectName = firstSubject?.name_th || '';
    const teacher = studyGroup?.teachers;
    const teacherPrefix = teacher?.prefixes?.short_name || '';
    const teacherName = teacher ? `${teacherPrefix}${teacher.first_name_th} ${teacher.last_name_th}`.trim() : '';
    const groupSubjects = (studyGroup?.study_group_subjects || []).map((sgs) => ({
        id: sgs.subjects?.id || sgs.id,
        subject_code: sgs.subjects?.subject_code || sgs.moe_code || '',
        moe_code: sgs.moe_code || '',
        subject_name: sgs.subjects?.name_th || '',
        name_th: sgs.subjects?.name_th || '',
        total_hours: Number(sgs.subjects?.total_hours || 0),
        is_ac_maintenance_fee: Boolean(studyGroup?.is_ac_maintenance_fee),
    }));

    return {
        id: row.id,
        application_no: row.application_no || String(row.id).padStart(5, '0'),
        status: row.status,
        total_amount: row.total_amount,
        paid_amount: row.status === 'paid' ? row.total_amount : null,
        slip_url: row.slip_url,
        id_card_url: row.applicants?.id_card_url || null,
        payment_method: row.payment_method || 'online_transfer',
        rejection_reason: row.rejection_reason,
        rejected_at: row.rejected_at,
        receipt_number: row.receipt_number,
        receipt_book_no: row.receipt_book_no,
        apply_date: row.apply_date,
        payment_date: row.payment_date,
        receipt_date: row.receipt_date,
        study_group_id: row.study_group_id,
        applicant_id: row.applicant_id,
        citizen_id: row.applicants?.citizen_id,
        student_type: row.applicants?.student_type || 'นักศึกษาใหม่',
        title_name: row.applicants?.title_name,
        raw_full_name: row.applicants?.full_name,
        applicant_name: row.applicants ? `${row.applicants.title_name}${row.applicants.full_name}` : '',
        phone: row.applicants?.phone,
        email: row.applicants?.email,
        group_code: studyGroup?.group_code,
        group_name: studyGroup?.group_name,
        room_code: studyGroup?.room_code || '',
        location_name: studyGroup?.locations?.name || '',
        time_slot_name: studyGroup?.time_slots?.time_name || '',
        time_slot_code: studyGroup?.time_slots?.time_code || '',
        time_slot_range: studyGroup?.time_slots?.time_range || '',
        total_hours: studyGroup?.total_hours || firstSubject?.total_hours || 75,
        is_ac_maintenance_fee: Boolean(studyGroup?.is_ac_maintenance_fee),
        is_waived_fee: Boolean(studyGroup?.is_waived_fee),
        tuition_fee: studyGroup?.tuition_fee,
        application_fee: studyGroup?.application_fee,
        schedule_description: studyGroup?.schedule_description || '',
        start_date: studyGroup?.start_date,
        subject_code: subjectCode,
        subject_name: subjectName,
        teacher_name: teacherName,
        max_seats: studyGroup?.max_seats,
        current_seats: studyGroup?.current_seats,
        batch_id: studyGroup?.batch_id,
        batch_name: batch?.batch_name || '',
        academic_year: batch?.academic_year || '',
        term: batch?.term || '',
        batch_no: batch?.batch_no || '',
        study_open_date: batch?.study_open_date,
        study_group: studyGroup,
        study_group_subjects: studyGroup?.study_group_subjects || [],
        subjects: groupSubjects.length > 0 ? groupSubjects : (studyGroup ? [{
            subject_code: studyGroup.group_code || subjectCode,
            subject_name: studyGroup.group_name || subjectName,
            name_th: studyGroup.group_name || subjectName,
            total_hours: Number(studyGroup.total_hours || 0),
            is_ac_maintenance_fee: Boolean(studyGroup.is_ac_maintenance_fee),
        }] : []),
        confirmed_by_user_id: row.confirmed_by_user_id,
        rejected_by_user_id: row.rejected_by_user_id,
        applicant_profile: row.applicants || null,
    };
};

// Resolves a small set of auth user ids -> display names (best-effort, never throws).
const resolveUserNames = async (rows) => {
    const ids = [...new Set(rows.flatMap((r) => [r.confirmed_by_user_id, r.rejected_by_user_id]).filter(Boolean))];
    if (ids.length === 0) return rows;

    const nameById = {};
    await Promise.all(
        ids.map(async (id) => {
            try {
                const { data, error } = await supabase.auth.admin.getUserById(id);
                if (!error && data?.user) {
                    nameById[id] = data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email;
                }
            } catch {
                /* best-effort — leave unresolved, UI falls back to raw id */
            }
        })
    );

    return rows.map((r) => ({
        ...r,
        approved_by_name: r.confirmed_by_user_id ? nameById[r.confirmed_by_user_id] || r.confirmed_by_user_id : null,
        rejected_by_name: r.rejected_by_user_id ? nameById[r.rejected_by_user_id] || r.rejected_by_user_id : null,
    }));
};

export const getEnrollmentsService = async ({ studyGroupId, status, batchId } = {}) => {
    let query = supabase.from('enrollments').select(ENROLLMENT_SELECT).order('apply_date', { ascending: false });
    if (studyGroupId) query = query.eq('study_group_id', studyGroupId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    let rows = data.map(flatten);

    if (batchId) {
        rows = rows.filter((r) => String(r.batch_id) === String(batchId));
    }

    // Group-by-group student numbering (ordered ascending by apply_date)
    const countByGroup = {};
    const sortedAsc = [...rows].sort((a, b) => new Date(a.apply_date) - new Date(b.apply_date));
    sortedAsc.forEach((row) => {
        const gid = row.study_group_id;
        if (!countByGroup[gid]) countByGroup[gid] = 0;
        countByGroup[gid] += 1;
        row.student_no = countByGroup[gid];
    });

    return resolveUserNames(rows);
};

export const getEnrollmentByIdService = async (id) => {
    const { data, error } = await supabase
        .from('enrollments')
        .select(ENROLLMENT_SELECT)
        .eq('id', id)
        .single();
    if (error) throw error;
    const row = flatten(data);

    // Compute ordinal student number in this group
    if (row.study_group_id) {
        const { data: groupList, error: gErr } = await supabase
            .from('enrollments')
            .select('id, apply_date')
            .eq('study_group_id', row.study_group_id)
            .order('apply_date', { ascending: true });
        if (!gErr && groupList) {
            const idx = groupList.findIndex((e) => String(e.id) === String(id));
            if (idx !== -1) row.student_no = idx + 1;
        }
    }

    const resolved = await resolveUserNames([row]);
    return resolved[0];
};

const sanitizeAndNormalizeApplicant = (data) => {
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
        const err = new Error('ผู้สมัครรายนี้ลงทะเบียนกลุ่มเรียนนี้ไปแล้ว');
        err.status = 409;
        throw err;
    }
};

/**
 * สร้างใบสมัคร Walk-in โดยเจ้าหน้าที่งานทะเบียน
 * paymentMethod: 'online_transfer' | 'counter_cash'
 *   - online_transfer -> initial status 'pending_payment' (awaiting slip/verification)
 *   - counter_cash    -> initial status 'pending_verification' (finance confirms cash at counter)
 */
export const createWalkinEnrollmentService = async ({ applicant, study_group_id, paymentMethod = 'online_transfer' }) => {
    const savedApplicant = await upsertApplicant(applicant);

    await ensureNoDuplicateEnrollment(savedApplicant.id, study_group_id);

    const { data: group, error: groupErr } = await supabase
        .from('study_groups')
        .select('tuition_fee, application_fee, is_waived_fee')
        .eq('id', study_group_id)
        .single();
    if (groupErr) throw groupErr;

    const total_amount = group.is_waived_fee ? 0 : Number(group.tuition_fee || 0) + Number(group.application_fee || 0);
    const initialStatus = paymentMethod === 'counter_cash' ? 'pending_verification' : 'pending_payment';

    const { data: enrollment, error } = await supabase
        .from('enrollments')
        .insert([
            {
                applicant_id: savedApplicant.id,
                study_group_id,
                status: initialStatus,
                total_amount,
                payment_method: paymentMethod,
                apply_date: new Date().toISOString(),
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

/**
 * ยืนยันการชำระเงิน (Finance)
 */
export const confirmPaymentService = async (enrollmentId, { receipt_number, receipt_book_no, approvedByUserId }) => {
    if (!receipt_number?.trim()) {
        const err = new Error('กรุณากรอกเลขที่ใบเสร็จรับเงิน');
        err.status = 400;
        throw err;
    }
    if (!receipt_book_no?.trim()) {
        const err = new Error('กรุณากรอกเล่มที่ใบเสร็จรับเงิน');
        err.status = 400;
        throw err;
    }

    const { data: enrollment, error: findErr } = await supabase
        .from('enrollments')
        .select('id, status, study_group_id')
        .eq('id', enrollmentId)
        .single();
    if (findErr) throw findErr;

    if (enrollment.status === 'paid') {
        const err = new Error('ใบสมัครนี้ถูกยืนยันการชำระเงินไปแล้ว');
        err.status = 409;
        throw err;
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabase
        .from('enrollments')
        .update({
            status: 'paid',
            receipt_number: receipt_number.trim(),
            receipt_book_no: receipt_book_no.trim(),
            receipt_date: now,
            confirmed_by_user_id: approvedByUserId || null,
        })
        .eq('id', enrollmentId)
        .select()
        .single();
    if (updateErr) throw updateErr;

    const { error: rpcError } = await supabase.rpc('increment_study_group_seats', {
        p_study_group_id: enrollment.study_group_id,
    });
    if (rpcError) {
        const { data: group, error: gErr } = await supabase
            .from('study_groups')
            .select('current_seats')
            .eq('id', enrollment.study_group_id)
            .single();
        if (!gErr) {
            await supabase
                .from('study_groups')
                .update({ current_seats: (group.current_seats || 0) + 1 })
                .eq('id', enrollment.study_group_id);
        }
    }

    return updated;
};

/**
 * ปฏิเสธสลิป/รายการชำระเงิน (Finance)
 */
export const rejectPaymentService = async (enrollmentId, { reason, rejectedByUserId }) => {
    const { data: enrollment, error: findErr } = await supabase
        .from('enrollments')
        .select('id, status')
        .eq('id', enrollmentId)
        .single();
    if (findErr) throw findErr;

    if (enrollment.status === 'paid') {
        const err = new Error('ไม่สามารถปฏิเสธรายการที่ยืนยันการชำระเงินแล้ว');
        err.status = 409;
        throw err;
    }

    const { data: updated, error } = await supabase
        .from('enrollments')
        .update({
            status: 'rejected',
            rejection_reason: reason,
            rejected_at: new Date().toISOString(),
            rejected_by_user_id: rejectedByUserId || null,
        })
        .eq('id', enrollmentId)
        .select()
        .single();
    if (error) throw error;
    return updated;
};

export const cancelEnrollmentService = async (enrollmentId) => {
    const { data, error } = await supabase
        .from('enrollments')
        .update({ status: 'cancelled' })
        .eq('id', enrollmentId)
        .select()
        .single();
    if (error) throw error;
    return data;
};

/**
 * ย้ายกลุ่มเรียนของผู้สมัคร (Registrar)
 */
export const reassignGroupService = async (enrollmentId, newStudyGroupId) => {
    const { data: group, error: groupErr } = await supabase
        .from('study_groups')
        .select('tuition_fee, application_fee, is_waived_fee')
        .eq('id', newStudyGroupId)
        .single();
    if (groupErr) throw groupErr;

    const total_amount = group.is_waived_fee ? 0 : Number(group.tuition_fee || 0) + Number(group.application_fee || 0);

    const { data: updated, error } = await supabase
        .from('enrollments')
        .update({ study_group_id: newStudyGroupId, total_amount })
        .eq('id', enrollmentId)
        .select()
        .single();
    if (error) throw error;
    return updated;
};

/**
 * ส่งอีเมลยืนยันให้ผู้สมัคร (stub — wire up to a real email provider)
 */
export const sendConfirmationEmailService = async (enrollmentId) => {
    const { data: enrollment, error } = await supabase
        .from('enrollments')
        .select('id, applicants:applicant_id ( email, full_name )')
        .eq('id', enrollmentId)
        .single();
    if (error) throw error;

    if (!enrollment.applicants?.email) {
        const err = new Error('ผู้สมัครรายนี้ไม่มีอีเมลในระบบ');
        err.status = 400;
        throw err;
    }

    return { message: 'ส่งอีเมลยืนยันเรียบร้อยแล้ว', to: enrollment.applicants.email };
};

/**
 * Registrar full-edit — updates ALL applicant fields (personal, address,
 * education, contact) and optionally reassigns the study group in one call.
 */
export const updateApplicantDetailsService = async (enrollmentId, { applicant, study_group_id }) => {
    const { data: enrollment, error: findErr } = await supabase
        .from('enrollments')
        .select('id, applicant_id')
        .eq('id', enrollmentId)
        .single();
    if (findErr) throw findErr;

    if (applicant && Object.keys(applicant).length > 0) {
        // Never let stray id/relation keys leak into the update payload.
        const normalized = sanitizeAndNormalizeApplicant(applicant);
        const { id, created_at, ...safeApplicant } = normalized;
        const { error: appErr } = await supabase.from('applicants').update(safeApplicant).eq('id', enrollment.applicant_id);
        if (appErr) {
            if (appErr.code === '23505') {
                const err = new Error('เลขประจำตัวประชาชนนี้มีอยู่แล้วในระบบ');
                err.status = 400;
                throw err;
            }
            throw appErr;
        }
    }

    if (study_group_id) {
        return reassignGroupService(enrollmentId, study_group_id);
    }

    const { data: fresh, error } = await supabase.from('enrollments').select(ENROLLMENT_SELECT).eq('id', enrollmentId).single();
    if (error) throw error;
    return flatten(fresh);
};

/**
 * Applicant self-service update endpoint with Edit Guard
 * PUT /api/v1/enrollments/:id/applicant-update
 * 
 * Rules:
 * - If status === 'paid': Return 403 Forbidden ('ไม่อนุญาตให้แก้ไขข้อมูล เนื่องจากได้รับการยืนยันการชำระเงินแล้ว')
 * - If status === 'pending_payment' || 'pending_verification' || 'rejected': Execute update on applicants and enrollments tables and return 200 OK.
 */
export const updateApplicantSelfService = async (enrollmentId, { applicant, slip_url, payment_method } = {}) => {
    const { data: enrollment, error: findErr } = await supabase
        .from('enrollments')
        .select('id, status, applicant_id, study_group_id, slip_url, payment_method')
        .eq('id', enrollmentId)
        .maybeSingle();

    if (findErr) throw findErr;
    if (!enrollment) {
        const err = new Error('ไม่พบข้อมูลใบสมัคร');
        err.status = 404;
        throw err;
    }

    if (enrollment.status === 'paid') {
        const err = new Error('ไม่อนุญาตให้แก้ไขข้อมูล เนื่องจากได้รับการยืนยันการชำระเงินแล้ว');
        err.status = 403;
        throw err;
    }

    if (enrollment.status === 'cancelled') {
        const err = new Error('ใบสมัครนี้ถูกยกเลิกแล้ว ไม่สามารถแก้ไขได้');
        err.status = 400;
        throw err;
    }

    // 1. Update applicant table if applicant object is provided
    let updatedApplicant = null;
    if (applicant && Object.keys(applicant).length > 0) {
        const normalized = sanitizeAndNormalizeApplicant(applicant);
        const { id, created_at, ...safeApplicant } = normalized;
        const { data: appData, error: appErr } = await supabase
            .from('applicants')
            .update(safeApplicant)
            .eq('id', enrollment.applicant_id)
            .select()
            .single();

        if (appErr) {
            if (appErr.code === '23505') {
                const err = new Error('เลขประจำตัวประชาชนนี้มีอยู่แล้วในระบบ');
                err.status = 400;
                throw err;
            }
            throw appErr;
        }
        updatedApplicant = appData;
    }

    // 2. Update enrollments table if slip_url or payment_method or status reset is needed
    const enrollmentUpdates = {};
    if (slip_url !== undefined) {
        enrollmentUpdates.slip_url = slip_url;
        if (slip_url) {
            enrollmentUpdates.payment_date = new Date().toISOString();
            enrollmentUpdates.status = 'pending_verification';
        }
    }
    if (payment_method !== undefined) {
        enrollmentUpdates.payment_method = payment_method;
    }
    if (enrollment.status === 'rejected') {
        enrollmentUpdates.rejection_reason = null;
        enrollmentUpdates.rejected_at = null;
        enrollmentUpdates.rejected_by_user_id = null;
        if (slip_url || enrollment.slip_url) {
            enrollmentUpdates.status = 'pending_verification';
        }
    }

    let updatedEnrollment = enrollment;
    if (Object.keys(enrollmentUpdates).length > 0) {
        const { data: enData, error: enErr } = await supabase
            .from('enrollments')
            .update(enrollmentUpdates)
            .eq('id', enrollmentId)
            .select()
            .single();

        if (enErr) throw enErr;
        updatedEnrollment = enData;
    }

    if (!updatedApplicant) {
        const { data: appData } = await supabase
            .from('applicants')
            .select('*')
            .eq('id', enrollment.applicant_id)
            .single();
        updatedApplicant = appData;
    }

    return {
        message: 'อัปเดตข้อมูลใบสมัครเรียบร้อยแล้ว',
        enrollment: updatedEnrollment,
        applicant: updatedApplicant,
    };
};