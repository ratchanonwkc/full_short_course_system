import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { useReactToPrint } from "react-to-print";
import Swal from "sweetalert2";
import { Users, UserPlus, IdCard, X, Search, Eye, BadgeCheck, UserCheck, AlertCircle, GraduationCap, Printer } from "lucide-react";
import Combobox from "../../../components/common/Combobox";
import SummaryCard from "../../../components/common/SummaryCard";
import { getStudyGroups, getBlankPrintTemplate } from "../../study-groups/services/studyGroupApi";
import { getBatches } from "../../batches/services/batchApi";
import { getEnrollments, createWalkinEnrollment, cancelEnrollment } from "../../enrollments/services/enrollmentApi";
import ApplicantFormFields, { EMPTY_APPLICANT } from "../../public/components/ApplicantFormFields";
import ApplicantDetailDrawer from "../components/ApplicantDetailDrawer";
import ApplicationFormPrint from "../../../components/print/ApplicationFormPrint";
import { findActiveBatch, isBatchActive } from "../../../utils/activeBatch";

ModuleRegistry.registerModules([AllCommunityModule]);

const STATUS_META = {
    pending_payment: { label: "รอชำระเงิน", className: "bg-amber-100 text-amber-700" },
    pending_verification: { label: "รอตรวจสอบสลิป", className: "bg-blue-100 text-blue-700" },
    paid: { label: "ชำระเงินแล้ว", className: "bg-emerald-100 text-emerald-700" },
    cancelled: { label: "ยกเลิก", className: "bg-slate-200 text-slate-500" },
};

const STATUS_FILTERS = [
    { value: "all", label: "ทุกสถานะ" },
    { value: "paid", label: "ชำระเงินแล้ว" },
    { value: "pending", label: "รอชำระเงิน" }, // covers both pending_payment + pending_verification
    { value: "cancelled", label: "ยกเลิก" },
];

const PAYMENT_METHOD_OPTIONS = [
    { value: "online_transfer", label: "โอนเงินออนไลน์ / แนบสลิป" },
    { value: "counter_cash", label: "ชำระเงินที่ห้องการเงิน (Pay at Finance Office)" },
];

function StatusBadgeRenderer({ value }) {
    const meta = STATUS_META[value] || STATUS_META.pending_payment;
    return (
        <div className="flex h-full w-full items-center justify-center">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
        </div>
    );
}

function matchesStatusFilter(enrollmentStatus, filterValue) {
    if (filterValue === "all") return true;
    if (filterValue === "pending") return enrollmentStatus === "pending_payment" || enrollmentStatus === "pending_verification";
    return enrollmentStatus === filterValue;
}

/**
 * RegistrarEnrollmentsPage — Flat global applicant table.
 * - Auto-selects the Active Batch on load (findActiveBatch), manual override via Combobox.
 * - Lightweight Metric Summary Cards (Total Applicants, Assigned, Unassigned, Ready for Class).
 * - Global search across name/phone/email/citizen_id.
 * - Status quick filters.
 * - Row click -> ApplicantDetailDrawer (slide-over, full profile + registrar full-edit).
 */
export default function RegistrarEnrollmentsPage() {
    const [batches, setBatches] = useState([]);
    const [groups, setGroups] = useState([]);
    const [selectedBatchId, setSelectedBatchId] = useState("");
    const [selectedGroupId, setSelectedGroupId] = useState(""); // "" = all groups in batch
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [walkinOpen, setWalkinOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [detailEnrollment, setDetailEnrollment] = useState(null);

    // Blank Application Printing state
    const [blankPrintData, setBlankPrintData] = useState(null);
    const blankPrintRef = useRef(null);

    const handlePrintBlankDoc = useReactToPrint({
        contentRef: blankPrintRef,
        documentTitle: `ใบสมัครเปล่า_${blankPrintData?.group_name || "blank_application"}`,
    });

    const handlePrintPureBlank = async () => {
        try {
            const data = await getBlankPrintTemplate("");
            setBlankPrintData(data);
            setTimeout(() => {
                handlePrintBlankDoc();
            }, 150);
        } catch (err) {
            Swal.fire("ไม่สามารถพิมพ์ได้", "เกิดข้อผิดพลาดในการโหลดแบบฟอร์มเปล่า", "error");
        }
    };

    // ── Load batches, auto-select Active Batch ──────────────────────────────
    useEffect(() => {
        getBatches().then((data) => {
            setBatches(data);
            const active = findActiveBatch(data);
            if (active) setSelectedBatchId(String(active.id));
        });
    }, []);

    // ── Load study groups for the selected batch ────────────────────────────
    useEffect(() => {
        if (!selectedBatchId) {
            setGroups([]);
            return;
        }
        getStudyGroups({ batch_id: selectedBatchId }).then(setGroups).catch(() => setGroups([]));
        setSelectedGroupId("");
    }, [selectedBatchId]);

    const loadEnrollments = useCallback(async () => {
        if (!selectedBatchId) return;
        setLoading(true);
        try {
            const params = selectedGroupId
                ? { study_group_id: selectedGroupId }
                : { batch_id: selectedBatchId };
            const data = await getEnrollments(params);
            setEnrollments(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    }, [selectedBatchId, selectedGroupId]);

    useEffect(() => {
        loadEnrollments();
    }, [loadEnrollments]);

    // ── Computed Statistics for Summary Cards ───────────────────────────────
    const stats = useMemo(() => {
        const total = enrollments.length;
        const assigned = enrollments.filter((e) => Boolean(e.study_group_id || e.group_code)).length;
        const unassigned = enrollments.filter((e) => !e.study_group_id && !e.group_code).length;
        const readyForClass = enrollments.filter((e) => e.status === "paid").length;

        return { total, assigned, unassigned, readyForClass };
    }, [enrollments]);

    const batchOptions = useMemo(
        () =>
            batches.map((b) => ({
                value: b.id,
                label: isBatchActive(b) ? `${b.batch_name} (รุ่นปัจจุบัน)` : b.batch_name,
            })),
        [batches]
    );
    const groupOptions = useMemo(
        () => groups.map((g) => ({ value: g.id, label: `${g.group_code} — ${g.group_name}` })),
        [groups]
    );

    const currentBatch = useMemo(
        () => batches.find((b) => String(b.id) === String(selectedBatchId)),
        [batches, selectedBatchId]
    );
    const currentGroup = useMemo(
        () => groups.find((g) => String(g.id) === String(selectedGroupId)),
        [groups, selectedGroupId]
    );

    // ── Flat table: global search + status filter (client-side, on already-scoped rows) ──
    const filteredEnrollments = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return enrollments.filter((e) => {
            const matchesSearch =
                !term ||
                (e.applicant_name || "").toLowerCase().includes(term) ||
                (e.phone || "").includes(term) ||
                (e.citizen_id || "").includes(term) ||
                (e.email || "").toLowerCase().includes(term);
            return matchesSearch && matchesStatusFilter(e.status, statusFilter);
        });
    }, [enrollments, searchTerm, statusFilter]);

    const handleCancel = async (enrollment) => {
        const result = await Swal.fire({
            title: "ยืนยันยกเลิกใบสมัครนี้?",
            text: `${enrollment.applicant_name}`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ยกเลิกใบสมัคร",
            cancelButtonText: "ปิด",
            confirmButtonColor: "#dc2626",
        });
        if (result.isConfirmed) {
            await cancelEnrollment(enrollment.id);
            loadEnrollments();
        }
    };

    const handleViewDetail = (enrollment) => setDetailEnrollment(enrollment);

    const handleReassigned = (updated) => {
        setEnrollments((prev) => prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)));
        setDetailEnrollment((prev) => (prev ? { ...prev, ...updated } : prev));
    };

    const ActionsRenderer = (params) => (
        <div className="flex h-full w-full items-center justify-center gap-1.5">
            <button
                type="button"
                onClick={() => handleViewDetail(params.data)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition active:scale-95"
            >
                <Eye size={13} /> รายละเอียด
            </button>
            {params.data.status !== "cancelled" && (
                <button
                    type="button"
                    onClick={() => handleCancel(params.data)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition active:scale-95"
                >
                    <X size={13} /> ยกเลิก
                </button>
            )}
        </div>
    );

    const getShiftInfo = (data) => {
        if (!data) return null;
        const text = `${data.time_slot_code || ""} ${data.time_slot_name || ""} ${data.group_code || ""} ${data.schedule_description || ""}`;
        if (text.includes("ค่ำ") || text.includes("ค1") || text.includes("ค2") || text.includes("17:") || text.includes("18:")) {
            return { label: "รอบค่ำ", cls: "bg-purple-50 text-purple-700 border-purple-200" };
        }
        if (text.includes("บ่าย") || text.includes("บ1") || text.includes("บ2") || text.includes("13:")) {
            return { label: "รอบบ่าย", cls: "bg-amber-50 text-amber-700 border-amber-200" };
        }
        if (text.includes("เสาร์") || text.includes("อาทิตย์") || text.includes("ส-อา") || text.includes("ส.") || text.includes("อ.")) {
            return { label: "ส-อา", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
        }
        if (text.includes("เช้า") || text.includes("ช1") || text.includes("ช2") || text.includes("08:") || text.includes("09:")) {
            return { label: "รอบเช้า", cls: "bg-blue-50 text-blue-700 border-blue-200" };
        }
        if (text.includes("พ1") || text.includes("พ2") || text.includes("พิเศษ")) {
            return { label: "รอบพิเศษ", cls: "bg-rose-50 text-rose-700 border-rose-200" };
        }
        return null;
    };

    const GroupDualLineRenderer = ({ data }) => {
        if (!data) return null;
        const shift = getShiftInfo(data);
        const tooltipParts = [
            data.teacher_name && `ผู้สอน: ${data.teacher_name}`,
            (data.room_code || data.location_name) && `ห้องเรียน: ${data.room_code || data.location_name}`,
            data.schedule_description && `เวลา: ${data.schedule_description}`,
        ].filter(Boolean);

        return (
            <div className="flex flex-col justify-center h-full py-1 leading-tight min-w-0" title={tooltipParts.join(" • ") || undefined}>
                <div className="font-semibold text-slate-800 text-sm truncate">
                    {data.group_name || data.subject_name || "-"}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                    {data.group_code && (
                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                            {data.group_code}
                        </span>
                    )}
                    {shift && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${shift.cls}`}>
                            {shift.label}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    const columnDefs = useMemo(
        () => [
            {
                field: "citizen_id",
                headerName: "เลขบัตรประชาชน",
                flex: 1,
                minWidth: 130,
                headerClass: "ag-header-cell-center",
                cellClass: "font-mono text-xs flex items-center justify-center",
            },
            {
                field: "applicant_name",
                headerName: "ชื่อ-นามสกุล",
                flex: 1.3,
                minWidth: 150,
                cellClass: "font-semibold text-slate-900 flex items-center",
            },
            {
                headerName: "ติดต่อ",
                flex: 1.1,
                minWidth: 140,
                cellClass: "flex items-center text-xs text-slate-600",
                valueGetter: (p) => `${p.data.phone || "-"}${p.data.email ? ` / ${p.data.email}` : ""}`,
            },
            {
                field: "batch_name",
                headerName: "รุ่นการเรียน",
                flex: 0.9,
                minWidth: 110,
                headerClass: "ag-header-cell-center",
                cellClass: "flex items-center justify-center text-xs text-slate-700",
            },
            {
                headerName: "กลุ่มเรียน / รายวิชา",
                field: "group_name",
                flex: 1.6,
                minWidth: 190,
                cellRenderer: GroupDualLineRenderer,
            },
            {
                field: "status",
                headerName: "สถานะชำระเงิน",
                flex: 1,
                minWidth: 130,
                headerClass: "ag-header-cell-center",
                cellClass: "flex items-center justify-center",
                cellRenderer: StatusBadgeRenderer,
            },
            {
                headerName: "จัดการ",
                pinned: "right",
                width: 185,
                sortable: false,
                filter: false,
                headerClass: "ag-header-cell-center",
                cellClass: "flex items-center justify-center",
                cellRenderer: ActionsRenderer,
            },
        ],
        []
    );

    const defaultColDef = useMemo(
        () => ({
            resizable: true,
            sortable: true,
            filter: true,
            cellClass: "flex items-center text-sm text-slate-700",
            headerClass: "font-semibold text-slate-700",
        }),
        []
    );

    // Study groups scoped to the applicant being viewed in the drawer (their own batch)
    const [modalGroupOptions, setModalGroupOptions] = useState([]);
    useEffect(() => {
        if (!detailEnrollment) {
            setModalGroupOptions([]);
            return;
        }
        const batchIdForApplicant = detailEnrollment.batch_id || selectedBatchId;
        getStudyGroups({ batch_id: batchIdForApplicant })
            .then((data) => setModalGroupOptions(data.map((g) => ({ value: g.id, label: `${g.group_code} — ${g.group_name}` }))))
            .catch(() => setModalGroupOptions([]));
    }, [detailEnrollment, selectedBatchId]);

    return (
        <div className="w-full flex-1 flex flex-col min-h-0 p-4 sm:p-6">
            {/* Header */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="flex items-center gap-2 text-xl font-black text-slate-800 sm:text-2xl">
                        <UserCheck size={24} className="text-blue-600" /> จัดการรายชื่อผู้สมัคร &amp; จัดกลุ่มเรียน
                    </h1>
                    <p className="text-sm text-slate-500">
                        ค้นหา ตรวจสอบสถานะการชำระเงิน และกำหนดกลุ่มเรียนให้ผู้สมัคร
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handlePrintPureBlank}
                        className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-blue-600 active:scale-95"
                    >
                        <Printer size={16} /> พิมพ์ใบสมัครเปล่า
                    </button>
                    <button
                        onClick={() => setWalkinOpen(true)}
                        disabled={!selectedBatchId}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                    >
                        <UserPlus size={16} /> ลงทะเบียน Walk-in
                    </button>
                </div>
            </div>

            {/* 📊 1. Lightweight Metric Summary Cards */}
            <div className="mb-5 grid grid-cols-2 gap-3.5 sm:grid-cols-2 lg:grid-cols-4 shrink-0">
                <SummaryCard
                    title="ผู้สมัครทั้งหมด (Total Applicants)"
                    value={loading ? "-" : stats.total.toLocaleString()}
                    subtitle="ยอดผู้ลงทะเบียนในรุ่นนี้"
                    icon={Users}
                    variant="navy"
                    loading={loading}
                />
                <SummaryCard
                    title="จัดกลุ่มเรียนแล้ว (Assigned)"
                    value={loading ? "-" : stats.assigned.toLocaleString()}
                    subtitle="มีกลุ่มเรียนและห้องเรียนแล้ว"
                    icon={UserCheck}
                    variant="indigo"
                    loading={loading}
                />
                <SummaryCard
                    title="ยังไม่ระบุกลุ่ม (Unassigned)"
                    value={loading ? "-" : stats.unassigned.toLocaleString()}
                    subtitle="รอกำหนดกลุ่มเรียน"
                    icon={AlertCircle}
                    variant="amber"
                    loading={loading}
                />
                <SummaryCard
                    title="ชำระเงินเรียบร้อย (Ready for Class)"
                    value={loading ? "-" : stats.readyForClass.toLocaleString()}
                    subtitle="สถานะพร้อมเข้าเรียน"
                    icon={GraduationCap}
                    variant="emerald"
                    loading={loading}
                />
            </div>

            {/* Global filter bar */}
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 shrink-0">
                <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        รุ่นการเรียน
                        {currentBatch && isBatchActive(currentBatch) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                <BadgeCheck size={10} /> รุ่นปัจจุบัน
                            </span>
                        )}
                    </label>
                    <Combobox
                        value={selectedBatchId}
                        onChange={setSelectedBatchId}
                        options={batchOptions}
                        placeholder="เลือกรุ่นการเรียน..."
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-bold text-slate-400">กลุ่มเรียน</label>
                    <Combobox
                        value={selectedGroupId}
                        onChange={setSelectedGroupId}
                        options={groupOptions}
                        placeholder="ทุกกลุ่มเรียนในรุ่นนี้"
                        disabled={!selectedBatchId}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-bold text-slate-400">ค้นหา</label>
                    <div className="relative">
                        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="ชื่อ, เบอร์โทร, อีเมล, เลขบัตร..."
                            className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                        />
                    </div>
                </div>
                <div>
                    <label className="mb-1 block text-xs font-bold text-slate-400">สถานะ</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                    >
                        {STATUS_FILTERS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {currentGroup && (
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-600 shrink-0">
                    <span
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-2xs"
                        title="นับเฉพาะผู้สมัครที่ได้รับการยืนยันการชำระเงินแล้ว (Confirmed Paid)"
                    >
                        <Users size={14} className="text-blue-600" />
                        จำนวนที่นั่ง: <span className="font-bold text-slate-900">{currentGroup.current_seats || 0}</span> / {currentGroup.max_seats || 0}
                        <span className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-100">
                            (ชำระเงินแล้ว)
                        </span>
                    </span>
                </div>
            )}

            <div className="h-[calc(100vh-260px)] min-h-[480px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                <AgGridReact
                    theme={themeQuartz}
                    rowData={filteredEnrollments}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    loading={loading}
                    pagination
                    paginationPageSize={25}
                    paginationPageSizeSelector={[10, 25, 50, 100]}
                    domLayout="normal"
                    headerHeight={44}
                    rowHeight={56}
                    animateRows
                    overlayNoRowsTemplate="<span class='text-sm text-slate-400'>ยังไม่มีผู้ลงทะเบียน</span>"
                    getRowId={(params) => String(params.data.id)}
                    onRowDoubleClicked={(params) => handleViewDetail(params.data)}
                    rowStyle={{ cursor: "pointer" }}
                    className="h-full w-full"
                />
            </div>

            <WalkinModal
                isOpen={walkinOpen}
                onClose={() => setWalkinOpen(false)}
                batches={batches}
                defaultBatchId={selectedBatchId}
                groups={groups}
                defaultGroupId={selectedGroupId}
                onSuccess={() => {
                    setWalkinOpen(false);
                    loadEnrollments();
                }}
            />

            <ApplicantDetailDrawer
                isOpen={Boolean(detailEnrollment)}
                onClose={() => setDetailEnrollment(null)}
                enrollment={detailEnrollment}
                groupOptionsForBatch={modalGroupOptions}
                onReassigned={handleReassigned}
            />

            {/* ── Hidden Print Component for Blank Application ──────── */}
            <div className="hidden">
                <ApplicationFormPrint
                    ref={blankPrintRef}
                    isBlank={true}
                    enrollment={blankPrintData}
                    studentNo=""
                />
            </div>
        </div>
    );
}

function WalkinModal({ isOpen, onClose, batches, defaultBatchId, groups, defaultGroupId, onSuccess }) {
    const [formData, setFormData] = useState(EMPTY_APPLICANT);
    const [batchId, setBatchId] = useState(defaultBatchId);
    const [groupId, setGroupId] = useState(defaultGroupId);
    const [modalGroups, setModalGroups] = useState(groups);
    const [paymentMethod, setPaymentMethod] = useState("online_transfer");
    const [submitting, setSubmitting] = useState(false);

    const batchOptions = useMemo(
        () => batches.map((b) => ({ value: b.id, label: isBatchActive(b) ? `${b.batch_name} (รุ่นปัจจุบัน)` : b.batch_name })),
        [batches]
    );
    const groupOptions = useMemo(
        () => modalGroups.map((g) => ({ value: g.id, label: `${g.group_code} — ${g.group_name}` })),
        [modalGroups]
    );

    useEffect(() => {
        if (isOpen) {
            setFormData(EMPTY_APPLICANT);
            setBatchId(defaultBatchId);
            setGroupId(defaultGroupId);
            setModalGroups(groups);
            setPaymentMethod("online_transfer");
        }
    }, [isOpen, defaultBatchId, defaultGroupId, groups]);

    // Re-fetch groups if officer picks a different batch inside the modal
    useEffect(() => {
        if (!isOpen || !batchId) return;
        if (String(batchId) === String(defaultBatchId)) {
            setModalGroups(groups);
            return;
        }
        getStudyGroups({ batch_id: batchId }).then(setModalGroups).catch(() => setModalGroups([]));
        setGroupId("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batchId, isOpen]);

    if (!isOpen) return null;

    const handleReadSmartCard = () => {
        Swal.fire({
            title: "กำลังอ่านข้อมูลจากบัตรประชาชน...",
            timer: 1200,
            didOpen: () => Swal.showLoading(),
        }).then(() => {
            setFormData((prev) => ({
                ...prev,
                citizen_id: "1234567890123",
                title_name: "นาย",
                full_name: "สมชาย ใจดี",
                birth_date: "1998-05-12",
                house_no: "123",
                moo: "4",
                postal_code: "10110",
                subdistrict: "คลองตัน",
                district: "วัฒนา",
                province: "กรุงเทพมหานคร",
            }));
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.citizen_id.length !== 13) {
            Swal.fire("ข้อมูลไม่ถูกต้อง", "กรุณากรอกเลขประจำตัวประชาชนให้ครบ 13 หลัก", "warning");
            return;
        }
        if (!groupId) {
            Swal.fire("แจ้งเตือน", "กรุณาเลือกกลุ่มเรียน", "warning");
            return;
        }
        try {
            setSubmitting(true);
            await createWalkinEnrollment({
                applicant: formData,
                study_group_id: Number(groupId),
                payment_method: paymentMethod,
            });
            Swal.fire(
                "สำเร็จ",
                paymentMethod === "counter_cash"
                    ? "ลงทะเบียน Walk-in เรียบร้อย รอชำระเงินที่ห้องการเงิน"
                    : "ลงทะเบียน Walk-in เรียบร้อย สถานะ 'รอชำระเงิน' ส่งต่อแผนกการเงิน",
                "success"
            );
            onSuccess?.();
        } catch (error) {
            Swal.fire("เกิดข้อผิดพลาด", error.response?.data?.message || "ไม่สามารถลงทะเบียนได้", "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-lg font-black text-slate-800">
                        <UserPlus size={20} className="text-blue-600" /> ลงทะเบียนนักเรียน Walk-in
                    </h2>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-sm font-bold text-slate-600">รุ่นการเรียน *</label>
                            <Combobox value={batchId} onChange={setBatchId} options={batchOptions} placeholder="เลือกรุ่นการเรียน..." />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-bold text-slate-600">กลุ่มเรียน *</label>
                            <Combobox
                                value={groupId}
                                onChange={setGroupId}
                                options={groupOptions}
                                placeholder="เลือกกลุ่มเรียน..."
                                disabled={!batchId}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-bold text-slate-600">ช่องทางการชำระเงิน *</label>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {PAYMENT_METHOD_OPTIONS.map((opt) => (
                                <label
                                    key={opt.value}
                                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm transition ${paymentMethod === opt.value
                                        ? "border-blue-400 bg-blue-50 font-semibold text-blue-700"
                                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="payment_method"
                                        value={opt.value}
                                        checked={paymentMethod === opt.value}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="accent-blue-600"
                                    />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <ApplicantFormFields
                        formData={formData}
                        setFormData={setFormData}
                        showCitizenIdReader
                        onReadSmartCard={handleReadSmartCard}
                    />

                    <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            <IdCard size={16} /> {submitting ? "กำลังบันทึก..." : "บันทึกและส่งต่อแผนกการเงิน"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}