import { Calendar, User, Users, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCompactSchedule } from "../../../utils/groupCode";
import TimeSlotBadge from "../../../components/common/TimeSlotBadge";

/**
 * CourseCard — Ultra-compact & High-signal card for applicants.
 * Surfaces ONLY the 6 core decision-making fields:
 * 1. แผนก (Department)
 * 2. จำนวนที่นั่ง (Available Seats)
 * 3. ชื่อวิชา (Course Name) & รอบเรียน (Shift)
 * 4. วันและเวลาเรียน (Schedule & Times)
 * 5. อาจารย์ผู้สอน (Instructor)
 * 6. ราคาและปุ่มสมัคร (Price & Action Button)
 */
export default function CourseCard({ course }) {
    const paidCount = course.paid_count ?? course.current_seats ?? 0;
    const maxSeats = course.max_seats || 0;
    const remainingSeats = Math.max(0, maxSeats - paidCount);
    const isFull = maxSeats > 0 && paidCount >= maxSeats;

    const isMultiSubject = Array.isArray(course.subjects) && course.subjects.length > 1;
    const rawName = course.subject_name || course.subjects?.[0]?.name_th || course.group_name || "";
    // Clean course title to remove internal bracket codes like [ปกติ] (รอบ ช/1)
    const displayName = rawName.replace(/\s*\[.*?\]|\s*\(.*?\)/g, "").trim() || rawName;

    const scheduleLine = formatCompactSchedule(course);

    return (
        <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-blue-300 hover:shadow-md">
            {/* 1 & 2: Top Bar: แผนก (Left) | จำนวนที่นั่ง (Right) */}
            <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-semibold text-slate-500 text-xs">
                    {course.major_name || course.major_short_name || "หลักสูตรระยะสั้น"}
                </span>

                <span
                    className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                        isFull
                            ? "bg-red-50 text-red-600 border border-red-200/60"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                    }`}
                >
                    <Users size={11} />
                    {isFull ? "ที่นั่งเต็ม" : `ว่าง ${remainingSeats} ที่`}
                </span>
            </div>

            {/* 3, 4, 5: Middle Content */}
            <div className="my-3 space-y-2">
                {/* Badges: รอบเรียน (Shift) + ชุดวิชา */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <TimeSlotBadge course={course} timeCode={course.time_code} timeRange={course.time_range} size="sm" />
                    {isMultiSubject && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-1.5 py-0.5 text-xs font-bold text-purple-700">
                            <Layers size={11} /> ชุดวิชา {course.subjects.length} วิชา
                        </span>
                    )}
                </div>

                {/* 3. ชื่อวิชา */}
                <h3 className="text-base font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                    {displayName}
                </h3>

                {/* 4. วันและเวลาเรียน */}
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Calendar size={13} className="shrink-0 text-blue-500" />
                    <span className="truncate font-medium">{scheduleLine}</span>
                </div>

                {/* 5. อาจารย์ผู้สอน */}
                {course.teacher_name && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <User size={12} className="shrink-0 text-slate-400" />
                        <span className="truncate">ผู้สอน: {course.teacher_name}</span>
                    </div>
                )}
            </div>

            {/* 6. ราคาและปุ่มสมัคร */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                <div>
                    {course.is_free ? (
                        <span className="text-sm font-extrabold text-emerald-600">
                            เรียนฟรี
                        </span>
                    ) : (
                        <div className="flex items-baseline gap-0.5">
                            <span className="text-xs font-bold text-blue-700">฿</span>
                            <span className="text-lg font-black text-blue-700 leading-none">
                                {Number(course.fee || 0).toLocaleString()}
                            </span>
                        </div>
                    )}
                </div>

                <Link
                    to={isFull ? "#" : `/register/${course.id}`}
                    aria-disabled={isFull}
                    onClick={(e) => isFull && e.preventDefault()}
                    className={`inline-flex items-center justify-center rounded-xl px-4 py-1.5 text-xs font-bold transition active:scale-[0.98] ${
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
