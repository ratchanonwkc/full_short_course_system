import React, { forwardRef } from 'react';

function toThaiDigits(val) {
  if (val === null || val === undefined || val === '') return '';
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return String(val).replace(/[0-9]/g, (d) => thaiDigits[Number(d)]);
}

function formatThaiDateShort(rawDate, useThaiDigits = true) {
  if (!rawDate) return '-';
  const date = new Date(rawDate);
  if (isNaN(date.getTime())) return String(rawDate);
  const shortThaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const day = useThaiDigits ? toThaiDigits(date.getDate()) : date.getDate();
  const month = shortThaiMonths[date.getMonth()];
  const fullBeYear = date.getFullYear() > 2500 ? date.getFullYear() : date.getFullYear() + 543;
  const yearShort = useThaiDigits ? toThaiDigits(String(fullBeYear).slice(-2)) : String(fullBeYear).slice(-2);
  return `${day} ${month} ${yearShort}`;
}

const CourseScheduleTablePrint = forwardRef(function CourseScheduleTablePrint(
  {
    batch: propBatch,
    groups: propGroups,
    data = {},
    isDraft = false,
    useThaiDigits = true,
  },
  ref
) {
  const num = (v) => (useThaiDigits ? toThaiDigits(v) : v);

  const batch = propBatch || data.batch || data || {};
  const groups = propGroups || data.groups || [];

  const term = num(batch.term || data.term || '1');
  const academicYear = num(batch.academic_year || data.academic_year || '2569');
  const batchDisplay = num(batch.batch_display || data.batch_display || `${batch.batch_no || '1'}/${batch.academic_year || '2569'}`);

  // 1. Dynamic Asterisk Map Builder
  const uniqueNotesMap = new Map();
  let symbolCounter = 1;

  (groups || []).forEach((g) => {
    let text = g.footnote_text?.trim();
    if (!text && g.fee_exception_type && g.fee_exception_type !== 'none') {
      const legacyNotes = {
        note_1: 'การจัดการเรียนการสอนร่วมกับเรือนจำกลางอุดรธานี',
        note_2: 'การจัดการเรียนการสอนร่วมกับโรงเรียนประสาทคณานุกิจ วัดพุทธนิมิต',
        note_3: 'การจัดการเรียนการสอนร่วมกับเรือนจำชั่วคราวโคกก่อง',
      };
      text = legacyNotes[g.fee_exception_type] || g.fee_exception_type;
    }
    if (text && !uniqueNotesMap.has(text)) {
      uniqueNotesMap.set(text, '*'.repeat(symbolCounter++));
    }
  });

  // 2. Group data hierarchy: Department ➔ Study Groups ➔ Subjects
  const groupedByDept = (groups || []).reduce((acc, group) => {
    const deptName =
      group.academic_majors?.name_th ||
      group.department_name ||
      group.major_name ||
      group.department?.name ||
      'แผนกวิชาทั่วไป';

    if (!acc[deptName]) acc[deptName] = [];

    const subjectsList = group.study_group_subjects || [];

    let footnoteText = group.footnote_text?.trim();
    if (!footnoteText && group.fee_exception_type && group.fee_exception_type !== 'none') {
      const legacyNotes = {
        note_1: 'การจัดการเรียนการสอนร่วมกับเรือนจำกลางอุดรธานี',
        note_2: 'การจัดการเรียนการสอนร่วมกับโรงเรียนประสาทคณานุกิจ วัดพุทธนิมิต',
        note_3: 'การจัดการเรียนการสอนร่วมกับเรือนจำชั่วคราวโคกก่อง',
      };
      footnoteText = legacyNotes[group.fee_exception_type] || group.fee_exception_type;
    }

    const rawTeacher =
      group.teachers?.first_name_th
        ? `${group.teachers.prefix_name || ''}${group.teachers.first_name_th}`
        : group.teacher_name || 'ครูผู้สอน';

    const cleanTeacher = rawTeacher.startsWith('ครู')
      ? rawTeacher
      : `ครู${rawTeacher.replace(/^(นาย|นางสาว|นาง|อาจารย์|อ\.|ผศ\.|รศ\.|ดร\.)\s*/, '').trim()}`;

    const shift =
      group.time_slots?.time_name?.replace(/^รอบ\s*/, '') ||
      group.time_slot_name?.replace(/^รอบ\s*/, '') ||
      group.shift ||
      (group.group_code?.includes('ช')
        ? 'เช้า'
        : group.group_code?.includes('บ')
          ? 'บ่าย'
          : group.group_code?.includes('ค')
            ? 'ค่ำ'
            : 'เช้า');

    let parsedSubjects = [];
    if (subjectsList.length > 0) {
      parsedSubjects = subjectsList.map((sgs, idx) => {
        const subjectData = sgs.subjects || sgs;
        const subjHours = Number(
          subjectData.total_hours ||
          sgs.total_hours ||
          (Number(group.total_hours) / subjectsList.length) ||
          75
        );
        return {
          id: `${group.id}-${sgs.id || idx}`,
          group_id: group.id,
          subject_code:
            subjectData.subject_code ||
            sgs.moe_code ||
            sgs.subject_code ||
            group.subject_code ||
            group.code ||
            group.group_code ||
            '-',
          subject_name:
            subjectData.name_th ||
            sgs.name_th ||
            group.subject_name ||
            group.group_name ||
            '-',
          shift: shift,
          hours: subjHours,
          tuition_fee: group.tuition_fee,
          is_ac_maintenance_fee: Boolean(group.is_ac_maintenance_fee),
          is_waived_fee: Boolean(group.is_waived_fee || group.is_free_tuition),
          footnote_text: footnoteText || null,
          max_seats: Number(group.max_seats || 20),
          start_date: group.start_date || batch.study_open_date || batch.start_date,
          teacher_name: cleanTeacher,
        };
      });
    } else {
      parsedSubjects = [
        {
          id: group.id,
          group_id: group.id,
          subject_code: group.subject_code || group.code || group.group_code || '-',
          subject_name: group.subject_name || group.group_name || '-',
          shift: shift,
          hours: Number(group.total_hours || 75),
          tuition_fee: group.tuition_fee,
          is_ac_maintenance_fee: Boolean(group.is_ac_maintenance_fee),
          is_waived_fee: Boolean(group.is_waived_fee || group.is_free_tuition),
          footnote_text: footnoteText || null,
          max_seats: Number(group.max_seats || 20),
          start_date: group.start_date || batch.study_open_date || batch.start_date,
          teacher_name: cleanTeacher,
        },
      ];
    }

    acc[deptName].push({
      ...group,
      cleanTeacher,
      footnote_text: footnoteText || null,
      subjects: parsedSubjects,
    });

    return acc;
  }, {});

  let runningIndex = 1;
  let totalCapacity = 0;

  return (
    <div
      ref={ref}
      className="course-schedule-print-root bg-white text-black font-['Sarabun',sans-serif] select-text"
      style={{
        width: '210mm',
        minHeight: '297mm',
        boxSizing: 'border-box',
        padding: '0.6cm 1.5cm 1.0cm 2.0cm', // ลด Padding ด้านบนของหน้าแรก
        margin: '0 auto',
        fontSize: '12px',
        lineHeight: '1.2', // บีบความสูงบรรทัดให้ชิดขึ้น
        color: '#000',
        backgroundColor: '#fff',
      }}
    >
      <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap');

    @page {
      size: A4 portrait;
      margin: 0;
    }

    .print-page-spacer {
      display: none;
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
      .course-schedule-print-root {
        width: 210mm !important;
        box-sizing: border-box !important;
        padding: 0.6cm 1.5cm 1.0cm 2.0cm !important; /* ระยะขอบหน้า 1 */
        font-family: 'Sarabun', 'TH Sarabun New', sans-serif !important;
      }
      thead {
        display: table-header-group;
      }
      tr.print-page-spacer {
        display: table-row !important;
        height: 1.2cm !important; /* ระยะเว้นหัวตารางหน้า 2 */
        border: none !important;
      }
      tr.print-page-spacer th {
        border: none !important;
        height: 1.2cm !important;
        padding: 0 !important;
        margin: 0 !important;
        background: transparent !important;
      }
      tbody.dept-block {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      tbody.summary-block {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .no-break-block {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
    }
  `}</style>
      {/* 2. ปรับลดระยะห่างระหว่างชื่อหัวเอกสารกับหัวตาราง */}
      <div className="text-center font-bold text-[14.5px] mb-1.5 leading-tight">
        แผนการรับสมัครหลักสูตรวิชาชีพระยะสั้น ปีการศึกษา {academicYear} ภาคเรียนที่ {term} (รุ่นที่ {batchDisplay})
        {isDraft && (
          <span className="ml-2 text-xs font-normal text-amber-600 border border-amber-400 rounded px-1.5 py-0.5">
            ฉบับร่าง
          </span>
        )}
      </div>

      {/* 3. ปรับเซลล์ตารางให้กระชับและตัวหนังสือชิดกันมากขึ้น (เปลี่ยน p-1 เป็น p-0.5 และใส่ leading-snug) */}
      <table className="w-full border-collapse text-center text-[12px] leading-snug">
        <thead>
          <tr className="print-page-spacer" style={{ border: 'none' }}>
            <th colSpan="12" style={{ border: 'none', background: 'transparent' }}></th>
          </tr>

          <tr className="border-t border-b border-black font-bold">
            <th rowSpan="2" className="border-l border-r border-black p-0.5 w-7">ที่</th>
            <th rowSpan="2" className="border-r border-black p-0.5 w-20">รหัสวิชา</th>
            <th rowSpan="2" className="border-r border-black p-0.5 text-center">แผนกวิชา/ชื่อวิชา</th>
            <th rowSpan="2" className="border-r border-black p-0.5 w-9">รอบ</th>
            <th rowSpan="2" className="border-r border-black p-0.5 w-11">จำนวน<br />ชั่วโมง</th>
            <th colSpan="4" className="border-r border-black p-0.5">ค่าใช้จ่าย</th>
            <th rowSpan="2" className="border-r border-black p-0.5 w-10">จำนวน<br />รับ</th>
            <th rowSpan="2" className="border-r border-black p-0.5 w-16">วันที่<br />เปิดเรียน</th>
            <th rowSpan="2" className="border-r border-black p-0.5 w-20">ผู้สอน</th>
          </tr>
          <tr className="border-b border-black font-bold text-[11px]">
            <th className="border-r border-black p-0.5 w-11">ค่าบำรุง<br />การศึกษา</th>
            <th className="border-r border-black p-0.5 w-9">ค่าสมัคร</th>
            <th className="border-r border-black p-0.5 w-11">ค่าห้องเรียน<br />ปรับอากาศ</th>
            <th className="border-r border-black p-0.5 w-10">รวม</th>
          </tr>
        </thead>

        {Object.keys(groupedByDept).length === 0 ? (
          <tbody>
            <tr>
              <td colSpan="12" className="border border-black p-8 text-center text-slate-400">
                ไม่มีข้อมูลรายวิชาที่เปิดสอนในรุ่นนี้
              </td>
            </tr>
          </tbody>
        ) : (
          Object.entries(groupedByDept).map(([deptName, deptGroups]) => (
            <tbody
              key={deptName}
              className="dept-block"
              style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
            >
              {/* Department Header Row */}
              <tr className="border-t-2 border-b border-l border-r border-black bg-slate-50 font-bold">
                <td colSpan="12" className="border-l border-r border-black p-1 text-center font-bold">
                  {deptName}
                </td>
              </tr>

              {/* Study Groups under this Department */}
              {deptGroups.map((group, groupIdx) => {
                const isLastGroupInDept = groupIdx === deptGroups.length - 1;
                const subjectsList = group.subjects || [group];

                return subjectsList.map((s, subjIdx) => {
                  const isLastSubjInGroup = subjIdx === subjectsList.length - 1;
                  const currentIndex = runningIndex++;

                  let borderBottomClass = 'border-b-0';
                  if (isLastSubjInGroup) {
                    borderBottomClass = isLastGroupInDept ? 'border-b border-black' : 'border-b border-dotted border-black';
                  }

                  const hours = Number(s.hours || 75);
                  const isAirCon = Boolean(s.is_ac_maintenance_fee);
                  const asteriskSymbol = s.footnote_text ? uniqueNotesMap.get(s.footnote_text) : null;
                  const isExempt = Boolean(
                    asteriskSymbol ||
                    s.is_waived_fee ||
                    s.is_free_tuition ||
                    (s.tuition_fee !== undefined && s.tuition_fee !== null && Number(s.tuition_fee) === 0)
                  );

                  const tuition = hours * 1;
                  const regFee = 10;
                  const airFee = isAirCon ? hours * 5 : 0;
                  const totalFee = tuition + regFee + airFee;

                  let totalDisplay = '-';
                  if (asteriskSymbol) {
                    totalDisplay = asteriskSymbol;
                  } else if (isExempt) {
                    totalDisplay = '-';
                  } else {
                    totalDisplay = num(totalFee);
                  }

                  if (subjIdx === 0) {
                    totalCapacity += Number(s.max_seats || 20);
                  }

                  return (
                    <tr
                      key={s.id}
                      className={`border-black ${borderBottomClass}`}
                    >
                      <td className="border-l border-r border-black p-1">{num(currentIndex)}</td>
                      <td className="border-r border-black p-1 font-mono text-[11.5px]">
                        {num(s.subject_code)}
                      </td>
                      <td className="border-r border-black p-1 text-left pl-2 font-medium">
                        {s.subject_name}
                      </td>
                      <td className="border-r border-black p-1">
                        {s.shift}
                      </td>
                      <td className="border-r border-black p-1">{num(hours)}</td>
                      <td className="border-r border-black p-1">{isExempt ? '-' : num(tuition)}</td>
                      <td className="border-r border-black p-1">{isExempt ? '-' : num(regFee)}</td>
                      <td className="border-r border-black p-1">{isExempt || !isAirCon ? '-' : num(airFee)}</td>
                      <td className="border-r border-black p-1 font-bold">
                        {totalDisplay}
                      </td>
                      <td className="border-r border-black p-1">{num(s.max_seats)}</td>
                      <td className="border-r border-black p-1 text-[11px]">
                        {formatThaiDateShort(s.start_date, useThaiDigits)}
                      </td>
                      <td className="border-r border-black p-1 text-left pl-1 whitespace-nowrap overflow-hidden text-ellipsis">
                        {s.teacher_name}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          ))
        )}

        {/* Summary Footer */}
        <tbody className="summary-block" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <tr className="border-t-2 border-b border-black font-bold">
            <td colSpan="9" className="border-l border-r-0 border-black p-1 text-right pr-3">รวมจำนวนรับ :</td>
            <td className="border-r border-black p-1">{num(totalCapacity)}</td>
            <td colSpan="2" className="border-r border-black p-1"></td>
          </tr>
        </tbody>
      </table>

      {/* ── Policy Notice & Dynamic Notes Block ── */}
      <div className="no-break-block" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <div className="text-center font-medium mt-1.5 text-[11.5px]">
          (เมื่อชำระเงินค่าเรียนแล้วไม่สามารถคืนเงินได้ ยกเว้นรายวิชาที่เปิดทำการสอนไม่ได้)
        </div>

        {uniqueNotesMap.size > 0 && (
          <div className="mt-4 text-[12px] space-y-0.5">
            <p className="font-bold">หมายเหตุ :</p>
            <div className="pl-6 space-y-0.5">
              {Array.from(uniqueNotesMap.entries()).map(([noteText, symbol]) => (
                <p key={symbol}>
                  {symbol} หมายถึง {noteText}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default CourseScheduleTablePrint;