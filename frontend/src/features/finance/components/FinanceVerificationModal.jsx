import { useEffect, useState } from "react";
import {
    X, ZoomIn, ZoomOut, RotateCw, CheckCircle2, XCircle,
    ReceiptText, Clock, User2, Phone, IdCard, BookOpen,
    Wallet, ExternalLink, Calendar, Layers, AlertTriangle, FileText
} from "lucide-react";
import Swal from "sweetalert2";
import { confirmPayment, rejectPayment } from "../../enrollments/services/enrollmentApi";
import { formatCompactSchedule } from "../../../utils/groupCode";
import { formatThaiDate, formatThaiFullDate } from "../../../utils/dateUtils";

const PAYMENT_TYPE_LABELS = {
    online_transfer: "โอนเงินออนไลน์ (แนบสลิป)",
    counter_cash: "ชำระเงินสดที่ห้องการเงิน",
};

const COMMON_REJECTION_REASONS = [
    "ยอดเงินในสลิปไม่ตรงกับยอดที่ต้องชำระ",
    "ภาพสลิปไม่ชัดเจน ไม่สามารถตรวจสอบได้",
    "สลิปซ้ำ หรือเคยใช้ยืนยันไปแล้ว",
    "ไม่พบรายการโอนในระบบบัญชีธนาคาร",
    "สลิปโอนเข้าผิดบัญชีของวิทยาลัย",
];

function formatCitizenId(cid) {
    if (!cid || String(cid).length !== 13) return cid || "-";
    const s = String(cid);
    return `${s[0]}-${s.slice(1, 5)}-${s.slice(5, 10)}-${s.slice(10, 12)}-${s[12]}`;
}

/**
 * FinanceVerificationModal
 * -------------------------------------------------------------------------
 * High-signal Payment Verification modal for Finance Officers.
 * Organized into 3 clear decision sections:
 * - Section A: Applicant & Course Identification (Who & What)
 * - Section B: Financial Breakdown vs. Total Payable (The Numbers)
 * - Section C: Slip Proof Verification & Decision Actions (Evidence & Decision)
 */
export default function FinanceVerificationModal({ enrollment, onClose, onResolved }) {
    const [receiptBookNo, setReceiptBookNo] = useState("");
    const [receiptNumber, setReceiptNumber] = useState("");
    const [rejectReason, setRejectReason] = useState("");
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setReceiptBookNo(enrollment?.receipt_book_no || "");
        setReceiptNumber(enrollment?.receipt_number || "");
        setRejectReason("");
        setShowRejectForm(false);
        setZoom(1);
        setRotation(0);
    }, [enrollment]);

    if (!enrollment) return null;

    const isCounterCash = enrollment.payment_method === "counter_cash" || enrollment.payment_method === "walk_in_cash";
    const paymentTypeLabel = PAYMENT_TYPE_LABELS[enrollment.payment_method] || PAYMENT_TYPE_LABELS.online_transfer;
    const isPaid = enrollment.status === "paid";
    const isRejected = enrollment.status === "rejected";

    // Course & Schedule data
    const group = enrollment.study_group || {};
    const rawCourseName = enrollment.subject_name || enrollment.group_name || group.group_name || "";
    const displayCourseName = rawCourseName.replace(/\s*\[.*?\]|\s*\(.*?\)/g, "").trim() || rawCourseName;
    const scheduleLine = formatCompactSchedule(group.id ? group : enrollment);

    // Subject count & Financial breakdown
    const subjectList = Array.isArray(enrollment.subjects) && enrollment.subjects.length > 0
        ? enrollment.subjects
        : (Array.isArray(group.study_group_subjects) && group.study_group_subjects.length > 0
            ? group.study_group_subjects
            : []);
    const subjectCount = subjectList.length > 0 ? subjectList.length : 1;
    const appFee = Number(enrollment.application_fee ?? group.application_fee ?? (subjectCount * 10));
    const tuitionFee = Number(enrollment.tuition_fee ?? group.tuition_fee ?? 0);
    const isAc = Boolean(enrollment.is_ac_maintenance_fee || group.is_ac_maintenance_fee);
    const isWaived = Boolean(enrollment.is_waived_fee || group.is_waived_fee);
    const totalAmount = Number(enrollment.total_amount ?? (isWaived ? 0 : (tuitionFee + appFee)));

    const handleApprove = async () => {
        if (!receiptBookNo.trim()) {
            Swal.fire("แจ้งเตือน", "กรุณากรอกเล่มที่ใบเสร็จรับเงิน (Book No.)", "warning");
            return;
        }
        if (!receiptNumber.trim()) {
            Swal.fire("แจ้งเตือน", "กรุณากรอกเลขที่ใบเสร็จรับเงิน (Receipt No.)", "warning");
            return;
        }

        const result = await Swal.fire({
            title: "ยืนยันการอนุมัติการชำระเงิน?",
            html: `
                <div class="text-left text-sm space-y-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    <p><b>ผู้สมัคร:</b> ${enrollment.applicant_name}</p>
                    <p><b>วิชา:</b> ${displayCourseName}</p>
                    <p><b>ยอดเงิน:</b> <span class="text-blue-700 font-bold">฿${totalAmount.toLocaleString()}</span></p>
                    <p><b>เล่มที่/เลขที่:</b> <span class="font-mono font-bold">${receiptBookNo.trim()}/${receiptNumber.trim()}</span></p>
                </div>
            `,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "✓ ยืนยันอนุมัติชำระเงิน",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#059669",
        });

        if (!result.isConfirmed) return;

        try {
            setSubmitting(true);
            await confirmPayment(enrollment.id, {
                receipt_book_no: receiptBookNo.trim(),
                receipt_number: receiptNumber.trim(),
            });
            Swal.fire({
                icon: "success",
                title: "อนุมัติการชำระเงินสำเร็จ",
                text: "ออกใบเสร็จและปรับสถานะเป็น 'ชำระแล้ว (พร้อมเข้าเรียน)' เรียบร้อย",
                timer: 2000,
                showConfirmButton: false,
            });
            onResolved?.();
        } catch (error) {
            Swal.fire("เกิดข้อผิดพลาด", error.response?.data?.message || "ไม่สามารถยืนยันการชำระเงินได้", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            Swal.fire("แจ้งเตือน", "กรุณาระบุเหตุผลในการปฏิเสธ", "warning");
            return;
        }
        const result = await Swal.fire({
            title: "ยืนยันการปฏิเสธสลิป?",
            text: `เหตุผล: "${rejectReason.trim()}" (ผู้สมัครจะได้รับแจ้งให้แนบสลิปใหม่)`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "✕ ปฏิเสธรายการ",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#dc2626",
        });
        if (!result.isConfirmed) return;

        try {
            setSubmitting(true);
            await rejectPayment(enrollment.id, { reason: rejectReason.trim() });
            Swal.fire({
                icon: "success",
                title: "ปฏิเสธรายการเรียบร้อย",
                text: "ปรับสถานะเป็น 'สลิปไม่ถูกต้อง' เพื่อให้ผู้สมัครส่งสลิปใหม่",
                timer: 2000,
                showConfirmButton: false,
            });
            onResolved?.();
        } catch (error) {
            Swal.fire("เกิดข้อผิดพลาด", error.response?.data?.message || "ไม่สามารถปฏิเสธรายการได้", "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col">
                
                {/* ── Modal Header ────────────────────────────────────────── */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-3.5 backdrop-blur-md">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <ReceiptText size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-black text-slate-800 sm:text-lg">
                                    ตรวจสอบและยืนยันการชำระเงิน
                                </h2>
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-bold text-slate-600">
                                    ใบสมัคร #{enrollment.application_no || String(enrollment.id).padStart(5, "0")}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                วันที่สมัคร: {formatThaiDate(enrollment.apply_date)}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ── Modal Body (3 High-Signal Sections) ─────────────────── */}
                <div className="p-5 sm:p-6 space-y-5">
                    
                    {/* ═══════════════════════════════════════════════════════════
                        SECTION A: APPLICANT & COURSE IDENTIFICATION (Who & What)
                    ═══════════════════════════════════════════════════════════ */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3.5">
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <User2 size={14} className="text-blue-600" /> [1] ข้อมูลผู้สมัครและหลักสูตรที่ลงทะเบียน
                            </span>
                            <span className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
                                {enrollment.batch_name || group.batch_name || "รุ่นปัจจุบัน"}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {/* Applicant Info */}
                            <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200/80">
                                <span className="text-[11px] font-semibold text-slate-400 block">ผู้สมัครเรียน</span>
                                <h3 className="text-base font-extrabold text-slate-900">
                                    {enrollment.applicant_name}
                                </h3>
                                <div className="space-y-1 text-xs text-slate-600 pt-1">
                                    <p className="flex items-center gap-1.5">
                                        <IdCard size={13} className="text-slate-400 shrink-0" />
                                        <span>เลขบัตร:</span>
                                        <strong className="font-mono text-slate-800">{formatCitizenId(enrollment.citizen_id)}</strong>
                                    </p>
                                    <p className="flex items-center gap-1.5">
                                        <Phone size={13} className="text-slate-400 shrink-0" />
                                        <span>เบอร์โทร:</span>
                                        {enrollment.phone ? (
                                            <a href={`tel:${enrollment.phone}`} className="font-bold text-blue-600 hover:underline">
                                                {enrollment.phone}
                                            </a>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Course Info */}
                            <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200/80">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-blue-600">
                                        {group.academic_majors?.name_th || enrollment.major_name || "วิชาชีพระยะสั้น"}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        {enrollment.group_code && (
                                            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10.5px] font-mono text-slate-600">
                                                {enrollment.group_code}
                                            </span>
                                        )}
                                        {enrollment.moe_code && (
                                            <span className="rounded bg-indigo-50 px-1.5 py-0.2 text-[10.5px] font-mono text-indigo-700">
                                                ศธ. {enrollment.moe_code}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <h4 className="text-sm font-bold text-slate-900">
                                    {displayCourseName}
                                </h4>
                                <div className="space-y-1 text-xs text-slate-600 pt-1">
                                    <p className="flex items-center gap-1.5">
                                        <Calendar size={13} className="text-slate-400 shrink-0" />
                                        <span>{scheduleLine}</span>
                                    </p>
                                    <p className="flex items-center gap-1.5">
                                        <User2 size={13} className="text-slate-400 shrink-0" />
                                        <span>ผู้สอน: {enrollment.teacher_name || group.teacher_name || "อาจารย์ประจำวิชา"}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════════
                        SECTION B: FINANCIAL BREAKDOWN VS TOTAL (The Numbers)
                    ═══════════════════════════════════════════════════════════ */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                        
                        {/* Breakdown & Callout (7 cols) */}
                        <div className="lg:col-span-7 space-y-3">
                            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white p-4 space-y-3">
                                <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                        <Wallet size={14} className="text-blue-600" /> [2] รายการคำนวณยอดเงิน (Financial Breakdown)
                                    </span>
                                    <span className="text-[11px] font-semibold text-slate-500">
                                        {subjectCount > 1 ? `ชุดวิชา (${subjectCount} วิชา)` : "วิชาเดี่ยว (1 วิชา)"}
                                    </span>
                                </div>

                                <div className="space-y-1.5 text-xs text-slate-700">
                                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                        <span className="text-slate-600">ค่าสมัคร (10 บ. × {subjectCount} วิชา):</span>
                                        <strong className="font-mono text-slate-800">฿{appFee.toLocaleString()}</strong>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                        <span className="text-slate-600">ค่าบำรุงการศึกษา (Tuition Fee):</span>
                                        <strong className="font-mono text-slate-800">฿{tuitionFee.toLocaleString()}</strong>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-slate-600">ค่าบำรุงห้องปรับอากาศ:</span>
                                        <span className="font-medium text-slate-500">{isAc ? "รวมในหลักสูตรแล้ว" : "ไม่มี (ห้องพัดลม)"}</span>
                                    </div>
                                </div>

                                {/* Prominent Callout */}
                                <div className="mt-2 rounded-xl bg-blue-600 p-3.5 text-white flex items-center justify-between shadow-xs">
                                    <div>
                                        <span className="text-[11px] font-medium text-blue-100 block">ยอดที่ต้องชำระจริง (Total Payable)</span>
                                        {isWaived ? (
                                            <span className="text-lg font-black text-emerald-300">ยกเว้นค่าธรรมเนียม (เรียนฟรี)</span>
                                        ) : (
                                            <span className="text-2xl font-black tracking-tight">฿{totalAmount.toLocaleString()}</span>
                                        )}
                                    </div>
                                    <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                                        isCounterCash ? "bg-amber-400 text-slate-900" : "bg-white/20 text-white"
                                    }`}>
                                        {isCounterCash ? "ชำระเงินสด" : "โอนเงินออนไลน์"}
                                    </span>
                                </div>
                            </div>

                            {/* Receipt Input Box (Required for Approve) */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5">
                                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <FileText size={14} className="text-emerald-600" /> ข้อมูลใบเสร็จรับเงิน (จำเป็นสำหรับการอนุมัติ)
                                </span>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-500">เล่มที่ (Book No.) *</label>
                                        <input
                                            type="text"
                                            value={receiptBookNo}
                                            onChange={(e) => setReceiptBookNo(e.target.value)}
                                            placeholder="เช่น 12"
                                            disabled={isPaid}
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono font-bold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-slate-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-500">เลขที่ (Receipt No.) *</label>
                                        <input
                                            type="text"
                                            value={receiptNumber}
                                            onChange={(e) => setReceiptNumber(e.target.value)}
                                            placeholder="เช่น 000123"
                                            disabled={isPaid}
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono font-bold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-slate-100"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ═══════════════════════════════════════════════════════
                            SECTION C: SLIP PROOF VERIFICATION (Evidence)
                        ═══════════════════════════════════════════════════════ */}
                        <div className="lg:col-span-5 flex flex-col rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <ReceiptText size={14} className="text-blue-600" /> [3] หลักฐานการโอนเงิน (สลิป)
                                </span>
                                {enrollment.slip_url && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                                            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                                            title="ซูมเข้า"
                                        >
                                            <ZoomIn size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setZoom((z) => Math.max(0.6, z - 0.25))}
                                            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                                            title="ซูมออก"
                                        >
                                            <ZoomOut size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRotation((r) => (r + 90) % 360)}
                                            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                                            title="หมุน 90°"
                                        >
                                            <RotateCw size={14} />
                                        </button>
                                        <a
                                            href={enrollment.slip_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="rounded-md p-1 text-blue-600 hover:bg-blue-50"
                                            title="เปิดรูปขนาดเต็มในหน้าต่างใหม่"
                                        >
                                            <ExternalLink size={14} />
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Slip Image Viewport */}
                            <div className="flex-1 min-h-[220px] max-h-[300px] flex items-center justify-center overflow-auto rounded-xl border border-slate-200 bg-slate-900/5 p-2">
                                {isCounterCash ? (
                                    <div className="text-center p-4 space-y-1">
                                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                                            <Wallet size={20} />
                                        </div>
                                        <p className="text-xs font-bold text-slate-700">ชำระเงินสดที่ห้องการเงิน</p>
                                        <p className="text-[11px] text-slate-500">ไม่ต้องแนบสลิปโอนเงิน ตรวจนับเงินสดก่อนยืนยัน</p>
                                    </div>
                                ) : enrollment.slip_url ? (
                                    <img
                                        src={enrollment.slip_url}
                                        alt="สลิปการโอนเงิน"
                                        style={{
                                            transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                            transition: "transform 0.15s ease",
                                        }}
                                        className="max-h-64 object-contain rounded shadow-xs"
                                    />
                                ) : (
                                    <div className="text-center text-xs text-slate-400">
                                        ยังไม่ได้แนบสลิปการโอนเงิน
                                    </div>
                                )}
                            </div>

                            {/* Slip Meta */}
                            <div className="text-[11px] text-slate-500 flex justify-between items-center px-1">
                                <span>วิธีชำระ: <b>{paymentTypeLabel}</b></span>
                                <span>{enrollment.payment_date ? formatThaiFullDate(enrollment.payment_date) : "-"}</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Rejection Reason Box (Toggled) ───────────────────── */}
                    {showRejectForm && (
                        <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 space-y-3 animate-in fade-in">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                                    <AlertTriangle size={15} /> ระบุเหตุผลในการปฏิเสธสลิป / การชำระเงิน *
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowRejectForm(false)}
                                    className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                                >
                                    ยกเลิก
                                </button>
                            </div>

                            {/* Quick reason pills */}
                            <div className="flex flex-wrap gap-1.5">
                                {COMMON_REJECTION_REASONS.map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setRejectReason(r)}
                                        className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-700 border border-red-200 hover:bg-red-100/50 transition text-left"
                                    >
                                        + {r}
                                    </button>
                                ))}
                            </div>

                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows={2}
                                placeholder="พิมพ์เหตุผลเพิ่มเติม..."
                                className="w-full rounded-xl border border-red-300 bg-white p-2.5 text-xs text-slate-800 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                            />
                        </div>
                    )}

                    {/* ── Audit History ────────────────────────────────────── */}
                    {(enrollment.approved_by_name || enrollment.rejected_by_name) && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-1 text-xs text-slate-500">
                            <p className="flex items-center gap-1 font-bold text-slate-600 text-[11px]">
                                <Clock size={12} /> ประวัติการตรวจสอบ
                            </p>
                            {enrollment.approved_by_name && (
                                <p className="flex items-center gap-1.5 text-emerald-700">
                                    <User2 size={12} />
                                    อนุมัติโดย: <strong>{enrollment.approved_by_name}</strong>
                                    {enrollment.payment_date && ` (${formatThaiFullDate(enrollment.payment_date)})`}
                                </p>
                            )}
                            {enrollment.rejected_by_name && (
                                <p className="flex items-center gap-1.5 text-red-600">
                                    <User2 size={12} />
                                    ปฏิเสธโดย: <strong>{enrollment.rejected_by_name}</strong>
                                    {enrollment.rejected_at && ` (${formatThaiFullDate(enrollment.rejected_at)})`}
                                    {enrollment.rejection_reason && ` — เหตุผล: "${enrollment.rejection_reason}"`}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Modal Footer Action Buttons ──────────────────────────── */}
                <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/90 px-5 py-3.5 backdrop-blur-md">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition"
                    >
                        ปิดหน้าต่าง
                    </button>

                    <div className="flex items-center gap-2.5">
                        {!showRejectForm ? (
                            <button
                                type="button"
                                onClick={() => setShowRejectForm(true)}
                                disabled={submitting || isPaid}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-white px-4 py-2 text-xs font-bold text-red-600 shadow-xs hover:bg-red-50 active:scale-95 transition disabled:opacity-50"
                            >
                                <XCircle size={15} /> ✕ ปฏิเสธ / สลิปไม่ถูกต้อง
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleReject}
                                disabled={submitting}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 active:scale-95 transition disabled:opacity-50"
                            >
                                <XCircle size={15} /> {submitting ? "กำลังบันทึก..." : "ยืนยันการปฏิเสธ"}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleApprove}
                            disabled={submitting || showRejectForm || isPaid}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition disabled:opacity-50"
                        >
                            <CheckCircle2 size={15} /> {submitting ? "กำลังยืนยัน..." : (isPaid ? "อนุมัติเรียบร้อยแล้ว" : "✓ อนุมัติการชำระเงิน")}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}