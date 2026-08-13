import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Wallet, Eye, CheckCircle2, X, ReceiptText } from "lucide-react";
import { getEnrollments, confirmPayment } from "../../enrollments/services/enrollmentApi";

const API_ORIGIN = import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:5000";

const STATUS_META = {
    pending_payment: { label: "รอชำระเงิน", className: "bg-amber-100 text-amber-700" },
    pending_verification: { label: "รอตรวจสอบสลิป", className: "bg-blue-100 text-blue-700" },
};

/**
 * FinanceVerificationPage — Payment Verification Dashboard (Finance Portal)
 * Audit queue: pending_verification / pending_payment -> Confirm payment (atomic seat +1)
 */
export default function FinanceVerificationPage() {
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewing, setViewing] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const [pv, pp] = await Promise.all([
                getEnrollments({ status: "pending_verification" }),
                getEnrollments({ status: "pending_payment" }),
            ]);
            setEnrollments([...pv, ...pp]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    return (
        <div className="p-6">
            <h1 className="mb-1 flex items-center gap-2 text-xl font-black text-slate-800">
                <Wallet size={22} className="text-indigo-600" /> ตรวจสอบและยืนยันการชำระเงิน (แผนกการเงิน)
            </h1>
            <p className="mb-6 text-sm text-slate-500">รายการที่รอตรวจสอบสลิปหรือรอชำระเงิน — ตรวจสอบแล้วกดยืนยันเพื่อออกใบเสร็จและเพิ่มที่นั่งอัตโนมัติ</p>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                        <tr>
                            <th className="px-4 py-3">ผู้สมัคร</th>
                            <th className="px-4 py-3">กลุ่มเรียน</th>
                            <th className="px-4 py-3">ยอดชำระ</th>
                            <th className="px-4 py-3">สถานะ</th>
                            <th className="px-4 py-3 text-right">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">กำลังโหลด...</td></tr>
                        )}
                        {!loading && enrollments.length === 0 && (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">ไม่มีรายการที่ต้องตรวจสอบ</td></tr>
                        )}
                        {enrollments.map((en) => (
                            <tr key={en.id} className="hover:bg-slate-50/70">
                                <td className="px-4 py-3">
                                    <p className="font-semibold text-slate-800">{en.applicant_name}</p>
                                    <p className="text-xs text-slate-400">{en.citizen_id}</p>
                                </td>
                                <td className="px-4 py-3 text-slate-600">{en.group_code}</td>
                                <td className="px-4 py-3 font-bold text-slate-700">{Number(en.total_amount).toLocaleString()} บ.</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_META[en.status]?.className}`}>
                                        {STATUS_META[en.status]?.label}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => setViewing(en)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
                                    >
                                        <Eye size={14} /> ตรวจสอบ / ยืนยัน
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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
    const [receiptNumber, setReceiptNumber] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setReceiptNumber("");
    }, [enrollment]);

    if (!enrollment) return null;

    const handleConfirm = async () => {
        if (!receiptNumber.trim()) {
            Swal.fire("แจ้งเตือน", "กรุณากรอกเลขที่ใบเสร็จรับเงิน", "warning");
            return;
        }
        const result = await Swal.fire({
            title: "ยืนยันการชำระเงิน?",
            html: `ผู้สมัคร <b>${enrollment.applicant_name}</b><br/>เลขที่ใบเสร็จ: <b>${receiptNumber}</b><br/><span style="color:#94a3b8;font-size:13px">สถานะจะเปลี่ยนเป็น 'ชำระเงินแล้ว' และเพิ่มที่นั่งในกลุ่มเรียนอัตโนมัติ</span>`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "ยืนยันชำระเงิน",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#4f46e5",
        });
        if (!result.isConfirmed) return;

        try {
            setSubmitting(true);
            await confirmPayment(enrollment.id, { receipt_number: receiptNumber.trim() });
            Swal.fire("สำเร็จ", "ยืนยันการชำระเงินและออกใบเสร็จเรียบร้อย", "success");
            onConfirmed?.();
        } catch (error) {
            Swal.fire("เกิดข้อผิดพลาด", error.response?.data?.message || "ไม่สามารถยืนยันการชำระเงินได้", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const slipSrc = enrollment.slip_url ? `${API_ORIGIN}${enrollment.slip_url}` : null;

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

                <div className="mb-5">
                    <label className="mb-1.5 block text-sm font-bold text-slate-600">เลขที่ใบเสร็จรับเงิน (Receipt Number) *</label>
                    <input
                        type="text"
                        value={receiptNumber}
                        onChange={(e) => setReceiptNumber(e.target.value)}
                        placeholder="เช่น RC-2026-000123"
                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                    />
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
