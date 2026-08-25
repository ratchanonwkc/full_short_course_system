import { useEffect, useMemo, useState, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { Wallet, Eye, BadgeCheck, Clock, CheckCircle2, AlertCircle, Banknote } from "lucide-react";
import Combobox from "../../../components/common/Combobox";
import SummaryCard from "../../../components/common/SummaryCard";
import { getEnrollments } from "../../enrollments/services/enrollmentApi";
import { getBatches } from "../../batches/services/batchApi";
import { getStudyGroups } from "../../study-groups/services/studyGroupApi";
import FinanceVerificationModal from "../components/FinanceVerificationModal";
import { findActiveBatch, isBatchActive } from "../../../utils/activeBatch";

ModuleRegistry.registerModules([AllCommunityModule]);

const STATUS_META = {
    pending_payment: { label: "รอชำระเงิน", className: "bg-amber-100 text-amber-700" },
    pending_verification: { label: "รอตรวจสอบสลิป", className: "bg-blue-100 text-blue-700" },
    paid: { label: "ชำระแล้ว", className: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "สลิปไม่ถูกต้อง", className: "bg-red-100 text-red-700" },
    cancelled: { label: "ยกเลิก", className: "bg-slate-200 text-slate-500" },
};

const PAYMENT_TYPE_LABELS = {
    online_transfer: "โอนเงินออนไลน์",
    counter_cash: "ชำระที่ห้องการเงิน",
};

// Tab definitions — each maps to the enrollment statuses it should display
const TABS = [
    { key: "pending", label: "รอตรวจสอบ", statuses: ["pending_payment", "pending_verification"] },
    { key: "paid", label: "ชำระแล้ว", statuses: ["paid"] },
    { key: "rejected", label: "สลิปไม่ถูกต้อง", statuses: ["rejected"] },
    { key: "all", label: "ทั้งหมด", statuses: null },
];

function StatusBadgeRenderer({ value }) {
    const meta = STATUS_META[value] || STATUS_META.pending_payment;
    return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>{meta.label}</span>;
}

function PaymentTypeRenderer({ value }) {
    const label = PAYMENT_TYPE_LABELS[value] || PAYMENT_TYPE_LABELS.online_transfer;
    const isCash = value === "counter_cash";
    return (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${isCash ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
            {label}
        </span>
    );
}

/**
 * FinanceVerificationPage — Tabbed audit-friendly payment verification dashboard.
 * - Lightweight Metric Summary Cards (Pending, Paid, Rejected, Total Revenue).
 * - Auto-selects the Active Batch on load.
 * - Tabs: Pending Verification (default) / Paid / Rejected / All.
 * - Row action opens FinanceVerificationModal (zoom/rotate slip, approve/reject, audit log).
 */
export default function FinanceVerificationPage() {
    const [allEnrollments, setAllEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewing, setViewing] = useState(null);
    const [activeTab, setActiveTab] = useState("pending");

    const [batches, setBatches] = useState([]);
    const [groups, setGroups] = useState([]);
    const [filterBatchId, setFilterBatchId] = useState("");
    const [filterGroupId, setFilterGroupId] = useState("");

    // ── Load batches, auto-select Active Batch ──────────────────────────────
    useEffect(() => {
        getBatches().then((data) => {
            setBatches(data);
            const active = findActiveBatch(data);
            if (active) setFilterBatchId(String(active.id));
        }).catch(() => setBatches([]));
    }, []);

    useEffect(() => {
        if (!filterBatchId) {
            setGroups([]);
            setFilterGroupId("");
            return;
        }
        getStudyGroups({ batch_id: filterBatchId }).then(setGroups).catch(() => setGroups([]));
        setFilterGroupId("");
    }, [filterBatchId]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterGroupId) params.study_group_id = filterGroupId;
            else if (filterBatchId) params.batch_id = filterBatchId;

            const data = await getEnrollments(params);
            setAllEnrollments(Array.isArray(data) ? data : []);
        } catch {
            setAllEnrollments([]);
        } finally {
            setLoading(false);
        }
    }, [filterBatchId, filterGroupId]);

    useEffect(() => {
        load();
    }, [load]);

    // ── Computed Metrics & Stats for Summary Cards ──────────────────────────
    const stats = useMemo(() => {
        let pending = 0;
        let paid = 0;
        let rejected = 0;
        let totalRevenue = 0;

        for (const item of allEnrollments) {
            if (item.status === "pending_payment" || item.status === "pending_verification") {
                pending++;
            } else if (item.status === "paid") {
                paid++;
                totalRevenue += Number(item.total_amount) || 0;
            } else if (item.status === "rejected") {
                rejected++;
            }
        }

        return { pending, paid, rejected, totalRevenue };
    }, [allEnrollments]);

    // ── Filtered rows for current Tab ───────────────────────────────────────
    const filteredEnrollments = useMemo(() => {
        const tab = TABS.find((t) => t.key === activeTab);
        if (!tab?.statuses) return allEnrollments;
        return allEnrollments.filter((item) => tab.statuses.includes(item.status));
    }, [allEnrollments, activeTab]);

    const batchOptions = useMemo(
        () => batches.map((b) => ({ value: b.id, label: isBatchActive(b) ? `${b.batch_name} (รุ่นปัจจุบัน)` : b.batch_name })),
        [batches]
    );
    const groupOptions = useMemo(
        () => groups.map((g) => ({ value: g.id, label: `${g.group_code} — ${g.group_name}` })),
        [groups]
    );
    const currentBatch = useMemo(() => batches.find((b) => String(b.id) === String(filterBatchId)), [batches, filterBatchId]);

    const ActionsRenderer = (params) => (
        <button
            onClick={() => setViewing(params.data)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 active:scale-95"
        >
            <Eye size={14} /> ตรวจสอบ / ยืนยัน
        </button>
    );

    const columnDefs = useMemo(
        () => [
            { field: "applicant_name", headerName: "ผู้สมัคร", flex: 1.4, minWidth: 160 },
            { field: "citizen_id", headerName: "เลขบัตรประชาชน", flex: 1.2, minWidth: 140, cellClass: "font-mono text-xs" },
            { field: "group_code", headerName: "กลุ่มเรียน", flex: 1, minWidth: 120 },
            { field: "payment_method", headerName: "ประเภทการชำระ", flex: 1, minWidth: 130, cellRenderer: PaymentTypeRenderer },
            {
                field: "total_amount",
                headerName: "ยอดชำระ",
                flex: 0.8,
                minWidth: 100,
                type: "numericColumn",
                valueFormatter: (p) => `${Number(p.value).toLocaleString()} บ.`,
            },
            {
                field: "status",
                headerName: "สถานะ",
                flex: 1,
                minWidth: 130,
                cellRenderer: StatusBadgeRenderer,
            },
            {
                headerName: "จัดการ",
                pinned: "right",
                width: 150,
                sortable: false,
                filter: false,
                cellRenderer: ActionsRenderer,
            },
        ],
        []
    );

    const defaultColDef = useMemo(() => ({ resizable: true, sortable: true, filter: true }), []);

    return (
        <div className="w-full flex-1 flex flex-col min-h-0 p-4 sm:p-6">
            {/* Header */}
            <div className="mb-5 flex flex-col gap-1 shrink-0">
                <h1 className="flex items-center gap-2 text-xl font-black text-slate-800 sm:text-2xl">
                    <Wallet size={24} className="text-blue-600" /> ตรวจสอบและยืนยันการชำระเงิน (แผนกการเงิน)
                </h1>
                <p className="text-sm text-slate-500">
                    ตรวจสอบหลักฐานการโอนเงิน ออกใบเสร็จรับเงิน และสรุปยอดรายได้ค่าลงทะเบียน
                </p>
            </div>

            {/* 📊 1. Lightweight Metric Summary Cards */}
            <div className="mb-5 grid grid-cols-2 gap-3.5 sm:grid-cols-2 lg:grid-cols-4 shrink-0">
                <SummaryCard
                    title="รอตรวจสอบ (Pending)"
                    value={loading ? "-" : stats.pending.toLocaleString()}
                    subtitle="สลิปรอการตรวจสอบ/ยืนยัน"
                    icon={Clock}
                    variant="amber"
                    loading={loading}
                    onClick={() => setActiveTab("pending")}
                />
                <SummaryCard
                    title="ชำระแล้ว (Paid)"
                    value={loading ? "-" : stats.paid.toLocaleString()}
                    subtitle="รายการที่อนุมัติเรียบร้อย"
                    icon={CheckCircle2}
                    variant="emerald"
                    loading={loading}
                    onClick={() => setActiveTab("paid")}
                />
                <SummaryCard
                    title="ปฏิเสธ/มีปัญหา (Rejected)"
                    value={loading ? "-" : stats.rejected.toLocaleString()}
                    subtitle="สลิปไม่ถูกต้อง/ยอดไม่ตรง"
                    icon={AlertCircle}
                    variant="rose"
                    loading={loading}
                    onClick={() => setActiveTab("rejected")}
                />
                <SummaryCard
                    title="ยอดเงินรวม (Total Revenue)"
                    value={loading ? "-" : `฿${stats.totalRevenue.toLocaleString()}`}
                    subtitle="ยอดค่าธรรมเนียมที่ชำระแล้ว"
                    icon={Banknote}
                    variant="blue"
                    loading={loading}
                />
            </div>

            {/* Quick filters */}
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[36rem] lg:grid-cols-2 shrink-0">
                <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        รุ่นการเรียน
                        {currentBatch && isBatchActive(currentBatch) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                <BadgeCheck size={10} /> รุ่นปัจจุบัน
                            </span>
                        )}
                    </label>
                    <Combobox value={filterBatchId} onChange={setFilterBatchId} options={batchOptions} placeholder="ทุกรุ่นการเรียน" />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-bold text-slate-400">กลุ่มเรียน</label>
                    <Combobox
                        value={filterGroupId}
                        onChange={setFilterGroupId}
                        options={groupOptions}
                        placeholder="ทุกกลุ่มเรียน"
                        disabled={!filterBatchId}
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200 shrink-0">
                {TABS.map((tab) => {
                    let count = 0;
                    if (tab.key === "pending") count = stats.pending;
                    else if (tab.key === "paid") count = stats.paid;
                    else if (tab.key === "rejected") count = stats.rejected;
                    else count = allEnrollments.length;

                    const isSelected = activeTab === tab.key;
                    let badgeCls = "bg-slate-100 text-slate-600";
                    if (tab.key === "pending") badgeCls = isSelected ? "bg-amber-100 text-amber-700 ring-1 ring-amber-400/30 font-bold" : "bg-amber-50 text-amber-600 font-semibold";
                    else if (tab.key === "paid") badgeCls = isSelected ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-400/30 font-bold" : "bg-emerald-50 text-emerald-600 font-semibold";
                    else if (tab.key === "rejected") badgeCls = isSelected ? "bg-rose-100 text-rose-700 ring-1 ring-rose-400/30 font-bold" : "bg-rose-50 text-rose-600 font-semibold";
                    else badgeCls = isSelected ? "bg-blue-100 text-blue-700 ring-1 ring-blue-400/30 font-bold" : "bg-slate-100 text-slate-600 font-semibold";

                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition ${
                                isSelected ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs transition ${badgeCls}`}>
                                {loading ? "-" : count}
                            </span>
                            {isSelected && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-blue-600" />}
                        </button>
                    );
                })}
            </div>

            {/* Ag Grid Table */}
            <div className="w-full flex-1 min-h-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                <AgGridReact
                    theme={themeQuartz}
                    rowData={filteredEnrollments}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    loading={loading}
                    pagination
                    paginationPageSize={20}
                    domLayout="normal"
                    headerHeight={42}
                    rowHeight={44}
                    animateRows
                    overlayNoRowsTemplate="<span class='text-sm text-slate-400'>ไม่มีรายการในหมวดนี้</span>"
                    getRowId={(params) => String(params.data.id)}
                    className="h-full w-full"
                />
            </div>

            <FinanceVerificationModal
                enrollment={viewing}
                onClose={() => setViewing(null)}
                onResolved={() => {
                    setViewing(null);
                    load();
                }}
            />
        </div>
    );
}