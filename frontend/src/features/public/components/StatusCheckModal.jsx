import { Fragment, useState, useEffect, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Search, FileText, Loader2, Sparkles, AlertCircle, ArrowLeft } from "lucide-react";
import Swal from "sweetalert2";
import { trackApplicant } from "../services/publicApi";
import ApplicantTrackingCard from "./ApplicantTrackingCard";

/**
 * StatusCheckModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Public-facing Applicant Tracking & Status Portal modal.
 * Uses unified 13-digit Citizen ID entry point:
 * - Queries GET /api/v1/applicants/track/:citizen_id
 * - Renders interactive Application Detail Cards matching official form layout
 * - Inline edit guard (locked when status === 'paid', editable for pending/rejected)
 * - Document actions (view ID card, view Slip, re-upload slip, print application form)
 */
export default function StatusCheckModal({ isOpen, onClose, initialCitizenId = "" }) {
    const [citizenId, setCitizenId] = useState(initialCitizenId);
    const [loading, setLoading] = useState(false);
    const [trackingData, setTrackingData] = useState(null);
    const [selectedEnrollmentId, setSelectedEnrollmentId] = useState(null);
    const inputRef = useRef(null);

    useEffect(() => {

    const fetchTracking = async (cid) => {
        const clean = (cid || "").replace(/\D/g, "");
        if (clean.length !== 13) return;

        setLoading(true);
        try {
            const data = await trackApplicant(clean);
            setTrackingData(data);
            if (data?.enrollments?.length > 0) {
                setSelectedEnrollmentId(data.enrollments[0].id);
            }
        } catch (err) {
            setTrackingData(null);
            Swal.fire(
                "ไม่พบข้อมูล",
                err.response?.data?.message || "ไม่พบข้อมูลการสมัครของเลขประจำตัวประชาชนนี้ในระบบ",
                "info"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            if (initialCitizenId) {
                setCitizenId(initialCitizenId);
                fetchTracking(initialCitizenId);
            } else {
                setCitizenId("");
                setTrackingData(null);
            }
        }
    }, [isOpen, initialCitizenId]);

    const handleSearch = (e) => {
        e?.preventDefault();
        fetchTracking(citizenId);
    };

    const handleClose = () => {
        onClose();
        setCitizenId("");
        setTrackingData(null);
    };

    const activeEnrollment = trackingData?.enrollments?.find(
        (e) => String(e.id) === String(selectedEnrollmentId)
    ) || trackingData?.enrollments?.[0];

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog onClose={handleClose} className="relative z-50">
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-950/70" />
                </Transition.Child>

                <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                        leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                    >
                        <Dialog.Panel className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                            {/* ── Modal Header ───────────────────────────────── */}
                            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 px-6 py-4 text-white">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
                                        <FileSearch size={22} />
                                    </span>
                                    <div>
                                        <Dialog.Title className="text-base sm:text-lg font-bold">
                                            ตรวจสอบสถานะการสมัครและชำระเงิน
                                        </Dialog.Title>
                                        <p className="text-xs text-blue-100 font-medium">
                                            กรอกเลขประจำตัวประชาชน 13 หลักเพื่อดูรายละเอียด
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* ── Search & Filter Area ───────────────────────── */}
                            <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4">
                                <form onSubmit={handleSearch} className="flex flex-col items-center gap-3">
                                    <CitizenId13Grid
                                        value={citizenId}
                                        onChange={(val) => {
                                            setCitizenId(val);
                                            if (val.length === 13) {
                                                fetchTracking(val);
                                            }
                                        }}
                                        disabled={loading}
                                        autoFocus
                                    />
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="submit"
                                            disabled={loading || citizenId.length !== 13}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 transition"
                                        >
                                            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                                            <span>ตรวจสอบสถานะ</span>
                                        </button>
                                        {citizenId && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCitizenId("");
                                                    setTrackingData(null);
                                                }}
                                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                                            >
                                                ล้างข้อมูล
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>

                            {/* ── Scrollable Body Area ─────────────────────────── */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/40">
                                {loading && !trackingData && (
                                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                        <Loader2 size={36} className="animate-spin text-blue-600 mb-3" />
                                        <p className="text-sm font-semibold text-slate-600">กำลังค้นหาข้อมูลการสมัคร...</p>
                                    </div>
                                )}

                                {!loading && !trackingData && (
                                    <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                                        <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 shadow-2xs">
                                            <FileText size={32} />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-700">ระบุเลขประจำตัวประชาชน 13 หลัก</h3>
                                        <p className="mt-1 text-xs text-slate-500 max-w-sm">
                                            เพื่อตรวจสอบสถานะใบสมัคร ชำระเงิน แนบหลักฐานสลิปโอนเงิน หรือแก้ไขข้อมูลส่วนตัว
                                        </p>
                                    </div>
                                )}

                                {trackingData && (
                                    <div className="space-y-4">
                                        {/* Multi-Enrollment Tabs (if applicant has multiple applications) */}
                                        {trackingData.enrollments?.length > 1 && (
                                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                                <span className="text-xs font-bold text-slate-500 shrink-0">วิชาที่สมัคร:</span>
                                                {trackingData.enrollments.map((en, idx) => {
                                                    const isSelected = String(en.id) === String(activeEnrollment?.id);
                                                    return (
                                                        <button
                                                            key={en.id}
                                                            type="button"
                                                            onClick={() => setSelectedEnrollmentId(en.id)}
                                                            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition shrink-0 ${
                                                                isSelected
                                                                    ? "bg-blue-600 text-white shadow-sm"
                                                                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                                                            }`}
                                                        >
                                                            {idx + 1}. {en.study_group?.group_name || en.subject_name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Render Interactive Application Detail Card */}
                                        {activeEnrollment ? (
                                            <ApplicantTrackingCard
                                                key={activeEnrollment.id}
                                                applicant={trackingData.applicant}
                                                enrollment={activeEnrollment}
                                                onUpdated={() => fetchTracking(citizenId)}
                                            />
                                        ) : (
                                            <div className="rounded-2xl bg-white p-8 text-center text-slate-400 border border-slate-200">
                                                <AlertCircle size={32} className="mx-auto mb-2 text-slate-300" />
                                                <p className="text-sm font-semibold">ไม่พบประวัติการสมัครในวิชาชีพระยะสั้น</p>
                                            </div>
                                        )}
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
