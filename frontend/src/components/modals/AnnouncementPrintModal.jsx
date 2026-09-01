// src/components/modals/AnnouncementPrintModal.jsx
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, Transition, Menu } from '@headlessui/react';
import { useReactToPrint } from 'react-to-print';
import {
  X,
  Printer,
  RotateCcw,
  FileText,
  Megaphone,
  Table2,
  Layers,
  Sparkles,
  CheckSquare,
  Square,
  FileCheck2,
  Send,
  ChevronDown,
} from 'lucide-react';
import OfficialMemoPrint, { resolveGroupTypeLabel } from '../print/announcements/OfficialMemoPrint';
import CollegeAnnouncementPrint from '../print/announcements/CollegeAnnouncementPrint';
import CourseScheduleTablePrint from '../print/announcements/CourseScheduleTablePrint';
import { getStudyGroups } from '../../features/study-groups/services/studyGroupApi';

const TABS = [
  { key: 'memo', label: 'บันทึกข้อความ', icon: FileText },
  { key: 'announcement', label: 'ประกาศวิทยาลัย', icon: Megaphone },
  { key: 'course_table', label: 'ตารางรายวิชาแนบท้าย', icon: Table2 },
];

const DOC_CONFIGS = [
  {
    id: 'memo_draft',
    label: 'บันทึกข้อความ (ร่าง)',
    shortLabel: 'บันทึก (ร่าง)',
    badge: 'ร่าง',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    tab: 'memo',
    isDraft: true,
  },
  {
    id: 'memo_final',
    label: 'บันทึกข้อความ (จริง)',
    shortLabel: 'บันทึก (จริง)',
    badge: 'จริง',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    tab: 'memo',
    isDraft: false,
  },
  {
    id: 'announce_draft',
    label: 'ประกาศวิทยาลัย (ร่าง)',
    shortLabel: 'ประกาศ (ร่าง)',
    badge: 'ร่าง',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    tab: 'announcement',
    isDraft: true,
  },
  {
    id: 'announce_final',
    label: 'ประกาศวิทยาลัย (จริง)',
    shortLabel: 'ประกาศ (จริง)',
    badge: 'จริง',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    tab: 'announcement',
    isDraft: false,
  },
  {
    id: 'schedule_table',
    label: 'ตารางรายวิชาแนบท้าย',
    shortLabel: 'ตารางแนบท้าย',
    badge: 'ตาราง',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    tab: 'course_table',
    batchOnly: true,
  },
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
 * - One-click Document Bundle Presets
 * - Multi-document checklist selection
 * - Continuous page-break print stream
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
  mode = '',
}) {
  const activeType = initialType || type || 'regular';
  const isRegular = activeType === 'regular';
  const isBatchLevel = mode === 'batch' || (mode !== 'group' && !group && isRegular);

  const visibleTabs = useMemo(() => {
    if (isBatchLevel) {
      return TABS;
    }
    return TABS.filter((t) => t.key !== 'course_table');
  }, [isBatchLevel]);

  const availableDocs = useMemo(() => {
    if (isBatchLevel) return DOC_CONFIGS;
    return DOC_CONFIGS.filter((d) => !d.batchOnly);
  }, [isBatchLevel]);

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

  // Multi-document bundle selection state
  const [selectedDocs, setSelectedDocs] = useState(() =>
    isBatchLevel ? ['memo_draft', 'announce_draft', 'schedule_table'] : ['memo_draft', 'announce_draft']
  );

  const previewPrintRef = useRef(null);
  const multiPrintRef = useRef(null);

  // Preset Bundles Generator
  const presets = useMemo(() => {
    const draftBundle = ['memo_draft', 'announce_draft', ...(isBatchLevel ? ['schedule_table'] : [])];
    const finalBundle = ['memo_final', 'announce_final', ...(isBatchLevel ? ['schedule_table'] : [])];
    const allBundle = ['memo_draft', 'memo_final', 'announce_draft', 'announce_final', ...(isBatchLevel ? ['schedule_table'] : [])];

    return {
      draft: draftBundle,
      final: finalBundle,
      all: allBundle,
    };
  }, [isBatchLevel]);

  useEffect(() => {
    if (isOpen) {
      setDocNo('');
      setDocDateIso(new Date().toISOString().slice(0, 10));
      setIsDraft(true);

      // Default to "ชุดเสนอลงนาม (ร่าง)" on opening
      setSelectedDocs(isBatchLevel ? ['memo_draft', 'announce_draft', 'schedule_table'] : ['memo_draft', 'announce_draft']);

      if (!isBatchLevel && activeTab === 'course_table') {
        setActiveTab('memo');
      }

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
  }, [isOpen, isBatchLevel, activeTab, batch?.id, isRegular, group, groups, initialDepartment, groupTypeLabel, courseCount]);

  const { batchNo, academicYear, batchDisplay } = useMemo(() => extractBatchDisplay(batch), [batch]);

  // Consolidate groups strictly for this batch
  const allGroups = useMemo(() => {
    if (fetchedGroups && fetchedGroups.length > 0) {
      return fetchedGroups;
    }
    if (batch?.study_groups && batch.study_groups.length > 0) return batch.study_groups;
    if (groups && groups.length > 0) return groups;
    return [];
  }, [fetchedGroups, batch, groups]);

  // Permissive Active Regular Group Filter
  const activeBatchGroups = useMemo(() => {
    return (allGroups || []).filter((group) => {
      // Safe Batch ID matching
      const matchBatch = !batch?.id || !group.batch_id || String(group.batch_id) === String(batch?.id);

      // Safe Group Type matching (regular / normal / ปกติ / empty)
      const isGroupRegular =
        !group.group_type ||
        group.group_type === 'normal' ||
        group.group_type === 'regular' ||
        group.group_type === 'ปกติ' ||
        group.category === 'ปกติ';

      // Safe Status matching (not cancelled)
      const isNotCancelled = group.status !== 'cancelled' && !group.is_cancelled;

      return matchBatch && isGroupRegular && isNotCancelled;
    });
  }, [allGroups, batch?.id]);

  // Calculate regular courses count dynamically for batch mode
  const calculatedRegularCoursesCount = useMemo(() => {
    if (!isRegular) return manualCourseCount;
    if (typeof courseCount === 'number' && courseCount > 0) return courseCount;

    const listToCount = activeBatchGroups.length > 0 ? activeBatchGroups : allGroups;
    if (listToCount.length > 0) {
      return listToCount.reduce((acc, group) => {
        const subjectCount = group.subjects_in_group?.length || group.subjects?.length || 1;
        return acc + subjectCount;
      }, 0);
    }
    return 1;
  }, [isRegular, manualCourseCount, courseCount, activeBatchGroups, allGroups]);

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

  const resolvedGroupsForPrint = activeBatchGroups.length > 0 ? activeBatchGroups : allGroups;

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
    groups: resolvedGroupsForPrint,
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

  // Continuous multi-document print trigger
  const triggerMultiPrint = useReactToPrint({
    contentRef: multiPrintRef,
    documentTitle: `ชุดเอกสาร_${currentGroupTypeLabel}_รุ่นที่_${batchDisplay}`,
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
        .print-page-wrapper {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
        }
      }
    `,
  });

  const handleApplyPreset = (presetKey) => {
    const list = presets[presetKey] || [];
    setSelectedDocs(list);
  };

  const handleQuickPresetPrint = (presetKey) => {
    const list = presets[presetKey] || [];
    setSelectedDocs(list);
    // Trigger print after state update cycle
    setTimeout(() => {
      triggerMultiPrint();
    }, 100);
  };

  const toggleDoc = (docId) => {
    setSelectedDocs((prev) => {
      if (prev.includes(docId)) {
        return prev.filter((id) => id !== docId);
      }
      return [...prev, docId];
    });
  };

  const handleReset = () => {
    setDocNo('');
    setDocDateIso(new Date().toISOString().slice(0, 10));
    setHeadRegistrarName('นายอัคเดช พิสัยสวัสดิ์');
    if (!isRegular) {
      setDepartmentName(initialDepartment || group?.major_name || 'อาหาร - ขนม');
    }
  };

  // Check which preset is currently active
  const isDraftPresetActive = useMemo(() => {
    if (selectedDocs.length !== presets.draft.length) return false;
    return presets.draft.every((id) => selectedDocs.includes(id));
  }, [selectedDocs, presets.draft]);

  const isFinalPresetActive = useMemo(() => {
    if (selectedDocs.length !== presets.final.length) return false;
    return presets.final.every((id) => selectedDocs.includes(id));
  }, [selectedDocs, presets.final]);

  const isAllPresetActive = useMemo(() => {
    if (selectedDocs.length !== presets.all.length) return false;
    return presets.all.every((id) => selectedDocs.includes(id));
  }, [selectedDocs, presets.all]);

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
              <Dialog.Panel className="relative flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl border border-slate-200">
                {/* ── Top Header & Configuration Bar ── */}
                <div className="border-b border-slate-200 bg-slate-50/95 px-4 py-2.5 shrink-0 space-y-2">
                  {/* Top Line: Title + Metadata inputs + Close */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* Left: Title & Batch Tag */}
                    <div className="flex items-center gap-2">
                      <Dialog.Title className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Printer size={16} className="text-blue-600" />
                        <span>ระบบพิมพ์เอกสารราชการ ({currentGroupTypeLabel})</span>
                      </Dialog.Title>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        รุ่น {batchDisplay}
                      </span>
                    </div>

                    {/* Center: Metadata inputs */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
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

                    {/* Right: Thai digits & Close */}
                    <div className="flex items-center gap-1.5">
                      <label className="flex cursor-pointer items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 border border-slate-200">
                        <input
                          type="checkbox"
                          checked={useThaiDigits}
                          onChange={(e) => setUseThaiDigits(e.target.checked)}
                          className="h-3 w-3 accent-blue-600"
                        />
                        เลขไทย
                      </label>

                      <button
                        type="button"
                        onClick={handleReset}
                        title="ล้างค่า"
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
                      >
                        <RotateCcw size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {/* ── Workflow Architecture: Quick Presets & Document Checklist ── */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-2 border border-slate-200 shadow-2xs">
                    {/* Left: Quick Preset Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mr-1">
                        <Sparkles size={12} className="text-amber-500" /> ชุดด่วน:
                      </span>

                      <button
                        type="button"
                        onClick={() => handleApplyPreset('draft')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                          isDraftPresetActive
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        <FileCheck2 size={13} />
                        ชุดเสนอลงนาม (ร่าง)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyPreset('final')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                          isFinalPresetActive
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        <Send size={13} />
                        ชุดประกาศจริง (จริง)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyPreset('all')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                          isAllPresetActive
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100'
                        }`}
                      >
                        <Layers size={13} />
                        พิมพ์ทั้งหมด ({isBatchLevel ? '5' : '4'} ฉบับ)
                      </button>
                    </div>

                    {/* Right: Granular Document Checkboxes */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 mr-0.5">เลือกเอกสาร:</span>
                      {availableDocs.map((doc) => {
                        const isChecked = selectedDocs.includes(doc.id);
                        return (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => toggleDoc(doc.id)}
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium border transition ${
                              isChecked
                                ? 'bg-blue-50 border-blue-300 text-blue-800 font-semibold'
                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare size={13} className="text-blue-600" />
                            ) : (
                              <Square size={13} className="text-slate-400" />
                            )}
                            <span>{doc.shortLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Bottom Line: Single-Tab Previews Navigation & Canvas Controls ── */}
                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-1.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-semibold text-slate-400 mr-1.5">แท็บพรีวิวหน้าจอ:</span>
                      {visibleTabs.map(({ key, label, icon: Icon }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setActiveTab(key)}
                          className={`flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-md transition ${
                            activeTab === key
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                          }`}
                        >
                          <Icon size={12} />
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Preview Draft/Final Toggle for current on-screen tab */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                        <span>พรีวิวฉบับ:</span>
                        <button
                          type="button"
                          onClick={() => setIsDraft(true)}
                          className={`rounded px-2 py-0.5 transition ${
                            isDraft
                              ? 'bg-amber-100 text-amber-800 font-bold border border-amber-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          ร่าง
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDraft(false)}
                          className={`rounded px-2 py-0.5 transition ${
                            !isDraft
                              ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          จริง
                        </button>
                      </div>

                      <div className="text-[10px] text-slate-400 hidden sm:flex items-center gap-1 font-medium border-l border-slate-300 pl-2">
                        <Layers size={11} /> พรีวิวมาตรฐาน A4 (210 × 297 มม.)
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Preview Stage: Full Height A4 Canvas (On-screen Inspection) ── */}
                <div className="flex w-full flex-1 justify-center overflow-x-auto overflow-y-auto bg-slate-300 p-4 sm:p-6">
                  <div
                    className="shrink-0 bg-white shadow-2xl transition-all"
                    style={{
                      width: '210mm',
                      minHeight: '297mm',
                    }}
                  >
                    {activeTab === 'memo' && (
                      <OfficialMemoPrint
                        ref={previewPrintRef}
                        data={memoData}
                        isDraft={isDraft}
                        useThaiDigits={useThaiDigits}
                      />
                    )}
                    {activeTab === 'announcement' && (
                      <CollegeAnnouncementPrint
                        ref={previewPrintRef}
                        data={memoData}
                        isDraft={isDraft}
                        useThaiDigits={useThaiDigits}
                      />
                    )}
                    {activeTab === 'course_table' && (
                      <CourseScheduleTablePrint
                        ref={previewPrintRef}
                        batch={batch}
                        groups={memoData.groups}
                        data={memoData}
                        isDraft={isDraft}
                        useThaiDigits={useThaiDigits}
                      />
                    )}
                  </div>
                </div>

                {/* ── Dedicated Continuous Print Engine Container (Strict Page Breaks) ── */}
                <div ref={multiPrintRef} className="hidden print:block">
                  {selectedDocs.includes('memo_draft') && (
                    <div
                      className="print-page-wrapper"
                      style={{
                        pageBreakAfter: 'always',
                        breakAfter: 'page',
                      }}
                    >
                      <OfficialMemoPrint data={memoData} isDraft={true} useThaiDigits={useThaiDigits} />
                    </div>
                  )}

                  {selectedDocs.includes('memo_final') && (
                    <div
                      className="print-page-wrapper"
                      style={{
                        pageBreakAfter: 'always',
                        breakAfter: 'page',
                      }}
                    >
                      <OfficialMemoPrint data={memoData} isDraft={false} useThaiDigits={useThaiDigits} />
                    </div>
                  )}

                  {selectedDocs.includes('announce_draft') && (
                    <div
                      className="print-page-wrapper"
                      style={{
                        pageBreakAfter: 'always',
                        breakAfter: 'page',
                      }}
                    >
                      <CollegeAnnouncementPrint data={memoData} isDraft={true} useThaiDigits={useThaiDigits} />
                    </div>
                  )}

                  {selectedDocs.includes('announce_final') && (
                    <div
                      className="print-page-wrapper"
                      style={{
                        pageBreakAfter: 'always',
                        breakAfter: 'page',
                      }}
                    >
                      <CollegeAnnouncementPrint data={memoData} isDraft={false} useThaiDigits={useThaiDigits} />
                    </div>
                  )}

                  {selectedDocs.includes('schedule_table') && isBatchLevel && (
                    <div className="print-page-wrapper">
                      <CourseScheduleTablePrint
                        batch={batch}
                        groups={resolvedGroupsForPrint}
                        data={memoData}
                        isDraft={isDraft}
                        useThaiDigits={useThaiDigits}
                      />
                    </div>
                  )}
                </div>

                {/* ── Modal Footer with Quick Preset Actions & Print Triggers ── */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-2.5 shrink-0">
                  {/* Left: Summary of selected documents */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">เอกสารที่จะพิมพ์:</span>
                    {selectedDocs.length === 0 ? (
                      <span className="text-rose-500 font-medium">ยังไม่ได้เลือกเอกสารใดๆ</span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1">
                        {selectedDocs.map((id) => {
                          const doc = DOC_CONFIGS.find((d) => d.id === id);
                          if (!doc) return null;
                          return (
                            <span
                              key={id}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${doc.badgeColor}`}
                            >
                              {doc.shortLabel}
                            </span>
                          );
                        })}
                        <span className="text-[11px] font-bold text-slate-500">
                          ({selectedDocs.length} ฉบับ)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: Quick Bundle Print Menu & Main Print Button */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      ปิด (Cancel)
                    </button>

                    {/* Quick Bundle Dropdown Menu */}
                    <Menu as="div" className="relative inline-block text-left">
                      <Menu.Button className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 active:scale-[0.98]">
                        <Sparkles size={13} className="text-amber-600" />
                        <span>ชุดแฟ้มพิมพ์ด่วน</span>
                        <ChevronDown size={13} className="text-slate-400" />
                      </Menu.Button>

                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="absolute right-0 bottom-full mb-1.5 w-64 origin-bottom-right rounded-lg bg-white p-1 shadow-lg ring-1 ring-black/5 focus:outline-hidden z-20 border border-slate-200">
                          <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400">
                            สั่งพิมพ์ชุดเอกสารทันที
                          </div>

                          <Menu.Item>
                            {({ active }) => (
                              <button
                                type="button"
                                onClick={() => handleQuickPresetPrint('draft')}
                                className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs font-semibold transition ${
                                  active ? 'bg-amber-50 text-amber-900' : 'text-slate-700'
                                }`}
                              >
                                <span className="flex items-center gap-1.5">
                                  <FileCheck2 size={14} className="text-amber-600" />
                                  ชุดเสนอลงนาม (ร่าง)
                                </span>
                                <span className="text-[10px] text-amber-700 font-bold bg-amber-100 rounded px-1.5 py-0.5">
                                  {isBatchLevel ? '3 ฉบับ' : '2 ฉบับ'}
                                </span>
                              </button>
                            )}
                          </Menu.Item>

                          <Menu.Item>
                            {({ active }) => (
                              <button
                                type="button"
                                onClick={() => handleQuickPresetPrint('final')}
                                className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs font-semibold transition ${
                                  active ? 'bg-emerald-50 text-emerald-900' : 'text-slate-700'
                                }`}
                              >
                                <span className="flex items-center gap-1.5">
                                  <Send size={14} className="text-emerald-600" />
                                  ชุดประกาศจริง (จริง)
                                </span>
                                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 rounded px-1.5 py-0.5">
                                  {isBatchLevel ? '3 ฉบับ' : '2 ฉบับ'}
                                </span>
                              </button>
                            )}
                          </Menu.Item>

                          <Menu.Item>
                            {({ active }) => (
                              <button
                                type="button"
                                onClick={() => handleQuickPresetPrint('all')}
                                className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs font-semibold transition ${
                                  active ? 'bg-indigo-50 text-indigo-900' : 'text-slate-700'
                                }`}
                              >
                                <span className="flex items-center gap-1.5">
                                  <Layers size={14} className="text-indigo-600" />
                                  พิมพ์ทั้งหมดครบชุด
                                </span>
                                <span className="text-[10px] text-indigo-700 font-bold bg-indigo-100 rounded px-1.5 py-0.5">
                                  {isBatchLevel ? '5 ฉบับ' : '4 ฉบับ'}
                                </span>
                              </button>
                            )}
                          </Menu.Item>
                        </Menu.Items>
                      </Transition>
                    </Menu>

                    {/* Main Print Button */}
                    <button
                      type="button"
                      disabled={selectedDocs.length === 0}
                      onClick={() => triggerMultiPrint()}
                      className={`inline-flex items-center gap-1.5 rounded px-4 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-[0.98] ${
                        selectedDocs.length === 0
                          ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      <Printer size={14} />
                      <span>สั่งพิมพ์ ({selectedDocs.length} ฉบับ)</span>
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