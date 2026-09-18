/**
 * tests/helpers/mock-factory.js
 * -------------------------------------------------------------
 * Central test data factory for Short Course ERP test automation.
 * Provides unique session ID, Thai Citizen ID (Modulo-11),
 * phone, email, and formatted naming wrappers for test entities.
 */

export const TEST_SESSION_ID = Date.now();

/**
 * Prefix an entity name with the current test session tag.
 * Allows safe autonomous identification and purging during teardown.
 * @param {string} name - Entity name
 * @returns {string} - Tagged name, e.g. "[TEST-1726540000000] แผนกทดสอบ"
 */
export function wrapName(name) {
    return `[TEST-${TEST_SESSION_ID}] ${name}`;
}

/**
 * Generate a valid 13-digit Thai Citizen ID using the Modulo-11 checksum algorithm.
 * Checksum formula:
 *   Sum = sum(d_i * (13 - i)) for i in 0..11
 *   Checksum = (11 - (Sum % 11)) % 10
 * @returns {string} - Valid 13-digit Thai National ID
 */
export function generateThaiCitizenId() {
    // Digit 1: 1-8 (valid first digits for Thai IDs)
    const digits = [Math.floor(Math.random() * 8) + 1];

    // Digits 2-12: Random numbers 0-9
    for (let i = 1; i < 12; i++) {
        digits.push(Math.floor(Math.random() * 10));
    }

    // Calculate Modulo-11 checksum
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += digits[i] * (13 - i);
    }
    const checksum = (11 - (sum % 11)) % 10;
    digits.push(checksum);

    return digits.join('');
}

/**
 * Generate a realistic Thai mobile phone number.
 * Pattern: 08xxxxxxxx, 09xxxxxxxx, or 06xxxxxxxx (10 digits)
 * @returns {string} - 10-digit mobile number string
 */
export function generateThaiPhone() {
    const prefixes = ['08', '09', '06'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const rest = Math.floor(10000000 + Math.random() * 90000000).toString();
    return `${prefix}${rest}`;
}

/**
 * Generate a unique test email address scoped to the current session.
 * @param {string} suffix - Optional label suffix
 * @returns {string} - Valid email address
 */
export function generateThaiEmail(suffix = 'user') {
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `test_${TEST_SESSION_ID}_${suffix}_${rand}@example.com`;
}

/**
 * Prepares a test major (department) mock payload.
 */
export function createMockDepartmentPayload() {
    return {
        name_th: wrapName('แผนกทดสอบ'),
        name_en: `Department ${TEST_SESSION_ID}`,
        short_name_th: '[TEST]',
        department_id: String(Math.floor(80 + Math.random() * 19)).padStart(2, '0'), // 2-digit number e.g. 80-99
    };
}

/**
 * Prepares a test minor (field of study) mock payload.
 */
export function createMockMinorPayload(majorId) {
    return {
        major_id: majorId,
        sub_department_id: '1',
        name_th: wrapName('สาขางานทดสอบ'),
        name_en: `Minor ${TEST_SESSION_ID}`,
    };
}

/**
 * Prepares a test subject mock payload.
 */
export function createMockSubjectPayload() {
    return {
        name_th: wrapName('วิชาทดสอบวิชาชีพ'),
        name_en: `Course ${TEST_SESSION_ID}`,
        theory_hours: '30',
        practice_hours: '60',
        total_hours: '90',
        duration_group: '61-90 ชั่วโมง',
    };
}

/**
 * Prepares a test teacher mock payload.
 */
export function createMockTeacherPayload() {
    return {
        citizen_id: generateThaiCitizenId(),
        prefix: 'นาย',
        first_name_th: wrapName('อาจารย์ทดสอบ'),
        last_name_th: 'ระบบพัฒนา',
        phone: generateThaiPhone(),
        email: generateThaiEmail('teacher'),
    };
}

/**
 * Prepares a test batch mock payload.
 */
export function createMockBatchPayload() {
    const shortSuffix = TEST_SESSION_ID.toString().slice(-2);
    return {
        batch_sequence: 999,
        iteration: 1,
        academic_year: '2569',
        term: 1,
        batch_name: `รุ่นที่ 999/${shortSuffix}`,
        total_hours: 120,
    };
}
