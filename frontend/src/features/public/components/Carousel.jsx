import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Carousel — แสดงวิชาเปิดสอน (status='open') แบบสไลด์อัตโนมัติ
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
    const course = courses[index];

    return (
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-lg">
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center sm:px-12">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                    <BookOpen size={13} /> วิชาเปิดรับสมัคร
                </span>
                <h3 className="text-xl font-extrabold sm:text-2xl">{course.group_name}</h3>
                <p className="text-sm text-indigo-100">
                    {course.schedule_description || `${course.total_hours} ชั่วโมง`} •{" "}
                    {course.is_free ? "ไม่มีค่าใช้จ่าย" : `${course.fee.toLocaleString()} บาท`}
                </p>
                <Link
                    to={`/register/${course.id}`}
                    className="mt-2 rounded-lg bg-white px-5 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                >
                    สมัครเรียนวิชานี้
                </Link>
            </div>

            {count > 1 && (
                <>
                    <button
                        type="button"
                        onClick={prev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-1.5 hover:bg-white/30"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={next}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-1.5 hover:bg-white/30"
                    >
                        <ChevronRight size={18} />
                    </button>
                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                        {courses.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setIndex(i)}
                                className={`h-1.5 w-1.5 rounded-full transition ${i === index ? "w-4 bg-white" : "bg-white/40"
                                    }`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
