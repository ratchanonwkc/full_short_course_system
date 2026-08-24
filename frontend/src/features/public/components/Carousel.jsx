import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Carousel — แสดงวิชาเปิดสอน (status='open') แบบสไลด์อัตโนมัติ พร้อม fluid transition
 * props: courses: Array<mapped study_group>
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
                {courses.map((course) => (
                    <div
                        key={course.id}
                        className="flex w-full shrink-0 flex-col items-center gap-3 bg-gradient-to-br from-blue-600 to-blue-800 px-6 py-10 text-center text-white sm:px-12"
                    >
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                            <BookOpen size={13} /> วิชาเปิดรับสมัคร
                        </span>
                        <h3 className="text-xl font-extrabold sm:text-2xl">{course.group_name}</h3>
                        <p className="text-sm text-blue-100">
                            {course.schedule_description || `${course.total_hours} ชั่วโมง`} •{" "}
                            {course.is_free ? "ไม่มีค่าใช้จ่าย" : `${course.fee.toLocaleString()} บาท`}
                        </p>
                        <Link
                            to={`/register/${course.id}`}
                            className="mt-2 rounded-lg bg-white px-5 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
                        >
                            สมัครเรียนวิชานี้
                        </Link>
                    </div>
                ))}
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
