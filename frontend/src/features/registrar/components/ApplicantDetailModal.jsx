import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, User, Phone, GraduationCap, Wallet, Printer, Save } from "lucide-react";
import Swal from "sweetalert2";
import Combobox from "../../../components/common/Combobox";
import { formatThaiFullDate } from "../../../utils/dateUtils";
import { reassignStudyGroup } from "../services/registrarApi";

const STATUS_META = {
    pending_payment: { label: "รอชำระเงิน", className: "bg-amber-100 text-amber-700" },
    pending_verification: { label: "รอตรวจสอบสลิป", className: "bg-blue-100 text-blue-700" },
    paid: { label: "ชำระเงินแล้ว", className: "bg-emerald-100 text-emerald-700" },
    cancelled: { label: "ยกเลิก", className: "bg-slate-200 text-slate-500" },
};

/**
 * ApplicantDetailModal
 * -------------------------------------------------------------------------
 * Read-only applicant profile (personal / education / contact / payment)
 * plus the one editable field a Registrar is allowed to change: the
 * assigned Study Group, via a searchable Combobox.
 *
 * Props:
 * - isOpen, onClose
 * - enrollment: flattened enrollment row (from enrollmentApi.getEnrollments)
 * - groupOptionsForBatch: Array<{ value, label }>  -> study groups within the applicant's batch
 * - onReassigned: (updatedEnrollment) => void
 */
export default function ApplicantDetailModal({ isOpen, onClose, enrollment, groupOptionsForBatch = [], onReassigned }) {
    const [selectedGroupId, setSelectedGroupId] = useState("");
    const [saving, setSaving] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);

    useEffect(() => {
        if (isOpen && enrollment) {
            setSelectedGroupId(String(enrollment.study_group_id ?? ""));
        }
    }, [isOpen, enrollment]);

    const meta = STATUS_META[enrollment?.status] || STATUS_META.pending_payment;
    const hasGroupChanged = useMemo(
        () => enrollment && String(selectedGroupId) !== String(enrollment.study_group_id ?? ""),
        [selectedGroupId, enrollment]
    );

    if (!enrollment) return null;

    const handleSaveGroup = async () => {
        if (!hasGroupChanged) return;
        setSaving(true);
        try {
            const updated = await reassignStudyGroup(enrollment.id, { study_group_id: Number(selectedGroupId) });
            onReassigned?.(updated);
            Swal.fire({
                toast: true, position: "top-end", icon: "success",
                title: "ย้ายกลุ่มเรียนเรียบร้อยแล้ว", showConfirmButton: false, timer: 2000, timerProgressBar: true,
            });
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "ย้ายกลุ่มเรียนไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = () => window.print();

    const handleSendEmail = async () => {
        setSendingEmail(true);
        try {
            await sendConfirmationEmail(enrollment.id);
            Swal.fire({
                toast: true, position: "top-end", icon: "success",
                title: "ส่งอีเมลยืนยันเรียบร้อยแล้ว", showConfirmButton: false, timer: 2000, timerProgressBar: true,
            });
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "ส่งอีเมลไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        } finally {
            setSendingEmail(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/50" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white text-left shadow-xl">
                                {/* Header */}
                                <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
                                    <div>
                                        <Dialog.Title className="text-lg font-bold text-slate-900">
                                            {enrollment.applicant_name}
                                        </Dialog.Title>
                                        <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>
                                            {meta.label}
                                        </span>
                                    </div>
                                    <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                                    {/* Personal info */}
                                    <Section icon={User} title="ข้อมูลส่วนตัว">
                                        <InfoRow label="เลขบัตรประชาชน" value={enrollment.citizen_id} mono />
                                        <InfoRow label="ชื่อ-นามสกุล" value={enrollment.applicant_name} />
                                    </Section>

                                    {/* Contact */}
                                    <Section icon={Phone} title="ช่องทางติดต่อ">
                                        <InfoRow label="เบอร์โทร" value={enrollment.phone} icon={Phone} />
                                        {enrollment.email && <InfoRow label="อีเมล" value={enrollment.email} icon={Mail} />}
                                    </Section>

                                    {/* Education / enrollment */}
                                    <Section icon={GraduationCap} title="ข้อมูลการลงทะเบียน">
                                        <InfoRow label="รุ่นการเรียน" value={enrollment.batch_name || "-"} />
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                                                กลุ่มเรียน (แก้ไขได้)
                                            </label>
                                            <Combobox
                                                value={selectedGroupId}
                                                onChange={setSelectedGroupId}
                                                options={groupOptionsForBatch}
                                                placeholder="เลือกกลุ่มเรียน..."
                                            />
                                            {hasGroupChanged && (
                                                <button
                                                    type="button"
                                                    onClick={handleSaveGroup}
                                                    disabled={saving}
                                                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                                                >
                                                    <Save size={13} />
                                                    {saving ? "กำลังบันทึก..." : "บันทึกการย้ายกลุ่ม"}
                                                </button>
                                            )}
                                        </div>
                                    </Section>

                                    {/* Payment */}
                                    <Section icon={Wallet} title="สถานะการชำระเงิน">
                                        <InfoRow
                                            label="ยอดชำระ"
                                            value={`${Number(enrollment.total_amount || 0).toLocaleString()} บาท`}
                                        />
                                        {enrollment.receipt_number && (
                                            <InfoRow
                                                label="เลขที่ใบเสร็จ"
                                                value={`${enrollment.receipt_book_no ? `${enrollment.receipt_book_no}/` : ""}${enrollment.receipt_number}`}
                                                mono
                                            />
                                        )}
                                        {enrollment.payment_date && (
                                            <InfoRow label="วันที่ชำระเงิน" value={formatThaiFullDate(enrollment.payment_date)} />
                                        )}
                                    </Section>
                                </div>

                                {/* Footer actions */}
                                <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 px-6 py-4">
                                    <button
                                        type="button"
                                        onClick={handlePrint}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                                    >
                                        <Printer size={14} />
                                        พิมพ์ใบสมัคร
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSendEmail}
                                        disabled={sendingEmail || !enrollment.email}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-50"
                                        title={!enrollment.email ? "ไม่มีอีเมลของผู้สมัคร" : undefined}
                                    >
                                        <Send size={14} />
                                        {sendingEmail ? "กำลังส่ง..." : "ส่งอีเมลยืนยัน"}
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

function Section({ icon: Icon, title, children }) {
    return (
        <section className="rounded-xl border border-slate-200 p-4">
            <h4 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-700">
                <Icon size={15} className="text-indigo-500" />
                {title}
            </h4>
            <div className="space-y-2.5">{children}</div>
        </section>
    );
}

function InfoRow({ label, value, mono = false, icon: Icon }) {
    return (
        <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-1.5 text-slate-400">
                {Icon && <Icon size={13} />}
                {label}
            </span>
            <span className={`text-right font-medium text-slate-800 ${mono ? "font-mono" : ""}`}>{value || "-"}</span>
        </div>
    );
}