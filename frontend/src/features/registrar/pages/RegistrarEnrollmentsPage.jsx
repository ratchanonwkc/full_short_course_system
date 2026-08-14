import { useEffect, useMemo, useState, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import Swal from "sweetalert2";
import { Users, UserPlus, IdCard, X } from "lucide-react";
import { getStudyGroups } from "../../study-groups/services/studyGroupApi";
import { getBatches } from "../../batches/services/batchApi";
import { getEnrollments, createWalkinEnrollment, cancelEnrollment } from "../../enrollments/services/enrollmentApi";
import ApplicantFormFields, { EMPTY_APPLICANT } from "../../public/components/ApplicantFormFields";

ModuleRegistry.registerModules([AllCommunityModule]);

const STATUS_META = {
    pending_payment: { label: "รอชำระเงิน", className: "bg-amber-100 text-amber-700" },
    pending_verification: { label: "รอตรวจสอบสลิป", className: "bg-blue-100 text-blue-700" },
    paid: { label: "ชำระเงินแล้ว", className: "bg-emerald-100 text-emerald-700" },
    cancelled: { label: "ยกเลิก", className: "bg-slate-200 text-slate-500" },
};

function StatusBadgeRenderer({ value }) {
    const meta = STATUS_META[value] || STATUS_META.pending_payment;
    return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>{meta.label}</span>;
}

/**
 * RegistrarEnrollmentsPage — Hierarchy-aware student management, single screen.
 * Batch -> Study Group dropdowns at the top let staff jump straight to any
 * group's roster without nested page navigation. "ทุกกลุ่มเรียน" shows every
 * enrollment across the selected batch at once.
 */
export default function RegistrarEnrollmentsPage() {
    const [batches, setBatches] = useState([]);
    const [groups, setGroups] = useState([]);
    const [selectedBatchId, setSelectedBatchId] = useState("");
    const [selectedGroupId, setSelectedGroupId] = useState(""); // "" = all groups in batch
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [walkinOpen, setWalkinOpen] = useState(false);

    useEffect(() => {
        getBatches().then((data) => {
            setBatches(data);
            if (data.length > 0) setSelectedBatchId(String(data[0].id));
        });
    }, []);

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
            setEnrollments(data);
        } finally {
            setLoading(false);
        }
    }, [selectedBatchId, selectedGroupId]);

    useEffect(() => {
        loadEnrollments();
    }, [loadEnrollments]);

    const currentGroup = useMemo(
        () => groups.find((g) => String(g.id) === String(selectedGroupId)),
        [groups, selectedGroupId]
    );

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

    const ActionsRenderer = (params) =>
        params.data.status !== "cancelled" ? (
            <button onClick={() => handleCancel(params.data)} className="text-xs font-bold text-red-500 hover:underline">
                ยกเลิก
            </button>
        ) : null;

    const columnDefs = useMemo(
        () => [
            { field: "applicant_name", headerName: "ชื่อ-นามสกุล", flex: 1.4, minWidth: 160 },
            { field: "citizen_id", headerName: "เลขบัตรประชาชน", flex: 1.1, minWidth: 140, cellClass: "font-mono text-xs" },
            { field: "phone", headerName: "เบอร์โทร", flex: 0.9, minWidth: 110 },
            ...(selectedGroupId
                ? []
                : [{ field: "group_code", headerName: "กลุ่มเรียน", flex: 0.9, minWidth: 110 }]),
            {
                field: "total_amount",
                headerName: "ยอดชำระ",
                flex: 0.8,
                minWidth: 100,
                type: "numericColumn",
                valueFormatter: (p) => `${Number(p.value).toLocaleString()} บ.`,
            },
            { field: "status", headerName: "สถานะ", flex: 0.9, minWidth: 120, cellRenderer: StatusBadgeRenderer },
            {
                headerName: "จัดการ",
                pinned: "right",
                width: 90,
                sortable: false,
                filter: false,
                cellRenderer: ActionsRenderer,
            },
        ],
        [selectedGroupId]
    );

    const defaultColDef = useMemo(() => ({ resizable: true, sortable: true, filter: true }), []);

    return (
        <div className="p-4 sm:p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="flex items-center gap-2 text-xl font-black text-slate-800">
                        <Users size={22} className="text-indigo-600" /> จัดการผู้เรียนในกลุ่มเรียน (งานทะเบียน)
                    </h1>
                    <p className="text-sm text-slate-500">เลือกรุ่นและกลุ่มเรียนเพื่อดูรายชื่อผู้ลงทะเบียนทันที ไม่ต้องเข้าไปหลายหน้า</p>
                </div>
                <button
                    onClick={() => setWalkinOpen(true)}
                    disabled={!selectedBatchId}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                    <UserPlus size={16} /> ลงทะเบียน Walk-in
                </button>
            </div>

            {/* Hierarchy filters: Batch -> Study Group, both top-level, no page nav */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div>
                    <label className="mb-1 block text-xs font-bold text-slate-400">รุ่นการเรียน</label>
                    <select
                        value={selectedBatchId}
                        onChange={(e) => setSelectedBatchId(e.target.value)}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold focus:border-indigo-500 focus:outline-none sm:w-64"
                    >
                        {batches.map((b) => (
                            <option key={b.id} value={b.id}>
                                {b.batch_name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-xs font-bold text-slate-400">กลุ่มเรียน</label>
                    <select
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        disabled={!selectedBatchId}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold focus:border-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 sm:w-64"
                    >
                        <option value="">ทุกกลุ่มเรียนในรุ่นนี้</option>
                        {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.group_code} — {g.group_name}
                            </option>
                        ))}
                    </select>
                </div>
                {currentGroup && (
                    <span className="mt-5 text-sm font-semibold text-slate-500">
                        ที่นั่ง {currentGroup.current_seats}/{currentGroup.max_seats}
                    </span>
                )}
            </div>

            <div className="h-[calc(100vh-18rem)] min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <AgGridReact
                    theme={themeQuartz}
                    rowData={enrollments}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    loading={loading}
                    pagination
                    paginationPageSize={25}
                    headerHeight={42}
                    rowHeight={44}
                    animateRows
                    overlayNoRowsTemplate="<span class='text-sm text-slate-400'>ยังไม่มีผู้ลงทะเบียน</span>"
                    getRowId={(params) => String(params.data.id)}
                    className="h-full w-full"
                />
            </div>

            <WalkinModal
                isOpen={walkinOpen}
                onClose={() => setWalkinOpen(false)}
                groups={groups}
                defaultGroupId={selectedGroupId}
                onSuccess={() => {
                    setWalkinOpen(false);
                    loadEnrollments();
                }}
            />
        </div>
    );
}

function WalkinModal({ isOpen, onClose, groups, defaultGroupId, onSuccess }) {
    const [formData, setFormData] = useState(EMPTY_APPLICANT);
    const [groupId, setGroupId] = useState(defaultGroupId);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData(EMPTY_APPLICANT);
            setGroupId(defaultGroupId);
        }
    }, [isOpen, defaultGroupId]);

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
            await createWalkinEnrollment({ applicant: formData, study_group_id: Number(groupId) });
            Swal.fire("สำเร็จ", "ลงทะเบียน Walk-in เรียบร้อย สถานะ 'รอชำระเงิน' ส่งต่อแผนกการเงิน", "success");
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
                        <UserPlus size={20} className="text-indigo-600" /> ลงทะเบียนนักเรียน Walk-in
                    </h2>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-bold text-slate-600">เลือกกลุ่มเรียน *</label>
                        <select
                            value={groupId}
                            onChange={(e) => setGroupId(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                            required
                        >
                            <option value="">-- เลือกกลุ่มเรียน --</option>
                            {groups.map((g) => (
                                <option key={g.id} value={g.id}>{g.group_code} — {g.group_name}</option>
                            ))}
                        </select>
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
                            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <IdCard size={16} /> {submitting ? "กำลังบันทึก..." : "บันทึกและส่งต่อแผนกการเงิน"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
