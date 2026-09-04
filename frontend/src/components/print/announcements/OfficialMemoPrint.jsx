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

  const term = num(d.term || '1');
  const academicYear = num(d.academic_year || '2569');
  const batchDisplay = num(d.batch_display || `${d.batch_no || '1'}/${d.academic_year || '2569'}`);
  const courseCount = num(d.course_count || '1');
  const docDate = d.doc_date ? formatThaiDateFull(d.doc_date) : (d.doc_date_display || '');
  const docNo = d.doc_no ? num(d.doc_no) : '';
  const groupTypeLabel = resolveGroupTypeLabel(d.group_type_label || d.group_type || d.type);
  const rawDepartmentName = d.department_name || 'อาหาร - ขนม';
  const cleanDepartmentName = rawDepartmentName.replace(/^แผนกวิชา\s*/, '');

  // ── Unified Paragraphs & Proposal Items for All Memorandums ──
  const paragraph1 = `ตามที่ งานพัฒนาหลักสูตรการเรียนการสอน ได้สำรวจความประสงค์ในการเปิดทำการเรียนการสอนหลักสูตรวิชาชีพระยะสั้น (${groupTypeLabel}) ภาคเรียนที่ ${term} ปีการศึกษา ${academicYear} (รุ่นที่ ${batchDisplay}) จากครูผู้สอนเป็นที่เรียบร้อย แผนกวิชา${cleanDepartmentName} มีความประสงค์จะขอเปิดทำการเรียนการสอน จำนวน ${courseCount} รายวิชา ตามรายละเอียดในประกาศรับสมัครฯ ที่แนบมาพร้อมนี้`;
  const paragraph2 = `ดังนั้น งานทะเบียน จึงได้ดำเนินการจัดทำประกาศรับสมัครนักศึกษาหลักสูตรวิชาชีพระยะสั้น (${groupTypeLabel}) ภาคเรียนที่ ${term} ปีการศึกษา ${academicYear} (รุ่นที่ ${batchDisplay}) แผนกวิชา${cleanDepartmentName} เพื่อประกาศให้ทราบโดยทั่วกัน`;
  const proposalItems = [
    `${num('1')}. ทราบ/ พิจารณาอนุญาต`,
    `${num('2')}. แจ้งฝ่ายวิชาการ งานศูนย์ดิจิทัลและสื่อสารองค์กร`,
  ];

  return (
    <div
      ref={ref}
      lang="th"
      className="memo-print-root bg-white text-black font-['TH_Sarabun_PSK','THSarabunPSK',sans-serif] select-text"
      style={{
        width: '210mm',
        minHeight: '297mm',
        boxSizing: 'border-box',
        padding: '1.5cm 2.0cm 2.0cm 3.0cm',
        margin: '0 auto',
        fontSize: '16pt',
        lineHeight: '1',
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

        .memo-print-root,
        .memo-print-root * {
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
          .memo-print-root {
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 1.5cm 2.0cm 2.0cm 3.0cm !important;
            box-sizing: border-box !important;
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

      {/* ── Header Zone: Garuda + Title ── */}
      <div className="relative mb-2 flex items-start">
        <img
          src={garudaLogo}
          alt="Garuda"
          style={{ width: '1.5cm', height: '1.5cm' }}
          className="shrink-0 object-contain"
        />
        <div className="absolute inset-x-0 text-center" style={{ top: '0.15cm' }}>
          <h1 className="text-[29pt] font-bold text-black tracking-tight leading-none">บันทึกข้อความ</h1>
        </div>
      </div>

      {/* ── Metadata Header Rows ── */}
      <div className="mt-2.5 space-y-1.5 text-[16pt]">
        {/* Row 1: ส่วนราชการ */}
        <div className="flex items-baseline w-full">
          <span className="text-[20pt] font-bold shrink-0">ส่วนราชการ</span>
          <span className="ml-2 flex-1 border-b border-dotted border-black pb-[1px] pl-1 text-[16pt] font-normal">
            {d.department_agency || 'งานทะเบียน วิทยาลัยสารพัดช่างอุดรธานี'}
          </span>
        </div>

        {/* Row 2: ที่ + วันที่ */}
        <div className="flex items-baseline w-full">
          <div className="flex flex-1 items-baseline">
            <span className="text-[20pt] font-bold shrink-0">ที่</span>
            <span className="ml-2 flex-1 border-b border-dotted border-black pb-[1px] pl-1 text-[16pt] font-normal">
              {docNo || <span className="invisible">-</span>}
            </span>
          </div>
          <div className="flex flex-1 items-baseline ml-6">
            <span className="text-[20pt] font-bold shrink-0">วันที่</span>
            <span className="ml-2 flex-1 border-b border-dotted border-black pb-[1px] pl-1 text-left text-[16pt] font-normal">
              {docDate || <span className="invisible">-</span>}
            </span>
          </div>
        </div>

        {/* Row 3: เรื่อง (Split into 2 neat rows with dotted underlines) */}
        <div className="flex items-start w-full">
          <span className="text-[20pt] font-bold shrink-0 pt-0.5">เรื่อง</span>
          <div className="ml-2 flex-1 space-y-1 pl-1 leading-snug text-[16pt] font-normal">
            <div className="border-b border-dotted border-black pb-[1px] text-[16pt] font-normal">
              ขออนุญาตประกาศรับสมัครนักศึกษาหลักสูตรวิชาชีพระยะสั้น ({groupTypeLabel})
            </div>
            <div className="border-b border-dotted border-black pb-[1px] text-[16pt] font-normal">
              ภาคเรียนที่ {term} ปีการศึกษา {academicYear} (รุ่นที่ {batchDisplay}) แผนกวิชา{cleanDepartmentName}
            </div>
          </div>
        </div>
      </div>

      {/* ── Solid Horizontal Divider Line ── */}
      <div className="mt-2 border-b-2 border-black" />

      {/* ── Salutation & Paragraphs ── */}
      <div className="mt-3.5 space-y-3 text-[16pt] font-normal leading-relaxed">
        <div className="flex items-baseline text-[16pt]">
          <span className="text-[16pt] font-normal">เรียน</span>
          <span className="ml-4 text-[16pt] font-normal">ผู้อำนวยการวิทยาลัยสารพัดช่างอุดรธานี</span>
        </div>

        {/* Paragraph 1: First-line indent only */}
        <p style={{ textIndent: '1.5cm' }} className="text-[16pt] font-normal thai-distributed">
          {paragraph1}
        </p>

        {/* Paragraph 2: First-line indent only */}
        <p style={{ textIndent: '1.5cm' }} className="text-[16pt] font-normal thai-distributed">
          {paragraph2}
        </p>

        {/* Request Block */}
        <div className="text-[16pt] font-normal">
          <p style={{ textIndent: '1.5cm' }} className="text-[16pt] font-normal">จึงเรียนมาเพื่อโปรด</p>
          <div className="pl-[2.5cm] space-y-0.5 mt-1 text-[16pt] font-normal">
            {proposalItems.map((item, idx) => (
              <p key={idx} className="text-[16pt] font-normal">{item}</p>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sign-Off Section ── */}
      <div className="mt-10 flex justify-end pr-6 text-[16pt] font-normal">
        <div className="text-center" style={{ minWidth: '220px' }}>
          <p className="mb-1 text-[16pt] font-normal">({d.head_registration_name || 'นายอัคเดช พิสัยสวัสดิ์'})</p>
          <p className="text-[16pt] font-normal">หัวหน้างานทะเบียน</p>
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