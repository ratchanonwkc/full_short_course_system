import { forwardRef } from 'react';
import garudaLogo from '../../../assets/Garuda_Emblem_of_Thailand_(Monochrome).svg.webp';

function toThaiDigits(val) {
  if (val === null || val === undefined || val === '') return '';
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return String(val).replace(/[0-9]/g, (d) => thaiDigits[Number(d)]);
}

function formatThaiDateShort(rawDate) {
  if (!rawDate) return '................................';

  // If already formatted Thai text, return directly
  if (typeof rawDate === 'string' && (rawDate.includes('มกราคม') || rawDate.includes('พ.ศ.'))) {
    return rawDate;
  }

  const date = new Date(rawDate);
  if (isNaN(date.getTime())) return '................................';

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const day = toThaiDigits(date.getDate());
  const month = thaiMonths[date.getMonth()];
  const year = toThaiDigits(date.getFullYear() > 2500 ? date.getFullYear() : date.getFullYear() + 543);

  return `${day} ${month} พ.ศ.\u00A0${year}`;
}

function formatAnnounceDate(rawDate) {
  if (!rawDate) {
    const now = new Date();
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return `ประกาศ ณ วันที่ ${toThaiDigits(now.getDate())} เดือน ${thaiMonths[now.getMonth()]} พุทธศักราช ${toThaiDigits(now.getFullYear() > 2500 ? now.getFullYear() : now.getFullYear() + 543)}`;
  }

  if (typeof rawDate === 'string' && rawDate.includes('ประกาศ ณ วันที่')) {
    return rawDate;
  }

  const date = new Date(rawDate);
  const validDate = isNaN(date.getTime()) ? new Date() : date;
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const day = toThaiDigits(validDate.getDate());
  const month = thaiMonths[validDate.getMonth()];
  const year = toThaiDigits(validDate.getFullYear() > 2500 ? validDate.getFullYear() : validDate.getFullYear() + 543);
  return `ประกาศ ณ วันที่ ${day} เดือน ${month} พุทธศักราช ${year}`;
}

const CollegeAnnouncementPrint = forwardRef(function CollegeAnnouncementPrint(
  { data = {}, isDraft = false, useThaiDigits = true },
  ref
) {
  const d = data;
  const num = (v) => (useThaiDigits ? toThaiDigits(v) : v);

  const term = num(d.term || '1');
  const academicYear = num(d.academic_year || '2569');
  const batchDisplay = num(d.batch_display || `${d.batch_no || '1'}/${d.academic_year || '2569'}`);
  const directorName = d.director_name || 'นายไพฑูรย์ ธนพงศ์ภากรณ์';

  // Robust date resolving
  const rawApplyStart = d.admit_open_date || d.apply_start_date || d.registration_start_date || d.reg_start_date || d.batch_start_date || d.start_date;
  const rawApplyEnd = d.admit_close_date || d.apply_end_date || d.registration_end_date || d.reg_end_date || d.batch_end_date || d.end_date;
  const rawStudyOpen = d.study_open_date || d.study_start_date || d.course_start_date || d.start_date || d.batch_start_date;

  const applyStartDate = formatThaiDateShort(rawApplyStart);
  const applyEndDate = formatThaiDateShort(rawApplyEnd);
  const studyOpenDate = formatThaiDateShort(rawStudyOpen);

  return (
    <div
      ref={ref}
      className="announcement-print-root bg-white text-black font-['Sarabun',sans-serif] select-text"
      style={{
        width: '210mm',
        minHeight: '297mm',
        boxSizing: 'border-box',
        padding: '1.5cm 2.0cm 2.0cm 3.0cm',
        margin: '0 auto',
        fontSize: '14px',
        lineHeight: '1.45',
        color: '#000',
        backgroundColor: '#fff',
      }}
    >
      <style orientation="portrait">{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap');

        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .announcement-print-root {
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 1.5cm 2.0cm 2.0cm 3.0cm !important;
            box-sizing: border-box !important;
            font-family: 'Sarabun', 'TH Sarabun New', sans-serif !important;
          }
        }
      `}</style>

      {/* ── Top Center Garuda Emblem ── */}
      <div className="flex justify-center mb-2">
        <img
          src={garudaLogo}
          alt="Garuda"
          style={{ width: '2.5cm', height: '2.5cm' }}
          className="object-contain"
        />
      </div>

      {/* ── Title Header ── */}
      <div className="text-center space-y-1 mb-3">
        <h1 className="text-[14px]  tracking-tight">ประกาศวิทยาลัยสารพัดช่างอุดรธานี</h1>
        <p className="text-[14px] ">
          เรื่อง การรับสมัครนักศึกษาหลักสูตรวิชาชีพระยะสั้น ภาคเรียนที่ {term} ปีการศึกษา {academicYear} (รุ่นที่ {batchDisplay})
        </p>
        <div className="w-4/5 mx-auto border-b border-dotted border-black pt-1" />
      </div>

      {/* ── Body Preamble ── */}
      <div className="text-justify leading-relaxed">
        <p style={{ textIndent: '1.5cm' }}>
          ด้วยวิทยาลัยสารพัดช่างอุดรธานี สังกัดสำนักงานคณะกรรมการการอาชีวศึกษา กระทรวงศึกษาธิการ ได้เปิดรับสมัครนักศึกษาหลักสูตรวิชาชีพระยะสั้น เพื่อสนองความต้องการของตลาดแรงงาน ช่วยเสริมสร้างคุณภาพชีวิตของประชาชนให้ดีขึ้น สามารถนำไปใช้ในชีวิตประจำวัน หรือประกอบอาชีพได้ จึงประกาศรับสมัครนักศึกษาเข้าเรียน ภาคเรียนที่ {term} ปีการศึกษา {academicYear} (รุ่นที่ {batchDisplay}) ตามแผนการรับสมัครแนบท้าย โดยมีระเบียบการ ดังนี้
        </p>
      </div>

      {/* ── Section 1: Schedule ── */}
      <div className="mt-3 space-y-0.5">
        <p className="font-bold text-[14.5px]">กำหนดการรับสมัครและวันเปิดเรียน</p>
        <div className="pl-[1.5cm] space-y-0.5">
          <p>รับสมัคร ตั้งแต่วันที่ {applyStartDate} ถึงวันที่ {applyEndDate}</p>
          <p>เปิดเรียนวันที่ {studyOpenDate}</p>
        </div>
      </div>

      {/* ── Section 2: Study Shifts ── */}
      <div className="mt-2.5 space-y-0.5">
        <p className="font-bold text-[14.5px]">กำหนดเวลาเรียน</p>
        <div className="pl-[1.5cm] space-y-0.5">
          <p>{num('1')}. รอบเช้า &nbsp;เวลา {num('09.00')} - {num('12.00')} น.</p>
          <p>{num('2')}. รอบบ่าย เวลา {num('13.00')} - {num('16.00')} น.</p>
          <p>{num('3')}. รอบค่ำ &nbsp;เวลา {num('16.00')} - {num('19.00')} น.</p>
        </div>
      </div>

      {/* ── Section 3: Qualifications ── */}
      <div className="mt-2.5 space-y-0.5">
        <p className="font-bold text-[14.5px]">คุณสมบัติของผู้สมัคร</p>
        <div className="pl-[1.5cm] space-y-0.5">
          <p>{num('1')}. ประชาชนทั่วไปไม่จำกัดความรู้ และวุฒิการศึกษา สามารถอ่านออกเขียนได้</p>
          <p>{num('2')}. มีสัญชาติไทย หรือคนซึ่งไม่มีสัญชาติไทย</p>
          <p>{num('3')}. มีร่างกายแข็งแรง หรือคนพิการที่มีความเหมาะสมในการเรียนวิชาชีพนั้นๆ</p>
        </div>
      </div>

      {/* ── Section 4: Required Documents ── */}
      <div className="mt-2.5 space-y-0.5">
        <p className="font-bold text-[14.5px]">หลักฐานการรับสมัคร</p>
        <div className="pl-[1.5cm] space-y-0.5">
          <p>{num('1')}. สำเนาบัตรประจำตัวประชาชน หรือบัตรประจำตัวคนซึ่งไม่มีสัญชาติไทย หรือหนังสือเดินทาง</p>
          <p>{num('2')}. รูปถ่ายหน้าตรง สวมเสื้อสุภาพ ไม่สวมหมวกหรือแว่นตาดำ ถ่ายไว้ไม่เกิน&nbsp;{num('60')}&nbsp;วัน ขนาด&nbsp;{num('1')}&nbsp;นิ้ว&nbsp;{num('1')}&nbsp;รูป</p>
        </div>
      </div>

      {/* ── Section 5: Location & Contact ── */}
      <div className="mt-2.5 space-y-0.5">
        <p className="font-bold text-[14.5px]">สถานที่รับสมัคร</p>
        <p style={{ textIndent: '1.5cm' }} className="text-justify leading-relaxed">
          วิทยาลัยสารพัดช่างอุดรธานี เลขที่ {num('137')} ถ.อำเภอ ต.หมากแข้ง อ.เมือง จ.อุดรธานี โทร.&nbsp;{num('0-4222-1170')} สนใจติดต่อขอรายละเอียดได้ที่วิทยาลัยสารพัดช่างอุดรธานี ในวันเวลาราชการ หรือที่ Website&nbsp;:&nbsp;www.uptech.ac.th
        </p>
      </div>

      {/* ── Announcement Date ── */}
      <div className="mt-4 text-center">
        <p>{formatAnnounceDate(d.doc_date)}</p>
      </div>

      {/* ── Director Sign-Off ── */}
      <div className="mt-15 flex justify-end pr-8">
        <div className="text-center" style={{ minWidth: '240px' }}>
          <p className="mb-1">({directorName})</p>
          <p>ผู้อำนวยการวิทยาลัยสารพัดช่างอุดรธานี</p>
        </div>
      </div>

      {/* ── Draft Lines ── */}
      {isDraft && (
        <div className="mt-15 flex justify-end text-[12px] leading-snug">
          <div className="text-left w-20">
            <p>/ร่าง</p>
            <p>/พิมพ์</p>
            <p>/ตรวจ</p>
          </div>
        </div>
      )}
    </div>
  );
});

export default CollegeAnnouncementPrint;
