import dayjs from "./dateUtils.js";
import { GROUP_TYPE_LABELS } from "./groupCode.js";

/**
 * reportFormatters.js
 * ─────────────────────────────────────────────────────────────────────────
 * Utilities for formatting and course-level flattening for the
 * "Offered Courses Report" (แบบรายงานรายวิชาที่เปิดสอน - ศธ. มาตรฐานอาชีวศึกษา)
 */

/**
 * สกัดเฉพาะชื่อจริงของครูผู้สอน (ตัดคำนำหน้า เช่น นาย, นาง, น.ส., ว่าที่ ร.ต. และตัดนามสกุลออก)
 * ตัวอย่าง:
 * - "ว่าที่ ร.ต. วัชรวิชญ์ สุวรรณ" -> "วัชรวิชญ์"
 * - "นาง วนิดา โคตรคำ" -> "วนิดา"
 * - "น.ส. เอกภพ" -> "เอกภพ"
 * - "อ.วัชรวิชญ์" -> "วัชรวิชญ์"
 */
export function extractTeacherFirstName(teacherInput) {
    if (!teacherInput) return "-";

    let raw = "";
    if (typeof teacherInput === "object") {
        raw = teacherInput.first_name_th ||
            teacherInput.teacher_first_name ||
            teacherInput.name ||
            teacherInput.teacher_name ||
            "";
    } else {
        raw = String(teacherInput);
    }

    raw = raw.trim();
    if (!raw) return "-";

    // Strip common Thai titles/prefixes (with optional trailing/inner spaces)
    const prefixRegex = /^(ว่าที่\s*ร\.ต\.\s*(หญิง)?|ว่าที่ร้อยตรี(\s*หญิง)?|นางสาว|นาย|นาง|น\.ส\.|ดร\.|ผศ\.\s*ดร\.|รศ\.\s*ดร\.|ศ\.\s*ดร\.|ผศ\.|รศ\.|ศ\.|อาจารย์|อ\.|ครู)\s*/i;
    const cleaned = raw.replace(prefixRegex, "").trim();

    // Take only the first word (first name), discarding last name
    const parts = cleaned.split(/\s+/);
    return parts[0] || "-";
}

/**
 * แปลงวันเรียนให้อยู่ในรูปตัวย่อมาตรฐานอาชีวะ เช่น:
 * - จันทร์-ศุกร์ -> "จ-ศ"
 * - เสาร์-อาทิตย์ -> "ส-อา"
 * - เสาร์ -> "ส"
 * - อาทิตย์ -> "อา"
 * - ทุกวัน -> "ทุกวัน"
 */
export function formatStudyDaysShort(studyDays, scheduleDescription = "") {
    const days = Array.isArray(studyDays)
        ? studyDays
        : typeof studyDays === "string" && studyDays.trim()
            ? studyDays.split(",").map((s) => s.trim()).filter(Boolean)
            : [];

    const WEEKDAYS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"];
    const WEEKENDS = ["เสาร์", "อาทิตย์"];

    if (days.length === 5 && WEEKDAYS.every((d) => days.includes(d))) {
        return "จ-ศ";
    }
    if (days.length === 2 && WEEKENDS.every((d) => days.includes(d))) {
        return "ส-อา";
    }
    if (days.length === 7) {
        return "ทุกวัน";
    }
    if (days.length > 0) {
        const dayMap = {
            "จันทร์": "จ",
            "อังคาร": "อ",
            "พุธ": "พ",
            "พฤหัสบดี": "พฤ",
            "ศุกร์": "ศ",
            "เสาร์": "ส",
            "อาทิตย์": "อา",
        };
        const mapped = days.map((d) => dayMap[d] || d);
        return mapped.join(",");
    }

    // Fallback inspect text description
    const desc = scheduleDescription || "";
    if (desc.includes("จันทร์ - ศุกร์") || desc.includes("จ-ศ") || desc.includes("จันทร์-ศุกร์")) {
        return "จ-ศ";
    }
    if (desc.includes("เสาร์ - อาทิตย์") || desc.includes("ส-อา") || desc.includes("เสาร์-อาทิตย์")) {
        return "ส-อา";
    }

    return "จ-ศ";
}

/**
 * คำนวณรหัสรอบและกลุ่มเรียน เช่น "ค่ำ/1", "เช้า/1", "บ่าย/1", "ส-อา/1"
 */
export function getShiftLabel(group) {
    if (!group) return "ปกติ/1";

    const groupNo = group.group_no ?? 1;
    const timeName = group.time_slot_name || group.time_slots?.time_name || "";
    const timeCode = group.time_code || group.time_slots?.time_code || "";
    const groupCode = group.group_code || "";
    const schedule = group.schedule_description || "";
    const timeRange = group.time_slot_range || group.time_slots?.time_range || "";

    let shift = "";
    if (
        timeName.includes("ค่ำ") ||
        timeCode === "ค" ||
        groupCode.includes("ค") ||
        schedule.includes("ค่ำ") ||
        schedule.includes("17:") ||
        schedule.includes("18:") ||
        timeRange.includes("17:") ||
        timeRange.includes("18:")
    ) {
        shift = "ค่ำ";
    } else if (
        timeName.includes("เช้า-บ่าย") ||
        timeCode === "พ" ||
        groupCode.includes("พ") ||
        timeName.includes("เต็มวัน") ||
        timeName.includes("ทั้งวัน")
    ) {
        shift = "เช้า-บ่าย";
    } else if (
        timeName.includes("เช้า") ||
        timeCode === "ช" ||
        groupCode.includes("ช") ||
        schedule.includes("เช้า") ||
        schedule.includes("08:") ||
        schedule.includes("09:") ||
        timeRange.includes("08:") ||
        timeRange.includes("09:")
    ) {
        shift = "เช้า";
    } else if (
        timeName.includes("บ่าย") ||
        timeCode === "บ" ||
        groupCode.includes("บ") ||
        schedule.includes("บ่าย") ||
        schedule.includes("13:") ||
        timeRange.includes("13:")
    ) {
        shift = "บ่าย";
    } else if (
        timeName.includes("ส-อา") ||
        timeName.includes("เสาร์") ||
        timeName.includes("อาทิตย์") ||
        schedule.includes("ส-อา") ||
        schedule.includes("เสาร์")
    ) {
        shift = "ส-อา";
    } else {
        shift = timeName ? timeName.replace(/^รอบ/, "").trim() : (timeCode || "ปกติ");
    }

    return `${shift}/${groupNo}`;
}

/**
 * จัดรูปแบบวันที่ พ.ศ. ในรูปแบบ D/M/YYYY (ไม่ใส่ 0 นำหน้าตัวเลขวันและเดือน)
 * เช่น "2026-04-27" -> "27/4/2569", "2026-06-04" -> "4/6/2569"
 */
export function formatBuddhistDateDMY(dateStr) {
    if (!dateStr) return "-";
    const d = dayjs(dateStr);
    if (!d.isValid()) return "-";
    return d.format("D/M/BBBB");
}

/**
 * คืนค่าป้ายกำกับประเภทกลุ่มเรียนสำหรับ string วิชา
 * ถ้าเป็น normal / ปกติ ให้คืนค่าว่าง "" เพื่อให้ชื่อวิชากระชับ
 */
export function getGroupTypeDisplay(groupType) {
    if (!groupType || groupType === "normal" || groupType === "ปกติ") {
        return "";
    }
    return GROUP_TYPE_LABELS[groupType] || groupType;
}

/**
 * สร้างชื่อรายวิชาตามสูตรมาตรฐานของงานทะเบียนอาชีวศึกษา:
 * const courseString = `${subject_name} ${group_type || ''} ${study_days_short}(${shift_label}) อ.${teacher_firstname} ${total_hours} ชม.`.replace(/\s+/g, ' ').trim();
 * ตัวอย่างผลลัพธ์: "การร้องและเล่นให้เป็นเพลง พิเศษ จ-ศ(ค่ำ/1) อ.วัชรวิชญ์ 75 ชม."
 */
export function buildOfferedCourseString({
    subject_name = "",
    group_type = "",
    study_days_short = "จ-ศ",
    shift_label = "1",
    teacher_firstname = "-",
    total_hours = 0,
}) {
    const typeLabel = getGroupTypeDisplay(group_type);
    const teacherStr = teacher_firstname && teacher_firstname !== "-" ? `อ.${teacher_firstname}` : "";

    const rawString = `${subject_name} ${typeLabel ? typeLabel + " " : ""}${study_days_short}(${shift_label}) ${teacherStr ? teacherStr + " " : ""}${total_hours || 0} ชม.`;
    return rawString.replace(/\s+/g, " ").trim();
}

/**
 * ตรวจสอบว่ากลุ่มเรียนตรงกับประเภทกลุ่มที่เลือกไว้ในตัวกรองหรือไม่
 * @param {object} group
 * @param {string[]} selectedTypes - e.g. ['special', 'project'] หรือมี 'all'
 */
export function matchesGroupTypeFilter(group, selectedTypes = ["all"]) {
    if (!selectedTypes || selectedTypes.length === 0 || selectedTypes.includes("all")) {
        return true;
    }

    const rawType = (group?.group_type || "normal").toLowerCase();

    return selectedTypes.some((selected) => {
        const s = String(selected).toLowerCase();
        if (s === "normal" || s === "ปกติ" || s === "regular") {
            return !group?.group_type || rawType === "normal" || rawType === "ปกติ" || rawType === "regular";
        }
        if (s === "special" || s === "พิเศษ") {
            return rawType === "special" || rawType === "พิเศษ" || rawType === "แบบพิเศษ";
        }
        if (s === "project" || s === "โครงการ") {
            return rawType === "project" || rawType === "โครงการ";
        }
        if (s === "extra" || s === "เพิ่มเติม") {
            return rawType === "extra" || rawType === "เพิ่มเติม";
        }
        if (s === "vocational" || s === "ห้องเรียนอาชีพ") {
            return rawType === "vocational" || rawType === "ห้องเรียนอาชีพ";
        }
        return rawType === s;
    });
}

/**
 * Course-Level Flattening:
 * แตกกลุ่มเรียน (study_groups) เป็นรายวิชาเดี่ยว (1 แถว = 1 รายวิชา)
 * - หากมีหลายวิชาย่อย (ชุดวิชา) ให้แตกแยกแถวละวิชา
 * - สืบทอดวันเรียน รอบเรียน เวลา และครูผู้สอนจากกลุ่มเรียนหากไม่ได้ระบุที่ระดับวิชา
 * - รันลำดับที่ (ที่) ต่อเนื่อง 1, 2, 3...
 */
export function flattenStudyGroupsToSubjects(groups = [], selectedTypes = ["all"]) {
    const filteredGroups = (groups || []).filter((g) => matchesGroupTypeFilter(g, selectedTypes));
    const flattened = [];

    filteredGroups.forEach((group) => {
        const shiftLabel = getShiftLabel(group);
        const studyDaysShort = formatStudyDaysShort(group.study_days, group.schedule_description);
        const teacherFirstname = extractTeacherFirstName(group.teacher_first_name || group.teacher_name || group.teachers);

        const subSubjects = Array.isArray(group.subjects_in_group) && group.subjects_in_group.length > 0
            ? group.subjects_in_group
            : (Array.isArray(group.study_group_subjects) && group.study_group_subjects.length > 0
                ? group.study_group_subjects.map((sgs) => ({
                    id: sgs.id,
                    subject_id: sgs.subject_id,
                    moe_code: sgs.moe_code,
                    sequence_order: sgs.sequence_order,
                    subject_code: sgs.subjects?.subject_code || "",
                    name_th: sgs.subjects?.name_th || "",
                    total_hours: sgs.subjects?.total_hours || 0,
                }))
                : []);

        if (subSubjects.length > 0) {
            // Sort by sequence_order if present
            const sortedSub = [...subSubjects].sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));

            sortedSub.forEach((sub) => {
                const subjectName = sub.name_th || sub.subject_name || sub.subjects?.name_th || group.group_name || "";
                const moeCode = sub.moe_code || group.room_code || sub.subject_code || group.group_code || "-";
                const totalHours = Number(sub.total_hours) || Number(group.total_hours) || 0;
                const startDate = sub.start_date || group.start_date;
                const endDate = sub.end_date || group.end_date;
                const subTeacherName = extractTeacherFirstName(sub.teacher || sub.teacher_name || teacherFirstname);

                const courseString = buildOfferedCourseString({
                    subject_name: subjectName,
                    group_type: group.group_type,
                    study_days_short: studyDaysShort,
                    shift_label: shiftLabel,
                    teacher_firstname: subTeacherName,
                    total_hours: totalHours,
                });

                flattened.push({
                    groupId: group.id,
                    groupCode: group.group_code,
                    groupName: group.group_name,
                    groupType: group.group_type,
                    subjectId: sub.subject_id || sub.id,
                    subjectCode: sub.subject_code || "",
                    subjectName: subjectName,
                    moeCode: moeCode,
                    courseString: courseString,
                    startDate: startDate,
                    endDate: endDate,
                    formattedStartDate: formatBuddhistDateDMY(startDate),
                    formattedEndDate: formatBuddhistDateDMY(endDate),
                    teacherFirstName: subTeacherName,
                    totalHours: totalHours,
                    shiftLabel: shiftLabel,
                    studyDaysShort: studyDaysShort,
                });
            });
        } else {
            // Single subject group without sub-subjects
            const subjectName = group.group_name || "-";
            const moeCode = group.room_code || group.group_code || "-";
            const totalHours = Number(group.total_hours) || 0;

            const courseString = buildOfferedCourseString({
                subject_name: subjectName,
                group_type: group.group_type,
                study_days_short: studyDaysShort,
                shift_label: shiftLabel,
                teacher_firstname: teacherFirstname,
                total_hours: totalHours,
            });

            flattened.push({
                groupId: group.id,
                groupCode: group.group_code,
                groupName: group.group_name,
                groupType: group.group_type,
                subjectId: null,
                subjectCode: group.group_code || "",
                subjectName: subjectName,
                moeCode: moeCode,
                courseString: courseString,
                startDate: group.start_date,
                endDate: group.end_date,
                formattedStartDate: formatBuddhistDateDMY(group.start_date),
                formattedEndDate: formatBuddhistDateDMY(group.end_date),
                teacherFirstName: teacherFirstname,
                totalHours: totalHours,
                shiftLabel: shiftLabel,
                studyDaysShort: studyDaysShort,
            });
        }
    });

    // Assign 1-indexed sequential row numbers after flattening
    return flattened.map((row, index) => ({
        ...row,
        rowNo: index + 1,
    }));
}
