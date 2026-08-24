import { Sunrise, Sun, Moon, CalendarDays } from "lucide-react";

/**
 * TimeSlotBadge
 * -------------------------------------------------------------------------
 * Prominent, color-coded badge for the time-of-day a course meets.
 * Derives the period from time_code (ช/บ/ค/พ) when available, otherwise
 * falls back to parsing the start hour out of time_range ("09:00 - 12:00").
 *
 * Props:
 * - timeCode: "ช" | "บ" | "ค" | "พ"  (เช้า/บ่าย/ค่ำ/เต็มวัน — matches time_slots.time_code)
 * - timeRange: string  e.g. "09:00 - 12:00" (used as fallback + shown as subtext)
 * - size: "sm" | "md"  (default "md")
 */
const PERIOD_META = {
    morning: { label: "รอบเช้า", Icon: Sunrise, className: "bg-amber-100 text-amber-700 border-amber-200" },
    afternoon: { label: "รอบบ่าย", Icon: Sun, className: "bg-orange-100 text-orange-700 border-orange-200" },
    evening: { label: "รอบค่ำ", Icon: Moon, className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    fullday: { label: "เต็มวัน", Icon: CalendarDays, className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const TIME_CODE_MAP = {
    ช: "morning",
    บ: "afternoon",
    ค: "evening",
    พ: "fullday",
};

function periodFromRange(timeRange) {
    if (!timeRange) return "fullday";
    const match = /^(\d{1,2}):/.exec(timeRange.trim());
    if (!match) return "fullday";
    const startHour = Number(match[1]);
    if (startHour < 12) return "morning";
    if (startHour < 16) return "afternoon";
    return "evening";
}

export default function TimeSlotBadge({ timeCode, timeRange, size = "md" }) {
    const periodKey = TIME_CODE_MAP[timeCode] || periodFromRange(timeRange);
    const meta = PERIOD_META[periodKey] || PERIOD_META.fullday;
    const { label, Icon, className } = meta;

    const sizeCls =
        size === "sm"
            ? "gap-1 px-2 py-0.5 text-[11px]"
            : "gap-1.5 px-2.5 py-1 text-xs";
    const iconSize = size === "sm" ? 11 : 13;

    return (
        <span
            className={`inline-flex items-center rounded-full border font-bold shadow-sm ${sizeCls} ${className}`}
            title={timeRange || label}
        >
            <Icon size={iconSize} />
            {label}
            {timeRange && <span className="hidden font-medium opacity-80 sm:inline">· {timeRange}</span>}
        </span>
    );
}
