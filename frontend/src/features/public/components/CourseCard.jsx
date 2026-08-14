import { Clock, MapPin, Users, Tag, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * CourseCard — แสดงข้อมูล study_group แบบย่อ ใช้ได้ทั้ง Grid / List view
 * props: course (mapped object จาก publicApi.getOpenStudyGroups), view: 'grid' | 'list'
 */
export default function CourseCard({ course, view = "grid" }) {
    const isFull = course.remaining_seats <= 0;
    const isList = view === "list";
    const seatsPct = course.max_seats > 0 ? Math.min(100, (course.current_seats / course.max_seats) * 100) : 0;

    return (
        <div
            className={`group rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:border-indigo-200 ${
                isList ? "flex flex-col gap-4 p-4 sm:flex-row sm:items-center" : "flex flex-col p-5"
            }`}
        >
            <div className={isList ? "min-w-0 flex-1" : ""}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-600">
                        {course.group_code}
                    </span>
                    {course.is_free && (
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600">
                            ฟรี
                        </span>
                    )}
                    {course.major_short_name && (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                            {course.major_short_name}
                        </span>
                    )}
                </div>
                <h3 className="mb-2 text-sm font-bold text-slate-900 line-clamp-2 sm:text-base">{course.group_name}</h3>

                <ul className="mb-3 flex flex-col gap-1.5 text-xs text-slate-500">
                    <li className="flex items-center gap-1.5">
                        <Clock size={13} className="shrink-0 text-indigo-400" />
                        {course.schedule_description || `${course.total_hours} ชั่วโมง`}
                    </li>
                    {(course.registration_start_date || course.registration_end_date) && (
                        <li className="flex items-center gap-1.5">
                            <CalendarDays size={13} className="shrink-0 text-indigo-400" />
                            รับสมัคร {course.registration_start_date || "-"} ถึง {course.registration_end_date || "-"}
                        </li>
                    )}
                    <li className="flex items-center gap-1.5">
                        <MapPin size={13} className="shrink-0 text-indigo-400" />
                        {course.location_name || "-"}
                    </li>
                </ul>

                {/* Seats badge / progress bar */}
                <div className="mb-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 font-semibold text-slate-500">
                            <Users size={12} /> ที่นั่ง
                        </span>
                        <span className={`font-bold ${isFull ? "text-red-500" : "text-slate-700"}`}>
                            {course.current_seats}/{course.max_seats}
                        </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                            className={`h-full rounded-full transition-all ${isFull ? "bg-red-500" : seatsPct > 70 ? "bg-amber-400" : "bg-emerald-400"}`}
                            style={{ width: `${seatsPct}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className={isList ? "flex shrink-0 items-center gap-4" : "mt-auto flex items-center justify-between"}>
                <div className="flex items-center gap-1 text-base font-bold text-indigo-700">
                    <Tag size={14} className="text-indigo-400" />
                    {course.is_free ? "ไม่มีค่าใช้จ่าย" : `${course.fee.toLocaleString()} บาท`}
                </div>
                <Link
                    to={isFull ? "#" : `/register/${course.id}`}
                    aria-disabled={isFull}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition active:scale-[0.98] ${
                        isFull
                            ? "cursor-not-allowed bg-slate-100 text-slate-400"
                            : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                    onClick={(e) => isFull && e.preventDefault()}
                >
                    {isFull ? "ที่นั่งเต็ม" : "สมัครเรียน"}
                </Link>
            </div>
        </div>
    );
}
