import { forwardRef } from 'react';
import garudaLogo from '../../../assets/Garuda_Emblem_of_Thailand_(Monochrome).svg.webp';

export const GROUP_TYPE_LABELS = {
  normal: 'ปกติ',
  regular: 'ปกติ',
  special: 'แบบพิเศษ',
  project: 'โครงการ',
  vocational: 'ห้องเรียนอาชีพ',
  extra: 'เพิ่มเติม',
};

export function resolveGroupTypeLabel(rawType) {
  if (!rawType) return 'ปกติ';
  if (GROUP_TYPE_LABELS[rawType]) return GROUP_TYPE_LABELS[rawType];
  if (['ปกติ', 'พิเศษ', 'แบบพิเศษ', 'โครงการ', 'ห้องเรียนอาชีพ', 'เพิ่มเติม'].includes(rawType)) {
    return rawType === 'พิเศษ' ? 'แบบพิเศษ' : rawType;
  }
  return rawType;
}

export function toThaiDigits(val) {
  if (val === null || val === undefined || val === '') return '';
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return String(val).replace(/[0-9]/g, (d) => thaiDigits[Number(d)]);
}

function formatThaiDateFull(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  return `${toThaiDigits(date.getDate())} ${thaiMonths[date.getMonth()]} ${toThaiDigits(date.getFullYear() + 543)}`;
}

const OfficialMemoPrint = forwardRef(function OfficialMemoPrint(
  { data = {}, isDraft = false, useThaiDigits = true },
  ref
) {
  const d = data;
  const num = (v) => (useThaiDigits ? toThaiDigits(v) : v);

  const rawType = d.type || 'regular';
  const isRegular = rawType === 'regular' || rawType === 'normal' || rawType === 'ปกติ';
  const term = num(d.term || '1');
  const academicYear = num(d.academic_year || '2569');
  const batchDisplay = num(d.batch_display || `${d.batch_no || '1'}/${d.academic_year || '2569'}`);
  const courseCount = num(d.course_count || '1');
  const docDate = d.doc_date ? formatThaiDateFull(d.doc_date) : (d.doc_date_display || '');
  const docNo = d.doc_no ? num(d.doc_no) : '';
  const groupTypeLabel = resolveGroupTypeLabel(d.group_type_label || d.group_type || d.type);
  const rawDepartmentName = d.department_name || 'อาหาร - ขนม';
  const cleanDepartmentName = rawDepartmentName.replace(/^แผนกวิชา\s*/, '');

  // ── Construct Subject, Paragraphs & Proposal Items based on Mode ──
  let paragraph1 = '';
  let paragraph2 = '';
  let proposalItems = [];

  if (isRegular) {
    paragraph1 = `ตามที่ งานทะเบียน ได้สำรวจความประสงค์ในการเปิดทำการเรียนการสอนหลักสูตรวิชาชีพระยะสั้น ภาคเรียนที่ ${term} ปีการศึกษา ${academicYear} (รุ่นที่ ${batchDisplay}) จากครูผู้สอนเป็นที่เรียบร้อยแล้วนั้น แผนกวิชาต่าง ๆ มีความประสงค์จะขอเปิดทำการเรียนการสอน จำนวน ${courseCount} รายวิชา ตามรายละเอียดในประกาศรับสมัครฯ ที่แนบมาพร้อมนี้`;
    paragraph2 = `ดังนั้น งานทะเบียน จึงได้ดำเนินการจัดทำประกาศรับสมัครนักศึกษาหลักสูตรวิชาชีพระยะสั้น (ปกติ) ภาคเรียนที่ ${term} ปีการศึกษา ${academicYear} (รุ่นที่ ${batchDisplay}) เพื่อประกาศให้ทราบโดยทั่วกัน`;
    proposalItems = [
      `${num('1')}. ทราบ`,
      `${num('2')}. พิจารณาอนุญาต`,
      `${num('3')}. แจ้งฝ่ายวิชาการ งานประชาสัมพันธ์ และงานการเงิน ดำเนินการต่อไป`,
    ];
  } else {
    paragraph1 = `ตามที่ งานพัฒนาหลักสูตรการเรียนการสอน ได้สำรวจความประสงค์ในการเปิดทำการเรียนการสอนหลักสูตรวิชาชีพระยะสั้น (${groupTypeLabel}) ภาคเรียนที่ ${term} ปีการศึกษา ${academicYear} (รุ่นที่ ${batchDisplay}) จากครูผู้สอนเป็นที่เรียบร้อย แผนกวิชา${cleanDepartmentName} มีความประสงค์จะขอเปิดทำการเรียนการสอน จำนวน ${courseCount} รายวิชา ตามรายละเอียดในประกาศรับสมัครฯ ที่แนบมาพร้อมนี้`;
    paragraph2 = `ดังนั้น งานทะเบียน จึงได้ดำเนินการจัดทำประกาศรับสมัครนักศึกษาหลักสูตรวิชาชีพระยะสั้น (${groupTypeLabel}) ภาคเรียนที่ ${term} ปีการศึกษา ${academicYear} (รุ่นที่ ${batchDisplay}) แผนกวิชา${cleanDepartmentName} เพื่อประกาศให้ทราบโดยทั่วกัน`;
    proposalItems = [
      `${num('1')}. ทราบ/ พิจารณาอนุญาต`,
      `${num('2')}. แจ้งฝ่ายวิชาการ งานศูนย์ดิจิทัลและสื่อสารองค์กร`,
    ];
  }

  return (
    <div
      ref={ref}
      className="memo-print-root bg-white text-black font-['Sarabun',sans-serif] select-text"
      style={{
        width: '210mm',
        minHeight: '297mm',
        boxSizing: 'border-box',
        padding: '1.5cm 2.0cm 2.0cm 3.0cm',
        margin: '0 auto',
        fontSize: '13px',
        lineHeight: '1.42',
        color: '#000',
        backgroundColor: '#fff',
      }}
    >
      <style orientation="portrait">{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@100;400;500;600;700&display=swap');

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
          .memo-print-root {
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 1.5cm 2.0cm 2.0cm 3.0cm !important;
            box-sizing: border-box !important;
            font-family: 'Sarabun', 'TH Sarabun New', sans-serif !important;
          }
        }
      `}</style>

      {/* ── Header Zone: Garuda + Title ── */}
      <div className="relative mb-2 flex items-start">
        <img
          src={garudaLogo}
          alt="Garuda"
          style={{ width: '1.5cm', height: '1.5cm' }}
          className="shrink-0 object-contain"
        />
        <div className="absolute inset-x-0 text-center" style={{ top: '0.15cm' }}>
          <h1 className="text-[23px] font-bold text-black tracking-tight">บันทึกข้อความ</h1>
        </div>
      </div>

      {/* ── Metadata Header Rows ── */}
      <div className="mt-2.5 space-y-1.5 text-[13.5px]">
        {/* Row 1: ส่วนราชการ */}
        <div className="flex items-baseline w-full">
          <span className="text-[14.5px] font-bold shrink-0">ส่วนราชการ</span>
          <span className="ml-2 flex-1 border-b border-dotted border-black pb-[1px] pl-1">
            {d.department_agency || 'งานทะเบียน วิทยาลัยสารพัดช่างอุดรธานี'}
          </span>
        </div>

        {/* Row 2: ที่ + วันที่ */}
        <div className="flex items-baseline w-full">
          <div className="flex flex-1 items-baseline">
            <span className="text-[14.5px] font-bold shrink-0">ที่</span>
            <span className="ml-2 flex-1 border-b border-dotted border-black pb-[1px] pl-1">
              {docNo || <span className="invisible">-</span>}
            </span>
          </div>
          <div className="flex flex-1 items-baseline ml-6">
            <span className="text-[14.5px] font-bold shrink-0">วันที่</span>
            <span className="ml-2 flex-1 border-b border-dotted border-black pb-[1px] pl-1 text-center">
              {docDate || <span className="invisible">-</span>}
            </span>
          </div>
        </div>

        {/* Row 3: เรื่อง (Split into 2 neat rows with dotted underlines) */}
        <div className="flex items-start w-full">
          <span className="text-[14.5px] font-bold shrink-0 pt-0.5">เรื่อง</span>
          {isRegular ? (
            <span
              className="ml-2 flex-1 border-b border-dotted border-black pb-[1px] pl-1 leading-snug"
              style={{ whiteSpace: 'break-spaces', wordBreak: 'break-word' }}
            >
              ประกาศรับสมัครนักศึกษาหลักสูตรวิชาชีพระยะสั้น ภาคเรียนที่ {term} ปีการศึกษา {academicYear} (รุ่นที่ {batchDisplay})
            </span>
          ) : (
            <div className="ml-2 flex-1 space-y-1 pl-1 leading-snug">
              <div className="border-b border-dotted border-black pb-[1px]">
                ขออนุญาตประกาศรับสมัครนักศึกษาหลักสูตรวิชาชีพระยะสั้น ({groupTypeLabel})
              </div>
              <div className="border-b border-dotted border-black pb-[1px]">
                ภาคเรียนที่ {term} ปีการศึกษา {academicYear} (รุ่นที่ {batchDisplay}) แผนกวิชา{cleanDepartmentName}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Solid Horizontal Divider Line ── */}
      <div className="mt-2 border-b-2 border-black" />

      {/* ── Salutation & Paragraphs ── */}
      <div className="mt-3.5 space-y-3 text-[13px] leading-relaxed text-justify">
        <div className="flex items-baseline">
          <span className="text-[14.5px] font-bold">เรียน</span>
          <span className="ml-4">ผู้อำนวยการวิทยาลัยสารพัดช่างอุดรธานี</span>
        </div>

        {/* Paragraph 1: First-line indent only */}
        <p style={{ textIndent: '1.5cm' }}>
          {paragraph1}
        </p>

        {/* Paragraph 2: First-line indent only */}
        <p style={{ textIndent: '1.5cm' }}>
          {paragraph2}
        </p>

        {/* Request Block */}
        <div>
          <p style={{ textIndent: '2.5cm' }}>จึงเรียนมาเพื่อโปรด</p>
          <div className="pl-[3.5cm] space-y-0.5 mt-1">
            {proposalItems.map((item, idx) => (
              <p key={idx}>{item}</p>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sign-Off Section ── */}
      <div className="mt-10 flex justify-end pr-6 text-[13px]">
        <div className="text-center" style={{ minWidth: '220px' }}>
          <p className="mb-1">({d.head_registration_name || 'นายอัคเดช พิสัยสวัสดิ์'})</p>
          <p>หัวหน้างานทะเบียน</p>
        </div>
      </div>

      {/* ── Draft Lines (Bottom Right) ── */}
      {isDraft && (
        <div className="mt-60 flex justify-end text-[11.5px] leading-snug">
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

export default OfficialMemoPrint;