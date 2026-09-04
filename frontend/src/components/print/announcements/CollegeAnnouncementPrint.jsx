import { forwardRef, useMemo } from 'react';
import garudaLogo from '../../../assets/Garuda_Emblem_of_Thailand_(Monochrome).svg.webp';
import { resolveGroupTypeLabel, toThaiDigits } from './OfficialMemoPrint';
import { formatStudyDaysOnly } from '../../../utils/groupCode';

export const COURSE_RULES_CONFIG = {
  standard: {
    qualifications: [
      'ประชาชนทั่วไปไม่จำกัดความรู้ และวุฒิการศึกษา สามารถอ่านออกเขียนได้',
      'มีสัญชาติไทย หรือคนซึ่งไม่มีสัญชาติไทย',
      'มีร่างกายแข็งแรง หรือคนพิการที่มีความเหมาะสมในการเรียนวิชาชีพนั้นๆ',
    ],
    documents: [
      'สำเนาบัตรประจำตัวประชาชน หรือบัตรประจำตัวคนซึ่งไม่มีสัญชาติไทย หรือหนังสือเดินทาง',
      'รูปถ่ายหน้าตรง สวมเสื้อสุภาพ ไม่สวมหมวกหรือแว่นตาดำ ถ่ายไว้ไม่เกิน ๖๐ วัน ขนาด ๑ นิ้ว ๑ รูป',
    ],
  },
  massage: {
    qualifications: [
      'มีอายุไม่ต่ำกว่า ๑๘ ปีบริบูรณ์',
      'สำเร็จการศึกษาไม่ต่ำกว่าการศึกษาภาคบังคับ',
      'มีสุขภาพร่างกายแข็งแรง ไม่เป็นอุปสรรคต่อการเรียนและการประกอบวิชาชีพนวดไทย',
    ],
    documents: [
      'สำเนาบัตรประจำตัวประชาชน หรือบัตรประจำตัวคนซึ่งไม่มีสัญชาติไทย หรือหนังสือเดินทาง',
      'สำเนาหลักฐานแสดงวุฒิการศึกษาไม่ต่ำกว่าการศึกษาภาคบังคับ',
      'ใบรับรองแพทย์ (ออกให้ไม่เกิน ๑ เดือน แสดงว่าสุขภาพแข็งแรง ไม่เป็นโรคติดต่อร้ายแรง)',
      'รูปถ่ายหน้าตรง สวมเสื้อสุภาพ ไม่สวมหมวกหรือแว่นตาดำ ถ่ายไว้ไม่เกิน ๖๐ วัน ขนาด ๑ นิ้ว ๑ รูป',
    ],
  },
};

export function getCourseRules(data) {
  const combinedText = [
    data?.department_name,
    data?.cleanDepartmentName,
    data?.major_name,
    data?.group_name,
    data?.subject_name,
    ...(data?.groups || []).map((g) => `${g.group_name || ''} ${g.major_name || ''} ${g.subject_name || ''}`),
  ]
    .filter(Boolean)
    .join(' ');

  const isMassage = combinedText.includes('นวด') || combinedText.includes('หัตถเวช');
  return isMassage ? COURSE_RULES_CONFIG.massage : COURSE_RULES_CONFIG.standard;
}

/**
 * Format full date for narrative body sections
 */
function formatThaiDateShort(rawDate, useThaiDigits = true) {
  if (!rawDate) return '................................';

  if (typeof rawDate === 'string' && (rawDate.includes('มกราคม') || rawDate.includes('พ.ศ.'))) {
    return useThaiDigits ? toThaiDigits(rawDate) : rawDate;
  }

  const date = new Date(rawDate);
  if (isNaN(date.getTime())) return '................................';

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const d = date.getDate();
  const month = thaiMonths[date.getMonth()];
  const y = date.getFullYear() > 2500 ? date.getFullYear() : date.getFullYear() + 543;

  const day = useThaiDigits ? toThaiDigits(d) : d;
  const year = useThaiDigits ? toThaiDigits(y) : y;

  return `${day} ${month} พ.ศ.\u00A0${year}`;
}

/**
 * Format short abbreviated Thai date for course table cells (e.g. "๑๙ ต.ค. ๖๙")
 */
export function formatThaiDateAbbr(rawDate, useThaiDigits = true) {
  if (!rawDate) return '-';

  const thaiMonthsShort = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  if (typeof rawDate === 'string') {
    for (const m of thaiMonthsShort) {
      if (rawDate.includes(m)) {
        return useThaiDigits ? toThaiDigits(rawDate) : rawDate;
      }
    }
  }

  const date = new Date(rawDate);
  if (isNaN(date.getTime())) return '-';

  const d = date.getDate();
  const m = thaiMonthsShort[date.getMonth()];
  const y = date.getFullYear() > 2500 ? date.getFullYear() : date.getFullYear() + 543;
  const shortYear = String(y).slice(-2);

  const dayStr = useThaiDigits ? toThaiDigits(d) : d;
  const yearStr = useThaiDigits ? toThaiDigits(shortYear) : shortYear;

  return `${dayStr} ${m} ${yearStr}`;
}

/**
 * Display only instructor's first name: strip titles/prefixes and omit surname
 */
export function sanitizeTeacherFirstName(rawName) {
  if (!rawName || typeof rawName !== 'string') return '-';

  let name = rawName.trim();
  name = name.replace(/^(นาย|นางสาว|นาง|น\.ส\.|ดร\.|ผศ\.ดร\.|ผศ\.|รศ\.ดร\.|รศ\.|ศ\.|อ\.|อาจารย์|ครู)\s*/, '');

  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '-';

  return parts[0];
}

/**
 * Format contact telephone number with consistent hyphenation and Thai numerals
 */
export function formatPhoneNumber(phone, useThaiDigits = true) {
  if (!phone) return '';
  const str = String(phone).trim();
  const digitsOnly = str.replace(/\D/g, '');
  let formatted = str;
  if (digitsOnly.length === 10) {
    formatted = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  } else if (digitsOnly.length === 9) {
    formatted = `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2, 5)}-${digitsOnly.slice(5)}`;
  }
  return useThaiDigits ? toThaiDigits(formatted) : formatted;
}

/**
 * Exact Course Fee Calculation Formula (Per-Row):
 * - Application/Registration Fee: 10 THB flat per course.
 * - Tuition Fee: 1 THB per hour (hours * 1).
 * - Air Conditioning Fee (ค่าแอร์): If the study group or course has air conditioning enabled
 *   (has_air_con / is_air_conditioned / is_ac_maintenance_fee), calculate at 5 THB per hour (hours * 5). Otherwise, 0 THB.
 * - Total Fee per Course = 10 + (hours * 1) + (has_air_con ? (hours * 5) : 0).
 */
export function calculateCourseFee(course, studyGroup = {}) {
  if (!course && !studyGroup) return 0;

  const c = course || {};
  const g = studyGroup || {};

  // If waived fee / free tuition
  const isWaived = Boolean(c.is_waived_fee || c.is_free_tuition || g.is_waived_fee || g.is_free_tuition);
  if (isWaived) return 0;

  const subjectObj = c.subjects || c.subject || {};
  const hours = Number(c.hours ?? c.total_hours ?? subjectObj.total_hours ?? g.total_hours ?? 0);

  // Check air conditioning enabled
  const hasAirCon = Boolean(
    c.has_air_con ??
    c.is_air_conditioned ??
    c.is_ac_maintenance_fee ??
    c.is_ac ??
    g.has_air_con ??
    g.is_air_conditioned ??
    g.is_ac_maintenance_fee ??
    g.is_ac ??
    false
  );

  const appFee = 10;
  const tuitionFee = hours * 1;
  const airConFee = hasAirCon ? hours * 5 : 0;

  const total = appFee + tuitionFee + airConFee;
  return Number.isNaN(total) ? 0 : total;
}

export const getCourseFee = calculateCourseFee;

function formatAnnounceDate(rawDate, useThaiDigits = true) {
  if (!rawDate) {
    const now = new Date();
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const d = now.getDate();
    const m = thaiMonths[now.getMonth()];
    const y = now.getFullYear() > 2500 ? now.getFullYear() : now.getFullYear() + 543;
    const day = useThaiDigits ? toThaiDigits(d) : d;
    const year = useThaiDigits ? toThaiDigits(y) : y;
    return `ประกาศ ณ วันที่ ${day} เดือน ${m} พุทธศักราช ${year}`;
  }

  if (typeof rawDate === 'string' && rawDate.includes('ประกาศ ณ วันที่')) {
    return useThaiDigits ? toThaiDigits(rawDate) : rawDate;
  }

  const date = new Date(rawDate);
  const validDate = isNaN(date.getTime()) ? new Date() : date;
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const d = validDate.getDate();
  const m = thaiMonths[validDate.getMonth()];
  const y = validDate.getFullYear() > 2500 ? validDate.getFullYear() : validDate.getFullYear() + 543;
  const day = useThaiDigits ? toThaiDigits(d) : d;
  const year = useThaiDigits ? toThaiDigits(y) : y;
  return `ประกาศ ณ วันที่ ${day} เดือน ${m} พุทธศักราช ${year}`;
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
  const groupTypeLabel = resolveGroupTypeLabel(d.group_type_label || d.group_type || d.type);
  const rawDepartmentName = d.department_name || d.major_name || '';
  const cleanDepartmentName = rawDepartmentName.replace(/^แผนกวิชา\s*/, '');

  // Robust date resolving
  const rawApplyStart =
    d.admit_open_date ||
    d.apply_start_date ||
    d.registration_start_date ||
    d.reg_start_date ||
    d.batch_start_date ||
    d.start_date;
  const rawApplyEnd =
    d.admit_close_date ||
    d.apply_end_date ||
    d.registration_end_date ||
    d.reg_end_date ||
    d.batch_end_date ||
    d.end_date;
  const rawStudyOpen =
    d.study_open_date ||
    d.study_start_date ||
    d.course_start_date ||
    d.start_date ||
    d.batch_start_date;

  const applyStartDate = formatThaiDateShort(rawApplyStart, useThaiDigits);
  const applyEndDate = formatThaiDateShort(rawApplyEnd, useThaiDigits);
  const studyOpenDate = formatThaiDateShort(rawStudyOpen, useThaiDigits);

  // Dynamic course rows builder with exact fee calculation
  const courseRows = useMemo(() => {
    const rawGroups =
      Array.isArray(d.groups) && d.groups.length > 0
        ? d.groups
        : d.group
          ? [d.group]
          : [d];

    const rows = [];
    rawGroups.forEach((g) => {
      const subjects = g.subjects_in_group || g.subjects || [];
      const teacherPhone =
        g.teacher_phone ||
        g.teachers?.phone ||
        g.teacher?.phone ||
        g.phone ||
        d.teacher_phone ||
        d.phone ||
        '';
      const teacherName = g.teacher_first_name || g.teacher_name || d.teacher_name || '-';

      if (subjects.length > 0) {
        subjects.forEach((s) => {
          const subjectData = s.subjects || s;
          const hours = Number(subjectData.total_hours || s.total_hours || g.total_hours || 75);
          const isExempt = Boolean(s.is_waived_fee || s.is_free_tuition || g.is_waived_fee || g.is_free_tuition);

          const courseItem = {
            ...g,
            ...subjectData,
            ...s,
            hours,
            total_hours: hours,
            is_waived_fee: isExempt,
          };

          const calculatedFee = calculateCourseFee(courseItem, g);

          rows.push({
            id: s.id || `${g.id}-${subjectData.subject_code}`,
            subject_code: subjectData.subject_code || s.moe_code || s.subject_code || g.group_code || '-',
            subject_name: subjectData.name_th || s.name_th || g.group_name || '-',
            hours: hours,
            fee: calculatedFee,
            total_fee: calculatedFee,
            is_waived_fee: isExempt,
            max_seats: Number(g.max_seats || 20),
            start_date: g.start_date || d.study_open_date || d.start_date,
            teacher_name: s.teacher_name || teacherName,
            teacher_phone: teacherPhone,
            study_group: g,
            has_air_con: Boolean(s.has_air_con ?? s.is_air_conditioned ?? g.is_ac_maintenance_fee ?? g.has_air_con ?? false),
          });
        });
      } else if (g.group_code || g.group_name || g.name_th) {
        const hours = Number(g.total_hours || 75);
        const isExempt = Boolean(g.is_waived_fee || g.is_free_tuition);
        const courseItem = {
          ...g,
          hours,
          total_hours: hours,
          is_waived_fee: isExempt,
        };

        const calculatedFee = calculateCourseFee(courseItem, g);

        rows.push({
          id: g.id || 'single-row',
          subject_code: g.subject_code || g.group_code || '-',
          subject_name: g.subject_name || g.group_name || g.name_th || '-',
          hours: hours,
          fee: calculatedFee,
          total_fee: calculatedFee,
          is_waived_fee: isExempt,
          max_seats: Number(g.max_seats || 20),
          start_date: g.start_date || d.study_open_date || d.start_date,
          teacher_name: teacherName,
          teacher_phone: teacherPhone,
          study_group: g,
          has_air_con: Boolean(g.is_ac_maintenance_fee ?? g.has_air_con ?? false),
        });
      }
    });

    return rows;
  }, [d]);

  // Single-Course vs. Multi-Course Summary Logic for Hours
  const totalHours = useMemo(() => {
    if (!courseRows || courseRows.length === 0) return 0;
    if (courseRows.length === 1) {
      return Number(courseRows[0].hours) || 0;
    }
    return courseRows.reduce((sum, r) => sum + (Number(r.hours) || 0), 0);
  }, [courseRows]);

  // Primary group & teacher phone contact
  const primaryGroup = (Array.isArray(d.groups) && d.groups[0]) || d.group || d;

  // Single-Course vs. Multi-Course Summary Logic for Fees
  const totalFee = useMemo(() => {
    if (!courseRows || courseRows.length === 0) return 0;

    // Single-Course: take that single course's calculated total fee directly without redundant looping
    if (courseRows.length === 1) {
      const single = courseRows[0];
      if (single.is_waived_fee) return 0;
      return typeof single.fee === 'number'
        ? single.fee
        : calculateCourseFee(single, single.study_group || primaryGroup);
    }

    // Multi-Course: aggregate the sum dynamically across all rows using reduce
    return courseRows.reduce((sum, course) => {
      if (course.is_waived_fee) return sum;
      const fee = typeof course.fee === 'number'
        ? course.fee
        : calculateCourseFee(course, course.study_group || primaryGroup);
      return sum + (fee || 0);
    }, 0);
  }, [courseRows, primaryGroup]);

  // Dynamic rules based on course type (Standard vs Massage)
  const rules = useMemo(() => getCourseRules(d), [d]);

  // Study schedule details from primary group
  const studyDaysText =
    Array.isArray(primaryGroup.study_days) && primaryGroup.study_days.length > 0
      ? formatStudyDaysOnly(primaryGroup.study_days)
      : primaryGroup.schedule_description || '';

  let studyTimeText = '';
  if (primaryGroup.custom_start_time && primaryGroup.custom_end_time) {
    studyTimeText = `${primaryGroup.custom_start_time} - ${primaryGroup.custom_end_time} น.`;
  } else if (primaryGroup.time_slot_range || primaryGroup.time_range) {
    studyTimeText = primaryGroup.time_slot_range || primaryGroup.time_range;
  }

  // Contact phone of teacher
  const contactPhone = useMemo(() => {
    return (
      courseRows.find((r) => r.teacher_phone)?.teacher_phone ||
      primaryGroup?.teacher_phone ||
      primaryGroup?.teachers?.phone ||
      primaryGroup?.teacher?.phone ||
      primaryGroup?.phone ||
      d?.teacher_phone ||
      d?.phone ||
      ''
    );
  }, [courseRows, primaryGroup, d]);

  return (
    <div
      ref={ref}
      lang="th"
      className="announcement-print-root bg-white text-black font-['TH_Sarabun_PSK','THSarabunPSK',sans-serif] select-text"
      style={{
        width: '210mm',
        minHeight: '297mm',
        boxSizing: 'border-box',
        padding: '1.5cm 2.0cm 1.5cm 2.0cm',
        margin: '0 auto',
        fontSize: '16pt',
        lineHeight: '1.45',
        color: '#000',
        backgroundColor: '#fff',
        fontFamily: "'TH Sarabun PSK', 'THSarabunPSK', sans-serif",
      }}
    >
      <style orientation="portrait">{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        html, body {
          font-family: 'TH Sarabun PSK', 'THSarabunPSK', sans-serif;
        }

        .announcement-print-root,
        .announcement-print-root * {
          font-family: 'TH Sarabun PSK', 'THSarabunPSK', sans-serif !important;
        }

        .thai-distributed {
          text-align: justify;
          text-justify: distribute;
          text-justify: inter-character;
          text-justify: inter-cluster;
          text-align-last: left;
          -webkit-hyphens: none;
          hyphens: none;
          word-break: normal;
          overflow-wrap: break-word;
        }

        @media print {
          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            font-family: 'TH Sarabun PSK', 'THSarabunPSK', sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .announcement-print-root {
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 1.5cm 2.0cm 1.5cm 2.0cm !important;
            box-sizing: border-box !important;
            font-family: 'TH Sarabun PSK', 'THSarabunPSK', sans-serif !important;
          }
          table, th, td {
            font-family: 'TH Sarabun PSK', 'THSarabunPSK', sans-serif !important;
          }
          .thai-distributed {
            text-align: justify !important;
            text-justify: distribute !important;
            text-justify: inter-character !important;
            text-justify: inter-cluster !important;
            text-align-last: left !important;
            -webkit-hyphens: none !important;
            hyphens: none !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
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
      <div className="text-center space-y-1 mb-2">
        <h1 className="text-[18pt] font-bold tracking-tight">ประกาศวิทยาลัยสารพัดช่างอุดรธานี</h1>
        <p className="text-[16pt] font-normal">
          เรื่อง การรับสมัครนักศึกษาหลักสูตรวิชาชีพระยะสั้น ({groupTypeLabel}) <br /> ภาคเรียนที่ {term} ปีการศึกษา {academicYear} (รุ่นที่ {batchDisplay}){cleanDepartmentName ? ` แผนกวิชา${cleanDepartmentName}` : ''}
        </p>
        <div className="w-4/5 mx-auto border-b border-dotted border-black pt-1" />
      </div>

      {/* ── Body Preamble ── */}
      <div className="leading-relaxed text-[16pt] font-normal">
        <p style={{ textIndent: '1.5cm' }} className="thai-distributed leading-relaxed text-[16pt] font-normal">
          ด้วยวิทยาลัยสารพัดช่างอุดรธานี สังกัดสำนักงานคณะกรรมการการอาชีวศึกษา กระทรวงศึกษาธิการ ได้เปิดรับสมัครนักศึกษาหลักสูตรวิชาชีพระยะสั้น เพื่อสนองความต้องการของตลาดแรงงาน ช่วยเสริมสร้างคุณภาพชีวิตของประชาชนให้ดีขึ้น สามารถนำไปใช้ในชีวิตประจำวัน หรือประกอบอาชีพได้ จึงประกาศรับสมัครนักศึกษาเข้าเรียน <br /> ภาคเรียนที่ {term} ปีการศึกษา {academicYear} (รุ่นที่ {batchDisplay}) {cleanDepartmentName ? ` แผนกวิชา${cleanDepartmentName}` : ''} ตามรายละเอียดดังนี้
        </p>
      </div>

      {/* ── Section 1: Course Details Table ── */}
      <div className="mt-2 space-y-0.5 text-[16pt]">
        <table className="w-full border-collapse text-center text-[15pt] leading-snug border border-black my-1">
          <thead>
            <tr className="border-t border-b border-black bg-slate-50 font-bold text-[15pt]">
              <th className="border-l border-r border-black p-0.5 w-7 font-bold">ที่</th>
              <th className="border-r border-black p-0.5 w-24 font-bold">รหัสวิชา</th>
              <th className="border-r border-black p-0.5 text-center font-bold">ชื่อวิชา</th>
              <th className="border-r border-black p-0.5 w-14 font-bold">จำนวน<br />ชั่วโมง</th>
              <th className="border-r border-black p-0.5 w-16 font-bold">ค่าเรียน<br />(บาท)</th>
              <th className="border-r border-black p-0.5 w-12 font-bold">จำนวน<br />ที่รับ</th>
              <th className="border-r border-black p-0.5 w-20 font-bold">วันเปิดเรียน</th>
              <th className="border-r border-black p-0.5 w-24 font-bold">ผู้สอน</th>
            </tr>
          </thead>
          <tbody>
            {courseRows.length === 0 ? (
              <tr>
                <td colSpan="8" className="border border-black py-4 text-slate-400 font-normal text-[15pt]">
                  ไม่มีข้อมูลรายวิชา
                </td>
              </tr>
            ) : (
              courseRows.map((row, idx) => (
                <tr key={row.id || idx} className="border-b border-black text-[15pt] font-normal">
                  <td className="border-l border-r border-black py-0.5 px-1">{num(idx + 1)}</td>
                  <td className="border-r border-black py-0.5 px-1 font-mono">{num(row.subject_code)}</td>
                  <td className="border-r border-black py-0.5 px-1.5 text-left">{row.subject_name}</td>
                  <td className="border-r border-black py-0.5 px-1">{num(row.hours)}</td>
                  <td className="border-r border-black py-0.5 px-1">
                    {row.is_waived_fee ? '-' : num((row.fee ?? 0).toLocaleString())}
                  </td>
                  <td className="border-r border-black py-0.5 px-1">{num(row.max_seats)}</td>
                  <td className="border-r border-black py-0.5 px-1 text-[13pt] whitespace-nowrap">
                    {formatThaiDateAbbr(row.start_date, useThaiDigits)}
                  </td>
                  <td className="border-r border-black py-0.5 px-1 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                    {sanitizeTeacherFirstName(row.teacher_name)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-b border-black font-bold bg-slate-50/50 text-[15pt]">
              {/* Columns 1-3: ที่, รหัสวิชา, ชื่อวิชา merged */}
              <td colSpan={3} className="border-l border-r border-black py-0.5 px-2 text-center font-bold">
                รวม
              </td>
              {/* Column 4: จำนวนชั่วโมง */}
              <td className="border-r border-black py-0.5 px-1 text-center font-bold">
                {num(totalHours)}
              </td>
              {/* Column 5: ค่าเรียน */}
              <td className="border-r border-black py-0.5 px-1 text-center font-bold">
                {totalFee === 0 && courseRows.every((r) => r.is_waived_fee)
                  ? '-'
                  : num((totalFee ?? 0).toLocaleString())}
              </td>
              {/* Columns 6-8: จำนวนที่รับ, วันเปิดเรียน, ผู้สอน merged */}
              <td colSpan={3} className="border-r border-black py-0.5 px-2 text-center font-semibold">
                {contactPhone ? `ติดต่อผู้สอน โทร. ${formatPhoneNumber(contactPhone, useThaiDigits)}` : 'ติดต่อผู้สอน'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Section 2: Schedule ── */}
      <div className="mt-2 space-y-0.5 text-[16pt] font-normal">
        <p className="font-bold text-[18pt]">กำหนดการรับสมัครและวัน/เวลาเรียน</p>
        <div className="pl-[1.5cm] space-y-0.5 text-[16pt] font-normal">
          <p>รับสมัคร ตั้งแต่วันที่ {applyStartDate} ถึงวันที่ {applyEndDate}</p>
          <p>
            เปิดเรียนวันที่ {studyOpenDate}
            {studyDaysText || studyTimeText ? (
              <span>
                {studyDaysText ? ` เรียนวัน${num(studyDaysText)}` : ''}
                {studyTimeText ? ` เวลา ${num(studyTimeText)}` : ''}
              </span>
            ) : (
              <>
                <span> {num('1')}. รอบเช้า &nbsp;เวลา {num('09.00')} - {num('12.00')} น.</span>
                <span> {num('2')}. รอบบ่าย เวลา {num('13.00')} - {num('16.00')} น.</span>
                <span> {num('3')}. รอบค่ำ &nbsp;เวลา {num('16.00')} - {num('19.00')} น.</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* ── Section 3: Qualifications ── */}
      <div className="mt-2 space-y-0.5 text-[16pt] font-normal">
        <p className="font-bold text-[18pt]">คุณสมบัติของผู้สมัคร</p>
        <div className="pl-[1.5cm] space-y-0.5 text-[16pt] font-normal">
          {rules.qualifications.map((q, idx) => (
            <p key={idx}>
              {num(idx + 1)}. {useThaiDigits ? toThaiDigits(q) : q}
            </p>
          ))}
        </div>
      </div>

      {/* ── Section 4: Required Documents ── */}
      <div className="mt-2 space-y-0.5 text-[16pt] font-normal">
        <p className="font-bold text-[18pt]">หลักฐานการรับสมัคร</p>
        <div className="pl-[1.5cm] space-y-0.5 text-[16pt] font-normal">
          {rules.documents.map((doc, idx) => (
            <p key={idx}>
              {num(idx + 1)}. {useThaiDigits ? toThaiDigits(doc) : doc}
            </p>
          ))}
        </div>
      </div>

      {/* ── Section 5: Location & Contact ── */}
      <div className="mt-2 space-y-0.5 text-[16pt] font-normal">
        <p className="font-bold text-[18pt]">สถานที่รับสมัคร</p>
        <p style={{ textIndent: '1.5cm' }} className="thai-distributed leading-relaxed text-[16pt] font-normal">
          วิทยาลัยสารพัดช่างอุดรธานี เลขที่ {num('137')} ถ.อำเภอ ต.หมากแข้ง อ.เมือง จ.อุดรธานี โทร.&nbsp;{num('0-4222-1170')} สนใจติดต่อขอรายละเอียดได้ที่วิทยาลัยสารพัดช่างอุดรธานี ในวันเวลาราชการ หรือที่ Website&nbsp;:&nbsp;www.uptech.ac.th
        </p>
      </div>

      {/* ── Announcement Date ── */}
      <div className="mt-3 text-center text-[16pt] font-normal">
        <p>{formatAnnounceDate(d.doc_date, useThaiDigits)}</p>
      </div>

      {/* ── Director Sign-Off ── */}
      <div className="mt-6 flex justify-end pr-8 text-[16pt] font-normal">
        <div className="text-center" style={{ minWidth: '240px' }}>
          <p className="mb-1">({directorName})</p>
          <p>ผู้อำนวยการวิทยาลัยสารพัดช่างอุดรธานี</p>
        </div>
      </div>

      {/* ── Draft Lines ── */}
      {isDraft && (
        <div className="mt-4 flex justify-end text-[12pt] font-normal leading-snug">
          <div className="text-left w-20">
            <p>/ร่าง</p>
            <p>{d.typist_name ? `${d.typist_name}/พิมพ์` : '/พิมพ์'}</p>
            <p>/ตรวจ</p>
          </div>
        </div>
      )}
    </div>
  );
});

export default CollegeAnnouncementPrint;
