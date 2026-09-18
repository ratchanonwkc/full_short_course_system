/**
 * tests/e2e/suite-part1.spec.js
 * -------------------------------------------------------------
 * E2E Test Spec Part 1: Academic Modules Workflow
 *
 * 1. Curriculums & Departments: Create [TEST] แผนกทดสอบ, verify table appearance
 * 2. Subjects: Add subject linked to created department, verify code and hours
 * 3. Teachers: Add teacher record with Thai title, verify profile in list
 * 4. Batches: Create single batch รุ่นที่ 999/${shortId}
 * 5. Teardown: Execute automatic purge on completion (test.afterAll)
 */

import { test, expect } from '@playwright/test';
import {
    TEST_SESSION_ID,
    wrapName,
    generateThaiCitizenId,
    generateThaiPhone,
    generateThaiEmail,
} from '../helpers/mock-factory.js';
import { purgeTestData } from '../helpers/teardown.js';

test.describe.serial('Academic Modules Workflow (Part 1)', () => {
    // Unique session test data
    const shortSessionId = TEST_SESSION_ID.toString().slice(-2);
    const testDeptCode = String(80 + (TEST_SESSION_ID % 18)).padStart(2, '0');
    const testDeptName = wrapName('แผนกทดสอบ');
    const testDeptShortName = '[TEST]';

    const testMinorName = wrapName('สาขางานทดสอบ');
    const testSubjectName = wrapName('วิชาทดสอบวิชาชีพ');

    const testTeacherFirstName = wrapName('อาจารย์ทดสอบ');
    const testTeacherLastName = 'ระบบพัฒนา';
    const testTeacherCitizenId = generateThaiCitizenId();
    const testTeacherPhone = generateThaiPhone();
    const testTeacherEmail = generateThaiEmail('teacher');

    const testBatchSequence = 999;
    const testBatchName = `รุ่นที่ 999/${shortSessionId}`;

    // Execute autonomous purge on suite completion
    test.afterAll(async () => {
        console.log('🔄 Executing autonomous teardown after test suite...');
        await purgeTestData();
    });

    // ─────────────────────────────────────────────────────────────
    // 1. Curriculums & Departments (Academic Structure)
    // ─────────────────────────────────────────────────────────────
    test('1. Curriculums & Departments: Create department and verify appearance', async ({ page }) => {
        await page.goto('/academic-structure');
        await page.waitForLoadState('networkidle');

        // Select the "สาขาวิชา/แผนก" (Majors / Departments) tab
        const majorsTab = page.getByRole('tab', { name: /สาขาวิชา\/แผนก/i });
        await expect(majorsTab).toBeVisible({ timeout: 10000 });
        await majorsTab.click();

        // Target the visible form panel on desktop or drawer
        const visibleMajorForm = page.locator('form').filter({ visible: true }).first();

        // Select ประเภทวิชา (Subject Type) via combobox search
        const subjectTypeCombobox = visibleMajorForm.getByPlaceholder('เลือกประเภทวิชา...').filter({ visible: true });
        await subjectTypeCombobox.click();
        await subjectTypeCombobox.fill('อุตสาหกรรม');
        const typeOption = page.getByRole('option', { name: /อุตสาหกรรม/i }).first();
        await expect(typeOption).toBeVisible({ timeout: 5000 });
        await typeOption.click();

        // Fill Department Code (รหัสแผนก 2 หลัก)
        const deptCodeInput = visibleMajorForm.getByPlaceholder('เช่น 01').filter({ visible: true });
        await deptCodeInput.fill(testDeptCode);

        // Fill Department Name Thai (ชื่อสาขาวิชา (ไทย))
        const deptNameInput = visibleMajorForm.locator('div').filter({ hasText: /^ชื่อสาขาวิชา \(ไทย\)$/ }).locator('input');
        await deptNameInput.fill(testDeptName);

        // Fill Short Name (ชื่อย่อ)
        const shortNameInput = visibleMajorForm.getByPlaceholder('เช่น ช.ยนต์').filter({ visible: true });
        await shortNameInput.fill(testDeptShortName);

        // Submit form
        const submitMajorBtn = visibleMajorForm.getByRole('button', { name: /เพิ่มสาขาวิชา$/i });
        await submitMajorBtn.click();

        // Verify toast or success message
        await expect(page.locator('.swal2-toast, .swal2-popup')).toBeVisible({ timeout: 10000 });

        // Filter by the created department name in the AG Grid search box
        const searchMajorInput = page.getByPlaceholder('ค้นหาสาขาวิชา...').filter({ visible: true });
        await searchMajorInput.fill(testDeptName);

        // Verify department appears in the AG Grid table
        const gridTable = page.locator('.ag-root');
        await expect(gridTable).toBeVisible();
        const departmentRow = page.locator('.ag-row').filter({ hasText: testDeptName });
        await expect(departmentRow).toBeVisible({ timeout: 15000 });

        // Create an accompanying Minor (สาขางาน) so subjects can cascade to it in Module 2
        const minorsTab = page.getByRole('tab', { name: /สาขางาน\/กลุ่มวิชา/i });
        await minorsTab.click();

        const visibleMinorForm = page.locator('form').filter({ visible: true }).first();

        // Select parent Major in MinorTab (placeholder: "เลือกสาขาวิชาต้นสังกัด...")
        const majorComboboxInMinor = visibleMinorForm.getByPlaceholder('เลือกสาขาวิชาต้นสังกัด...').filter({ visible: true });
        await majorComboboxInMinor.click();
        await majorComboboxInMinor.fill(testDeptName);
        const majorOptionInMinor = page.getByRole('option', { name: testDeptName }).first();
        await expect(majorOptionInMinor).toBeVisible({ timeout: 5000 });
        await majorOptionInMinor.click();

        // Fill sub_department_id (1 digit)
        const subDeptInput = visibleMinorForm.getByPlaceholder('เช่น 1').filter({ visible: true });
        await subDeptInput.fill('1');

        // Fill minor name
        const minorNameInput = visibleMinorForm.locator('div').filter({ hasText: /^ชื่อสาขางาน \(ไทย\)$/ }).locator('input');
        await minorNameInput.fill(testMinorName);

        // Submit minor
        const submitMinorBtn = visibleMinorForm.getByRole('button', { name: /เพิ่มสาขางาน$/i });
        await submitMinorBtn.click();
        await expect(page.locator('.swal2-toast, .swal2-popup')).toBeVisible({ timeout: 10000 });

        // Filter and verify minor in the table
        const searchMinorInput = page.getByPlaceholder('ค้นหาสาขางาน...').filter({ visible: true });
        await searchMinorInput.fill(testMinorName);
        const minorRow = page.locator('.ag-row').filter({ hasText: testMinorName });
        await expect(minorRow).toBeVisible({ timeout: 15000 });
    });

    // ─────────────────────────────────────────────────────────────
    // 2. Subjects (Curriculum Subjects)
    // ─────────────────────────────────────────────────────────────
    test('2. Subjects: Add subject linked to created department and verify hours', async ({ page }) => {
        await page.goto('/subjects');
        await page.waitForLoadState('networkidle');

        // Click "เพิ่มรายวิชาใหม่"
        const addSubjectBtn = page.getByRole('button', { name: /เพิ่มรายวิชาใหม่/i });
        await expect(addSubjectBtn).toBeVisible({ timeout: 10000 });
        await addSubjectBtn.click();

        // Target the visible drawer form
        await expect(page.getByText('เพิ่มรายวิชาใหม่').first()).toBeVisible({ timeout: 5000 });
        const drawer = page.locator('form').filter({ hasText: 'รหัสวิชา (Subject Code)' });

        // 1. Select Level (ระดับชั้น)
        const levelInput = drawer.locator('label', { hasText: /^ระดับชั้น$/ }).locator('xpath=..').locator('input');
        await levelInput.click();
        await levelInput.fill('วิชาชีพระยะสั้น');
        const levelOpt = page.getByRole('option', { name: /วิชาชีพระยะสั้น/i }).first();
        await expect(levelOpt).toBeVisible({ timeout: 5000 });
        await levelOpt.click();

        // 2. Select Subject Type (ประเภทวิชา): อุตสาหกรรม
        const typeInput = drawer.locator('label', { hasText: /^ประเภทวิชา$/ }).locator('xpath=..').locator('input');
        await typeInput.click();
        await typeInput.fill('อุตสาหกรรม');
        const typeOption = page.getByRole('option', { name: /อุตสาหกรรม/i }).first();
        await expect(typeOption).toBeVisible({ timeout: 5000 });
        await typeOption.click();

        // 3. Select Major (สาขาวิชา/แผนก): created department
        const majorInput = drawer.locator('label', { hasText: /^สาขาวิชา\/แผนก$/ }).locator('xpath=..').locator('input');
        await expect(majorInput).toBeEnabled({ timeout: 10000 });
        await majorInput.click();
        await majorInput.fill(testDeptName);
        const majorOption = page.getByRole('option', { name: testDeptName }).first();
        await expect(majorOption).toBeVisible({ timeout: 5000 });
        await majorOption.click();

        // 4. Select Minor (สาขางาน/กลุ่มวิชา): created minor
        const minorInput = drawer.locator('label', { hasText: /^สาขางาน\/กลุ่มวิชา$/ }).locator('xpath=..').locator('input');
        await expect(minorInput).toBeEnabled({ timeout: 10000 });
        await minorInput.click();
        await minorInput.fill(testMinorName);
        const minorOption = page.getByRole('option', { name: testMinorName }).first();
        await expect(minorOption).toBeVisible({ timeout: 5000 });
        await minorOption.click();

        // 5. Select Duration Group: 61-90 ชั่วโมง (value="3")
        const durationSelect = drawer.locator('label', { hasText: /^ช่วงระยะเวลาเรียน$/ }).locator('xpath=..').locator('select');
        await durationSelect.selectOption('3');

        // 6. Fill Course Name (TH)
        const nameInput = drawer.locator('label', { hasText: /^ชื่อวิชา \(ไทย\)$/ }).locator('xpath=..').locator('input');
        await nameInput.fill(testSubjectName);

        // 7. Fill Hours: Theory 30, Practice 60 -> Total 90
        const theoryInput = drawer.locator('label', { hasText: /^ทฤษฎี \(ชม\.\)$/ }).locator('xpath=..').locator('input');
        await theoryInput.fill('30');
        const practiceInput = drawer.locator('label', { hasText: /^ปฏิบัติ \(ชม\.\)/ }).locator('xpath=..').locator('input');
        await practiceInput.fill('60');

        // 8. Submit Subject (Button text is "บันทึกข้อมูล")
        const submitSubjectBtn = drawer.getByRole('button', { name: /บันทึกข้อมูล/i });
        await submitSubjectBtn.click();

        // Verify SweetAlert confirmation
        const swalSuccess = page.locator('.swal2-popup');
        await expect(swalSuccess).toBeVisible({ timeout: 10000 });
        const swalConfirm = page.locator('.swal2-confirm');
        if (await swalConfirm.isVisible()) {
            await swalConfirm.click();
        }

        // Filter or search for the created subject in the AG Grid table
        const searchInput = page.getByPlaceholder('ค้นหารหัสวิชา หรือ ชื่อวิชา...');
        await searchInput.fill(testSubjectName);
        await page.waitForTimeout(600); // debounce wait

        // Verify row appearance with linked department, code, and hours
        const subjectRow = page.locator('.ag-row').filter({ hasText: testSubjectName });
        await expect(subjectRow).toBeVisible({ timeout: 15000 });
        await expect(subjectRow).toContainText(testDeptName);
        await expect(subjectRow).toContainText('30');
    });

    // ─────────────────────────────────────────────────────────────
    // 3. Teachers (Personnel Management)
    // ─────────────────────────────────────────────────────────────
    test('3. Teachers: Add teacher record with Thai title and verify profile in list', async ({ page }) => {
        await page.goto('/teachers');
        await page.waitForLoadState('networkidle');

        // Click "เพิ่มอาจารย์ใหม่"
        const addTeacherBtn = page.getByRole('button', { name: /เพิ่มอาจารย์ใหม่/i });
        await expect(addTeacherBtn).toBeVisible({ timeout: 10000 });
        await addTeacherBtn.click();

        // Target the modal form
        await expect(page.getByText('เพิ่มอาจารย์ใหม่').first()).toBeVisible({ timeout: 5000 });
        const modal = page.locator('form').filter({ hasText: 'เลขบัตรประชาชน' });

        // Fill Citizen ID (13-digit valid Modulo-11)
        const citizenIdInput = modal.locator('#citizen_id');
        await citizenIdInput.fill(testTeacherCitizenId);

        // Select Prefix: นาย
        const prefixCombobox = modal.locator('#prefix_id');
        await prefixCombobox.click();
        await prefixCombobox.fill('นาย');
        const prefixOption = page.getByRole('option', { name: /นาย/i }).first();
        await expect(prefixOption).toBeVisible({ timeout: 5000 });
        await prefixOption.click();

        // Fill Name (TH)
        await modal.locator('#first_name_th').fill(testTeacherFirstName);
        await modal.locator('#last_name_th').fill(testTeacherLastName);

        // Fill Contact details
        await modal.locator('#phone').fill(testTeacherPhone);
        await modal.locator('#email').fill(testTeacherEmail);

        // Select Position: ครู
        const positionCombobox = modal.locator('#position_id');
        await positionCombobox.click();
        await positionCombobox.fill('ครู');
        const positionOption = page.getByRole('option', { name: /ครู/i }).first();
        await expect(positionOption).toBeVisible({ timeout: 5000 });
        await positionOption.click();

        // Submit Teacher form (Button text is "บันทึกข้อมูล")
        const submitTeacherBtn = modal.getByRole('button', { name: /บันทึกข้อมูล/i });
        await submitTeacherBtn.click();

        // Verify SweetAlert confirmation
        const swalPopup = page.locator('.swal2-popup');
        await expect(swalPopup).toBeVisible({ timeout: 10000 });
        const confirmBtn = page.locator('.swal2-confirm');
        if (await confirmBtn.isVisible()) {
            await confirmBtn.click();
        }

        // Verify teacher appears in the list
        const searchInput = page.getByPlaceholder(/Quick Search ค้นหาชื่อ/i);
        await searchInput.fill(testTeacherFirstName);
        await page.waitForTimeout(600);

        const teacherRow = page.locator('.ag-row').filter({ hasText: testTeacherFirstName });
        await expect(teacherRow).toBeVisible({ timeout: 15000 });
        await expect(teacherRow).toContainText('นาย');
    });

    // ─────────────────────────────────────────────────────────────
    // 4. Batches (Course Batches)
    // ─────────────────────────────────────────────────────────────
    test('4. Batches: Create single batch รุ่นที่ 999/${shortId} and verify in list', async ({ page }) => {
        await page.goto('/batches');
        await page.waitForLoadState('networkidle');

        // Click "สร้างรุ่นการเรียนใหม่"
        const createBatchBtn = page.getByRole('button', { name: /สร้างรุ่นการเรียนใหม่/i });
        await expect(createBatchBtn).toBeVisible({ timeout: 10000 });
        await createBatchBtn.click();

        // Target the modal form
        await expect(page.getByText('จัดการรุ่นการเรียน').or(page.getByText('สร้างรุ่นการเรียนใหม่')).first()).toBeVisible({ timeout: 5000 });
        const modal = page.locator('div[role="dialog"]').locator('form');

        // Tab 1: ข้อมูลรุ่น
        await expect(modal.getByText('(กำลังคำนวณ...)')).not.toBeVisible({ timeout: 5000 }).catch(() => {});
        const batchSequenceInput = modal.getByPlaceholder('เช่น 139');
        await expect(batchSequenceInput).toBeVisible({ timeout: 5000 });
        await batchSequenceInput.fill(String(testBatchSequence));

        const yearInput = modal.getByPlaceholder('เช่น 2569');
        if (await yearInput.isVisible()) {
            await yearInput.fill('2569');
        }

        const batchNameInput = modal.locator('#batch_name');
        await batchNameInput.fill(testBatchName);

        // Tab 2: กำหนดการ & ชั่วโมง
        const scheduleTab = page.getByRole('tab', { name: /กำหนดการ & ชั่วโมง/i });
        await scheduleTab.click();

        const totalHoursInput = modal.locator('#total_hours');
        await expect(totalHoursInput).toBeVisible({ timeout: 5000 });
        await totalHoursInput.fill('120');

        // Tab 3: ผู้รับผิดชอบ
        const personnelTab = page.getByRole('tab', { name: /ผู้รับผิดชอบ/i });
        await personnelTab.click();

        // Try to copy from latest batch or select a teacher if available
        const copyFromLatestBtn = modal.getByRole('button', { name: /คัดลอกข้อมูลผู้รับผิดชอบจากรุ่นล่าสุด/i });
        if (await copyFromLatestBtn.isVisible()) {
            await copyFromLatestBtn.click();
            await page.waitForTimeout(500);
        }

        // Submit Batch form (Button text is "บันทึกข้อมูล")
        const submitBatchBtn = modal.getByRole('button', { name: /บันทึกข้อมูล/i });
        await submitBatchBtn.click();

        // Verify SweetAlert confirmation
        const swalSuccess = page.locator('.swal2-icon-success');
        await expect(swalSuccess).toBeVisible({ timeout: 10000 });
        const confirmBtn = page.locator('.swal2-confirm');
        await expect(confirmBtn).toBeVisible({ timeout: 5000 });
        await confirmBtn.click();
        await page.waitForTimeout(500);

        // Search for the newly created batch in BatchesPage
        const searchBatchInput = page.getByPlaceholder('Quick Search ค้นหารุ่นการเรียน (ทุกปี)...');
        await searchBatchInput.fill(String(testBatchSequence));
        await page.waitForTimeout(600);

        // Verify row in AG Grid table
        const batchRow = page.locator('.ag-row').filter({ hasText: String(testBatchSequence) });
        await expect(batchRow).toBeVisible({ timeout: 15000 });
    });
});
