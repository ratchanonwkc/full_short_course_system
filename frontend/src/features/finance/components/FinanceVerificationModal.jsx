import { useEffect, useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCw, CheckCircle2, XCircle, ReceiptText, Clock, User2 } from "lucide-react";
import Swal from "sweetalert2";
import { confirmPayment, rejectPayment } from "../../enrollments/services/enrollmentApi";

const PAYMENT_TYPE_LABELS = {
    online_transfer: "โอนเงินออนไลน์",
    counter_cash: "ชำระเงินที่ห้องการเงิน",
};

/**
 * FinanceVerificationModal
 * -------------------------------------------------------------------------
 * Detail view for a single enrollment awaiting finance action.
 * - Slip image preview with zoom/rotate (online transfers only)
 * - Payment type badge (online vs counter cash)
 * - Amount due vs paid
 * - Approve / Reject (with required reason) actions
 * - Audit log of who approved/rejected + timestamp
 *
 * Props:
 * - enrollment | null
 * - onClose
 * - onResolved: () => void   -> called after approve/reject succeeds, to refresh the list
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
        setReceiptBookNo("");
        setReceiptNumber("");
        setRejectReason("");
        setShowRejectForm(false);
        setZoom(1);
        setRotation(0);
    }, [enrollment]);

    if (!enrollment) return null;

    const isCounterCash = enrollment.payment_method === "counter_cash";
    const paymentTypeLabel = PAYMENT_TYPE_LABELS[enrollment.payment_method] || PAYMENT_TYPE_LABELS.online_transfer;

    const handleApprove = async () => {
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
            html: `ผู้สมัคร <b>${enrollment.applicant_name}</b><br/>เล่มที่/เลขที่: <b>${receiptBookNo}/${receiptNumber}</b>`,
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
            text: "ผู้สมัครจะต้องอัปโหลดสลิปใหม่อีกครั้ง",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ปฏิเสธ",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#dc2626",
        });
        if (!result.isConfirmed) return;

        try {
            setSubmitting(true);
            await rejectPayment(enrollment.id, { reason: rejectReason.trim() });
            Swal.fire("สำเร็จ", "ปฏิเสธรายการและแจ้งผู้สมัครให้ส่งใหม่แล้ว", "success");
            onResolved?.();
        } catch (error) {
            Swal.fire("เกิดข้อผิดพลาด", error.response?.data?.message || "ไม่สามารถปฏิเสธรายการได้", "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
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
                    <div>
                        <span className="text-slate-400">ประเภทการชำระ:</span>{" "}
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${isCounterCash ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                            {paymentTypeLabel}
                        </span>
                    </div>
                    <div><span className="text-slate-400">ยอดที่ต้องชำระ:</span> <span className="font-bold text-indigo-600">{Number(enrollment.total_amount).toLocaleString()} บาท</span></div>
                    <div><span className="text-slate-400">ยอดที่ชำระจริง:</span> <span className="font-bold text-emerald-600">{Number(enrollment.paid_amount ?? enrollment.total_amount).toLocaleString()} บาท</span></div>
                </div>

                {/* Slip preview with zoom/rotate — only relevant for online transfers */}
                {!isCounterCash && (
                    <div className="mb-5">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-bold text-slate-600">หลักฐานการโอนเงิน (สลิป)</p>
                            {enrollment.slip_url && (
                                <div className="flex items-center gap-1">
                                    <button type="button" onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="ซูมเข้า">
                                        <ZoomIn size={15} />
                                    </button>
                                    <button type="button" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="ซูมออก">
                                        <ZoomOut size={15} />
                                    </button>
                                    <button type="button" onClick={() => setRotation((r) => (r + 90) % 360)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="หมุนภาพ">
                                        <RotateCw size={15} />
                                    </button>
                                </div>
                            )}
                        </div>
                        {enrollment.slip_url ? (
                            <div className="flex max-h-80 items-center justify-center overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                                <img
                                    src={enrollment.slip_url}
                                    alt="สลิปการโอนเงิน"
                                    style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transition: "transform 0.15s ease" }}
                                    className="max-h-72 object-contain"
                                />
                            </div>
                        ) : (
                            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400">
                                ไม่มีไฟล์สลิป
                            </div>
                        )}
                    </div>
                )}

                {isCounterCash && (
                    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                        ผู้สมัครเลือกชำระเงินที่ห้องการเงิน — โปรดตรวจสอบยอดเงินสดก่อนกดยืนยัน
                    </div>
                )}

                {/* Approve form */}
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

                {/* Reject form (toggled) */}
                {showRejectForm && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
                        <label className="mb-1.5 block text-sm font-bold text-red-700">เหตุผลในการปฏิเสธ *</label>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            rows={3}
                            placeholder="เช่น สลิปไม่ชัดเจน / ยอดเงินไม่ตรง / ไม่พบรายการโอน"
                            className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500"
                        />
                    </div>
                )}

                {/* Audit log */}
                {(enrollment.approved_by_name || enrollment.rejected_by_name) && (
                    <div className="mb-5 rounded-xl border border-slate-200 p-3">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                            <Clock size={12} /> ประวัติการดำเนินการ
                        </p>
                        <div className="space-y-1.5 text-xs text-slate-500">
                            {enrollment.approved_by_name && (
                                <div className="flex items-center gap-1.5">
                                    <User2 size={12} className="text-emerald-500" />
                                    ยืนยันโดย {enrollment.approved_by_name} — {enrollment.payment_date ? new Date(enrollment.payment_date).toLocaleString("th-TH") : "-"}
                                </div>
                            )}
                            {enrollment.rejected_by_name && (
                                <div className="flex items-center gap-1.5">
                                    <User2 size={12} className="text-red-500" />
                                    ปฏิเสธโดย {enrollment.rejected_by_name} — {enrollment.rejected_at ? new Date(enrollment.rejected_at).toLocaleString("th-TH") : "-"}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">ปิด</button>
                    {!showRejectForm ? (
                        <button
                            onClick={() => setShowRejectForm(true)}
                            className="flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                        >
                            <XCircle size={16} /> ปฏิเสธ
                        </button>
                    ) : (
                        <button
                            onClick={handleReject}
                            disabled={submitting}
                            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                            <XCircle size={16} /> {submitting ? "กำลังบันทึก..." : "ยืนยันการปฏิเสธ"}
                        </button>
                    )}
                    <button
                        onClick={handleApprove}
                        disabled={submitting || showRejectForm}
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                        <CheckCircle2 size={16} /> {submitting ? "กำลังยืนยัน..." : "ยืนยันการชำระเงิน"}
                    </button>
                </div>
            </div>
        </div>
    );
}