import { Clock, MapPin, Users, Tag } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * CourseCard — แสดงข้อมูล study_group แบบย่อ ใช้ได้ทั้ง Grid / List view
 * props: course (mapped object จาก publicApi.getOpenStudyGroups), view: 'grid' | 'list'
 */
export default function CourseCard({ course, view = "grid" }) {
    const isFull = course.remaining_seats <= 0;
    const isList = view === "list";

    return (
        <div
            className={`group rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:border-indigo-200 ${isList ? "flex items-center gap-4 p-4" : "flex flex-col p-5"
                }`}
        >
            <div className={isList ? "flex-1 min-w-0" : ""}>
                <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600">
                        {course.group_code}
                    </span>
                    {course.is_free && (
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                            FREE
                        </span>
                    )}
                </div>
                <h3 className="mb-2 text-sm font-bold text-slate-900 line-clamp-2">{course.group_name}</h3>

                <ul className="mb-3 flex flex-col gap-1.5 text-xs text-slate-500">
                    <li className="flex items-center gap-1.5">
                        <Clock size={13} className="shrink-0 text-indigo-400" />
                        {course.schedule_description || `${course.total_hours} ชั่วโมง`}
                    </li>
                    <li className="flex items-center gap-1.5">
                        <MapPin size={13} className="shrink-0 text-indigo-400" />
                        {course.location_name || "-"}
                    </li>
                    <li className="flex items-center gap-1.5">
                        <Users size={13} className="shrink-0 text-indigo-400" />
                        {isFull ? (
                            <span className="font-semibold text-red-500">ที่นั่งเต็มแล้ว</span>
                        ) : (
                            <span>เหลือ {course.remaining_seats} / {course.max_seats} ที่นั่ง</span>
                        )}
                    </li>
                </ul>
            </div>

            <div className={isList ? "flex shrink-0 items-center gap-4" : "mt-auto flex items-center justify-between"}>
                <div className="flex items-center gap-1 text-base font-bold text-indigo-700">
                    <Tag size={14} className="text-indigo-400" />
                    {course.is_free ? "ไม่มีค่าใช้จ่าย" : `${course.fee.toLocaleString()} บาท`}
                </div>
                <Link
                    to={isFull ? "#" : `/register/${course.id}`}
                    aria-disabled={isFull}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition active:scale-[0.98] ${isFull
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
