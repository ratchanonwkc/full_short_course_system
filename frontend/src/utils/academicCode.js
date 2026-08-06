/**
 * academicCode.js
 * ─────────────────────────────────────────────────────────────────────────
 * Utility สำหรับคำนวณรหัสแบบ Real-time ของโครงสร้างวิชาการ
 *
 * รหัสสาขางาน (academic_minors):
 *   สูตร:  [ระดับชั้น 1 หลัก][ประเภทวิชา 1 หลัก][แผนกวิชา 2 หลัก] - [รหัสสาขางาน 1 หลัก]
 *   ตัวอย่าง: level=1, subjectType=1, department="04", subDept="1"
 *            -> "1104-1"
 *
 * หมายเหตุ: ต่างจากรหัสวิชา (subject_code) ตรงที่ระหว่างส่วน prefix (4 หลัก) กับ
 * ส่วนรหัสสาขางาน (1 หลัก) จะคั่นด้วย "-" เสมอ ไม่ใช่การต่อกันตรง ๆ
 */
export function buildMinorCode({ levelId, subjectTypeId, departmentId, subDepartmentId }) {
    if (!levelId || !subjectTypeId || !departmentId || !subDepartmentId) return "";

    const deptPart = String(departmentId).padStart(2, "0").slice(-2);
    const prefix = `${levelId}${subjectTypeId}${deptPart}`;

    return `${prefix}-${subDepartmentId}`;
}

/** ใช้แสดง Preview ที่ยัง "กรอกไม่ครบ" โดยเติม "?" แทนส่วนที่ยังไม่รู้ */
export function buildMinorCodePreview({ levelId, subjectTypeId, departmentId, subDepartmentId }) {
    const levelPart = levelId ? String(levelId) : "?";
    const typePart = subjectTypeId ? String(subjectTypeId) : "?";
    const deptPart = departmentId ? String(departmentId).padStart(2, "0").slice(-2) : "??";
    const subPart = subDepartmentId ? String(subDepartmentId) : "?";

    return `${levelPart}${typePart}${deptPart}-${subPart}`;
}