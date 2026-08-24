import { Clock, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { formatThaiDate } from "../../../utils/dateUtils";
import TimeSlotBadge from "../../../components/common/TimeSlotBadge";

/**
 * CourseCard — Grid/List view card for a study group/course.
 * Now shows a prominent color-coded Time-Period Badge (รอบเช้า/บ่าย/ค่ำ/เต็มวัน)
 * next to the subject-code chip, derived from course.time_code (preferred)
 * or the start hour of course.time_range.
 */
export default function CourseCard({ course, view = "grid" }) {
    const isFull = course.remaining_seats <= 0;
    const isList = view === "list";

    return (
        <div
            className={`group relative rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:border-indigo-200 ${isList ? "flex flex-col gap-4 p-4 sm:flex-row sm:items-center" : "flex flex-col p-5"
                }`}
        >
            {/* Seats badge — top-right corner */}
            <span
                className={`absolute right-4 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[13px] font-extrabold shadow-sm ring-2 ring-white ${isFull ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                    }`}
            >
                <Users size={12} />
                {isFull ? "เต็ม" : `เหลือ ${course.remaining_seats}`}
            </span>

            <div className={isList ? "min-w-0 flex-1" : ""}>
                {course.major_short_name && <p className="mb-1 text-xs font-semibold text-slate-400">{course.major_short_name}</p>}

                <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-600">
                        {course.subject_code || course.subjects?.[0]?.subject_code}
                    </span>
                    <TimeSlotBadge timeCode={course.time_code} timeRange={course.time_range} size="sm" />
                </div>

                <h3 className="mb-2 text-sm font-bold text-slate-900 line-clamp-2 sm:text-base">
                    {course.subject_name || course.subjects?.[0]?.name_th || course.group_name}
                </h3>

                <ul className="mb-3 flex flex-col gap-1.5 text-xs text-slate-500">
                    <li className="flex items-center gap-1.5">
                        <Clock size={13} className="shrink-0 text-indigo-400" />
                        {course.schedule_description || `${course.total_hours} ชั่วโมง`}
                    </li>
                    {(course.registration_start_date || course.registration_end_date) && (
                        <li className="flex items-center gap-1.5">
                            <Clock size={13} className="shrink-0 text-indigo-400" />
                            รับสมัคร {formatThaiDate(course.registration_start_date)} ถึง {formatThaiDate(course.registration_end_date)}
                        </li>
                    )}
                    <li className="flex items-center gap-1.5">
                        <MapPin size={13} className="shrink-0 text-indigo-400" />
                        {course.location_name || "-"}
                    </li>
                </ul>
            </div>

            <div className={isList ? "flex shrink-0 items-center gap-4" : "mt-auto flex items-center justify-between"}>
                {course.is_free ? (
                    <span className="inline-flex items-center rounded-lg bg-emerald-100 px-3 py-1.5 text-sm font-extrabold text-emerald-700">เรียนฟรี</span>
                ) : (
                    <span className="text-base font-extrabold text-indigo-700">{course.fee.toLocaleString()} บาท</span>
                )}
                <Link
                    to={isFull ? "#" : `/register/${course.id}`}
                    aria-disabled={isFull}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition active:scale-[0.98] ${isFull ? "cursor-not-allowed bg-slate-100 text-slate-400" : "bg-indigo-600 text-white hover:bg-indigo-700"
                        }`}
                    onClick={(e) => isFull && e.preventDefault()}
                >
                    {isFull ? "ที่นั่งเต็ม" : "สมัครเรียน"}
                </Link>
            </div>
        </div>
    );
}
