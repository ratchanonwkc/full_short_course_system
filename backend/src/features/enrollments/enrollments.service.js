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
// Drawer can render/edit the entire profile (personal, address, education),
// not just name/citizen_id/phone/email.
const ENROLLMENT_SELECT = `
  id, status, total_amount, slip_url, receipt_number, receipt_book_no, apply_date, payment_date, receipt_date,
  study_group_id, applicant_id, payment_method, rejection_reason, rejected_at,
  confirmed_by_user_id, rejected_by_user_id,
  applicants:applicant_id (
    id, citizen_id, title_name, full_name, gender, birth_date, marital_status,
    house_no, moo, soi, road, occupation, nationality, religion,
    highest_education, previous_school, school_province,
    is_same_address, current_house_no, current_moo, current_soi, current_road,
    current_subdistrict, current_district, current_province, current_postal_code,
    phone, email, postal_code, subdistrict, district, province, id_card_url
  ),
  study_groups:study_group_id ( id, group_code, group_name, max_seats, current_seats, tuition_fee, application_fee, is_waived_fee, batch_id, batches:batch_id ( id, batch_name ) )
`;

const flatten = (row) => ({
    id: row.id,
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
    title_name: row.applicants?.title_name,
    raw_full_name: row.applicants?.full_name,
    applicant_name: row.applicants ? `${row.applicants.title_name}${row.applicants.full_name}` : '',
    phone: row.applicants?.phone,
    email: row.applicants?.email,
    group_code: row.study_groups?.group_code,
    group_name: row.study_groups?.group_name,
    max_seats: row.study_groups?.max_seats,
    current_seats: row.study_groups?.current_seats,
    batch_id: row.study_groups?.batch_id,
    batch_name: row.study_groups?.batches?.batch_name,
    confirmed_by_user_id: row.confirmed_by_user_id,
    rejected_by_user_id: row.rejected_by_user_id,
    // Full nested applicant profile — used by the Registrar Applicant Detail
    // Drawer to populate the read-only view AND the edit form in one shot.
    applicant_profile: row.applicants || null,
});

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

    return resolveUserNames(rows);
};

const upsertApplicant = async (applicantData) => {
    const { citizen_id } = applicantData;
    const { data: existing, error: findErr } = await supabase
        .from('applicants')
        .select('id')
        .eq('citizen_id', citizen_id)
        .maybeSingle();
    if (findErr) throw findErr;

    if (existing) {
        const { data, error } = await supabase
            .from('applicants')
            .update(applicantData)
            .eq('id', existing.id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    const { data, error } = await supabase.from('applicants').insert([applicantData]).select().single();
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
        const { id, ...safeApplicant } = applicant;
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