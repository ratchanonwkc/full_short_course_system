import { useEffect, useMemo, useState } from "react";
import { Rocket, BookOpen, Search, LayoutGrid, List as ListIcon, Filter } from "lucide-react";
import Carousel from "../../public/components/Carousel";
import CourseCard from "../../public/components/CourseCard";
import CourseListView from "../../public/components/CourseListRow";
import { getOpenStudyGroups } from "../../public/services/publicApi";
import { getMajors } from "../../curriculums/services/academicStructureApi";
import { getTimeSlots } from "../../study-groups/services/studyGroupApi";
import useDebouncedValue from "../../../hooks/useDebouncedValue";
import { formatThaiDate } from "../../../utils/dateUtils";

export default function IndexPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid"); // 'grid' | 'list'
  const debouncedSearch = useDebouncedValue(search, 300);

  const [majors, setMajors] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [filterMajorId, setFilterMajorId] = useState("");
  const [filterTimeCode, setFilterTimeCode] = useState("");

  useEffect(() => {
    getMajors().then(setMajors).catch(() => setMajors([]));
    getTimeSlots().then(setTimeSlots).catch(() => setTimeSlots([]));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getOpenStudyGroups({ search: debouncedSearch, major_id: filterMajorId || undefined })
      .then((data) => active && setCourses(data))
      .catch(() => active && setCourses([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [debouncedSearch, filterMajorId]);

  // รอบเรียน filter ทำฝั่ง client เพราะ backend ยังไม่รองรับ query param นี้โดยตรง
  const filteredCourses = useMemo(() => {
    if (!filterTimeCode) return courses;
    return courses.filter((c) => c.group_code?.includes(filterTimeCode));
  }, [courses, filterTimeCode]);

  const carouselCourses = useMemo(() => filteredCourses.slice(0, 5), [filteredCourses]);

  const activeBatchInfo = useMemo(() => {
    if (!courses || courses.length === 0) return null;
    const sample = courses.find((c) => c.registration_start_date || c.registration_end_date) || courses[0];
    if (!sample || (!sample.registration_start_date && !sample.registration_end_date)) return null;
    return {
      batch_name: sample.batch_name,
      reg_start: sample.registration_start_date,
      reg_end: sample.registration_end_date,
      study_start: sample.start_date,
      study_end: sample.end_date,
    };
  }, [courses]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-blue-50/60 via-white to-white">
      {/* Full-bleed Hero Section */}
      <section className="w-full bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 px-4 pb-14 pt-16 text-center text-white sm:pt-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold backdrop-blur-sm sm:text-sm">
            <Rocket size={14} />
            สมัครเรียนได้ที่นี่ — ออนไลน์ ง่าย รวดเร็ว
          </div>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
            หลักสูตรวิชาชีพระยะสั้น
            <br />
            <span className="text-blue-100">เปิดรับสมัครแล้ว!</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-blue-100 sm:text-lg">
            เรียนทักษะวิชาชีพที่ตลาดต้องการ ในระยะเวลาสั้น พร้อมวุฒิบัตรรับรองจากสถาบัน
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#open-courses"
              className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-blue-700 shadow-lg transition hover:bg-blue-50 active:scale-[0.98] sm:text-base"
            >
              ดูวิชาที่เปิดรับสมัคร
            </a>
          </div>
        </div>
      </section>

      {/* Dynamic Carousel — overlaps hero slightly */}
      {!loading && carouselCourses.length > 0 && (
        <section className="-mt-8 px-4 pb-10 sm:-mt-10">
          <Carousel courses={carouselCourses} />
        </section>
      )}

      {/* Course Listing */}
      <section id="open-courses" className="mx-auto max-w-6xl px-4 pb-24 pt-4">
        {/* Centralized Batch Application Schedule Banner */}
        {activeBatchInfo && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-blue-50/90 px-4 py-3 text-xs sm:text-sm text-slate-700 shadow-2xs">
            <div className="flex items-center gap-2 font-medium">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs">
                🗓️
              </span>
              <span>
                <strong className="text-slate-900 font-bold">{activeBatchInfo.batch_name || "รุ่นปัจจุบัน"}:</strong>{" "}
                รับสมัคร {formatThaiDate(activeBatchInfo.reg_start)} ถึง {formatThaiDate(activeBatchInfo.reg_end)}
              </span>
            </div>
            {activeBatchInfo.study_start && (
              <span className="rounded-lg bg-white/80 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-100">
                เปิดเรียน: {formatThaiDate(activeBatchInfo.study_start)}
              </span>
            )}
          </div>
        )}

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">
            📋 วิชาที่กำลังเปิดรับสมัครออนไลน์
          </h2>
          <div className="flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              onClick={() => setView("grid")}
              className={`rounded-md p-1.5 ${view === "grid" ? "bg-blue-600 text-white" : "text-slate-500"}`}
              title="Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setView("list")}
              className={`rounded-md p-1.5 ${view === "list" ? "bg-blue-600 text-white" : "text-slate-500"}`}
              title="List View"
            >
              <ListIcon size={15} />
            </button>
          </div>
        </div>

        {/* Prominent search bar */}
        <div className="relative mb-3">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อวิชา / รหัสกลุ่ม / รหัสวิชา..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 sm:text-base"
          />
        </div>

        {/* Department & round filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
            <Filter size={13} /> ตัวกรอง:
          </span>
          <select
            value={filterMajorId}
            onChange={(e) => setFilterMajorId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 outline-none transition focus:border-blue-400 sm:text-sm"
          >
            <option value="">ทุกแผนกวิชา</option>
            {majors.map((m) => (
              <option key={m.id} value={m.id}>{m.name_th}</option>
            ))}
          </select>
          <select
            value={filterTimeCode}
            onChange={(e) => setFilterTimeCode(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 outline-none transition focus:border-blue-400 sm:text-sm"
          >
            <option value="">ทุกรอบเรียน</option>
            {timeSlots.map((t) => (
              <option key={t.id} value={t.time_code}>{t.time_name} ({t.time_range})</option>
            ))}
          </select>
          {(filterMajorId || filterTimeCode || search) && (
            <button
              onClick={() => { setFilterMajorId(""); setFilterTimeCode(""); setSearch(""); }}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">กำลังโหลดข้อมูล...</div>
        ) : filteredCourses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-center text-slate-400">
            <BookOpen size={32} />
            ไม่พบวิชาที่เปิดรับสมัครในขณะนี้
          </div>
        ) : view === "grid" ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} view="grid" />
            ))}
          </div>
        ) : (
          <CourseListView courses={filteredCourses} loading={loading} />
        )}
      </section>
    </div>
  );
}