import { useEffect, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import Swal from "sweetalert2";
import { Wallet, Eye, CheckCircle2, X, ReceiptText } from "lucide-react";
import { getEnrollments, confirmPayment } from "../../enrollments/services/enrollmentApi";
import { getBatches } from "../../batches/services/batchApi";
import { getStudyGroups } from "../../study-groups/services/studyGroupApi";

ModuleRegistry.registerModules([AllCommunityModule]);

const STATUS_META = {
    pending_payment: { label: "รอชำระเงิน", className: "bg-amber-100 text-amber-700" },
    pending_verification: { label: "รอตรวจสอบสลิป", className: "bg-blue-100 text-blue-700" },
};

// Slip/QR URLs are now full Supabase Storage public URLs — use as-is, no origin concat needed.
const resolveFileUrl = (url) => url || null;

function StatusBadgeRenderer({ value }) {
    const meta = STATUS_META[value] || STATUS_META.pending_payment;
    return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>{meta.label}</span>;
}

/**
 * FinanceVerificationPage — Payment Verification Dashboard (Finance Portal)
 * AG-Grid table + Batch/Study Group quick filters + split receipt Book No./Receipt No. inputs.
 */
export default function FinanceVerificationPage() {
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewing, setViewing] = useState(null);

    const [batches, setBatches] = useState([]);
    const [groups, setGroups] = useState([]);
    const [filterBatchId, setFilterBatchId] = useState("");
    const [filterGroupId, setFilterGroupId] = useState("");

    useEffect(() => {
        getBatches().then(setBatches).catch(() => setBatches([]));
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

    const load = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterGroupId) params.study_group_id = filterGroupId;
            else if (filterBatchId) params.batch_id = filterBatchId;

            const [pv, pp] = await Promise.all([
                getEnrollments({ ...params, status: "pending_verification" }),
                getEnrollments({ ...params, status: "pending_payment" }),
            ]);
            setEnrollments([...pv, ...pp]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterBatchId, filterGroupId]);

    const ActionsRenderer = (params) => (
        <button
            onClick={() => setViewing(params.data)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
        >
            <Eye size={14} /> ตรวจสอบ / ยืนยัน
        </button>
    );

    const columnDefs = useMemo(
        () => [
            { field: "applicant_name", headerName: "ผู้สมัคร", flex: 1.4, minWidth: 160 },
            { field: "citizen_id", headerName: "เลขบัตรประชาชน", flex: 1.2, minWidth: 140, cellClass: "font-mono text-xs" },
            { field: "group_code", headerName: "กลุ่มเรียน", flex: 1, minWidth: 120 },
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
                <Wallet size={22} className="text-indigo-600" /> ตรวจสอบและยืนยันการชำระเงิน (แผนกการเงิน)
            </h1>
            <p className="mb-5 text-sm text-slate-500">
                รายการที่รอตรวจสอบสลิปหรือรอชำระเงิน — กรองตามรุ่น/กลุ่มเรียน แล้วกดยืนยันเพื่อออกใบเสร็จและเพิ่มที่นั่งอัตโนมัติ
            </p>

            {/* Quick filters */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <select
                    value={filterBatchId}
                    onChange={(e) => setFilterBatchId(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 sm:w-56"
                >
                    <option value="">ทุกรุ่นการเรียน</option>
                    {batches.map((b) => (
                        <option key={b.id} value={b.id}>{b.batch_name}</option>
                    ))}
                </select>
                <select
                    value={filterGroupId}
                    onChange={(e) => setFilterGroupId(e.target.value)}
                    disabled={!filterBatchId}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 sm:w-56"
                >
                    <option value="">ทุกกลุ่มเรียน</option>
                    {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.group_code} — {g.group_name}</option>
                    ))}
                </select>
            </div>

            <div className="h-[calc(100vh-16rem)] min-h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-white">
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
                    overlayNoRowsTemplate="<span class='text-sm text-slate-400'>ไม่มีรายการที่ต้องตรวจสอบ</span>"
                    getRowId={(params) => String(params.data.id)}
                    className="h-full w-full"
                />
            </div>

            <VerifyModal
                enrollment={viewing}
                onClose={() => setViewing(null)}
                onConfirmed={() => {
                    setViewing(null);
                    load();
                }}
            />
        </div>
    );
}

function VerifyModal({ enrollment, onClose, onConfirmed }) {
    const [receiptBookNo, setReceiptBookNo] = useState("");
    const [receiptNumber, setReceiptNumber] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setReceiptBookNo("");
        setReceiptNumber("");
    }, [enrollment]);

    if (!enrollment) return null;

    const handleConfirm = async () => {
        if (!receiptBookNo.trim()) {
            Swal.fire("แจ้งเตือน", "กรุณากรอกเล่มที่ใบเสร็จรับเงิน", "warning");
            return;
        }
        if (!receiptNumber.trim()) {
            Swal.fire("แจ้งเตือน", "กรุณากรอกเลขที่ใบเสร็จรับเงิน", "warning");
            return;
        }
        const result = await Swal.fire({
            title: "ยืนยันการชำระเงิน?",
            html: `ผู้สมัคร <b>${enrollment.applicant_name}</b><br/>เล่มที่/เลขที่: <b>${receiptBookNo}/${receiptNumber}</b><br/><span style="color:#94a3b8;font-size:13px">สถานะจะเปลี่ยนเป็น 'ชำระเงินแล้ว' และเพิ่มที่นั่งในกลุ่มเรียนอัตโนมัติ</span>`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "ยืนยันชำระเงิน",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#4f46e5",
        });
        if (!result.isConfirmed) return;

        try {
            setSubmitting(true);
            await confirmPayment(enrollment.id, {
                receipt_book_no: receiptBookNo.trim(),
                receipt_number: receiptNumber.trim(),
            });
            Swal.fire("สำเร็จ", "ยืนยันการชำระเงินและออกใบเสร็จเรียบร้อย", "success");
            onConfirmed?.();
        } catch (error) {
            Swal.fire("เกิดข้อผิดพลาด", error.response?.data?.message || "ไม่สามารถยืนยันการชำระเงินได้", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const slipSrc = resolveFileUrl(enrollment.slip_url);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-lg font-black text-slate-800">
                        <ReceiptText size={20} className="text-indigo-600" /> ตรวจสอบและยืนยันการชำระเงิน
                    </h2>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm">
                    <div><span className="text-slate-400">ผู้สมัคร:</span> <span className="font-bold text-slate-700">{enrollment.applicant_name}</span></div>
                    <div><span className="text-slate-400">เลขบัตรประชาชน:</span> <span className="font-mono text-slate-700">{enrollment.citizen_id}</span></div>
                    <div><span className="text-slate-400">กลุ่มเรียน:</span> <span className="font-bold text-slate-700">{enrollment.group_code}</span></div>
                    <div><span className="text-slate-400">ยอดที่ต้องชำระ:</span> <span className="font-bold text-indigo-600">{Number(enrollment.total_amount).toLocaleString()} บาท</span></div>
                </div>

                <div className="mb-5">
                    <p className="mb-2 text-sm font-bold text-slate-600">หลักฐานการโอนเงิน (สลิป)</p>
                    {slipSrc ? (
                        <img src={slipSrc} alt="สลิปการโอนเงิน" className="max-h-80 w-full rounded-xl border border-slate-200 object-contain" />
                    ) : (
                        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400">
                            ไม่มีไฟล์สลิป (ผู้สมัครยังไม่ได้อัปโหลด / กรณี Walk-in ที่ยังไม่ชำระ)
                        </div>
                    )}
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3">
                    <div>
                        <label className="mb-1.5 block text-sm font-bold text-slate-600">เล่มที่ (Book No.) *</label>
                        <input
                            type="text"
                            value={receiptBookNo}
                            onChange={(e) => setReceiptBookNo(e.target.value)}
                            placeholder="เช่น 12"
                            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-bold text-slate-600">เลขที่ (Receipt No.) *</label>
                        <input
                            type="text"
                            value={receiptNumber}
                            onChange={(e) => setReceiptNumber(e.target.value)}
                            placeholder="เช่น 000123"
                            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">ปิด</button>
                    <button
                        onClick={handleConfirm}
                        disabled={submitting}
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                        <CheckCircle2 size={16} /> {submitting ? "กำลังยืนยัน..." : "ยืนยันการชำระเงิน"}
                    </button>
                </div>
            </div>
        </div>
    );
}
