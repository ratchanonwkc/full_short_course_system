import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, BookOpen, Layers, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCompactSchedule } from "../../../utils/groupCode";

/**
 * Carousel — แสดงวิชาเปิดสอน (status='open') แบบสไลด์อัตโนมัติ พร้อม fluid transition
 * รองรับ 24h time format, study days, multi-subject tag, และ paid-only seat capacity.
 */
export default function Carousel({ courses = [] }) {
    const [index, setIndex] = useState(0);
    const count = courses.length;

    const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
    const prev = () => setIndex((i) => (i - 1 + count) % count);

    useEffect(() => {
        if (count <= 1) return;
        const timer = setInterval(next, 5000);
        return () => clearInterval(timer);
    }, [next, count]);

    if (count === 0) return null;

    return (
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-blue-100 shadow-lg">
            <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${index * 100}%)` }}
            >
                {courses.map((course) => {
                    const paidCount = course.paid_count ?? course.current_seats ?? 0;
                    const maxSeats = course.max_seats || 0;
                    const remainingSeats = Math.max(0, maxSeats - paidCount);
                    const isFull = maxSeats > 0 && paidCount >= maxSeats;
                    const isMultiSubject = Array.isArray(course.subjects) && course.subjects.length > 1;
                    const displayName = (course.subject_name || course.subjects?.[0]?.name_th || course.group_name || "").replace(/\s*\[.*?\]|\s*\(.*?\)/g, "").trim() || course.group_name;
                    const scheduleLine = formatCompactSchedule(course);

                    return (
                        <div
                            key={course.id}
                            className="flex w-full shrink-0 flex-col items-center gap-3 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 py-10 text-center text-white sm:px-12"
                        >
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                                    <BookOpen size={13} /> {course.major_name || "วิชาเปิดรับสมัคร"}
                                </span>
                                {isMultiSubject && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-400/30 px-2.5 py-0.5 text-xs font-semibold">
                                        <Layers size={12} /> ชุดวิชา ({course.subjects.length} วิชา)
                                    </span>
                                )}
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${isFull ? "bg-red-500/80" : "bg-emerald-500/80"}`}>
                                    <Users size={12} /> {isFull ? "ที่นั่งเต็ม" : `ว่าง ${remainingSeats} ที่`}
                                </span>
                            </div>

                            <h3 className="text-xl font-extrabold sm:text-2xl">{displayName}</h3>

                            <p className="text-sm text-blue-100 max-w-xl">
                                {scheduleLine} •{" "}
                                {course.is_free ? "เรียนฟรี" : `${Number(course.fee || 0).toLocaleString()} บาท`}
                            </p>

                            <Link
                                to={isFull ? "#" : `/register/${course.id}`}
                                aria-disabled={isFull}
                                onClick={(e) => isFull && e.preventDefault()}
                                className={`mt-2 rounded-xl px-6 py-2.5 text-sm font-bold shadow-sm transition ${
                                    isFull
                                        ? "cursor-not-allowed bg-white/30 text-white/60"
                                        : "bg-white text-blue-700 hover:bg-blue-50 active:scale-[0.98]"
                                }`}
                            >
                                {isFull ? "ที่นั่งเต็มแล้ว" : "สมัครเรียนวิชานี้"}
                            </Link>
                        </div>
                    );
                })}
            </div>

            {count > 1 && (
                <>
                    <button
                        type="button"
                        onClick={prev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-1.5 backdrop-blur-sm transition hover:bg-white/30"
                    >
                        <ChevronLeft size={18} className="text-white" />
                    </button>
                    <button
                        type="button"
                        onClick={next}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-1.5 backdrop-blur-sm transition hover:bg-white/30"
                    >
                        <ChevronRight size={18} className="text-white" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                        {courses.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setIndex(i)}
                                className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/40"}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
