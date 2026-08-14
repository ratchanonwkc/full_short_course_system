import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Search, FileText, CheckCircle2, Clock, XCircle, Send } from "lucide-react";
import Swal from "sweetalert2";
import { checkApplicationStatus } from "../services/publicApi";

// Ordered pipeline used to derive which timeline steps are "done" / "current" / "upcoming".
const TIMELINE_STEPS = [
    { key: "submitted", label: "ส่งใบสมัคร" },
    { key: "payment", label: "รอชำระเงิน / ตรวจสอบ" },
    { key: "approved", label: "อนุมัติ / ยืนยันแล้ว" },
];

function timelineStageFor(status) {
    if (status === "paid") return 2;
    if (status === "pending_payment" || status === "pending_verification") return 1;
    if (status === "cancelled") return -1; // special-cased in UI
    return 0;
}

const STATUS_META = {
    pending_payment: { label: "รอการชำระเงิน", color: "text-amber-600 bg-amber-50", icon: Clock },
    pending_verification: { label: "รอตรวจสอบการชำระเงิน", color: "text-blue-600 bg-blue-50", icon: Clock },
    paid: { label: "ชำระเงินสำเร็จ / ยืนยันแล้ว", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle2 },
    cancelled: { label: "ยกเลิกใบสมัคร", color: "text-red-600 bg-red-50", icon: XCircle },
};

function Timeline({ status }) {
    const stage = timelineStageFor(status);

    if (stage === -1) {
        return (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                <XCircle size={14} /> ใบสมัครนี้ถูกยกเลิกแล้ว
            </div>
        );
    }

    return (
        <div className="flex items-center">
            {TIMELINE_STEPS.map((step, i) => {
                const done = i < stage;
                const current = i === stage;
                return (
                    <div key={step.key} className="flex flex-1 items-center last:flex-none">
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                                    done
                                        ? "bg-emerald-500 text-white"
                                        : current
                                        ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                                        : "bg-slate-200 text-slate-400"
                                }`}
                            >
                                {done ? <CheckCircle2 size={14} /> : i + 1}
                            </div>
                            <span className={`w-16 text-center text-[10px] font-semibold leading-tight ${current ? "text-indigo-600" : "text-slate-400"}`}>
                                {step.label}
                            </span>
                        </div>
                        {i < TIMELINE_STEPS.length - 1 && (
                            <div className={`mx-1 h-0.5 flex-1 rounded ${done ? "bg-emerald-400" : "bg-slate-200"}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/**
 * StatusCheckModal — ตรวจสอบสถานะใบสมัครด้วยเลขบัตรประชาชน 13 หลัก (ไม่ต้อง Login)
 */
export default function StatusCheckModal({ isOpen, onClose }) {
    const [citizenId, setCitizenId] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleSearch = async () => {
        if (citizenId.length !== 13) {
            Swal.fire("ข้อมูลไม่ถูกต้อง", "กรุณากรอกเลขประจำตัวประชาชนให้ครบ 13 หลัก", "warning");
            return;
        }
        setLoading(true);
        setResult(null);
        try {
            const data = await checkApplicationStatus(citizenId);
            setResult(data);
        } catch (err) {
            Swal.fire("ไม่พบข้อมูล", err.response?.data?.message || "ไม่พบข้อมูลการสมัครของเลขประจำตัวประชาชนนี้", "info");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setCitizenId("");
        setResult(null);
        onClose();
    };

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog onClose={handleClose} className="relative z-50">
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40" />
                </Transition.Child>

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                        leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                    >
                        <Dialog.Panel className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
                            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-4">
                                <Dialog.Title className="flex items-center gap-2 text-base font-bold text-white">
                                    <FileText size={18} /> ตรวจสอบสถานะการสมัคร
                                </Dialog.Title>
                                <button onClick={handleClose} className="rounded p-1 text-white/80 hover:bg-white/10">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
                                <label className="mb-1.5 block text-sm font-semibold text-slate-600">
                                    เลขประจำตัวประชาชน (13 หลัก)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={13}
                                        value={citizenId}
                                        onChange={(e) => setCitizenId(e.target.value.replace(/\D/g, ""))}
                                        placeholder="กรอกเลขบัตรประชาชน"
                                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono tracking-widest focus:border-indigo-500 focus:outline-none"
                                    />
                                    <button
                                        onClick={handleSearch}
                                        disabled={loading}
                                        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                                    >
                                        <Search size={15} /> {loading ? "กำลังค้นหา..." : "ตรวจสอบ"}
                                    </button>
                                </div>

                                {result && (
                                    <div className="mt-5 space-y-4">
                                        <div className="rounded-xl bg-slate-50 p-4 text-sm">
                                            <p className="font-bold text-slate-800">
                                                {result.applicant.title_name}{result.applicant.full_name}
                                            </p>
                                            <p className="text-slate-500">โทร: {result.applicant.phone}</p>
                                        </div>

                                        {result.enrollments.length === 0 && (
                                            <p className="py-6 text-center text-sm text-slate-400">ยังไม่มีประวัติการสมัคร</p>
                                        )}

                                        {result.enrollments.map((en) => {
                                            const meta = STATUS_META[en.status] || STATUS_META.pending_payment;
                                            const Icon = meta.icon;
                                            return (
                                                <div key={en.id} className="rounded-xl border border-slate-200 p-4">
                                                    <div className="mb-3 flex items-center justify-between">
                                                        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                                                            <Send size={13} className="text-slate-400" />
                                                            {en.study_groups?.group_name}
                                                        </p>
                                                        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${meta.color}`}>
                                                            <Icon size={12} /> {meta.label}
                                                        </span>
                                                    </div>

                                                    <div className="mb-3">
                                                        <Timeline status={en.status} />
                                                    </div>

                                                    <p className="text-xs text-slate-500">
                                                        ยอดชำระ: {Number(en.total_amount).toLocaleString()} บาท
                                                        {en.receipt_number && ` • เลขใบเสร็จ: ${en.receipt_book_no ? `${en.receipt_book_no}/` : ""}${en.receipt_number}`}
                                                    </p>
                                                    {en.slip_url && (
                                                        <a
                                                            href={en.slip_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="mt-1 inline-block text-xs font-semibold text-indigo-600 hover:underline"
                                                        >
                                                            ดูสลิปที่อัปโหลด
                                                        </a>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
}
