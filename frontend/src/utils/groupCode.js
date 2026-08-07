export const GROUP_TYPE_LABELS = {
    normal: "ปกติ",
    special: "พิเศษ",
    project: "โครงการ",
    vocational: "ห้องเรียนอาชีพ",
    extra: "เพิ่มเติม",
};

export const GROUP_STATUS_META = {
    draft: { label: "ร่าง", emoji: "📝", className: "bg-slate-100 text-slate-600" },
    open: { label: "เปิดสอน", emoji: "🟢", className: "bg-emerald-100 text-emerald-700" },
    full: { label: "เต็ม", emoji: "🔴", className: "bg-red-100 text-red-700" },
    cancelled: { label: "ยกเลิก", emoji: "⚪", className: "bg-slate-200 text-slate-500" },
};

export function buildGroupCode({ subjectCode, timeCode, groupNo }) {
    if (!subjectCode || !timeCode || !groupNo) return "";
    return `${subjectCode}${timeCode}${groupNo}`;
}

export function buildGroupCodePreview({ subjectCode, timeCode, groupNo }) {
    const codePart = subjectCode || "????";
    const timePart = timeCode || "?";
    const groupPart = groupNo || "?";
    return `${codePart}${timePart}${groupPart}`;
}

/**
 * รหัสห้องเรียน: {full_major_code}{เลขห้อง 4 หลัก}
 * เปลี่ยนจากเดิมที่ใช้ department_id (2 หลัก) -> full_major_code (เต็ม เช่น 1101)
 * เพื่อไม่ให้ห้องชนกันข้ามระดับชั้น/ประเภทวิชาที่บังเอิญมี department_id เดียวกัน
 */
export function buildRoomCode({ fullMajorCode, roomSequence }) {
    if (!fullMajorCode || !roomSequence) return "";
    return `${fullMajorCode}${String(roomSequence).padStart(4, "0")}`;
}

export function buildMoeCode({ beYear2Digit, fullMajorCode, moeSequence }) {
    if (!beYear2Digit || !fullMajorCode || !moeSequence) return "";
    return `${beYear2Digit}${fullMajorCode}${String(moeSequence).padStart(3, "0")}`;
}

export function currentBeYear2Digit() {
    const beYear = new Date().getFullYear() + 543;
    return String(beYear).slice(-2);
}

/**
 * ข้อความ Default ของ "รูปแบบวันเรียน" จาก time_slot ที่เลือก
 * เช่น time_range = "09:00 - 12:00" -> "เรียนวันจันทร์ - ศุกร์ เวลา 09:00 - 12:00 น."
 */
export function buildScheduleDescription({ timeRange }) {
    if (!timeRange) return "";
    return `เรียนวันจันทร์ - ศุกร์ เวลา ${timeRange} น.`;
}

const TIME_CODE_DAY_LABEL = {
    ช: "เช้า",
    บ: "บ่าย",
    ค: "ค่ำ",
    พ: "เช้า-บ่าย",
};

/**
 * ชื่อกลุ่มเรียนอัตโนมัติ (สูตรใหม่):
 * "{ชื่อวิชา} [{ประเภทกลุ่ม}] - {schedule_description} (รอบ {time_code}/{group_no})"
 */
export function buildGroupName({ subjectName, groupType, scheduleDescription, timeCode, groupNo }) {
    const parts = [];
    if (subjectName) parts.push(subjectName);
    if (groupType && GROUP_TYPE_LABELS[groupType]) parts.push(`[${GROUP_TYPE_LABELS[groupType]}]`);
    if (scheduleDescription) parts.push(`- ${scheduleDescription}`);

    const dayLabel = TIME_CODE_DAY_LABEL[timeCode] || "";
    if (timeCode || groupNo) {
        parts.push(`(รอบ ${timeCode || "?"}/${groupNo || "?"}${dayLabel ? ` ${dayLabel}` : ""})`);
    }

    return parts.join(" ").trim();
}