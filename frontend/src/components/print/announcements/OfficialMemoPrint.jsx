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

function formatThaiDateFull(rawDate, useThaiDigits = true) {
  if (!rawDate) return '';
  const num = (v) => (useThaiDigits ? toThaiDigits(v) : v);

  if (
    typeof rawDate === 'string' &&
    (rawDate.includes('มกราคม') ||
      rawDate.includes('กุมภาพันธ์') ||
      rawDate.includes('มีนาคม') ||
      rawDate.includes('เมษายน') ||
      rawDate.includes('พฤษภาคม') ||
      rawDate.includes('มิถุนายน') ||
      rawDate.includes('กรกฎาคม') ||
      rawDate.includes('สิงหาคม') ||
      rawDate.includes('กันยายน') ||
      rawDate.includes('ตุลาคม') ||
      rawDate.includes('พฤศจิกายน') ||
      rawDate.includes('ธันวาคม'))
  ) {
    const cleaned = rawDate.replace(/^วันที่\s*/, '').replace(/พ\.ศ\.\s*/, '');
    return num(cleaned);
  }

  const date = new Date(rawDate);
  if (isNaN(date.getTime())) return num(rawDate);

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];
  const day = num(date.getDate());
  const month = thaiMonths[date.getMonth()];
  const year = num(date.getFullYear() > 2500 ? date.getFullYear() : date.getFullYear() + 543);
  return `${day} ${month} ${year}`;
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
  const docDate = d.doc_date
    ? formatThaiDateFull(d.doc_date, useThaiDigits)
    : d.doc_date_display
    ? formatThaiDateFull(d.doc_date_display, useThaiDigits)
    : '';
  const docNo = d.doc_no ? num(d.doc_no) : '';
  const groupTypeLabel = resolveGroupTypeLabel(d.group_type_label || d.group_type || d.type);
  const rawDepartmentName = d.department_name || 'อาหาร - ขนม';
  const cleanDepartmentName = rawDepartmentName.replace(/^แผนกวิชา\s*/, '');

  // ── Construct Subject, Paragraphs & Proposal Items ──
  let subject = '';
  let paragraph1 = '';
  let paragraph2 = '';
  let proposalItems = [];

  if (isRegular) {
    subject = `ประกาศรับสมัครนักศึกษาหลักสูตรวิชาชีพระยะสั้น ภาคเรียนที่ ${term} ปีการศึกษา ${academicYear} (รุ่นที่ ${batchDisplay})`;
    paragraph1 = `ตามที่ งานทะเบียน ได้สำรวจความประสงค์ในการเปิดทำการเรียนการสอนหลักสูตรวิชาชีพระยะสั้น ภาคเรียนที่ ${term} ปีการศึกษา ${academicYear} (รุ่นที่ ${batchDisplay}) จากครูผู้สอนเป็นที่เรียบร้อยแล้วนั้น แผนกวิชาต่าง ๆ มีความประสงค์จะขอเปิดทำการเรียนการสอน จำนวน ${courseCount} รายวิชา ตามรายละเอียดในประกาศรับสมัครฯ ที่แนบมาพร้อมนี้`;
    paragraph2 = `ดังนั้น งานทะเบียน จึงได้ดำเนินการจัดทำประกาศรับสมัครนักศึกษาหลักสูตรวิชาชีพระยะสั้น (ปกติ) ภาคเรียนที่ ${term} ปีการศึกษา ${academicYear} (รุ่นที่ ${batchDisplay}) เพื่อประกาศให้ทราบโดยทั่วกัน`;
    proposalItems = [
      `${num('1')}. ทราบ`,
      `${num('2')}. พิจารณาอนุญาต`,
      `${num('3')}. แจ้งฝ่ายวิชาการ งานประชาสัมพันธ์ และงานการเงิน ดำเนินการต่อไป`,
    ];
  } else {
    subject = `ขออนุญาตประกาศรับสมัครนักศึกษาหลักสูตรวิชาชีพระยะสั้น (${groupTypeLabel}) ภาคเรียนที่ ${term} ปีการศึกษา ${academicYear} (รุ่นที่ ${batchDisplay}) แผนกวิชา${cleanDepartmentName}`;
    paragraph1 = `ตามที่ งานพัฒนาหลักสูตรการเรียนการสอน ได้สำรวจความประสงค์ในการเปิดทำการเรียนการสอนหลักสูตรวิชาชีพระยะสั้น (${groupTypeLabel}) ภาคเรียนที่ ${term} ปีการศึกษา ${academicYear} (รุ่นที่ ${batchDisplay}) จากครูผู้สอนเป็นที่เรียบร้อย แผนกวิชา${cleanDepartmentName} มีความประสงค์จะขอเปิดทำการเรียนการสอน จำนวน ${courseCount} รายวิชา ตามรายละเอียดในประกาศรับสมัครฯ ที่แนบมาพร้อมนี้`;
    paragraph2 = `ดังนั้น งานทะเบียน จึงได้ดำเนินการจัดทำประกาศรับสมัครนักศึกษาหลักสูตรวิชาชีพระยะสั้น (${groupTypeLabel}) ภาคเรียนที่ ${term} ปีการศึกษา ${academicYear} (รุ่นที่ ${batchDisplay}) แผนกวิชา${cleanDepartmentName} เพื่อประกาศให้ทราบโดยทั่วกัน`;
    proposalItems = [
      `${num('1')}. ทราบ/ พิจารณาอนุญาต`,
      `${num('2')}. แจ้งฝ่ายวิชาการ งานศูนย์ดิจิทัลและสื่อสารองค์กร`,
    ];
  }

  // Ensure all texts undergo Thai digit conversion if useThaiDigits is active
  if (useThaiDigits) {
    subject = toThaiDigits(subject);
    paragraph1 = toThaiDigits(paragraph1);
    paragraph2 = toThaiDigits(paragraph2);
    proposalItems = proposalItems.map((item) => toThaiDigits(item));
  }

  return (
    <div
      ref={ref}
      className="official-memo-print-page bg-white text-black select-text"
      style={{
        width: '210mm',
        minHeight: '297mm',
        boxSizing: 'border-box',
        padding: '1.5cm 2.0cm 2.0cm 3.0cm',
        margin: '0 auto',
        fontSize: '16pt',
        lineHeight: 1.25,
        color: '#000000',
        backgroundColor: '#ffffff',
        fontFamily: "'TH Sarabun PSK', 'TH Sarabun New', sans-serif",
      }}
    >
      <style>{`
        @font-face {
          font-family: 'TH Sarabun PSK';
          font-style: normal;
          font-weight: 400;
          src: url('/fonts/THSARABUN.TTF') format('truetype'),
               local('TH Sarabun PSK'),
               local('TH Sarabun New');
        }

        @font-face {
          font-family: 'TH Sarabun PSK';
          font-style: normal;
          font-weight: 700;
          src: url('/fonts/THSARABUN BOLD.TTF') format('truetype'),
               local('TH Sarabun PSK Bold'),
               local('TH Sarabun New Bold');
        }

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
          .official-memo-print-page {
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 1.5cm 2.0cm 2.0cm 3.0cm !important;
            box-sizing: border-box !important;
            font-family: 'TH Sarabun PSK', 'TH Sarabun New', sans-serif !important;
          }
        }
      `}</style>

      {/* ── 1. Header Zone: Garuda Emblem (Left) & Memo Title (Center) ── */}
      <div
        style={{
          position: 'relative',
          minHeight: '1.5cm',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={garudaLogo}
          alt="Garuda Emblem"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '1.5cm',
            width: 'auto',
          }}
        />
        <h1
          style={{
            fontSize: '29pt',
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1,
            margin: 0,
            fontFamily: "'TH Sarabun PSK', 'TH Sarabun New', sans-serif",
          }}
        >
          บันทึกข้อความ
        </h1>
      </div>

      {/* ── 2. Metadata Header Rows (Gaps: margin-top: 22pt) ── */}
      {/* Row 1: ส่วนราชการ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          marginTop: '22pt',
          lineHeight: 1.25,
        }}
      >
        <span
          style={{
            fontSize: '20pt',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          ส่วนราชการ
        </span>
        <span
          style={{
            fontSize: '16pt',
            fontWeight: 'normal',
            marginLeft: '0.3cm',
            flex: 1,
          }}
        >
          {d.department_agency || 'งานทะเบียน วิทยาลัยสารพัดช่างอุดรธานี'}
        </span>
      </div>

      {/* Row 2: ที่ + วันที่ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          marginTop: '22pt',
          lineHeight: 1.25,
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'baseline',
          }}
        >
          <span
            style={{
              fontSize: '20pt',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            ที่
          </span>
          <span
            style={{
              fontSize: '16pt',
              fontWeight: 'normal',
              marginLeft: '0.3cm',
            }}
          >
            {docNo}
          </span>
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'baseline',
          }}
        >
          <span
            style={{
              fontSize: '20pt',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            วันที่
          </span>
          <span
            style={{
              fontSize: '16pt',
              fontWeight: 'normal',
              marginLeft: '0.3cm',
            }}
          >
            {docDate}
          </span>
        </div>
      </div>

      {/* Row 3: เรื่อง */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          marginTop: '22pt',
          lineHeight: 1.25,
        }}
      >
        <span
          style={{
            fontSize: '20pt',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            lineHeight: 1.25,
          }}
        >
          เรื่อง
        </span>
        <span
          style={{
            fontSize: '16pt',
            fontWeight: 'normal',
            marginLeft: '0.3cm',
            flex: 1,
            lineHeight: 1.25,
            paddingTop: '2pt',
            wordBreak: 'break-word',
          }}
        >
          {subject}
        </span>
      </div>

      {/* ── Solid Horizontal Line Below Header ── */}
      <div
        style={{
          marginTop: '8pt',
          borderBottom: '1.5pt solid #000000',
        }}
      />

      {/* ── 3. Salutation: เรียน (Gap: margin-top: 22pt) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          marginTop: '22pt',
          lineHeight: 1.25,
        }}
      >
        <span
          style={{
            fontSize: '16pt',
            fontWeight: 'normal',
            whiteSpace: 'nowrap',
          }}
        >
          เรียน
        </span>
        <span
          style={{
            fontSize: '16pt',
            fontWeight: 'normal',
            marginLeft: '0.5cm',
          }}
        >
          ผู้อำนวยการวิทยาลัยสารพัดช่างอุดรธานี
        </span>
      </div>

      {/* ── 4. Body Paragraphs (Indent: 2.5cm, Gap: margin-top: 22pt, Justified) ── */}
      {/* ภาคเหตุ (Paragraph 1) */}
      <p
        style={{
          marginTop: '22pt',
          marginBottom: 0,
          textIndent: '2.5cm',
          textAlign: 'justify',
          textJustify: 'inter-cluster',
          lineHeight: 1.25,
          fontSize: '16pt',
          fontWeight: 'normal',
          wordBreak: 'break-word',
        }}
      >
        {paragraph1}
      </p>

      {/* ภาคความประสงค์ (Paragraph 2) */}
      <p
        style={{
          marginTop: '22pt',
          marginBottom: 0,
          textIndent: '2.5cm',
          textAlign: 'justify',
          textJustify: 'inter-cluster',
          lineHeight: 1.25,
          fontSize: '16pt',
          fontWeight: 'normal',
          wordBreak: 'break-word',
        }}
      >
        {paragraph2}
      </p>

      {/* ภาคสรุป (Conclusion) */}
      <div style={{ marginTop: '22pt' }}>
        <p
          style={{
            margin: 0,
            textIndent: '2.5cm',
            textAlign: 'justify',
            textJustify: 'inter-cluster',
            lineHeight: 1.25,
            fontSize: '16pt',
            fontWeight: 'normal',
          }}
        >
          จึงเรียนมาเพื่อโปรด
        </p>
        <div style={{ paddingLeft: '3.5cm', marginTop: '4pt' }}>
          {proposalItems.map((item, idx) => (
            <p
              key={idx}
              style={{
                margin: 0,
                lineHeight: 1.25,
                fontSize: '16pt',
                fontWeight: 'normal',
              }}
            >
              {item}
            </p>
          ))}
        </div>
      </div>

      {/* ── 5. Signature Block (4 Enter = margin-top: 64pt, Right-of-center) ── */}
      <div
        style={{
          marginTop: '64pt',
          marginLeft: '8.0cm',
          width: '8.0cm',
          textAlign: 'center',
          fontSize: '16pt',
          fontWeight: 'normal',
          lineHeight: 1.25,
        }}
      >
        <p style={{ margin: 0 }}>
          ({d.head_registration_name || 'นายอัคเดช พิสัยสวัสดิ์'})
        </p>
        <p style={{ margin: '4pt 0 0 0' }}>หัวหน้างานทะเบียน</p>
      </div>

      {/* ── 6. Draft Lines (Bottom Right for Draft Mode) ── */}
      {isDraft && (
        <div
          style={{
            marginTop: '36pt',
            display: 'flex',
            justifyContent: 'flex-end',
            fontSize: '14pt',
            lineHeight: 1.25,
          }}
        >
          <div style={{ textAlign: 'left', width: '2.5cm' }}>
            <p style={{ margin: 0 }}>/ร่าง</p>
            <p style={{ margin: 0 }}>/พิมพ์</p>
            <p style={{ margin: 0 }}>/ตรวจ</p>
          </div>
        </div>
      )}
    </div>
  );
});

export default OfficialMemoPrint;