import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Search, FileText, CheckCircle2, Clock, XCircle } from "lucide-react";
import Swal from "sweetalert2";
import { checkApplicationStatus } from "../services/publicApi";

const STATUS_META = {
    pending_payment: { label: "รอการชำระเงิน", color: "text-amber-600 bg-amber-50", icon: Clock },
    pending_verification: { label: "รอตรวจสอบการชำระเงิน", color: "text-blue-600 bg-blue-50", icon: Clock },
    paid: { label: "ชำระเงินสำเร็จ / ยืนยันแล้ว", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle2 },
    cancelled: { label: "ยกเลิกใบสมัคร", color: "text-red-600 bg-red-50", icon: XCircle },
};

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
                        <Dialog.Panel className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                                <Dialog.Title className="flex items-center gap-2 text-base font-bold text-slate-900">
                                    <FileText size={18} className="text-indigo-600" /> ตรวจสอบสถานะการสมัคร
                                </Dialog.Title>
                                <button onClick={handleClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="px-6 py-5">
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
                                    <div className="mt-5 space-y-3">
                                        <div className="rounded-lg bg-slate-50 p-3 text-sm">
                                            <p className="font-bold text-slate-800">
                                                {result.applicant.title_name}{result.applicant.full_name}
                                            </p>
                                            <p className="text-slate-500">โทร: {result.applicant.phone}</p>
                                        </div>

                                        {result.enrollments.map((en) => {
                                            const meta = STATUS_META[en.status] || STATUS_META.pending_payment;
                                            const Icon = meta.icon;
                                            return (
                                                <div key={en.id} className="rounded-lg border border-slate-200 p-3">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-semibold text-slate-800">
                                                            {en.study_groups?.group_name}
                                                        </p>
                                                        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${meta.color}`}>
                                                            <Icon size={12} /> {meta.label}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        ยอดชำระ: {Number(en.total_amount).toLocaleString()} บาท
                                                        {en.receipt_number && ` • เลขใบเสร็จ: ${en.receipt_number}`}
                                                    </p>
                                                    {en.slip_url && (
                                                        <a
                                                            href={`${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:5000"}${en.slip_url}`}
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
