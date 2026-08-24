import { useEffect, useMemo, useState, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { Wallet, Eye, BadgeCheck } from "lucide-react";
import Combobox from "../../../components/common/Combobox";
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

// Tab definitions — each maps to the enrollment statuses it should query for.
const TABS = [
    { key: "pending", label: "รอตรวจสอบ", statuses: ["pending_payment", "pending_verification"] },
    { key: "paid", label: "ชำระแล้ว", statuses: ["paid"] },
    { key: "rejected", label: "สลิปไม่ถูกต้อง", statuses: ["rejected"] },
    { key: "all", label: "ทั้งหมด", statuses: null }, // null = no status filter
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
 * - Auto-selects the Active Batch on load.
 * - Tabs: Pending Verification (default) / Paid / Rejected / All.
 * - Row action opens FinanceVerificationModal (zoom/rotate slip, approve/reject, audit log).
 */
export default function FinanceVerificationPage() {
    const [enrollments, setEnrollments] = useState([]);
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

            const tab = TABS.find((t) => t.key === activeTab);
            if (!tab?.statuses) {
                const data = await getEnrollments(params);
                setEnrollments(data);
            } else {
                const results = await Promise.all(tab.statuses.map((status) => getEnrollments({ ...params, status })));
                setEnrollments(results.flat());
            }
        } finally {
            setLoading(false);
        }
    }, [filterBatchId, filterGroupId, activeTab]);

    useEffect(() => {
        load();
    }, [load]);

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
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
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
        <div className="p-4 sm:p-6">
            <h1 className="mb-1 flex items-center gap-2 text-xl font-black text-slate-800">
                <Wallet size={22} className="text-blue-600" /> ตรวจสอบและยืนยันการชำระเงิน (แผนกการเงิน)
            </h1>
            <p className="mb-5 text-sm text-slate-500">
                เลือกรุ่น/กลุ่มเรียน แล้วสลับแท็บเพื่อดูรายการรอตรวจสอบ ประวัติที่ชำระแล้ว หรือรายการที่ถูกปฏิเสธ
            </p>

            {/* Tabs */}
            <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`relative px-4 py-2.5 text-sm font-semibold transition ${activeTab === tab.key ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        {tab.label}
                        {activeTab === tab.key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-blue-600" />}
                    </button>
                ))}
            </div>

            {/* Quick filters */}
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[36rem] lg:grid-cols-2">
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

            <div className="h-[calc(100vh-20rem)] min-h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-white">
                <AgGridReact
                    theme={themeQuartz}
                    rowData={enrollments}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    loading={loading}
                    pagination
                    paginationPageSize={20}
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