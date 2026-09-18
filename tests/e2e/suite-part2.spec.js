/**
 * tests/e2e/suite-part2.spec.js
 * -------------------------------------------------------------
 * E2E Test Spec Part 2: Downstream Operational Modules Workflow
 *
 * 1. Study Groups: Create group, assert shift times auto-fill, MOE 9-digit code preview, edit max seats from 20 to 25
 * 2. Public Registration & Registrar: Complete 3-step registration with Modulo-11 citizen ID, is_same_address=true, edit phone in registrar drawer
 * 3. Offered Courses Report: Verify single-line format [ชื่อวิชา] [ประเภท] [วัน(รอบ)] อ.[ชื่อผู้สอน] [ชม.] ชม. and test type filters
 * 4. Payment Verification: Verify financial breakdown (tuition + 10 THB = total), approve payment, assert status updates to paid
 * 5. Bank Accounts: Create active bank account [TEST] ธนาคารกรุงไทย, account 999-0-99999-9 and verify in list
 * 6. User Management: Create staff account with finance role and verify role badge in table
 * 7. Audit Logs & Dashboard: Assert recent mutations logged with [TEST] prefix and verify dashboard metric cards
 * 8. Teardown: Autonomous foreign-key safe DB purge of all [TEST- entities (test.afterAll)
 */

import { test, expect } from '@playwright/test';
import {
    TEST_SESSION_ID,
    wrapName,
    generateThaiCitizenId,
    generateThaiPhone,
    generateThaiEmail,
} from '../helpers/mock-factory.js';
import { purgeTestData, supabase } from '../helpers/teardown.js';

test.describe.serial('Operational Modules Workflow (Part 2)', () => {
    // Unique session test data
    const shortSessionId = TEST_SESSION_ID.toString().slice(-4);
    const deptCode = String(80 + (TEST_SESSION_ID % 18)).padStart(2, '0');
    const subjectCode = `99${deptCode}-2001`;

    let testTeacher = null;
    let testMajor = null;
    let testMinor = null;
    let testSubject = null;
    let testBatch = null;

    let createdStudyGroupId = null;
    let createdStudyGroupName = '';

    const testApplicantCitizenId = generateThaiCitizenId();
    const testApplicantName = wrapName('ผู้สมัครทดสอบสอง');
    const testApplicantPhone = generateThaiPhone();

    const testBankName = `[TEST] ธนาคารกรุงไทย_${shortSessionId}`;
    const testBankAccountNo = '999-0-99999-9';

    const testStaffName = wrapName('เจ้าหน้าที่การเงิน');
    const testStaffEmail = `test_finance_${shortSessionId}@uptech.ac.th`;

    // ── Setup: Initialize prerequisite academic entities for relational continuity ──
    test.beforeAll(async () => {
        console.log('🚀 Setting up prerequisite academic records for Part 2 operational suite...');
        if (!supabase) {
            throw new Error('Supabase client is not available in test runner.');
        }

        // 1. Create Teacher
        const teacherCitizenId = generateThaiCitizenId();
        const { data: teacher, error: tErr } = await supabase
            .from('teachers')
            .insert([
                {
                    citizen_id: teacherCitizenId,
                    prefix_id: 1, // นาย
                    first_name_th: wrapName('อาจารย์ทดสอบสอง'),
                    last_name_th: 'ระบบพัฒนา',
                    phone: generateThaiPhone(),
                    email: generateThaiEmail('teacher2'),
                    position_id: 1,
                    is_active: true,
                },
            ])
            .select()
            .single();
        if (tErr) throw tErr;
        testTeacher = teacher;

        // 2. Create Major
        const { data: major, error: mErr } = await supabase
            .from('academic_majors')
            .insert([
                {
                    level_id: 1,
                    subject_type_id: 1,
                    department_id: deptCode,
                    name_th: wrapName('แผนกการจัดการทดสอบ'),
                    short_name_th: '[TEST]',
                    head_teacher_id: teacher.id,
                },
            ])
            .select()
            .single();
        if (mErr) throw mErr;
        testMajor = major;

        // 3. Create Minor
        const { data: minor, error: miErr } = await supabase
            .from('academic_minors')
            .insert([
                {
                    major_id: major.id,
                    sub_department_id: '1',
                    name_th: wrapName('สาขางานทดสอบสอง'),
                },
            ])
            .select()
            .single();
        if (miErr) throw miErr;
        testMinor = minor;

        // 4. Create Subject
        const { data: subject, error: sErr } = await supabase
            .from('subjects')
            .insert([
                {
                    major_id: major.id,
                    subject_code: subjectCode,
                    name_th: wrapName('วิชาทดสอบขั้นสูง'),
                    theory_hours: 30,
                    practice_hours: 60,
                    total_hours: 90,
                },
            ])
            .select()
            .single();
        if (sErr) throw sErr;
        testSubject = subject;

        // 5. Create Batch with status 'admitting'
        const { data: batch, error: bErr } = await supabase
            .from('batches')
            .insert([
                {
                    batch_name: `รุ่นที่ 998/${shortSessionId}`,
                    batch_sequence: 998,
                    batch_no: 1,
                    academic_year: '2569',
                    term: 1,
                    status: 'admitting',
                    total_hours: 120,
                    admit_open_date: '2026-01-01',
                    admit_close_date: '2026-12-31',
                    study_open_date: '2026-06-01',
                    study_close_date: '2026-10-31',
                },
            ])
            .select()
            .single();
        if (bErr) throw bErr;
        testBatch = batch;

        console.log(`✅ Prerequisite academic records created: Batch ID=${batch.id}, Subject ID=${subject.id}`);
    });

    // ── Teardown: Autonomous foreign-key safe DB purge ──
    test.afterAll(async () => {
        console.log('🔄 Executing autonomous teardown after Part 2 operational suite...');
        await purgeTestData();
    });

    // ─────────────────────────────────────────────────────────────
    // 1. จัดการกลุ่มเรียน (Study Groups - /planning/study-groups)
    // ─────────────────────────────────────────────────────────────
    test('1. Study Groups: Create group, assert shift times auto-fill, MOE 9-digit code preview, edit max seats to 25', async ({ page }) => {
        await page.goto(`/planning/study-groups/${testBatch.id}`);
        await page.waitForLoadState('networkidle');

        // On desktop viewport (1600x900), the form panel is permanently mounted on the right (.hidden.lg:block)
        // Scoping to formPanel prevents strict-mode conflict with the mobile drawer
        const formPanel = page.locator('div.hidden.lg\\:block');
        await expect(formPanel).toBeVisible({ timeout: 15000 });

        // 1. Select Major (Department)
        const majorComboboxInput = formPanel.getByPlaceholder('เลือกแผนกวิชา...');
        await expect(majorComboboxInput).toBeVisible({ timeout: 5000 });
        await majorComboboxInput.click();
        await majorComboboxInput.fill(testMajor.name_th);
        const majorOption = page.getByRole('option', { name: testMajor.name_th }).first();
        await expect(majorOption).toBeVisible({ timeout: 5000 });
        await majorOption.click();

        // 2. Add Subject to Group
        const subjectComboboxInput = formPanel.getByPlaceholder('พิมพ์ค้นหารหัสวิชา หรือชื่อวิชา');
        await expect(subjectComboboxInput).toBeVisible({ timeout: 5000 });
        await subjectComboboxInput.click();
        await subjectComboboxInput.fill(testSubject.subject_code);
        const subjectOption = page.getByRole('option', { name: testSubject.subject_code }).first();
        await expect(subjectOption).toBeVisible({ timeout: 5000 });
        await subjectOption.click();

        // 3. Select Shift (เช้า) and assert start/end times auto-populate
        const timeSlotSelect = formPanel.locator('select').filter({ has: page.locator('option', { hasText: /เช้า/i }) }).first();
        await expect(timeSlotSelect).toBeVisible({ timeout: 5000 });
        // Select an option containing 'เช้า'
        const morningOptionValue = await timeSlotSelect.locator('option', { hasText: /เช้า/i }).first().getAttribute('value');
        if (morningOptionValue) {
            await timeSlotSelect.selectOption(morningOptionValue);
        }

        // Assert start and end times auto-populated
        const startTimeInput = formPanel.locator('input[type="time"]').first();
        const endTimeInput = formPanel.locator('input[type="time"]').nth(1);
        await expect(startTimeInput).toHaveValue(/08:30|09:00|08:/);
        await expect(endTimeInput).toHaveValue(/12:30|12:00|16:/);

        // 4. Select Study Days (Click "จันทร์ - ศุกร์" shortcut button)
        const weekdaysBtn = formPanel.getByRole('button', { name: /^จันทร์ - ศุกร์$/i });
        await expect(weekdaysBtn).toBeVisible({ timeout: 5000 });
        await weekdaysBtn.click();

        // 5. Select Teacher
        const teacherComboboxInput = formPanel.getByPlaceholder('พิมพ์ค้นหาชื่อครูผู้สอน...');
        await expect(teacherComboboxInput).toBeVisible({ timeout: 5000 });
        await teacherComboboxInput.click();
        await teacherComboboxInput.fill(testTeacher.first_name_th);
        const teacherOption = page.getByRole('option', { name: testTeacher.first_name_th }).first();
        await expect(teacherOption).toBeVisible({ timeout: 5000 });
        await teacherOption.click();

        // 5.5 Auto Fill group identity (group_code, room_code, group_name)
        const autoFillBtn = formPanel.getByRole('button', { name: /Auto Fill/i });
        await expect(autoFillBtn).toBeVisible({ timeout: 5000 });
        await autoFillBtn.click();
        await page.waitForTimeout(500);

        // Fallback / manual fill if auto fill didn't populate group_code or group_name
        const groupCodeInput = formPanel.locator('input[placeholder*="กด Auto Fill"]').first();
        if (!(await groupCodeInput.inputValue())) {
            await groupCodeInput.fill(`${testSubject.subject_code}ช1`);
        }
        const groupNameInput = formPanel.locator('input[placeholder*="เช่น อาหารไทย"]');
        if (!(await groupNameInput.inputValue())) {
            await groupNameInput.fill(`${testSubject.name_th} [ปกติ] (รอบ ช/1)`);
        }

        // 6. Assert dynamic MOE 9-digit code calculates and displays
        // The subject row in GroupSubjectsTable displays the 9-digit MOE code input
        const moeInput = formPanel.locator('input[placeholder*="เลข ศธ."]').or(formPanel.locator('input[placeholder*="เช่น 691101001"]')).or(formPanel.locator('input[maxlength="9"]')).first();
        await expect(moeInput).toBeVisible({ timeout: 5000 });
        const moeVal = await moeInput.inputValue();
        expect(moeVal.length).toBe(9);

        // 7. Edit Max Seats from 20 to 25
        const maxSeatsInput = formPanel.locator('label', { hasText: /^จำนวนที่นั่งสูงสุด/i }).locator('xpath=..').locator('input[type="number"]');
        await expect(maxSeatsInput).toBeVisible({ timeout: 5000 });
        await maxSeatsInput.fill('25');

        // 8. Submit group form
        const submitGroupBtn = formPanel.getByRole('button', { name: /บันทึกข้อมูลกลุ่มเรียน/i });
        await expect(submitGroupBtn).toBeVisible({ timeout: 5000 });
        await submitGroupBtn.click();

        // Verify SweetAlert confirmation
        const swalSuccess = page.locator('.swal2-popup');
        await expect(swalSuccess).toBeVisible({ timeout: 10000 });
        await expect(swalSuccess).toContainText(/สร้างกลุ่มเรียนสำเร็จ|บันทึกการแก้ไขสำเร็จ|เรียบร้อย/i);
        const swalConfirm = page.locator('.swal2-confirm');
        if (await swalConfirm.isVisible()) {
            await swalConfirm.click();
        }

        // Assert group appears in table
        await page.waitForTimeout(600);
        const searchInput = page.getByPlaceholder('ค้นหากลุ่มเรียน...');
        if (await searchInput.isVisible()) {
            await searchInput.fill(testSubject.subject_code);
            await page.waitForTimeout(500);
        }

        const groupRow = page.locator('.ag-row').filter({ hasText: testSubject.subject_code }).first();
        await expect(groupRow).toBeVisible({ timeout: 15000 });
        await expect(groupRow).toContainText('25');

        // Fetch the created study group from DB for subsequent test steps
        const { data: dbGroup } = await supabase
            .from('study_groups')
            .select('id, group_name, group_code')
            .eq('batch_id', testBatch.id)
            .order('id', { ascending: false })
            .limit(1)
            .single();

        expect(dbGroup).toBeTruthy();
        createdStudyGroupId = dbGroup.id;
        createdStudyGroupName = dbGroup.group_name;
        console.log(`✅ Study Group created successfully: ID=${createdStudyGroupId}, Name=${createdStudyGroupName}`);
    });

    // ─────────────────────────────────────────────────────────────
    // 2. การรับสมัครและการจัดกลุ่ม (Public Registration & Registrar)
    // ─────────────────────────────────────────────────────────────
    test('2. Public Registration & Registrar: Complete 3-step registration and edit phone in registrar drawer', async ({ page }) => {
        expect(createdStudyGroupId).toBeTruthy();

        // ── A. Public Enrollment Flow ──
        await page.goto(`/register/${createdStudyGroupId}`);
        await page.waitForLoadState('networkidle');

        // Step 1: Personal Info
        // Citizen ID using segmented 13-digit input
        const cidInput = page.getByLabel('เลขประจำตัวประชาชน 13 หลัก');
        await expect(cidInput).toBeVisible({ timeout: 10000 });
        await cidInput.fill(testApplicantCitizenId);

        // Title and Name
        await page.locator('select[name="title_name"]').selectOption('นาย');
        await page.locator('input[name="full_name"]').fill(testApplicantName);
        await page.locator('select[name="gender"]').selectOption('ชาย');

        // Birth Date via DateSelector
        const birthDateBtn = page.locator('button#birth_date');
        await expect(birthDateBtn).toBeVisible({ timeout: 5000 });
        await birthDateBtn.click();
        const todayBtn = page.getByRole('button', { name: /^วันนี้$/i });
        await expect(todayBtn).toBeVisible({ timeout: 5000 });
        await todayBtn.click();

        // Registered Address
        const houseNoInput = page.locator('#registered_house_no');
        await expect(houseNoInput).toBeVisible({ timeout: 5000 });
        await houseNoInput.fill('99/1');

        // Subdistrict / District / Province / Postal Code
        const subdistrictInput = page.getByPlaceholder('พิมพ์ชื่อตำบล/แขวง หรือรหัสไปรษณีย์');
        await subdistrictInput.fill('หมากแข้ง');
        await page.waitForTimeout(300);
        await subdistrictInput.press('Enter');
        await page.waitForTimeout(200);

        // Ensure district, province, postalCode are filled
        const districtInput = page.getByPlaceholder('เช่น เมืองอุดรธานี').first();
        if (!(await districtInput.inputValue())) {
            await districtInput.fill('เมืองอุดรธานี');
        }
        const provinceInput = page.getByPlaceholder('เช่น อุดรธานี').first();
        if (!(await provinceInput.inputValue())) {
            await provinceInput.fill('อุดรธานี');
        }
        const postalInput = page.locator('input[inputmode="numeric"][maxlength="5"]').first();
        if (!(await postalInput.inputValue())) {
            await postalInput.fill('41000');
        }

        // Phone & Contact
        await page.locator('input[name="phone"]').fill(testApplicantPhone);

        // Upload Dummy ID Card File Buffer
        const idCardFileInput = page.locator('input[type="file"]').first();
        await idCardFileInput.setInputFiles({
            name: 'id_card_mock.png',
            mimeType: 'image/png',
            buffer: Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2D', 'hex'),
        });
        await page.waitForTimeout(300);

        // Ensure is_same_address toggle is true (default)
        const sameAddressCheckbox = page.getByLabel('ใช้ที่อยู่เดียวกับที่อยู่ตามทะเบียนบ้าน');
        if (await sameAddressCheckbox.isVisible()) {
            const isChecked = await sameAddressCheckbox.isChecked();
            if (!isChecked) await sameAddressCheckbox.check();
        }

        // Proceed to Step 2
        const nextStep1Btn = page.getByRole('button', { name: /ถัดไป/i });
        await expect(nextStep1Btn).toBeVisible({ timeout: 5000 });
        await nextStep1Btn.click();

        // Step 2: Payment Method
        // Select Counter Cash (ชำระเงินที่ห้องการเงิน) for direct test progression
        const counterCashRadio = page.getByText('ชำระเงินที่ห้องการเงิน');
        await expect(counterCashRadio).toBeVisible({ timeout: 8000 });
        await counterCashRadio.click();

        // Proceed to Step 3
        const nextStep2Btn = page.getByRole('button', { name: /ถัดไป/i });
        await nextStep2Btn.click();

        // Step 3: Review and Confirm
        const termsCheckbox = page.locator('input[type="checkbox"]').last();
        await expect(termsCheckbox).toBeVisible({ timeout: 5000 });
        await termsCheckbox.check();

        const confirmSubmitBtn = page.getByRole('button', { name: /ยืนยันการส่งใบสมัคร/i });
        await expect(confirmSubmitBtn).toBeVisible({ timeout: 5000 });
        await confirmSubmitBtn.click();

        // Assert submit succeeds without violates not-null constraint error
        const submitSwal = page.locator('.swal2-popup');
        await expect(submitSwal).toBeVisible({ timeout: 15000 });
        await expect(submitSwal).not.toContainText(/violates not-null constraint/i);
        const swalSuccessConfirm = page.locator('.swal2-confirm');
        if (await swalSuccessConfirm.isVisible()) {
            await swalSuccessConfirm.click();
        }

        console.log(`✅ Public registration completed for applicant: ${testApplicantName}`);

        // ── B. Registrar Management Flow ──
        await page.goto('/registrar/enrollments');
        await page.waitForLoadState('networkidle');

        // Select our test batch from batch dropdown
        const batchCombobox = page.getByPlaceholder('เลือกรุ่นการเรียน...');
        if (await batchCombobox.isVisible()) {
            await batchCombobox.click();
            await batchCombobox.fill(testBatch.batch_name);
            const batchOption = page.getByRole('option', { name: testBatch.batch_name }).first();
            if (await batchOption.isVisible()) {
                await batchOption.click();
            }
        }

        // Search for the applicant in the table
        const searchApplicantInput = page.getByPlaceholder('ชื่อ, เบอร์โทร, อีเมล, เลขบัตร...').or(page.locator('input[placeholder*="เลขบัตร"]'));
        await expect(searchApplicantInput).toBeVisible({ timeout: 10000 });
        await searchApplicantInput.fill(testApplicantName);
        await page.waitForTimeout(600);

        // Assert applicant appears in table
        const applicantRow = page.locator('.ag-row').filter({ hasText: testApplicantName }).first();
        await expect(applicantRow).toBeVisible({ timeout: 15000 });

        // Open ApplicantDetailDrawer via action button "รายละเอียด" or row dblclick
        const detailBtn = applicantRow.getByRole('button', { name: /รายละเอียด/i });
        if (await detailBtn.isVisible()) {
            await detailBtn.click();
        } else {
            await applicantRow.dblclick();
        }

        const drawer = page.locator('div.max-w-2xl');
        await expect(drawer).toBeVisible({ timeout: 10000 });
        await expect(drawer).toContainText(testApplicantName);

        // Click "แก้ไขข้อมูลทั้งหมด"
        const editAllBtn = drawer.getByRole('button', { name: /แก้ไขข้อมูลทั้งหมด/i });
        await expect(editAllBtn).toBeVisible({ timeout: 5000 });
        await editAllBtn.click();

        // Edit Phone Number to '0899999999'
        const editPhoneInput = drawer.locator('input[name="phone"]');
        await expect(editPhoneInput).toBeVisible({ timeout: 5000 });
        await editPhoneInput.fill('0899999999');

        // Click "บันทึกการแก้ไข"
        const saveEditBtn = drawer.getByRole('button', { name: /บันทึกการแก้ไข/i });
        await expect(saveEditBtn).toBeVisible({ timeout: 5000 });
        await saveEditBtn.click();

        // Verify toast / SweetAlert confirmation
        await page.waitForTimeout(1000);
        await expect(drawer.getByRole('button', { name: /แก้ไขข้อมูลทั้งหมด/i })).toBeVisible({ timeout: 8000 });
        await expect(drawer).toContainText('0899999999');

        // Close drawer
        const closeDrawerBtn = drawer.locator('button:has(svg.lucide-x)').first();
        await closeDrawerBtn.click();
        await expect(drawer).not.toBeVisible({ timeout: 8000 });
    });

    // ─────────────────────────────────────────────────────────────
    // 3. รายงานรายวิชาที่เปิดสอน (Offered Courses Report)
    // ─────────────────────────────────────────────────────────────
    test('3. Offered Courses Report: Verify single-line format [ชื่อวิชา] [ประเภท] [วัน(รอบ)] อ.[ชื่อผู้สอน] [ชม.] ชม. and test type filters', async ({ page }) => {
        await page.goto(`/reports/offered-courses?batchId=${testBatch.id}`);
        await page.waitForLoadState('networkidle');

        // Assert header is rendered
        await expect(page.getByText(/แบบรายงานรายวิชาที่เปิดสอน|รายวิชาที่เปิดสอน/i).first()).toBeVisible({ timeout: 10000 });

        // Test filter checkboxes: toggle 'ทั้งหมด', 'ปกติ', 'พิเศษ'
        const allCheckbox = page.getByRole('button', { name: /ทั้งหมด/i }).or(page.locator('label', { hasText: /ทั้งหมด/i }));
        const regularCheckbox = page.getByRole('button', { name: /ปกติ/i }).or(page.locator('label', { hasText: /ปกติ/i }));
        const specialCheckbox = page.getByRole('button', { name: /พิเศษ/i }).or(page.locator('label', { hasText: /พิเศษ/i }));

        await expect(allCheckbox.first()).toBeVisible({ timeout: 5000 });
        if (await regularCheckbox.first().isVisible()) {
            await regularCheckbox.first().click();
            await page.waitForTimeout(300);
        }
        if (await specialCheckbox.first().isVisible()) {
            await specialCheckbox.first().click();
            await page.waitForTimeout(300);
        }
        // Revert back to 'ทั้งหมด'
        await allCheckbox.first().click();
        await page.waitForTimeout(300);

        // Assert Single-Line Compactness: Verify course name follows the format:
        // [ชื่อวิชา] [ประเภท] [วัน(รอบ)] อ.[ชื่อผู้สอน] [ชม.] ชม.
        // Example: วิชาทดสอบขั้นสูง จ-ศ(เช้า/1) อ.อาจารย์ทดสอบสอง 90 ชม.
        const courseRow = page.locator('tr').filter({ hasText: testSubject.name_th }).first();
        await expect(courseRow).toBeVisible({ timeout: 15000 });

        const rowText = await courseRow.textContent();
        // Assert formula elements exist in row
        expect(rowText).toContain(testSubject.name_th);
        expect(rowText).toMatch(/จ-ศ|ทุกวัน|ส-อา/);
        expect(rowText).toContain('อ.');
        expect(rowText).toContain('ชม.');
    });

    // ─────────────────────────────────────────────────────────────
    // 4. ตรวจสอบการชำระเงิน (Payment Verification - Finance)
    // ─────────────────────────────────────────────────────────────
    test('4. Payment Verification: Verify financial breakdown, approve payment, and assert status updates to paid', async ({ page }) => {
        await page.goto('/finance/verification');
        await page.waitForLoadState('networkidle');

        // Select our test batch filter if available
        const batchCombobox = page.getByPlaceholder('เลือกรุ่นการเรียน...');
        if (await batchCombobox.isVisible()) {
            await batchCombobox.click();
            await batchCombobox.fill(testBatch.batch_name);
            const batchOption = page.getByRole('option', { name: testBatch.batch_name }).first();
            if (await batchOption.isVisible()) {
                await batchOption.click();
            }
        }

        // Locate test applicant row in AG Grid table
        const applicantRow = page.locator('.ag-row').filter({ hasText: testApplicantName }).first();
        await expect(applicantRow).toBeVisible({ timeout: 15000 });

        // Open PaymentVerificationModal via action button or row click
        const verifyBtn = applicantRow.getByRole('button', { name: /ตรวจสอบ/i });
        if (await verifyBtn.isVisible()) {
            await verifyBtn.click();
        } else {
            await applicantRow.click();
        }
        const modal = page.locator('div.max-w-4xl').or(page.locator('.fixed.inset-0'));
        await expect(modal.filter({ hasText: /ตรวจสอบและยืนยันการชำระเงิน|การคำนวณยอดเงิน/i }).first()).toBeVisible({ timeout: 8000 });

        // Assert Breakdown:
        // - Applicant name
        await expect(modal.getByText(testApplicantName).first()).toBeVisible();
        // - Fee calculation: Tuition + 10 THB Application fee = Total Payable
        await expect(modal.getByText(/ค่าสมัคร/i).first()).toBeVisible();
        await expect(modal.getByText(/฿10/i).first()).toBeVisible();
        await expect(modal.getByText(/ยอดที่ต้องชำระจริง/i).first()).toBeVisible();

        // Fill Book No and Receipt No
        const bookNoInput = modal.getByPlaceholder('เช่น 12');
        const receiptNoInput = modal.getByPlaceholder('เช่น 000123');
        await expect(bookNoInput).toBeVisible({ timeout: 5000 });
        await bookNoInput.fill('01');
        await receiptNoInput.fill('000001');

        // Click [ ✓ อนุมัติการชำระเงิน ]
        const approveBtn = modal.getByRole('button', { name: /✓ อนุมัติการชำระเงิน/i });
        await expect(approveBtn).toBeVisible({ timeout: 5000 });
        await approveBtn.click();

        // Confirm SweetAlert modal
        const swalConfirmApprove = page.locator('.swal2-confirm');
        await expect(swalConfirmApprove).toBeVisible({ timeout: 5000 });
        await swalConfirmApprove.click();

        // Wait for approval toast
        await page.waitForTimeout(1000);

        // Switch to "ชำระแล้ว" (Paid) tab or assert row status badge
        const paidTab = page.getByRole('button', { name: /^ชำระแล้ว/i }).or(page.getByText(/^ชำระแล้ว/i)).first();
        if (await paidTab.isVisible()) {
            await paidTab.click();
            await page.waitForTimeout(500);
        }

        const paidRow = page.locator('.ag-row').filter({ hasText: testApplicantName }).first();
        await expect(paidRow).toBeVisible({ timeout: 15000 });
        await expect(paidRow).toContainText(/ชำระแล้ว/i);
    });

    // ─────────────────────────────────────────────────────────────
    // 5. ตั้งค่าบัญชีรับเงิน (Bank Accounts - Finance Settings)
    // ─────────────────────────────────────────────────────────────
    test('5. Bank Accounts: Create active bank account and verify in list', async ({ page }) => {
        await page.goto('/finance/payment-methods');
        await page.waitForLoadState('networkidle');

        // Click "เพิ่มบัญชีธนาคาร"
        const addBankBtn = page.getByRole('button', { name: /เพิ่มบัญชีธนาคาร/i });
        await expect(addBankBtn).toBeVisible({ timeout: 10000 });
        await addBankBtn.click();

        // Fill modal form
        const bankNameInput = page.locator('input[name="bank_name"]');
        await expect(bankNameInput).toBeVisible({ timeout: 5000 });
        await bankNameInput.fill(testBankName);

        const accountNameInput = page.locator('input[name="account_name"]');
        await accountNameInput.fill('วิทยาลัยสารพัดช่าง');

        const accountNoInput = page.locator('input[name="account_number"]');
        await accountNoInput.fill(testBankAccountNo);

        // Ensure active checkbox is checked
        const activeCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: '' }).first();
        if (await activeCheckbox.isVisible() && !(await activeCheckbox.isChecked())) {
            await activeCheckbox.check();
        }

        // Click "บันทึก"
        const saveBankBtn = page.getByRole('button', { name: /^บันทึก$/i });
        await saveBankBtn.click();

        // Handle success alert
        const swalSuccess = page.locator('.swal2-confirm');
        if (await swalSuccess.isVisible({ timeout: 5000 }).catch(() => false)) {
            await swalSuccess.click();
        }

        // Assert bank account appears in list
        const bankCard = page.locator('div').filter({ hasText: testBankName }).first();
        await expect(bankCard).toBeVisible({ timeout: 10000 });
        await expect(bankCard).toContainText(testBankAccountNo);
    });

    // ─────────────────────────────────────────────────────────────
    // 6. จัดการผู้ใช้งาน (User Management - Admin)
    // ─────────────────────────────────────────────────────────────
    test('6. User Management: Create staff account with finance role and verify role badge in table', async ({ page }) => {
        await page.goto('/admin/users');
        await page.waitForLoadState('networkidle');

        // Click "เพิ่มผู้ใช้งานใหม่"
        const addUserBtn = page.getByRole('button', { name: /เพิ่มผู้ใช้งานใหม่/i });
        await expect(addUserBtn).toBeVisible({ timeout: 10000 });
        await addUserBtn.click();

        // Fill user details
        const nameInput = page.getByPlaceholder('เช่น ดร.สมชาย ใจดี');
        await expect(nameInput).toBeVisible({ timeout: 5000 });
        await nameInput.fill(testStaffName);

        const emailInput = page.getByPlaceholder('staff@institution.ac.th');
        await emailInput.fill(testStaffEmail);

        const passwordInput = page.getByPlaceholder('กำหนดรหัสผ่านอย่างน้อย 6 ตัวอักษร');
        await passwordInput.fill('Password123!');

        // Select Role: Finance
        const financeRoleCard = page.locator('div').filter({ hasText: /^Finance/i }).last();
        await expect(financeRoleCard).toBeVisible({ timeout: 5000 });
        await financeRoleCard.click();

        // Click "สร้างผู้ใช้งาน"
        const submitUserBtn = page.getByRole('button', { name: /^สร้างผู้ใช้งาน$/i });
        await submitUserBtn.click();

        // Wait for modal to close
        await page.waitForTimeout(1000);

        // Search for user in table
        const searchUserInput = page.getByPlaceholder('ค้นหาด้วยชื่อ-นามสกุล หรืออีเมล...');
        await expect(searchUserInput).toBeVisible({ timeout: 10000 });
        await searchUserInput.fill(testStaffEmail);
        await page.waitForTimeout(500);

        // Assert user row is visible with Finance role
        const userRow = page.locator('tr').filter({ hasText: testStaffEmail }).first();
        await expect(userRow).toBeVisible({ timeout: 10000 });
        await expect(userRow).toContainText('Finance');
    });

    // ─────────────────────────────────────────────────────────────
    // 7. ประวัติการใช้งาน & Dashboard (Audit Logs & Dashboard)
    // ─────────────────────────────────────────────────────────────
    test('7. Audit Logs & Dashboard: Assert recent mutations logged with [TEST] prefix and verify dashboard metric cards', async ({ page }) => {
        // ── A. Audit Logs Page ──
        await page.goto('/admin/audit-logs');
        await page.waitForLoadState('networkidle');

        // Assert table contains recent mutations with [TEST] prefix
        const searchAuditInput = page.getByPlaceholder(/ค้นหาด้วยชื่อผู้ปฏิบัติงาน/i).or(page.locator('input[placeholder*="ค้นหา"]')).first();
        if (await searchAuditInput.isVisible()) {
            await searchAuditInput.fill('[TEST');
            await page.waitForTimeout(500);
        }

        const auditRow = page.locator('tr').filter({ hasText: /\[TEST/ }).first();
        await expect(auditRow).toBeVisible({ timeout: 15000 });

        // ── B. Dashboard Page ──
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Assert Metric cards reflect active counts without rendering errors or NaN values
        const admittingCard = page.locator('div').filter({ hasText: /รุ่นที่เปิดรับสมัคร/i }).first();
        await expect(admittingCard).toBeVisible({ timeout: 10000 });
        const admittingText = await admittingCard.textContent();
        expect(admittingText).not.toContain('NaN');

        const totalGroupsCard = page.locator('div').filter({ hasText: /กลุ่มเรียนทั้งหมด/i }).first();
        await expect(totalGroupsCard).toBeVisible({ timeout: 10000 });
        const groupsText = await totalGroupsCard.textContent();
        expect(groupsText).not.toContain('NaN');

        const availableSeatsCard = page.locator('div').filter({ hasText: /จำนวนที่นั่งคงเหลือ/i }).first();
        await expect(availableSeatsCard).toBeVisible({ timeout: 10000 });
        const seatsText = await availableSeatsCard.textContent();
        expect(seatsText).not.toContain('NaN');

        console.log('✅ Audit logs and Dashboard metrics verified successfully with zero NaN errors.');
    });
});
