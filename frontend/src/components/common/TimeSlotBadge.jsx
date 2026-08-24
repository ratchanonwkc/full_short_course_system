import { Sunrise, Sun, Moon, Package } from "lucide-react";

/**
 * TimeSlotBadge / TimeBadge
 * -------------------------------------------------------------------------
 * Displays only the time category name and icon:
 *   - 🌅 รอบเช้า (Morning)  -> Amber badge
 *   - ☀️ รอบบ่าย (Afternoon) -> Orange badge
 *   - 🌙 รอบค่ำ (Evening)   -> Indigo badge
 *   - 📦 เต็มวัน (Full Day)  -> Blue badge
 */

export const PERIOD_META = {
    morning: {
        key: "morning",
        code: "ช",
        label: "รอบเช้า",
        Icon: Sunrise,
        className: "bg-amber-100 text-amber-800 border-amber-300",
    },
    afternoon: {
        key: "afternoon",
        code: "บ",
        label: "รอบบ่าย",
        Icon: Sun,
        className: "bg-orange-100 text-orange-800 border-orange-300",
    },
    evening: {
        key: "evening",
        code: "ค",
        label: "รอบค่ำ",
        Icon: Moon,
        className: "bg-blue-100 text-blue-800 border-blue-300",
    },
    fullday: {
        key: "fullday",
        code: "พ",
        label: "เต็มวัน",
        Icon: Package,
        className: "bg-blue-100 text-blue-800 border-blue-300",
    },
};

const TIME_CODE_MAP = {
    ช: "morning",
    บ: "afternoon",
    ค: "evening",
    พ: "fullday",
};

/**
 * Parse time string/number to decimal hours (e.g. "09:30" -> 9.5, "16.00" -> 16.0)
 */
export function parseHour(val) {
    if (val === null || val === undefined || val === "") return null;
    if (typeof val === "number") return val;
    const str = String(val).trim();
    const m = /^(\d{1,2})[:.](\d{2})/.exec(str);
    if (m) {
        return Number(m[1]) + Number(m[2]) / 60;
    }
    const simpleHour = /^(\d{1,2})$/.exec(str);
    if (simpleHour) {
        return Number(simpleHour[1]);
    }
    return null;
}

/**
 * Extract time range string or hours from any input text (handles :, ., and sentences)
 */
export function extractTimes(inputStr) {
    if (!inputStr || typeof inputStr !== "string") {
        return { startHour: null, endHour: null, rawRange: "" };
    }

    // Pattern matching "09:00 - 12:00", "09.00 - 12.00", "09:00:00 - 12:00:00", "09.00-12.00"
    const rangeMatch = /(\d{1,2}[:.]\d{2}(?::\d{2})?)\s*[-–—to至]\s*(\d{1,2}[:.]\d{2}(?::\d{2})?)/.exec(inputStr);
    if (rangeMatch) {
        const startHour = parseHour(rangeMatch[1]);
        const endHour = parseHour(rangeMatch[2]);
        const cleanStart = rangeMatch[1].replace(/:00$/, "");
        const cleanEnd = rangeMatch[2].replace(/:00$/, "");
        return { startHour, endHour, rawRange: `${cleanStart} - ${cleanEnd}` };
    }

    // Single time like "09:00:00" or "09:00" or "09.00"
    const singleMatch = /(\d{1,2}[:.]\d{2}(?::\d{2})?)/.exec(inputStr);
    if (singleMatch) {
        const startHour = parseHour(singleMatch[1]);
        const cleanStart = singleMatch[1].replace(/:00$/, "");
        return { startHour, endHour: null, rawRange: cleanStart };
    }

    return { startHour: null, endHour: null, rawRange: "" };
}

/**
 * Extract Thai period code (ช/บ/ค/พ) from group_code or other strings
 */
export function extractTimeCode(code) {
    if (!code || typeof code !== "string") return "";
    const match = /[ชบคพ]/.exec(code);
    return match ? match[0] : "";
}

/**
 * Categorize into period key ('morning' | 'afternoon' | 'evening' | 'fullday')
 */
export function resolvePeriod(props = {}) {
    const {
        timeCode,
        time_code,
        timeName,
        time_name,
        timeRange,
        time_range,
        startTime,
        start_time,
        endTime,
        end_time,
        groupCode,
        group_code,
        scheduleDescription,
        schedule_description,
        study_dates_description,
        course,
    } = props;

    // Merge nested course object if passed
    const c = course || {};
    const effectiveTimeCode = timeCode || time_code || c.time_code || extractTimeCode(groupCode || group_code || c.group_code);
    const effectiveTimeName = timeName || time_name || c.time_name;
    const effectiveTimeRange = timeRange || time_range || c.time_range;
    const effectiveStartTime = startTime || start_time || c.start_time || c.startTime;
    const effectiveEndTime = endTime || end_time || c.end_time || c.endTime;
    const effectiveDesc = scheduleDescription || schedule_description || study_dates_description || c.schedule_description || c.study_dates_description;

    // 1. Direct time_code mapping
    if (effectiveTimeCode && TIME_CODE_MAP[effectiveTimeCode]) {
        return TIME_CODE_MAP[effectiveTimeCode];
    }

    // 2. Direct time_name mapping
    if (effectiveTimeName && typeof effectiveTimeName === "string") {
        if (effectiveTimeName.includes("เช้า") && !effectiveTimeName.includes("บ่าย")) return "morning";
        if (effectiveTimeName.includes("บ่าย") && !effectiveTimeName.includes("เช้า")) return "afternoon";
        if (effectiveTimeName.includes("ค่ำ")) return "evening";
        if (effectiveTimeName.includes("เต็มวัน") || effectiveTimeName.includes("ช-บ") || (effectiveTimeName.includes("เช้า") && effectiveTimeName.includes("บ่าย"))) return "fullday";
    }

    // 3. Parse hours from start/end times or range strings
    let startHour = parseHour(effectiveStartTime);
    let endHour = parseHour(effectiveEndTime);

    if (startHour === null) {
        const textToSearch = effectiveTimeRange || effectiveDesc || "";
        const extracted = extractTimes(textToSearch);
        startHour = extracted.startHour;
        if (endHour === null) endHour = extracted.endHour;
    }

    if (startHour !== null) {
        // เต็มวัน (Full Day): Duration spanning morning through afternoon (e.g. 09:00 - 16:00)
        if (endHour !== null && startHour <= 11 && endHour >= 15) {
            return "fullday";
        }
        // รอบค่ำ (Evening): Starts >= 16:00 (or >= 16:30)
        if (startHour >= 16) {
            return "evening";
        }
        // รอบเช้า (Morning): Starts between 07:00–11:00 and ends <= 13:00
        if (startHour >= 7 && startHour <= 11.5 && (endHour === null || endHour <= 13.5)) {
            return "morning";
        }
        // รอบบ่าย (Afternoon): Starts between 12:00–15:00 and ends <= 18:00
        if (startHour >= 11.5 && startHour < 16 && (endHour === null || endHour <= 18.5)) {
            return "afternoon";
        }
    }

    // If there is a schedule description with time words
    if (effectiveDesc) {
        if (effectiveDesc.includes("เช้า") && !effectiveDesc.includes("บ่าย")) return "morning";
        if (effectiveDesc.includes("บ่าย") && !effectiveDesc.includes("เช้า")) return "afternoon";
        if (effectiveDesc.includes("ค่ำ")) return "evening";
    }

    return "fullday";
}

export default function TimeSlotBadge(props) {
    const {
        timeRange,
        time_range,
        scheduleDescription,
        schedule_description,
        study_dates_description,
        course,
        size = "md",
        className = "",
    } = props;

    const periodKey = resolvePeriod(props);
    const meta = PERIOD_META[periodKey] || PERIOD_META.fullday;
    const { label, Icon, className: badgeClass } = meta;

    // Display title tooltip
    const c = course || {};
    const rawText = timeRange || time_range || c.time_range || scheduleDescription || schedule_description || study_dates_description || c.schedule_description || c.study_dates_description || "";
    const { rawRange } = extractTimes(rawText);
    const displayRange = timeRange || time_range || c.time_range || rawRange || "";

    const sizeCls =
        size === "sm"
            ? "gap-1 px-2 py-0.5 text-[11px]"
            : "gap-1.5 px-2.5 py-1 text-xs";
    const iconSize = size === "sm" ? 11 : 13;

    return (
        <span
            className={`inline-flex items-center rounded-md border font-bold shadow-sm ${sizeCls} ${badgeClass} ${className}`}
            title={displayRange ? `${label} (${displayRange})` : label}
        >
            <Icon size={iconSize} className="shrink-0" />
            {label}
        </span>
    );
}

// Re-export TimeBadge for convenient naming compatibility
export { TimeSlotBadge as TimeBadge };
