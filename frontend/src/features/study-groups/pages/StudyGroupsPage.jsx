import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Search, Plus, Layers, Armchair, Users, BadgeCheck, Printer, FileText } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import Swal from "sweetalert2";
import StudyGroupTable from "../components/StudyGroupTable";
import GroupFormPanel from "../components/GroupFormPanel";
import StudyGroupRosterModal from "../components/StudyGroupRosterModal";
import ApplicationFormPrint from "../../../components/print/ApplicationFormPrint";
import SplitPanelLayout from "../../curriculums/components/SplitPanelLayout";
import SearchableCombobox from "../../../components/common/SearchableCombobox";
import Combobox from "../../../components/common/Combobox";
import SummaryCard from "../../../components/common/SummaryCard";
import { getStudyGroups, deleteStudyGroup, getLocations, getTimeSlots, getBlankPrintTemplate } from "../services/studyGroupApi";
import { getBatches } from "../../batches/services/batchApi";
import { getMajors } from "../../curriculums/services/academicStructureApi";
import { getSubjects } from "../../subjects/services/subjectApi";
import { getTeachers } from "../../teachers/services/teacherApi";
import { findActiveBatch, isBatchActive } from "../../../utils/activeBatch";

const STATUS_FILTER_OPTIONS = [
    { value: "all", label: "ทุกสถานะ" },
    { value: "draft", label: "📝 ร่าง" },
    { value: "open", label: "🟢 เปิดสอน" },
    { value: "full", label: "🔴 เต็ม" },
    { value: "cancelled", label: "⚪ ยกเลิก" },
];

/**
 * StudyGroupsPage
 * -------------------------------------------------------------------------
 * หน้าจัดการ "กลุ่มเรียน" (study_groups)
 * - Auto-selects the Active Batch on load (findActiveBatch), manual override via Combobox.
 * - Split View: ฝั่งซ้าย (60%) AG-Grid รายการกลุ่มเรียน + Filter, ฝั่งขวา (40%) Form Panel
 */
export default function StudyGroupsPage() {
    const { batchId } = useParams();
    const navigate = useNavigate();

    const [batches, setBatches] = useState([]);
    const [selectedBatchId, setSelectedBatchId] = useState(batchId ? String(batchId) : "");
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterMajorId, setFilterMajorId] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [editingGroup, setEditingGroup] = useState(null);
    const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);

    // Study Group Roster Modal state
    const [rosterGroupId, setRosterGroupId] = useState(null);
    const [rosterGroupTitle, setRosterGroupTitle] = useState("");

    // Blank Application Printing state
    const [blankPrintData, setBlankPrintData] = useState(null);
    const blankPrintRef = useRef(null);

    const handlePrintBlankDoc = useReactToPrint({
        contentRef: blankPrintRef,
        documentTitle: `ใบสมัครเปล่า_${blankPrintData?.group_name || "blank_application"}`,
    });

    const triggerPrintBlank = (data) => {
        setBlankPrintData(data);
        setTimeout(() => {
            handlePrintBlankDoc();
        }, 150);
    };

    const handlePrintPureBlank = async () => {
        try {
            const data = await getBlankPrintTemplate("");
            triggerPrintBlank(data);
        } catch (err) {
            Swal.fire("ไม่สามารถพิมพ์ได้", "เกิดข้อผิดพลาดในการโหลดแบบฟอร์มเปล่า", "error");
        }
    };

    const handlePrintGroupBlank = async (group) => {
        try {
            const data = await getBlankPrintTemplate(group.id);
            triggerPrintBlank(data);
        } catch (err) {
            Swal.fire("ไม่สามารถพิมพ์ได้", "เกิดข้อผิดพลาดในการโหลดแบบฟอร์มประจำกลุ่ม", "error");
        }
    };

    const handleViewRoster = (group) => {
        setRosterGroupId(group.id);
        setRosterGroupTitle(group.group_name);
    };

    // Shared reference data (สำหรับ GroupFormPanel เท่านั้น)
    const [majors, setMajors] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [timeSlots, setTimeSlots] = useState([]);
    const [refLoading, setRefLoading] = useState(true);

    // ── Load Batches and Auto-select Active Batch ─────────────────────────────
    useEffect(() => {
        getBatches()
            .then((data) => {
                const batchList = Array.isArray(data) ? data : [];
                setBatches(batchList);
                if (batchId) {
                    setSelectedBatchId(String(batchId));
                } else {
                    const active = findActiveBatch(batchList);
                    if (active) setSelectedBatchId(String(active.id));
                    else if (batchList.length > 0) setSelectedBatchId(String(batchList[0].id));
                }
            })
            .catch(() => setBatches([]));
    }, [batchId]);

    const batch = useMemo(
        () => batches.find((b) => String(b.id) === String(selectedBatchId)) || null,
        [batches, selectedBatchId]
    );

    const batchOptions = useMemo(
        () =>
            batches.map((b) => ({
                value: b.id,
                label: isBatchActive(b) ? `${b.batch_name} (รุ่นปัจจุบัน)` : b.batch_name,
            })),
        [batches]
    );

    // ── โหลดกลุ่มเรียนของรุ่นที่เลือก ─────────────────────────────────────────
    const fetchGroups = useCallback(async () => {
        if (!selectedBatchId) {
            setGroups([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const data = await getStudyGroups({ batch_id: selectedBatchId, major_id: filterMajorId || undefined });
            setGroups(Array.isArray(data) ? data : []);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "โหลดข้อมูลกลุ่มเรียนไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#0270c7",
            });
            setGroups([]);
        } finally {
            setLoading(false);
        }
    }, [selectedBatchId, filterMajorId]);

    // ── โหลดข้อมูลอ้างอิงสำหรับ GroupFormPanel (non-blocking ต่อตาราง) ─────────
    const fetchReferenceData = useCallback(async () => {
        setRefLoading(true);
        const [majorsRes, subjectsRes, teachersRes, locationsRes, timeSlotsRes] = await Promise.allSettled([
            getMajors(),
            getSubjects({ pageSize: 1000 }),
            getTeachers({ status: "active" }),
            getLocations(),
            getTimeSlots(),
        ]);

        setMajors(majorsRes.status === "fulfilled" ? (Array.isArray(majorsRes.value) ? majorsRes.value : []) : []);
        setSubjects(
            subjectsRes.status === "fulfilled"
                ? Array.isArray(subjectsRes.value?.data)
                    ? subjectsRes.value.data
                    : Array.isArray(subjectsRes.value)
                    ? subjectsRes.value
                    : []
                : []
        );
        setTeachers(teachersRes.status === "fulfilled" ? (Array.isArray(teachersRes.value) ? teachersRes.value : []) : []);
        setLocations(locationsRes.status === "fulfilled" ? (Array.isArray(locationsRes.value) ? locationsRes.value : []) : []);
        setTimeSlots(timeSlotsRes.status === "fulfilled" ? (Array.isArray(timeSlotsRes.value) ? timeSlotsRes.value : []) : []);

        setRefLoading(false);
    }, []);

    useEffect(() => {
        fetchReferenceData();
    }, [fetchReferenceData]);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    // ── refresh locations หลัง Quick Add / Manage ──────────────────────────────
    const handleLocationsRefresh = useCallback(async () => {
        try {
            const data = await getLocations();
            setLocations(Array.isArray(data) ? data : []);
        } catch {
            /* non-blocking */
        }
    }, []);

    const majorOptions = useMemo(() => majors.map((m) => ({ value: m.id, label: m.name_th })), [majors]);

    const filteredGroups = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return groups.filter((g) => {
            const matchesSearch =
                !term ||
                (g.group_code || "").toLowerCase().includes(term) ||
                (g.group_name || "").toLowerCase().includes(term) ||
                (g.teacher_name || "").toLowerCase().includes(term);
            const matchesStatus = filterStatus === "all" || g.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [groups, searchTerm, filterStatus]);

    const handleCreate = () => {
        setEditingGroup(null);
        setIsMobileFormOpen(true);
    };

    const handleEdit = (group) => {
        setEditingGroup(group);
        setIsMobileFormOpen(true);
    };

    const handleCancelEdit = () => {
        setEditingGroup(null);
        setIsMobileFormOpen(false);
    };

    const handleDelete = async (group) => {
        try {
            await deleteStudyGroup(group.id);
            setGroups((prev) => prev.filter((g) => g.id !== group.id));
            if (editingGroup?.id === group.id) setEditingGroup(null);
        } catch (err) {
            const isConflict = err?.response?.status === 409;
            Swal.fire({
                icon: "error",
                title: isConflict ? "ไม่สามารถลบได้" : "เกิดข้อผิดพลาด",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#0270c7",
            });
        }
    };

    const handleSaved = () => {
        setEditingGroup(null);
        setIsMobileFormOpen(false);
        fetchGroups();
    };

    const grid = (
        <>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:max-w-[220px]">
                        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="ค้นหากลุ่มเรียน..."
                            className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                        />
                    </div>
                    <div className="w-full sm:max-w-[220px]">
                        <SearchableCombobox
                            value={filterMajorId}
                            onChange={setFilterMajorId}
                            options={majorOptions}
                            placeholder="กรองตามแผนกวิชา..."
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 py-1.5 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 sm:max-w-[160px]"
                    >
                        {STATUS_FILTER_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!selectedBatchId}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                >
                    <Plus size={14} />
                    เพิ่มกลุ่มเรียนใหม่
                </button>
            </div>

            <div className="min-h-[480px] flex-1 overflow-hidden rounded-lg border border-slate-200 lg:min-h-0">
                <StudyGroupTable
                    rowData={filteredGroups}
                    loading={loading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onViewRoster={handleViewRoster}
                    onPrintGroupBlank={handlePrintGroupBlank}
                />
            </div>
        </>
    );

    const form = (
        <GroupFormPanel
            batchId={selectedBatchId}
            batch={batch}
            initialData={editingGroup}
            onSaved={handleSaved}
            onCancelEdit={handleCancelEdit}
            majors={majors}
            subjects={subjects}
            teachers={teachers}
            locations={locations}
            timeSlots={timeSlots}
            refLoading={refLoading}
            onLocationsRefresh={handleLocationsRefresh}
        />
    );

    // ── Computed Stats for Study Groups ─────────────────────────────────────
    const stats = useMemo(() => {
        const totalGroups = groups.length;
        const availableSeats = groups.reduce((sum, g) => {
            const max = Number(g.max_seats) || 0;
            const current = Number(g.current_seats) || 0;
            return sum + Math.max(0, max - current);
        }, 0);
        const totalEnrolled = groups.reduce((sum, g) => sum + (Number(g.current_seats) || 0), 0);
        const totalCapacity = groups.reduce((sum, g) => sum + (Number(g.max_seats) || 0), 0);

        return { totalGroups, availableSeats, totalEnrolled, totalCapacity };
    }, [groups]);

    return (
        <div className="w-full flex-1 flex flex-col min-h-0 p-4 sm:p-6">
            {/* Breadcrumb / Header */}
            <div className="mb-5 flex flex-col gap-2 shrink-0">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Link to="/batches" className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline">
                        <ChevronLeft size={15} />
                        รุ่นการเรียนทั้งหมด
                    </Link>
                    <span>/</span>
                    <span className="font-medium text-slate-700">จัดการกลุ่มเรียน</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                            <Layers size={18} />
                        </span>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                                {batch ? `จัดการกลุ่มเรียน — ${batch.batch_name}` : "จัดการกลุ่มเรียน"}
                            </h1>
                            <p className="text-sm text-slate-500">
                                {batch
                                    ? `ปีการศึกษา ${batch.academic_year} · ภาคเรียนที่ ${batch.term} · จัดการกลุ่มเรียนและตารางเรียนในรุ่นนี้`
                                    : "เลือกรุ่นการเรียนเพื่อจัดการกลุ่มเรียน"}
                            </p>
                        </div>
                    </div>

                    {/* Top Action Buttons (Pure Blank Form & Batch Selector) */}
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={handlePrintPureBlank}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition shadow-2xs"
                        >
                            <Printer size={14} />
                            <span>พิมพ์ใบสมัครเปล่า</span>
                        </button>

                        {/* Batch Combobox Selector */}
                        <div className="w-full sm:w-72">
                            <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                รุ่นการเรียน
                                {batch && isBatchActive(batch) && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                        <BadgeCheck size={10} /> รุ่นปัจจุบัน
                                    </span>
                                )}
                            </label>
                            <Combobox
                                value={selectedBatchId}
                                onChange={(val) => {
                                    setSelectedBatchId(val);
                                    setEditingGroup(null);
                                }}
                                options={batchOptions}
                                placeholder="เลือกรุ่นการเรียน..."
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 📊 Lightweight Metric Summary Cards */}
            <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3 shrink-0">
                <SummaryCard
                    title="กลุ่มเรียนทั้งหมด (Total Groups)"
                    value={loading ? "-" : stats.totalGroups.toLocaleString()}
                    subtitle="กลุ่มเรียนในรุ่นการเรียนนี้"
                    icon={Layers}
                    variant="indigo"
                    loading={loading}
                />
                <SummaryCard
                    title="จำนวนที่นั่งคงเหลือ (Available Seats)"
                    value={loading ? "-" : stats.availableSeats.toLocaleString()}
                    subtitle={`ความจุทั้งหมด ${stats.totalCapacity.toLocaleString()} ที่นั่ง`}
                    icon={Armchair}
                    variant="emerald"
                    loading={loading}
                />
                <SummaryCard
                    title="ผู้สมัครที่เข้ากลุ่มแล้ว (Enrolled)"
                    value={loading ? "-" : stats.totalEnrolled.toLocaleString()}
                    subtitle="จำนวนที่นั่งที่ถูกจองแล้ว"
                    icon={Users}
                    variant="blue"
                    loading={loading}
                />
            </div>

            {/* Split view */}
            <SplitPanelLayout
                grid={grid}
                form={form}
                isFormOpen={isMobileFormOpen}
                onCloseForm={() => setIsMobileFormOpen(false)}
            />

            {/* ── Study Group Student Roster (ศธ.02) Modal ─────────── */}
            <StudyGroupRosterModal
                isOpen={Boolean(rosterGroupId)}
                onClose={() => setRosterGroupId(null)}
                studyGroupId={rosterGroupId}
                groupTitle={rosterGroupTitle}
            />

            {/* ── Hidden Print Component for Blank Application ──────── */}
            <div className="hidden">
                {blankPrintData && (
                    <ApplicationFormPrint
                        ref={blankPrintRef}
                        enrollment={blankPrintData}
                        studentNo=""
                    />
                )}
            </div>
        </div>
    );
}