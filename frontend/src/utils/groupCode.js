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

export const ALL_STUDY_DAYS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
export const WEEKDAYS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"];
export const WEEKENDS = ["เสาร์", "อาทิตย์"];

/**
 * แปลง array วันเรียนให้อ่านเข้าใจง่าย เช่น: "จันทร์ - ศุกร์", "เสาร์ - อาทิตย์"
 */
export function formatStudyDaysOnly(studyDays) {
    const days = Array.isArray(studyDays) ? studyDays : [];
    if (days.length === 0) return "";
    if (days.length === 7) return "ทุกวัน (จันทร์ - อาทิตย์)";
    if (days.length === 5 && WEEKDAYS.every((d) => days.includes(d))) return "จันทร์ - ศุกร์";
    if (days.length === 2 && WEEKENDS.every((d) => days.includes(d))) return "เสาร์ - อาทิตย์";
    return days.join(", ");
}

/**
 * รวมวันเรียน, เวลา 24 ชม., และจำนวนชั่วโมงเป็นบรรทัดเดียว ป้องกันข้อความซ้ำซ้อน
 * เช่น: "จันทร์ - ศุกร์ • 09:00 - 12:00 น. (150 ชม.)"
 */
export function formatCompactSchedule(course) {
    if (!course) return "";

    // 1. วันเรียน
    let days = "";
    if (Array.isArray(course.study_days) && course.study_days.length > 0) {
        days = formatStudyDaysOnly(course.study_days);
    } else if (course.schedule_description) {
        const cleaned = course.schedule_description.replace(/เวลา.*$/, "").replace(/^เรียน(วัน)?/, "").replace(/^วัน/, "").trim();
        days = cleaned || "จันทร์ - ศุกร์";
    } else {
        days = "จันทร์ - ศุกร์";
    }

    // 2. เวลาเรียน 24 ชม.
    let time = "";
    if (course.custom_start_time && course.custom_end_time) {
        const format24 = (t) => {
            const p = String(t).split(":");
            return `${p[0].padStart(2, "0")}:${(p[1] || "00").padStart(2, "0")}`;
        };
        time = `${format24(course.custom_start_time)} - ${format24(course.custom_end_time)} น.`;
    } else if (course.time_range) {
        time = course.time_range.includes("น.") ? course.time_range : `${course.time_range} น.`;
    }

    // 3. ชั่วโมง
    const hours = course.total_hours ? `(${course.total_hours} ชม.)` : "";

    const parts = [days, time, hours].filter(Boolean);
    return parts.join(" • ");
}

/**
 * จัดรูปแบบข้อความ "รูปแบบวันเรียน" จาก studyDays, startTime, endTime หรือ timeRange
 * เช่น: "เรียนวันจันทร์ - ศุกร์ เวลา 09:00 - 11:00 น."
 */
export function buildScheduleDescription({ studyDays = [], startTime = "", endTime = "", timeRange = "" } = {}) {
    let dayText = "";

    const days = Array.isArray(studyDays) ? studyDays : [];
    if (days.length === 7) {
        dayText = "เรียนทุกวัน";
    } else if (
        days.length === 5 &&
        WEEKDAYS.every((d) => days.includes(d))
    ) {
        dayText = "เรียนวันจันทร์ - ศุกร์";
    } else if (
        days.length === 2 &&
        WEEKENDS.every((d) => days.includes(d))
    ) {
        dayText = "เรียนวันเสาร์ - อาทิตย์";
    } else if (days.length > 0) {
        dayText = `เรียนวัน${days.join(", ")}`;
    } else {
        dayText = "เรียนวันจันทร์ - ศุกร์";
    }

    let timeText = "";
    if (startTime && endTime) {
        timeText = `เวลา ${startTime} - ${endTime} น.`;
    } else if (timeRange) {
        timeText = timeRange.includes("น.") ? `เวลา ${timeRange}` : `เวลา ${timeRange} น.`;
    }

    if (!timeText) return dayText;
    return `${dayText} ${timeText}`.trim();
}

const TIME_CODE_DAY_LABEL = {
    ช: "เช้า",
    บ: "บ่าย",
    ค: "ค่ำ",
    พ: "เช้า-บ่าย",
};

/**
 * ชื่อกลุ่มเรียนอัตโนมัติ (สูตรมาตรฐานอาชีวศึกษา):
 * "[ชื่อวิชา] [ประเภท] (รอบ [รหัสย่อรอบ]/[กลุ่มที่] [ชื่อรอบเต็ม])"
 * เช่น: "อาหารไทย [ปกติ] (รอบ ช/1 เช้า)", "ศิลปะการชงกาแฟสด [พิเศษ] (รอบ พ/1 เช้า-บ่าย)"
 */
export function buildGroupName({ subjectName, groupType, timeCode, groupNo, }) {
    const parts = [];
    if (subjectName) parts.push(subjectName.trim());
    if (groupType && GROUP_TYPE_LABELS[groupType]) parts.push(`[${GROUP_TYPE_LABELS[groupType]}]`);

    if (timeCode || groupNo) {
        const roundText = `รอบ ${timeCode || "?"}/${groupNo || "?"}`;
        parts.push(`(${roundText})`);
    }

    return parts.join(" ").trim();
}

/**
 * คำนวณเลข ศธ. 9 หลักแบบรันลำดับต่อเนื่องในหน่วยความจำ (In-Memory Consecutive Offset)
 * เพื่อป้องกันการเรียก RPC ซ้ำซ้อนก่อนที่ข้อมูลแถวก่อนหน้าจะถูกบันทึกจริงลงฐานข้อมูล
 * เช่น แถวที่ 1 ได้ '691104001' -> แถวที่ 2 ได้ '691104002'
 */
export function calculateNextConsecutiveMoeCode(existingSubjects = [], baseRpcCode = "", fallbackPrefix = "") {
    const validCodes = (existingSubjects || [])
        .map((s) => s.moe_code?.trim())
        .filter((code) => code && code.length >= 9);

    if (validCodes.length === 0 && !baseRpcCode && !fallbackPrefix) {
        return "";
    }

    const sampleCode = validCodes[0] || baseRpcCode || `${fallbackPrefix}000`;
    const prefix = sampleCode.slice(0, -3); // e.g. "691104"

    const sequences = validCodes
        .filter((code) => code.startsWith(prefix))
        .map((code) => parseInt(code.slice(-3), 10))
        .filter((num) => !isNaN(num));

    if (sequences.length === 0) {
        if (baseRpcCode && baseRpcCode.startsWith(prefix)) {
            return baseRpcCode;
        }
        return `${prefix}001`;
    }

    const maxSeq = Math.max(...sequences);
    let nextSeq = maxSeq + 1;

    if (baseRpcCode && baseRpcCode.startsWith(prefix)) {
        const baseSeq = parseInt(baseRpcCode.slice(-3), 10);
        if (!isNaN(baseSeq) && baseSeq > nextSeq) {
            nextSeq = baseSeq;
        }
    }

    if (nextSeq > 999) return "";
    return `${prefix}${String(nextSeq).padStart(3, "0")}`;
}