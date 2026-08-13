import { useEffect, useMemo, useState } from "react";
import { Rocket, BookOpen, Search, LayoutGrid, List as ListIcon } from "lucide-react";
import Carousel from "../../public/components/Carousel";
import CourseCard from "../../public/components/CourseCard";
import { getOpenStudyGroups } from "../../public/services/publicApi";
import useDebouncedValue from "../../../hooks/useDebouncedValue";

export default function IndexPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid"); // 'grid' | 'list'
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getOpenStudyGroups({ search: debouncedSearch })
      .then((data) => active && setCourses(data))
      .catch(() => active && setCourses([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [debouncedSearch]);

  const carouselCourses = useMemo(() => courses.slice(0, 5), [courses]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-indigo-50/60 via-white to-white">
      {/* Hero Section */}
      <section className="mx-auto max-w-5xl px-4 pb-10 pt-16 text-center sm:pt-20">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-semibold text-indigo-700 sm:text-sm">
          <Rocket size={14} />
          สมัครเรียนได้ที่นี่ — ออนไลน์ ง่าย รวดเร็ว
        </div>
        <h1 className="text-3xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
          หลักสูตรวิชาชีพระยะสั้น
          <br />
          <span className="text-indigo-600">เปิดรับสมัครแล้ว!</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-slate-500 sm:text-lg">
          เรียนทักษะวิชาชีพที่ตลาดต้องการ ในระยะเวลาสั้น พร้อมวุฒิบัตรรับรองจากสถาบัน
        </p>
      </section>

      {/* Dynamic Carousel */}
      {!loading && carouselCourses.length > 0 && (
        <section className="px-4 pb-10">
          <Carousel courses={carouselCourses} />
        </section>
      )}

      {/* Course Listing */}
      <section id="open-courses" className="mx-auto max-w-6xl px-4 pb-24">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">
            📋 วิชาที่กำลังเปิดรับสมัครออนไลน์
          </h2>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อวิชา / รหัสกลุ่ม..."
                className="w-56 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex rounded-lg border border-slate-200 bg-white p-1">
              <button
                onClick={() => setView("grid")}
                className={`rounded-md p-1.5 ${view === "grid" ? "bg-indigo-600 text-white" : "text-slate-500"}`}
                title="Grid View"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setView("list")}
                className={`rounded-md p-1.5 ${view === "list" ? "bg-indigo-600 text-white" : "text-slate-500"}`}
                title="List View"
              >
                <ListIcon size={15} />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">กำลังโหลดข้อมูล...</div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-center text-slate-400">
            <BookOpen size={32} />
            ไม่พบวิชาที่เปิดรับสมัครในขณะนี้
          </div>
        ) : (
          <div className={view === "grid" ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"}>
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} view={view} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
