// src/components/modals/AnnouncementPrintModal.jsx
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useReactToPrint } from 'react-to-print';
import { X, Printer, RotateCcw, FileText, Megaphone, Table2, Layers, Building } from 'lucide-react';
import OfficialMemoPrint, { resolveGroupTypeLabel } from '../print/announcements/OfficialMemoPrint';
import CollegeAnnouncementPrint from '../print/announcements/CollegeAnnouncementPrint';
import { getStudyGroups } from '../../features/study-groups/services/studyGroupApi';

const TABS = [
  { key: 'memo', label: 'บันทึกข้อความ', icon: FileText },
  { key: 'announcement', label: 'ประกาศวิทยาลัย', icon: Megaphone },
  { key: 'course_table', label: 'ตารางรายวิชาแนบท้าย', icon: Table2 },
];

// ── Batch numbering helpers (NEVER use raw id / sequence keys) ──────────────
function extractBatchDisplay(batch) {
  const b = batch || {};
  const batchNo =
    b.batch_no || b.batch_name?.match(/(\d+)\s*\//)?.[1] || b.batch_name?.match(/รุ่นที่\s*(\d+)/)?.[1] || '1';
  const academicYear = b.academic_year || b.batch_name?.match(/\/(\d{4})/)?.[1] || '2569';
  return { batchNo: String(batchNo), academicYear: String(academicYear), batchDisplay: `${batchNo}/${academicYear}` };
}

const inputCls =
  'w-full rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30';

/**
 * AnnouncementPrintModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Mode-aware print modal for official announcements:
 * - type = 'regular' -> Batch level official memorandum (รอบปกติ)
 * - type !== 'regular' -> Study group level memorandum (แบบพิเศษ/โครงการ/ห้องเรียนอาชีพ/เพิ่มเติม)
 */
export default function AnnouncementPrintModal({
  isOpen,
  onClose,
  batch = null,
  courseCount = 0,
  groups = [],
  group = null,
  type = 'regular',
  initialType = '',
  groupTypeLabel = '',
  initialDepartment = '',
}) {
  const activeType = initialType || type || 'regular';
  const isRegular = activeType === 'regular';

  const [activeTab, setActiveTab] = useState('memo');
  const [docNo, setDocNo] = useState('');
  const [docDateIso, setDocDateIso] = useState(() => new Date().toISOString().slice(0, 10));
  const [headRegistrarName, setHeadRegistrarName] = useState('นายอัคเดช พิสัยสวัสดิ์');
  const [departmentName, setDepartmentName] = useState('อาหาร - ขนม');
  const [currentGroupTypeLabel, setCurrentGroupTypeLabel] = useState('แบบพิเศษ');
  const [manualCourseCount, setManualCourseCount] = useState(1);
  const [isDraft, setIsDraft] = useState(true);
  const [useThaiDigits, setUseThaiDigits] = useState(true);
  const [fetchedGroups, setFetchedGroups] = useState([]);

  const printRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setDocNo('');
      setDocDateIso(new Date().toISOString().slice(0, 10));
      setIsDraft(true);

      // Determine initial Department Name
      const dept =
        initialDepartment ||
        group?.major_name ||
        (groups.length > 0 ? groups[0]?.major_name : '') ||
        'อาหาร - ขนม';
      setDepartmentName(dept);

      // Determine Group Type Label
      let rawType = groupTypeLabel || group?.group_type || group?.category || (isRegular ? 'ปกติ' : '');
      const typeLabel = resolveGroupTypeLabel(rawType);
      setCurrentGroupTypeLabel(typeLabel);

      // Set Course Count
      if (group) {
        const count = group.subjects_in_group?.length || group.subjects?.length || 1;
        setManualCourseCount(count);
      } else if (courseCount > 0) {
        setManualCourseCount(courseCount);
      }

      // Reset and proactively fetch study groups for this specific batch if needed
      setFetchedGroups([]);
      if (batch?.id && isRegular) {
        getStudyGroups({ batch_id: batch.id })
          .then((data) => {
            const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
            setFetchedGroups(list);
          })
          .catch(() => {});
      }
    }
  }, [isOpen, batch?.id, isRegular, group, groups, initialDepartment, groupTypeLabel, courseCount]);

  const { batchNo, academicYear, batchDisplay } = useMemo(() => extractBatchDisplay(batch), [batch]);

  // Consolidate groups strictly for this batch
  const allGroups = useMemo(() => {
    if (fetchedGroups.length > 0) {
      return fetchedGroups.filter((g) => !batch?.id || String(g.batch_id) === String(batch?.id));
    }
    if (batch?.study_groups?.length > 0) return batch.study_groups;
    if (groups?.length > 0 && batch?.id) {
      return groups.filter((g) => String(g.batch_id) === String(batch?.id));
    }
    return [];
  }, [fetchedGroups, batch, groups]);

  // Calculate regular courses count dynamically for batch mode
  const calculatedRegularCoursesCount = useMemo(() => {
    if (!isRegular) return manualCourseCount;
    if (typeof courseCount === 'number' && courseCount > 0) return courseCount;

    const regularActiveGroups = (allGroups || []).filter((group) => {
      const isSameBatch = !batch?.id || String(group.batch_id) === String(batch?.id);
      const isRegularType =
        group.group_type === 'normal' ||
        group.group_type === 'regular' ||
        group.group_type === 'ปกติ' ||
        group.category === 'ปกติ' ||
        !group.group_type;
      const isActive =
        group.status === 'open' ||
        group.status === 'active' ||
        group.status === 'opened' ||
        group.is_active === true ||
        (!group.status && group.is_active !== false) ||
        (group.status !== 'cancelled' && group.status !== 'closed' && group.status !== 'inactive');
      return isSameBatch && isRegularType && isActive;
    });

    if (regularActiveGroups.length > 0) {
      return regularActiveGroups.reduce((acc, group) => {
        const subjectCount = group.subjects_in_group?.length || group.subjects?.length || 1;
        return acc + subjectCount;
      }, 0);
    }
    return 1;
  }, [isRegular, manualCourseCount, courseCount, allGroups, batch?.id]);

  // Sync manualCourseCount with calculatedRegularCoursesCount for regular mode
  useEffect(() => {
    if (isRegular && calculatedRegularCoursesCount > 0) {
      setManualCourseCount(calculatedRegularCoursesCount);
    }
  }, [isRegular, calculatedRegularCoursesCount]);

  const finalCourseCount = isRegular ? (manualCourseCount || calculatedRegularCoursesCount) : manualCourseCount;

  const formattedThaiDate = useMemo(() => {
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
    ];
    const dt = new Date(docDateIso);
    if (Number.isNaN(dt.getTime())) return '';
    return `${dt.getDate()} ${thaiMonths[dt.getMonth()]} ${dt.getFullYear() + 543}`;
  }, [docDateIso]);

  const memoData = {
    ...batch,
    type: activeType,
    doc_no: docNo,
    doc_date_display: formattedThaiDate,
    doc_date: docDateIso || new Date().toISOString(),
    department_agency: 'งานทะเบียน วิทยาลัยสารพัดช่างอุดรธานี',
    department_name: departmentName,
    term: batch?.term || '1',
    academic_year: academicYear,
    batch_no: batchNo,
    batch_display: batchDisplay,
    course_count: finalCourseCount,
    head_registration_name: headRegistrarName,
    group_type_label: resolveGroupTypeLabel(currentGroupTypeLabel),
    director_name: batch?.director_name || 'นายไพฑูรย์ ธนพงศ์ภากรณ์',
    admit_open_date: batch?.admit_open_date,
    admit_close_date: batch?.admit_close_date,
    apply_start_date: batch?.admit_open_date || batch?.apply_start_date || batch?.registration_start_date || batch?.reg_start_date || batch?.batch_start_date || batch?.start_date,
    apply_end_date: batch?.admit_close_date || batch?.apply_end_date || batch?.registration_end_date || batch?.reg_end_date || batch?.batch_end_date || batch?.end_date,
    study_open_date: batch?.study_open_date || batch?.study_start_date || batch?.course_start_date || batch?.batch_start_date || batch?.start_date,
    start_date: batch?.start_date,
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle:
      activeTab === 'announcement'
        ? `ประกาศวิทยาลัย_${currentGroupTypeLabel}_รุ่นที่_${batchDisplay}`
        : `บันทึกข้อความ_${currentGroupTypeLabel}_รุ่นที่_${batchDisplay}`,
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 0;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          margin: 0;
        }
      }
    `,
  });

  const handleReset = () => {
    setDocNo('');
    setDocDateIso(new Date().toISOString().slice(0, 10));
    setHeadRegistrarName('นายอัคเดช พิสัยสวัสดิ์');
    if (!isRegular) {
      setDepartmentName(initialDepartment || group?.major_name || 'อาหาร - ขนม');
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-950/70" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative flex h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl border border-slate-200">
                {/* ── Ultra-Compact Consolidated Header & Controls ── */}
                <div className="border-b border-slate-200 bg-slate-50/90 px-4 py-2 shrink-0">
                  {/* Top Line: Title + Controls + Actions in tight grid */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* Left: Title & Batch Tag */}
                    <div className="flex w-full items-center gap-2">
                      <Dialog.Title className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Printer size={15} className="text-blue-600" />
                        <span>พิมพ์บันทึกข้อความ ({currentGroupTypeLabel})</span>
                      </Dialog.Title>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        รุ่น {batchDisplay}
                      </span>
                    </div>

                    {/* Center: Metadata inputs in compact horizontal flex */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Show Department name input for Study Group Mode */}
                      {!isRegular && (
                        <Field label="แผนกวิชา">
                          <input
                            type="text"
                            value={departmentName}
                            onChange={(e) => setDepartmentName(e.target.value)}
                            placeholder="เช่น อาหาร - ขนม"
                            className={`${inputCls} w-32 font-semibold text-blue-700`}
                          />
                        </Field>
                      )}

                      <Field label="เลขที่หนังสือ">
                        <input
                          type="text"
                          value={docNo}
                          onChange={(e) => setDocNo(e.target.value)}
                          placeholder="อด ๐๑๐๙.๐๑/..."
                          className={`${inputCls} w-28`}
                        />
                      </Field>

                      <Field label="วันที่ออกเอกสาร">
                        <input
                          type="date"
                          value={docDateIso}
                          onChange={(e) => setDocDateIso(e.target.value)}
                          className={`${inputCls} w-32`}
                        />
                      </Field>

                      <Field label="หัวหน้างานทะเบียน">
                        <input
                          type="text"
                          value={headRegistrarName}
                          onChange={(e) => setHeadRegistrarName(e.target.value)}
                          className={`${inputCls} w-36`}
                        />
                      </Field>

                      <Field label="จำนวนรายวิชา">
                        <input
                          type="number"
                          value={finalCourseCount}
                          onChange={(e) => setManualCourseCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className={`${inputCls} w-16 bg-white text-center font-bold text-blue-700`}
                        />
                      </Field>
                    </div>

                    {/* Right: Mode toggles + Close */}
                    <div className="flex items-center gap-1.5">
                      {/* Draft Switch */}
                      <button
                        type="button"
                        onClick={() => setIsDraft((v) => !v)}
                        className={`rounded px-2 py-1 text-[11px] font-bold transition ${
                          isDraft ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {isDraft ? 'ฉบับร่าง' : 'ฉบับจริง'}
                      </button>

                      {/* Thai Digits Toggle */}
                      <label className="flex cursor-pointer items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 border border-slate-200">
                        <input
                          type="checkbox"
                          checked={useThaiDigits}
                          onChange={(e) => setUseThaiDigits(e.target.checked)}
                          className="h-3 w-3 accent-blue-600"
                        />
                        เลขไทย
                      </label>

                      {/* Reset button */}
                      <button
                        type="button"
                        onClick={handleReset}
                        title="ล้างค่า"
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                      >
                        <RotateCcw size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Line: Integrated Tabs Navigation */}
                  <div className="mt-1.5 flex items-center justify-between border-t border-slate-200/60 pt-1">
                    <div className="flex gap-1">
                      {TABS.map(({ key, label, icon: Icon }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setActiveTab(key)}
                          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-t-md transition ${
                            activeTab === key
                              ? 'bg-white text-blue-600 border border-b-0 border-slate-200 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <Icon size={12} />
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                      <Layers size={11} /> พรีวิวเอกสารมาตรฐานราชการ A4 (210 × 297 มม.)
                    </div>
                  </div>
                </div>

                {/* ── Preview Stage: Full Height A4 Canvas (No squishing) ── */}
                <div className="flex w-full flex-1 justify-center overflow-x-auto overflow-y-auto bg-slate-300 p-4 sm:p-6">
                  <div
                    className="shrink-0 bg-white shadow-2xl"
                    style={{ width: '210mm', minHeight: '297mm' }}
                  >
                    {activeTab === 'memo' && (
                      <OfficialMemoPrint ref={printRef} data={memoData} isDraft={isDraft} useThaiDigits={useThaiDigits} />
                    )}
                    {activeTab === 'announcement' && (
                      <CollegeAnnouncementPrint ref={printRef} data={memoData} isDraft={isDraft} useThaiDigits={useThaiDigits} />
                    )}
                    {activeTab === 'course_table' && (
                      <div className="flex h-full min-h-[297mm] items-center justify-center p-10 text-sm text-slate-400">
                        ตารางรายวิชาแนบท้าย — อยู่ระหว่างการพัฒนา
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Compact Footer ── */}
                <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-2 shrink-0">
                  <span className="text-[11px] text-slate-400">
                    แบบฟอร์มเอกสารทางการ วิทยาลัยสารพัดช่างอุดรธานี
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      ปิด (Cancel)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrint()}
                      disabled={activeTab !== 'memo' && activeTab !== 'announcement'}
                      className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
                    >
                      <Printer size={14} />
                      สั่งพิมพ์ (Print)
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] font-semibold text-slate-500">{label}</label>
      {children}
    </div>
  );
}