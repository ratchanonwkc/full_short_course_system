import { BookOpen, Users, Wallet, Calendar, Layers, User } from "lucide-react";
import { formatCompactSchedule } from "../../../utils/groupCode";

/**
 * CourseSummaryBanner
 * -------------------------------------------------------------------------
 * Ultra-compact & clean summary of the selected course for registration.
 * Displays only essential applicant-facing information.
 */
export default function CourseSummaryBanner({ group }) {
    if (!group) return null;

    const paidCount = group.paid_count ?? group.current_seats ?? 0;
    const maxSeats = group.max_seats || 0;
    const remainingSeats = Math.max(0, maxSeats - paidCount);
    const isFull = maxSeats > 0 && paidCount >= maxSeats;

    const isMultiSubject = Array.isArray(group.subjects) && group.subjects.length > 1;
    const rawName = group.subject_name || group.subjects?.[0]?.name_th || group.group_name || "";
    const displayName = rawName.replace(/\s*\[.*?\]|\s*\(.*?\)/g, "").trim() || rawName;

    const scheduleLine = formatCompactSchedule(group);

    return (
        <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-white p-4 shadow-xs sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100/60 pb-2.5">
                <div>
                    <span className="text-xs font-semibold text-blue-600">
                        {group.major_name || group.major_short_name || "วิชาที่ท่านเลือกสมัคร"}
                    </span>
                    <h2 className="text-lg font-black text-slate-900 sm:text-xl">{displayName}</h2>
                </div>

                <div className="flex items-center gap-2">
                    {isMultiSubject && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-700">
                            <Layers size={12} /> ชุดวิชา {group.subjects.length} วิชา
                        </span>
                    )}
                    <span
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold ${
                            isFull
                                ? "bg-red-50 text-red-600 border border-red-200/60"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                        }`}
                    >
                        <Users size={12} />
                        {isFull ? "ที่นั่งเต็ม" : `ว่าง ${remainingSeats} / ${maxSeats} ที่`}
                    </span>
                </div>
            </div>

            {/* 3 Core items: Schedule, Instructor, Fee */}
            <div className="grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-3">
                <div className="flex items-center gap-2 text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100">
                    <Calendar size={14} className="shrink-0 text-blue-500" />
                    <div>
                        <p className="text-[10.5px] font-semibold text-slate-400">วันและเวลาเรียน</p>
                        <p className="font-semibold text-slate-800">{scheduleLine}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100">
                    <User size={14} className="shrink-0 text-blue-500" />
                    <div>
                        <p className="text-[10.5px] font-semibold text-slate-400">อาจารย์ผู้สอน</p>
                        <p className="font-semibold text-slate-800">{group.teacher_name || "อาจารย์ประจำวิชา"}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100">
                    <Wallet size={14} className="shrink-0 text-blue-500" />
                    <div>
                        <p className="text-[10.5px] font-semibold text-slate-400">ค่าธรรมเนียมรวม</p>
                        {group.is_free ? (
                            <p className="font-extrabold text-emerald-600">เรียนฟรี</p>
                        ) : (
                            <p className="font-black text-blue-700 text-sm">
                                ฿{Number(group.fee || 0).toLocaleString()}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Child Subjects Breakdown (if multi-subject group) */}
            {isMultiSubject && (
                <div className="rounded-xl border border-slate-100 bg-white p-2.5 space-y-1 text-xs">
                    <p className="font-bold text-slate-700">รายวิชาในชุดวิชานี้ ({group.subjects.length} วิชา):</p>
                    <div className="divide-y divide-slate-100">
                        {group.subjects.map((sub, idx) => (
                            <div key={sub.id || idx} className="flex items-center justify-between py-0.5 text-slate-600">
                                <span>{sub.name_th}</span>
                                <span className="font-medium text-slate-400">{sub.total_hours} ชม.</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}