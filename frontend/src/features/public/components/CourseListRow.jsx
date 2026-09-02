import { Calendar, User, Users, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCompactSchedule } from "../../../utils/groupCode";
import TimeSlotBadge from "../../../components/common/TimeSlotBadge";

/**
 * CourseListRow — ultra-compact, single-row layout for public list view.
 * Displays exclusively the 6 core decision anchors with no internal codes or room numbers.
 */
function CourseListRow({ course }) {
    const paidCount = course.paid_count ?? course.current_seats ?? 0;
    const maxSeats = course.max_seats || 0;
    const remainingSeats = Math.max(0, maxSeats - paidCount);
    const isFull = maxSeats > 0 && paidCount >= maxSeats;

    const isMultiSubject = Array.isArray(course.subjects) && course.subjects.length > 1;
    const rawName = course.subject_name || course.subjects?.[0]?.name_th || course.group_name || "";
    const displayName = rawName.replace(/\s*\[.*?\]|\s*\(.*?\)/g, "").trim() || rawName;

    const scheduleLine = formatCompactSchedule(course);

    return (
        <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs transition-all hover:border-blue-300 hover:shadow-xs md:flex-row md:items-center md:justify-between md:gap-4">
            {/* 1. Left: แผนก, รอบเรียน, ชุดวิชา, ชื่อวิชา */}
            <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-500">
                        {course.major_name || course.major_short_name || "หลักสูตรระยะสั้น"}
                    </span>
                    <TimeSlotBadge course={course} timeCode={course.time_code} timeRange={course.time_range} size="xs" />
                    {isMultiSubject && (
                        <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-1.5 py-0.5 text-xs font-bold text-purple-700">
                            <Layers size={10} /> ชุดวิชา {course.subjects.length} วิชา
                        </span>
                    )}
                </div>

                <h3 className="truncate text-base font-bold text-slate-900">
                    {displayName}
                </h3>
            </div>

            {/* 2. Center: วันและเวลาเรียน & อาจารย์ผู้สอน */}
            <div className="flex shrink-0 flex-col gap-0.5 text-xs text-slate-600 md:max-w-xs md:items-start">
                <div className="flex items-center gap-1.5 truncate">
                    <Calendar size={13} className="shrink-0 text-blue-500" />
                    <span className="truncate font-medium">{scheduleLine}</span>
                </div>
                {course.teacher_name && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                        <User size={11} className="shrink-0 text-slate-400" />
                        <span className="truncate">ผู้สอน: {course.teacher_name}</span>
                    </div>
                )}
            </div>

            {/* 3. Right: จำนวนที่นั่ง + ราคา + ปุ่มสมัคร */}
            <div className="flex shrink-0 items-center justify-between gap-3 md:justify-end">
                <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                        isFull
                            ? "bg-red-50 text-red-600 border border-red-200/60"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                    }`}
                >
                    <Users size={11} />
                    {isFull ? "เต็ม" : `ว่าง ${remainingSeats} ที่`}
                </span>

                <div className="text-right min-w-[70px]">
                    {course.is_free ? (
                        <span className="text-xs font-extrabold text-emerald-600">เรียนฟรี</span>
                    ) : (
                        <div className="flex items-baseline justify-end gap-0.5">
                            <span className="text-xs font-bold text-blue-700">฿</span>
                            <span className="text-base font-black text-blue-700 leading-none">
                                {Number(course.fee || 0).toLocaleString()}
                            </span>
                        </div>
                    )}
                </div>

                <Link
                    to={isFull ? "#" : `/register/${course.id}`}
                    aria-disabled={isFull}
                    onClick={(e) => isFull && e.preventDefault()}
                    className={`inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-1.5 text-xs font-bold transition active:scale-[0.98] ${
                        isFull
                            ? "cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200"
                            : "bg-blue-600 text-white hover:bg-blue-700 shadow-2xs shadow-blue-600/30"
                    }`}
                >
                    {isFull ? "ที่นั่งเต็ม" : "สมัครเรียน"}
                </Link>
            </div>
        </div>
    );
}

/**
 * CourseListView — compact custom list container.
 */
export default function CourseListView({ courses = [], loading = false }) {
    if (loading) {
        return <div className="py-16 text-center text-sm text-slate-400">กำลังโหลดข้อมูล...</div>;
    }
    if (courses.length === 0) {
        return <div className="py-16 text-center text-sm text-slate-400">ไม่พบวิชาที่เปิดรับสมัคร</div>;
    }
    return (
        <div className="flex flex-col gap-2">
            {courses.map((course) => (
                <CourseListRow key={course.id} course={course} />
            ))}
        </div>
    );
}
