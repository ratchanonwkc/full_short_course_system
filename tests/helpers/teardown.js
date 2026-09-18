/**
 * tests/helpers/teardown.js
 * -------------------------------------------------------------
 * Autonomous Supabase / Database cleanup script.
 * Purges all test entities matching '[TEST-' in foreign-key safe order
 * (Children -> Parents) to maintain DB cleanliness after test runs.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend .env where SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are stored
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase credentials not found in backend/.env. Skipping DB cleanup.');
}

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * Executes a full foreign-key safe purge of test entities.
 * Safe order: Children -> Parents
 */
export async function purgeTestData() {
    if (!supabase) {
        console.warn('⚠️ No Supabase client initialized. Teardown skipped.');
        return;
    }

    console.log('🧹 [Teardown] Starting autonomous purge of test entities...');

    try {
        // 0. Audit Logs
        const { error: auditErr } = await supabase
            .from('audit_logs')
            .delete()
            .or('target_entity.ilike.%[TEST-%,description.ilike.%[TEST-%,target_entity.ilike.%[TEST]%,description.ilike.%[TEST]%');
        if (!auditErr) console.log('   - Purged test audit_logs.');

        // 1. Enrollments (associated with test applicants or test groups)
        const { data: testApplicants } = await supabase
            .from('applicants')
            .select('id')
            .or('full_name.ilike.%[TEST-%,full_name.ilike.%[TEST]%');

        const applicantIds = (testApplicants || []).map((a) => a.id);
        if (applicantIds.length > 0) {
            await supabase.from('enrollments').delete().in('applicant_id', applicantIds);
            console.log(`   - Deleted enrollments for ${applicantIds.length} test applicants.`);
        }

        // Also delete enrollments linked to test study groups
        const { data: testGroupsForEnroll } = await supabase
            .from('study_groups')
            .select('id')
            .or('group_name.ilike.%[TEST-%,group_name.ilike.%[TEST]%');
        const testGroupIdsForEnroll = (testGroupsForEnroll || []).map((g) => g.id);
        if (testGroupIdsForEnroll.length > 0) {
            await supabase.from('enrollments').delete().in('study_group_id', testGroupIdsForEnroll);
        }

        // 2. Applicants
        const { error: appErr } = await supabase
            .from('applicants')
            .delete()
            .or('full_name.ilike.%[TEST-%,full_name.ilike.%[TEST]%');
        if (!appErr) console.log('   - Purged test applicants.');

        // 3. Payment Methods (Bank Accounts)
        const { error: pmErr } = await supabase
            .from('payment_methods')
            .delete()
            .or('bank_name.ilike.%[TEST-%,bank_name.ilike.%[TEST]%,account_number.eq.999-0-99999-9');
        if (!pmErr) console.log('   - Purged test payment methods.');

        // 4. Test Users (Preserve admin badendgg@gmail.com)
        const { error: userErr } = await supabase
            .from('users')
            .delete()
            .neq('email', 'badendgg@gmail.com')
            .or('email.ilike.%test_finance%,name.ilike.%[TEST-%,name.ilike.%[TEST]%');
        if (!userErr) console.log('   - Purged test users.');

        // 5. Study Group Subjects (linked to test groups or test subjects)
        const { data: testSubjects } = await supabase
            .from('subjects')
            .select('id')
            .or('name_th.ilike.%[TEST-%,name_th.ilike.%[TEST]%');
        const subjectIds = (testSubjects || []).map((s) => s.id);

        const { data: testGroups } = await supabase
            .from('study_groups')
            .select('id')
            .or('group_name.ilike.%[TEST-%,group_name.ilike.%[TEST]%');
        const groupIds = (testGroups || []).map((g) => g.id);

        if (groupIds.length > 0 || subjectIds.length > 0) {
            if (groupIds.length > 0) {
                await supabase.from('study_group_subjects').delete().in('study_group_id', groupIds);
            }
            if (subjectIds.length > 0) {
                await supabase.from('study_group_subjects').delete().in('subject_id', subjectIds);
            }
            console.log('   - Purged test study_group_subjects relations.');
        }

        // 6. Study Groups
        const { error: grpErr } = await supabase
            .from('study_groups')
            .delete()
            .or('group_name.ilike.%[TEST-%,group_name.ilike.%[TEST]%,group_code.ilike.%[TEST-%');
        if (!grpErr) console.log('   - Purged test study groups.');

        // 7. Subjects
        const { error: subjErr } = await supabase
            .from('subjects')
            .delete()
            .or('name_th.ilike.%[TEST-%,name_th.ilike.%[TEST]%');
        if (!subjErr) console.log('   - Purged test subjects.');

        // 8. Batches (batch_name like [TEST- or sequence 998/999)
        const { error: batchErr } = await supabase
            .from('batches')
            .delete()
            .or('batch_name.ilike.%[TEST-%,batch_name.ilike.%[TEST]%,batch_sequence.eq.998,batch_sequence.eq.999,batch_name.ilike.%998/%,batch_name.ilike.%999/%');
        if (!batchErr) console.log('   - Purged test batches.');

        // 9. Academic Minors
        const { error: minorErr } = await supabase
            .from('academic_minors')
            .delete()
            .or('name_th.ilike.%[TEST-%,name_th.ilike.%[TEST]%');
        if (!minorErr) console.log('   - Purged test academic minors.');

        // 10. Academic Majors
        const { error: majorErr } = await supabase
            .from('academic_majors')
            .delete()
            .or('name_th.ilike.%[TEST-%,name_th.ilike.%[TEST]%,short_name_th.eq.[TEST]');
        if (!majorErr) console.log('   - Purged test academic majors.');

        // 11. Curriculums
        const { error: currErr } = await supabase
            .from('curriculums')
            .delete()
            .or('curriculum_name.ilike.%[TEST-%,curriculum_name.ilike.%[TEST]%');
        if (!currErr) console.log('   - Purged test curriculums.');

        // 12. Teachers
        const { error: teacherErr } = await supabase
            .from('teachers')
            .delete()
            .or('first_name_th.ilike.%[TEST-%,first_name_th.ilike.%[TEST]%,last_name_th.eq.ระบบพัฒนา');
        if (!teacherErr) console.log('   - Purged test teachers.');

        console.log('✅ [Teardown] Autonomous cleanup completed successfully.');
    } catch (err) {
        console.error('❌ [Teardown] Error during purge:', err.message || err);
    }
}

// Allow direct execution via CLI: node tests/helpers/teardown.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    purgeTestData().then(() => process.exit(0));
}
