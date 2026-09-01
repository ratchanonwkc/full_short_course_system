import { Clock, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { formatThaiDate } from "../../../utils/dateUtils";
import TimeSlotBadge from "../../../components/common/TimeSlotBadge";

/**
 * CourseListRow — one compact row for the List View.
 * Renders: department (muted, above title) -> course name + time-slot badge
 * -> schedule/location -> seat badge -> fee -> CTA.
 */
function CourseListRow({ course }) {
    const isFull = course.remaining_seats <= 0;
    const courseName = course.subject_name || course.subjects?.[0]?.name_th || course.group_name;
    const courseCode = course.subject_code || course.subjects?.[0]?.subject_code;

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm sm:flex-row sm:items-center sm:gap-4">
            {/* Title block */}
            <div className="min-w-0 flex-1">
                {course.major_short_name && (
                    <p className="mb-0.5 text-xs font-semibold text-slate-400">{course.major_short_name}</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                    {courseCode && (
                        <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-600">
                            {courseCode}
                        </span>
                    )}
                    <h3 className="truncate text-sm font-bold text-slate-900 sm:text-base">{courseName}</h3>
                    <TimeSlotBadge course={course} timeCode={course.time_code} timeRange={course.time_range} size="sm" />
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                        <Clock size={12} className="shrink-0 text-blue-400" />
                        {course.schedule_description || `${course.total_hours} ชั่วโมง`}
                    </span>
                    {(course.registration_start_date || course.registration_end_date) && (
                        <span className="flex items-center gap-1">
                            <Clock size={12} className="shrink-0 text-blue-400" />
                            รับสมัคร {formatThaiDate(course.registration_start_date)} -{" "}
                            {formatThaiDate(course.registration_end_date)}
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <MapPin size={12} className="shrink-0 text-blue-400" />
                        {course.location_name || "-"}
                    </span>
                </div>
            </div>

            {/* Seats + Fee + CTA */}
            <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                <span
                    title={`รับทั้งหมด ${course.max_seats || 0} คน • ชำระเงินแล้ว ${course.current_seats || 0} คน • เหลือ ${course.remaining_seats || 0} ที่นั่ง`}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-extrabold ${isFull ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                        }`}
                >
                    <Users size={13} />
                    {isFull ? "เต็ม" : `เหลือ ${course.remaining_seats} ที่`}
                </span>

                {course.is_free ? (
                    <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-700 whitespace-nowrap">
                        เรียนฟรี
                    </span>
                ) : (
                    <span className="text-sm font-extrabold text-blue-700 whitespace-nowrap">
                        {course.fee.toLocaleString()} บ.
                    </span>
                )}

                <Link
                    to={isFull ? "#" : `/register/${course.id}`}
                    aria-disabled={isFull}
                    onClick={(e) => isFull && e.preventDefault()}
                    className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${isFull
                        ? "cursor-not-allowed bg-slate-100 text-slate-400"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                >
                    {isFull ? "เต็ม" : "สมัครเรียน"}
                </Link>
            </div>
        </div>
    );
}

/**
 * CourseListView — compact custom list container (replaces AG-Grid CourseListGrid).
 */
export default function CourseListView({ courses = [], loading = false }) {
    if (loading) {
        return <div className="py-16 text-center text-sm text-slate-400">กำลังโหลดข้อมูล...</div>;
    }
    if (courses.length === 0) {
        return <div className="py-16 text-center text-sm text-slate-400">ไม่พบวิชาที่เปิดรับสมัคร</div>;
    }
    return (
        <div className="flex flex-col gap-2.5">
            {courses.map((course) => (
                <CourseListRow key={course.id} course={course} />
            ))}
        </div>
    );
}
