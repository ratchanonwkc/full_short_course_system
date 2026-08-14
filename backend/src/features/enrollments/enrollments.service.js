import { supabase } from '../../config/supabase.js';

const ENROLLMENT_SELECT = `
  id, status, total_amount, slip_url, receipt_number, receipt_book_no, apply_date, payment_date, receipt_date, study_group_id, applicant_id,
  applicants:applicant_id ( id, citizen_id, title_name, full_name, phone, current_address, subdistrict, district, province, postal_code ),
  study_groups:study_group_id ( id, group_code, group_name, max_seats, current_seats, tuition_fee, application_fee, is_waived_fee )
`;

const flatten = (row) => ({
    id: row.id,
    status: row.status,
    total_amount: row.total_amount,
    slip_url: row.slip_url,
    receipt_number: row.receipt_number,
    receipt_book_no: row.receipt_book_no,
    apply_date: row.apply_date,
    payment_date: row.payment_date,
    receipt_date: row.receipt_date,
    study_group_id: row.study_group_id,
    applicant_id: row.applicant_id,
    citizen_id: row.applicants?.citizen_id,
    applicant_name: row.applicants ? `${row.applicants.title_name}${row.applicants.full_name}` : '',
    phone: row.applicants?.phone,
    group_code: row.study_groups?.group_code,
    group_name: row.study_groups?.group_name,
    max_seats: row.study_groups?.max_seats,
    current_seats: row.study_groups?.current_seats,
});

export const getEnrollmentsService = async ({ studyGroupId, status, batchId } = {}) => {
    let query = supabase.from('enrollments').select(ENROLLMENT_SELECT).order('apply_date', { ascending: false });
    if (studyGroupId) query = query.eq('study_group_id', studyGroupId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    let rows = data.map(flatten);

    // batchId isn't a direct column on enrollments — filter client-side against
    // study_groups already joined in, avoiding a second round-trip for the common
    // "give me the staff dashboard for this batch" query.
    if (batchId) {
        const { data: groupIds, error: gErr } = await supabase
            .from('study_groups')
            .select('id')
            .eq('batch_id', batchId);
        if (gErr) throw gErr;
        const idSet = new Set((groupIds || []).map((g) => g.id));
        rows = rows.filter((r) => idSet.has(r.study_group_id));
    }

    return rows;
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

/**
 * Duplicate-enrollment guard shared by both online and walk-in flows.
 * Only blocks re-applying to the SAME study_group with a non-cancelled enrollment.
 */
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
 * สร้างใบสมัคร Walk-in โดยเจ้าหน้าที่งานทะเบียน -> สถานะเริ่มต้น 'pending_payment'
 * ส่งต่อให้แผนกการเงินดำเนินการยืนยันชำระเงินต่อไป
 */
export const createWalkinEnrollmentService = async ({ applicant, study_group_id }) => {
    const savedApplicant = await upsertApplicant(applicant);

    await ensureNoDuplicateEnrollment(savedApplicant.id, study_group_id);

    const { data: group, error: groupErr } = await supabase
        .from('study_groups')
        .select('tuition_fee, application_fee, is_waived_fee')
        .eq('id', study_group_id)
        .single();
    if (groupErr) throw groupErr;

    const total_amount = group.is_waived_fee ? 0 : Number(group.tuition_fee || 0) + Number(group.application_fee || 0);

    const { data: enrollment, error } = await supabase
        .from('enrollments')
        .insert([
            {
                applicant_id: savedApplicant.id,
                study_group_id,
                status: 'pending_payment',
                total_amount,
                apply_date: new Date().toISOString(),
            },
        ])
        .select()
        .single();
    if (error) throw error;

    return { applicant: savedApplicant, enrollment };
};

/**
 * ยืนยันการชำระเงิน (Finance) — atomic:
 *   1. update enrollment: status='paid', receipt_book_no, receipt_number, receipt_date
 *   2. increment study_groups.current_seats +1
 */
export const confirmPaymentService = async (enrollmentId, { receipt_number, receipt_book_no }) => {
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
