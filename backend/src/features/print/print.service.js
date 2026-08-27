import { supabase } from '../../config/supabase.js';

/**
 * print.service.js
 * ─────────────────────────────────────────────────────────────────────────
 * Service layer for print templates (Blank Form / Specific Course Form).
 */

export const getBlankTemplateService = async (studyGroupId) => {
    // 1. If a specific studyGroupId is provided, fetch course & batch info
    if (studyGroupId && studyGroupId !== 'blank' && !isNaN(Number(studyGroupId))) {
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
            `)
            .eq('id', studyGroupId)
            .maybeSingle();

        if (groupErr) throw groupErr;

        if (group) {
            const batch = group.batches;
            const teacher = group.teachers;
            const teacherPrefix = teacher?.prefixes?.short_name || '';
            const teacherName = teacher
                ? `${teacherPrefix}${teacher.first_name_th} ${teacher.last_name_th}`.trim()
                : '';

            const subjects = (group.study_group_subjects || [])
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
            const totalFee = group.is_waived_fee ? 0 : Number(group.tuition_fee || 0) + Number(group.application_fee || 0);

            return {
                is_blank: true,
                is_group_blank: true,
                study_group_id: group.id,
                group_code: group.group_code,
                group_name: group.group_name,
                room_code: group.room_code || '',
                tuition_fee: group.tuition_fee,
                application_fee: group.application_fee,
                total_amount: totalFee,
                total_hours: group.total_hours || primarySubject?.total_hours || 0,
                schedule_description: group.schedule_description || '',
                start_date: group.start_date,
                end_date: group.end_date,
                study_open_date: batch?.study_open_date || null,
                batch_id: batch?.id || null,
                batch_name: batch?.batch_name || '',
                academic_year: batch?.academic_year || '',
                term: batch?.term || null,
                batch_no: batch?.batch_no || null,
                teacher_name: teacherName,
                subject_code: primarySubject?.subject_code || group.group_code || '',
                moe_code: primarySubject?.moe_code || group.room_code || '',
                subject_name: primarySubject?.subject_name || group.group_name || '',
                subjects,
            };
        }
    }

    // 2. Pure blank template (Mode A: Completely blank)
    return {
        is_blank: true,
        is_pure_blank: true,
        study_group_id: null,
        group_code: '',
        group_name: '',
        room_code: '',
        tuition_fee: 0,
        application_fee: 0,
        total_amount: 0,
        total_hours: 0,
        schedule_description: '',
        start_date: null,
        end_date: null,
        study_open_date: null,
        batch_id: null,
        batch_name: '',
        academic_year: '',
        term: null,
        batch_no: null,
        teacher_name: '',
        subject_code: '',
        moe_code: '',
        subject_name: '',
        subjects: [],
    };
};
