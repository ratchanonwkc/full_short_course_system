/**
 * groupCode.js
 * ─────────────────────────────────────────────────────────────────────────
 * Utility คำนวณรหัส/ชื่อต่างๆ ของกลุ่มเรียนแบบ Real-time สำหรับปุ่ม "⚡ Auto Fill"
 *
 * 1) group_code (รหัสกลุ่มเรียน):
 *      {รหัสวิชา}-{time_code}{กลุ่มที่}
 *      รองรับทั้งวิชา 4 หลัก และหลักสูตรใหม่ 5 หลัก (ความยาวรหัสวิชาไม่ตายตัว)
 *      เช่น "1101-6320" + time_code="พ" + group_no=1 -> "1101-6320พ1"
 *           "10105-1306" + time_code="พ" + group_no=1 -> "10105-1306พ1"
 *
 * 2) room_code (รหัสห้องเรียน):
 *      {รหัสแผนก}{เลขห้อง 4 หลัก}
 *      เช่น department_id="1101" + running="0001" -> "11010001"
 *           department_id="10105" + running="0001" -> "101050001"
 *
 * 3) moe_code (เลข ศธ. รายวิชา) — ต่อ "รายวิชาย่อยแต่ละแถว" ใน study_group_subjects:
 *      {ปี พ.ศ. 2 หลัก}{รหัสแผนก}{ลำดับ 3 หลัก}
 *      เช่น year="69" + department_id="1101" + seq="001" -> "691101001"
 *
 * 4) group_name (ชื่อกลุ่มเรียน) — Gen ให้ ผู้ใช้แก้ไขต่อได้:
 *      "{ชื่อวิชา} {ประเภท} {รูปแบบวัน}({รอบ}/{กลุ่มที่}) {ชื่อผู้สอน}"
 */

export const GROUP_TYPE_LABELS = {
    normal: "ปกติ",
    special: "พิเศษ",
    project: "โครงการ",
    vocational: "ห้องเรียนอาชีพ",
    extra: "เพิ่มเติม",
};

/** รหัสวิชา (อาจมี "-" คั่นอยู่แล้ว เช่น 1101-6320) -> ตัด "-" ออกเพื่อต่อกับ time_code/group_no */
export function buildGroupCode({ subjectCode, timeCode, groupNo }) {
    if (!subjectCode || !timeCode || !groupNo) return "";
    return `${subjectCode}${timeCode}${groupNo}`;
}

/** Preview แบบเติม "?" ให้ส่วนที่ยังไม่ครบ (ใช้แสดงระหว่างกรอกฟอร์ม) */
export function buildGroupCodePreview({ subjectCode, timeCode, groupNo }) {
    const codePart = subjectCode || "????";
    const timePart = timeCode || "?";
    const groupPart = groupNo || "?";
    return `${codePart}${timePart}${groupPart}`;
}

/** รหัสห้องเรียน: {รหัสแผนก}{เลขห้อง 4 หลัก} */
export function buildRoomCode({ departmentId, roomSequence }) {
    if (!departmentId || !roomSequence) return "";
    return `${departmentId}${String(roomSequence).padStart(4, "0")}`;
}

/** เลข ศธ.: {ปี พ.ศ. 2 หลัก}{รหัสแผนก}{ลำดับ 3 หลัก} */
export function buildMoeCode({ beYear2Digit, departmentId, moeSequence }) {
    if (!beYear2Digit || !departmentId || !moeSequence) return "";
    return `${beYear2Digit}${departmentId}${String(moeSequence).padStart(3, "0")}`;
}

/** ปี พ.ศ. ปัจจุบัน 2 หลักท้าย เช่น 2569 -> "69" */
export function currentBeYear2Digit() {
    const beYear = new Date().getFullYear() + 543;
    return String(beYear).slice(-2);
}

/** รูปแบบวันจาก time_code -> ข้อความอ่านง่ายสำหรับใส่ใน group_name */
const TIME_CODE_DAY_LABEL = {
    ช: "เช้า",
    บ: "บ่าย",
    ค: "ค่ำ",
    พ: "เช้า-บ่าย",
};

/**
 * ชื่อกลุ่มเรียนอัตโนมัติ:
 * "{ชื่อวิชา} {ประเภท} {รอบ}({time_code}/{group_no}) {ชื่อผู้สอน}"
 * ทุกส่วนเป็น optional เพื่อให้ preview ได้แม้กรอกข้อมูลไม่ครบ (ส่วนที่ขาดจะถูกข้าม ไม่ใส่ "undefined")
 */
export function buildGroupName({ subjectName, groupType, timeCode, groupNo, teacherName }) {
    const parts = [];
    if (subjectName) parts.push(subjectName);
    if (groupType && GROUP_TYPE_LABELS[groupType]) parts.push(GROUP_TYPE_LABELS[groupType]);

    if (timeCode || groupNo) {
        const dayLabel = TIME_CODE_DAY_LABEL[timeCode] || "";
        const slot = `${timeCode || "?"}/${groupNo || "?"}`;
        parts.push(dayLabel ? `${dayLabel}(${slot})` : `(${slot})`);
    }
    if (teacherName) parts.push(teacherName);

    return parts.join(" ").trim();
}