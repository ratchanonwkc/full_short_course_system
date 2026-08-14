import { supabase } from '../../config/supabase.js';
import postalData from '../../data/thaiPostalCodes.json' with { type: 'json' };

const GROUP_SELECT = `
  id, group_code, group_name, status, max_seats, current_seats,
  tuition_fee, application_fee, is_waived_fee, is_ac_maintenance_fee,
  total_hours, study_dates_description, schedule_description,
  start_date, end_date, registration_start_date, registration_end_date,
  major_id,
  academic_majors:major_id ( id, name_th, short_name_th ),
  teachers:teacher_id ( id, first_name_th, last_name_th ),
  locations:joint_location_id ( id, name ),
  study_group_subjects (
    id, subject_id, sequence_order,
    subjects:subject_id ( id, subject_code, name_th, total_hours )
  )
`;

const mapGroup = (row) => {
    const fee = row.is_waived_fee ? 0 : Number(row.tuition_fee || 0) + Number(row.application_fee || 0);
    return {
        id: row.id,
        group_code: row.group_code,
        group_name: row.group_name,
        status: row.status,
        max_seats: row.max_seats,
        current_seats: row.current_seats,
        remaining_seats: Math.max(0, (row.max_seats || 0) - (row.current_seats || 0)),
        fee,
        is_free: Boolean(row.is_waived_fee),
        total_hours: row.total_hours,
        schedule_description: row.schedule_description || row.study_dates_description,
        start_date: row.start_date,
        end_date: row.end_date,
        registration_start_date: row.registration_start_date,
        registration_end_date: row.registration_end_date,
        major_id: row.major_id,
        major_name: row.academic_majors?.name_th || '',
        major_short_name: row.academic_majors?.short_name_th || '',
        teacher_name: row.teachers ? `${row.teachers.first_name_th} ${row.teachers.last_name_th}` : '',
        location_name: row.locations?.name || '',
        subjects: (row.study_group_subjects || []).map((s) => ({
            subject_id: s.subject_id,
            subject_code: s.subjects?.subject_code,
            name_th: s.subjects?.name_th,
        })),
    };
};

export const getOpenStudyGroupsService = async ({ search, majorId } = {}) => {
    let query = supabase.from('study_groups').select(GROUP_SELECT).eq('status', 'open').order('id', { ascending: false });
    if (majorId) query = query.eq('major_id', majorId);

    const { data, error } = await query;
    if (error) throw error;

    let mapped = data.map(mapGroup);

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
    return mapGroup(data);
};

export const lookupPostalCodeService = (code) => {
    const matches = postalData.filter((row) => row.postal_code === String(code));
    return matches;
};

export const getActivePaymentMethodsService = async () => {
    // Selective projection — avoid SELECT * on hot public endpoint
    const { data, error } = await supabase
        .from('payment_methods')
        .select('id, bank_name, account_name, account_number, qr_code_url')
        .eq('is_active', true);
    if (error) throw error;
    return data;
};

/**
 * upsertApplicant: find existing applicant by citizen_id first; update if found, insert if not.
 * This is the ONLY place identity is deduplicated — never blocks a person from applying
 * to a different course. Course-level duplication is enforced separately in
 * ensureNoDuplicateEnrollment() against the (applicant_id, study_group_id) composite key.
 */
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
 * Duplicate-enrollment guard — the ONLY thing that should ever block a submission.
 * Rejects re-applying to the SAME study_group only if the existing enrollment isn't cancelled.
 * A student who already took a different course, or whose previous attempt at this
 * exact course was cancelled, is allowed through.
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
        const err = new Error('ท่านได้สมัครเรียนวิชานี้ไปแล้ว กรุณาตรวจสอบสถานะการสมัครของท่าน');
        err.status = 409;
        throw err;
    }
};

export const createOnlineApplicationService = async ({ applicant, study_group_id, slip_url }) => {
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
                apply_date: now,
                payment_date: now,
            },
        ])
        .select()
        .single();
    if (error) throw error;

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
            `id, status, total_amount, slip_url, receipt_number, receipt_book_no, apply_date, payment_date, receipt_date,
       study_groups:study_group_id ( id, group_code, group_name, tuition_fee, application_fee, start_date )`
        )
        .eq('applicant_id', applicant.id)
        .order('apply_date', { ascending: false });
    if (enrollError) throw enrollError;

    return { applicant, enrollments: enrollments || [] };
};
