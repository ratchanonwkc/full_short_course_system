import { supabase } from '../../config/supabase.js';

/**
 * applicants.service.js
 * ─────────────────────────────────────────────────────────────────────────
 * Service layer for Applicant Portal tracking and profile queries.
 */

const APPLICANT_TRACK_SELECT = `
  id,
  application_no,
  status,
  total_amount,
  payment_method,
  slip_url,
  receipt_number,
  receipt_book_no,
  receipt_date,
  rejection_reason,
  rejected_at,
  apply_date,
  payment_date,
  study_groups:study_group_id (
    id,
    group_code,
    group_name,
    tuition_fee,
    application_fee,
    is_waived_fee,
    is_ac_maintenance_fee,
    total_hours,
    schedule_description,
    start_date,
    end_date,
    batches:batch_id (
      id,
      batch_name,
      academic_year,
      term,
      batch_no,
      study_open_date,
      study_close_date
    ),
    teachers:teacher_id (
      id,
      first_name_th,
      last_name_th,
      prefixes:prefix_id ( short_name )
    ),
    study_group_subjects (
      id,
      moe_code,
      sequence_order,
      subjects:subject_id (
        id,
        subject_code,
        name_th,
        name_en,
        total_hours
      )
    )
  )
`;

export const getApplicantTrackService = async (citizenId) => {
    if (!citizenId || !/^\d{13}$/.test(String(citizenId).trim())) {
        const err = new Error('เลขประจำตัวประชาชนไม่ถูกต้อง (ต้องมี 13 หลัก)');
        err.status = 400;
        throw err;
    }

    const cleanCitizenId = String(citizenId).trim();

    // 1. Query applicant profile
    const { data: applicant, error: appError } = await supabase
        .from('applicants')
        .select('*')
        .eq('citizen_id', cleanCitizenId)
        .maybeSingle();

    if (appError) throw appError;

    if (!applicant) {
        const err = new Error('ไม่พบข้อมูลการสมัครของเลขประจำตัวประชาชนนี้');
        err.status = 404;
        throw err;
    }

    // 2. Query applicant enrollments with joined study groups and subjects
    const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select(APPLICANT_TRACK_SELECT)
        .eq('applicant_id', applicant.id)
        .order('apply_date', { ascending: false });

    if (enrollError) throw enrollError;

    const formattedEnrollments = (enrollments || []).map((row) => {
        const group = row.study_groups;
        const batch = group?.batches;
        const teacher = group?.teachers;
        const teacherPrefix = teacher?.prefixes?.short_name || '';
        const teacherName = teacher
            ? `${teacherPrefix}${teacher.first_name_th} ${teacher.last_name_th}`.trim()
            : '';

        const subjects = (group?.study_group_subjects || [])
            .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))
            .map((sgs) => ({
                id: sgs.subjects?.id || sgs.id,
                subject_code: sgs.subjects?.subject_code || '',
                moe_code: sgs.moe_code || '',
                subject_name: sgs.subjects?.name_th || '',
                name_en: sgs.subjects?.name_en || '',
                total_hours: sgs.subjects?.total_hours || 0,
            }));

        const primarySubject = subjects[0] || null;

        return {
            id: row.id,
            application_no: row.application_no || String(row.id).padStart(5, '0'),
            status: row.status,
            total_amount: row.total_amount,
            payment_method: row.payment_method || 'online_transfer',
            slip_url: row.slip_url || null,
            id_card_url: applicant.id_card_url || null,
            receipt_number: row.receipt_number || null,
            receipt_book_no: row.receipt_book_no || null,
            receipt_date: row.receipt_date || null,
            rejection_reason: row.rejection_reason || null,
            rejected_at: row.rejected_at || null,
            apply_date: row.apply_date,
            payment_date: row.payment_date,
            subject_code: primarySubject?.subject_code || group?.group_code || '',
            moe_code: primarySubject?.moe_code || '',
            subject_name: primarySubject?.subject_name || group?.group_name || '',
            study_group: group
                ? {
                    id: group.id,
                    group_code: group.group_code,
                    group_name: group.group_name,
                    tuition_fee: group.tuition_fee,
                    application_fee: group.application_fee,
                    is_waived_fee: group.is_waived_fee,
                    is_ac_maintenance_fee: Boolean(group.is_ac_maintenance_fee),
                    total_hours: group.total_hours,
                    schedule_description: group.schedule_description || '',
                    start_date: group.start_date,
                    end_date: group.end_date,
                    batch_id: batch?.id,
                    batch_name: batch?.batch_name || '',
                    academic_year: batch?.academic_year || '',
                    term: batch?.term || null,
                    batch_no: batch?.batch_no || null,
                    teacher_name: teacherName,
                    study_group_subjects: group?.study_group_subjects || [],
                    subjects,
                }
                : null,
        };
    });

    return {
        applicant,
        enrollments: formattedEnrollments,
    };
};
