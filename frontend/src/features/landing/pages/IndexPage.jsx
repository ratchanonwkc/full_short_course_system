import { BookOpen, Clock, MapPin, Rocket } from 'lucide-react';

/** Placeholder courses - replace with real API data */
const OPEN_COURSES = [
  {
    id: 1,
    name: 'ช่างซ่อมบำรุงระบบไฟฟ้าในอาคาร',
    hours: 30,
    location: 'ห้อง 201 อาคาร ช.1',
    startDate: '1 ส.ค. 2568',
    seats: 20,
    remaining: 12,
  },
  {
    id: 2,
    name: 'ตัดเย็บเสื้อผ้าสตรีเบื้องต้น',
    hours: 60,
    location: 'ห้อง 301 อาคาร คหกรรม',
    startDate: '5 ส.ค. 2568',
    seats: 15,
    remaining: 0,
  },
  {
    id: 3,
    name: 'คอมพิวเตอร์กราฟิกสำหรับธุรกิจ',
    hours: 45,
    location: 'ห้อง Lab 1 อาคาร IT',
    startDate: '10 ส.ค. 2568',
    seats: 25,
    remaining: 18,
  },
];

export default function IndexPage() {
  const handleApply = (course) => {
    alert('ฟังก์ชันสมัครเรียน "' + course.name + '" กำลังอยู่ระหว่างพัฒนา');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-indigo-50/60 via-white to-white">

      {/* Development Banner */}
      <div className="bg-amber-400 py-3 text-center">
        <p className="text-base font-bold text-amber-900 sm:text-lg">
          🚀 ระบบกำลังอยู่ระหว่างการพัฒนา — บางส่วนอาจยังใช้งานไม่ได้
        </p>
      </div>

      {/* Hero Section */}
      <section className="mx-auto max-w-5xl px-4 pb-12 pt-16 text-center sm:pt-20">
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

        <a
          href="#open-courses"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]"
        >
          <BookOpen size={16} />
          ดูวิชาที่เปิดรับสมัคร
        </a>
      </section>

      {/* Open Courses Grid */}
      <section id="open-courses" className="mx-auto max-w-5xl px-4 pb-24">
        <h2 className="mb-6 text-xl font-bold text-slate-800 sm:text-2xl">
          📋 วิชาที่กำลังเปิดรับสมัครออนไลน์
        </h2>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {OPEN_COURSES.map((course) => (
            <CourseCard key={course.id} course={course} onApply={handleApply} />
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          * รายวิชาข้างต้นเป็นข้อมูลตัวอย่าง ระบบยังอยู่ระหว่างการพัฒนา
        </p>
      </section>
    </div>
  );
}

function CourseCard({ course, onApply }) {
  const pct = Math.round(((course.seats - course.remaining) / course.seats) * 100);
  const isFull = course.remaining === 0;

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-indigo-100">
      <h3 className="mb-3 text-sm font-bold text-slate-900">{course.name}</h3>

      <ul className="mb-4 flex flex-col gap-1.5 text-xs text-slate-500">
        <li className="flex items-center gap-1.5">
          <Clock size={13} className="text-indigo-400 shrink-0" />
          {course.hours} ชั่วโมง
        </li>
        <li className="flex items-center gap-1.5">
          <MapPin size={13} className="text-indigo-400 shrink-0" />
          {course.location}
        </li>
        <li className="flex items-center gap-1.5">
          <BookOpen size={13} className="text-indigo-400 shrink-0" />
          เปิดเรียน {course.startDate}
        </li>
      </ul>

      {/* Seat progress bar */}
      <div className="mb-4">
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>ที่นั่ง</span>
          {isFull
            ? <span className="font-semibold text-red-500">เต็มแล้ว</span>
            : <span>เหลือ {course.remaining} / {course.seats} ที่</span>
          }
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={'h-full rounded-full ' + (isFull ? 'bg-red-400' : 'bg-indigo-500')}
            style={{ width: pct + '%' }}
          />
        </div>
      </div>

      <button
        type="button"
        disabled={isFull}
        onClick={() => onApply(course)}
        className={'mt-auto w-full rounded-lg py-2 text-sm font-semibold transition active:scale-[0.98] ' + (isFull ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700')}
      >
        {isFull ? 'ที่นั่งเต็ม' : 'สมัครเรียน'}
      </button>
    </div>
  );
}
