import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, User, Phone, GraduationCap, Wallet, Printer, Save, Send, Pencil, IdCard as IdCardIcon } from "lucide-react";
import Swal from "sweetalert2";
import Combobox from "../../../components/common/Combobox";
import { formatThaiFullDate } from "../../../utils/dateUtils";
import { formatReceiptCode } from "../../../utils/receiptFormat";
import { updateApplicantDetails, sendConfirmationEmail } from "../services/registrarApi";

const STATUS_META = {
    pending_payment: { label: "รอชำระเงิน", className: "bg-amber-100 text-amber-700" },
    pending_verification: { label: "รอตรวจสอบสลิป", className: "bg-blue-100 text-blue-700" },
    paid: { label: "ชำระเงินแล้ว", className: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "สลิปไม่ถูกต้อง", className: "bg-red-100 text-red-700" },
    cancelled: { label: "ยกเลิก", className: "bg-slate-200 text-slate-500" },
};

/**
 * ApplicantDetailModal — formal Application Document layout.
 * - View mode: read-only, print-optimized (`print:` utility classes hide UI chrome).
 * - Edit mode: Registrar can update name/citizen_id/phone/email/group in place.
 *
 * Props:
 * - isOpen, onClose
 * - enrollment: flattened enrollment row (from enrollmentApi.getEnrollments)
 * - groupOptionsForBatch: Array<{ value, label }>  -> study groups within the applicant's batch
 * - onReassigned: (updatedEnrollment) => void
 */
export default function ApplicantDetailModal({ isOpen, onClose, enrollment, groupOptionsForBatch = [], onReassigned }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ title_name: "นาย", full_name: "", citizen_id: "", phone: "", email: "" });
    const [selectedGroupId, setSelectedGroupId] = useState("");
    const [saving, setSaving] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);

    useEffect(() => {
        if (isOpen && enrollment) {
            setSelectedGroupId(String(enrollment.study_group_id ?? ""));
            setEditForm({
                title_name: enrollment.title_name || "นาย",
                full_name: enrollment.raw_full_name || enrollment.applicant_name || "",
                citizen_id: enrollment.citizen_id || "",
                phone: enrollment.phone || "",
                email: enrollment.email || "",
            });
            setIsEditing(false);
        }
    }, [isOpen, enrollment]);

    const meta = STATUS_META[enrollment?.status] || STATUS_META.pending_payment;
    const hasGroupChanged = useMemo(
        () => enrollment && String(selectedGroupId) !== String(enrollment.study_group_id ?? ""),
        [selectedGroupId, enrollment]
    );

    if (!enrollment) return null;

    const receiptCode = formatReceiptCode(enrollment.receipt_book_no, enrollment.receipt_number);

    const handleSave = async () => {
        if (!editForm.full_name.trim()) {
            Swal.fire({ icon: "warning", title: "กรุณากรอกชื่อ-นามสกุล", confirmButtonColor: "#4f46e5" });
            return;
        }
        if (editForm.citizen_id.length !== 13) {
            Swal.fire({ icon: "warning", title: "เลขประจำตัวประชาชนต้องมี 13 หลัก", confirmButtonColor: "#4f46e5" });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                applicant: {
                    title_name: editForm.title_name,
                    full_name: editForm.full_name.trim(),
                    citizen_id: editForm.citizen_id,
                    phone: editForm.phone.trim(),
                    email: editForm.email.trim() || null,
                },
                ...(hasGroupChanged && { study_group_id: Number(selectedGroupId) }),
            };
            const updated = await updateApplicantDetails(enrollment.id, payload);
            onReassigned?.({
                ...updated,
                applicant_name: `${editForm.title_name}${editForm.full_name.trim()}`,
                title_name: editForm.title_name,
                raw_full_name: editForm.full_name.trim(),
                citizen_id: editForm.citizen_id,
                phone: editForm.phone.trim(),
                email: editForm.email.trim() || null,
            });
            setIsEditing(false);
            Swal.fire({
                toast: true, position: "top-end", icon: "success",
                title: "บันทึกการแก้ไขเรียบร้อยแล้ว", showConfirmButton: false, timer: 2000, timerProgressBar: true,
            });
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "บันทึกไม่สำเร็จ",
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
            <Dialog as="div" className="relative z-50 print:z-auto" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/50 print:hidden" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto print:static print:overflow-visible">
                    <div className="flex min-h-full items-center justify-center p-4 print:block print:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white text-left shadow-xl print:max-h-none print:w-full print:max-w-none print:rounded-none print:shadow-none">
                                {/* Header — screen only */}
                                <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4 print:hidden">
                                    <div>
                                        <Dialog.Title className="text-lg font-bold text-slate-900">{enrollment.applicant_name}</Dialog.Title>
                                        <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing((v) => !v)}
                                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                                isEditing ? "bg-amber-100 text-amber-700" : "border border-slate-300 text-slate-600 hover:bg-slate-50"
                                            }`}
                                        >
                                            <Pencil size={13} /> {isEditing ? "ยกเลิกแก้ไข" : "แก้ไขข้อมูล"}
                                        </button>
                                        <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Printable application document */}
                                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 print:overflow-visible print:px-10 print:py-8">
                                    <div className="mb-4 hidden border-b-2 border-slate-800 pb-3 text-center print:block">
                                        <p className="text-lg font-black">ใบสมัครเรียนหลักสูตรวิชาชีพระยะสั้น</p>
                                        <p className="text-sm text-slate-500">Application Form</p>
                                    </div>

                                    <Section icon={User} title="ข้อมูลส่วนตัว">
                                        {isEditing ? (
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <div>
                                                    <label className="mb-1 block text-xs font-semibold text-slate-500">คำนำหน้า</label>
                                                    <select
                                                        value={editForm.title_name}
                                                        onChange={(e) => setEditForm((p) => ({ ...p, title_name: e.target.value }))}
                                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                                                    >
                                                        <option value="นาย">นาย</option>
                                                        <option value="นาง">นาง</option>
                                                        <option value="นางสาว">นางสาว</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-semibold text-slate-500">ชื่อ-นามสกุล</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.full_name}
                                                        onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
                                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-semibold text-slate-500">เลขบัตรประชาชน</label>
                                                    <input
                                                        type="text"
                                                        maxLength={13}
                                                        value={editForm.citizen_id}
                                                        onChange={(e) => setEditForm((p) => ({ ...p, citizen_id: e.target.value.replace(/\D/g, "") }))}
                                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono outline-none focus:border-indigo-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-semibold text-slate-500">เบอร์โทร</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.phone}
                                                        onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="mb-1 block text-xs font-semibold text-slate-500">อีเมล</label>
                                                    <input
                                                        type="email"
                                                        value={editForm.email}
                                                        onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <InfoRow label="เลขบัตรประชาชน" value={enrollment.citizen_id} mono />
                                                <InfoRow label="ชื่อ-นามสกุล" value={enrollment.applicant_name} />
                                            </>
                                        )}
                                    </Section>

                                    {enrollment.id_card_url && (
                                        <Section icon={IdCardIcon} title="รูปบัตรประชาชน">
                                            <img src={enrollment.id_card_url} alt="บัตรประชาชน" className="max-h-56 rounded-lg border border-slate-200 object-contain print:max-h-72" />
                                        </Section>
                                    )}

                                    {!isEditing && (
                                        <Section icon={Phone} title="ช่องทางติดต่อ">
                                            <InfoRow label="เบอร์โทร" value={enrollment.phone} />
                                            {enrollment.email && <InfoRow label="อีเมล" value={enrollment.email} />}
                                        </Section>
                                    )}

                                    <Section icon={GraduationCap} title="ข้อมูลการลงทะเบียน">
                                        <InfoRow label="รุ่นการเรียน" value={enrollment.batch_name || "-"} />
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-500">กลุ่มเรียน</label>
                                            {isEditing ? (
                                                <>
                                                    <Combobox value={selectedGroupId} onChange={setSelectedGroupId} options={groupOptionsForBatch} placeholder="เลือกกลุ่มเรียน..." />
                                                    {hasGroupChanged && <p className="mt-1 text-xs font-semibold text-amber-600">* จะถูกย้ายกลุ่มเรียนเมื่อกด "บันทึกการแก้ไข"</p>}
                                                </>
                                            ) : (
                                                <p className="text-sm font-semibold text-slate-800">
                                                    {enrollment.group_code} — {enrollment.group_name}
                                                </p>
                                            )}
                                        </div>
                                    </Section>

                                    <Section icon={Wallet} title="สถานะการชำระเงิน">
                                        <InfoRow label="ยอดชำระ" value={`${Number(enrollment.total_amount || 0).toLocaleString()} บาท`} />
                                        {enrollment.receipt_number && <InfoRow label="เลขที่ใบเสร็จ" value={receiptCode} mono />}
                                        {enrollment.payment_date && <InfoRow label="วันที่ชำระเงิน" value={formatThaiFullDate(enrollment.payment_date)} />}
                                    </Section>

                                    <div className="hidden pt-8 print:block">
                                        <div className="grid grid-cols-2 gap-8 text-center text-sm">
                                            <div>
                                                <div className="mb-1 border-b border-slate-400 pb-8" />
                                                <p>ลายเซ็นผู้สมัคร</p>
                                            </div>
                                            <div>
                                                <div className="mb-1 border-b border-slate-400 pb-8" />
                                                <p>ลายเซ็นเจ้าหน้าที่ทะเบียน</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer — screen only */}
                                <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 px-6 py-4 print:hidden">
                                    {isEditing ? (
                                        <button
                                            type="button"
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                                        >
                                            <Save size={14} /> {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={handlePrint}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                                            >
                                                <Printer size={14} /> พิมพ์ใบสมัคร
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSendEmail}
                                                disabled={sendingEmail || !enrollment.email}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-50"
                                                title={!enrollment.email ? "ไม่มีอีเมลของผู้สมัคร" : undefined}
                                            >
                                                <Send size={14} /> {sendingEmail ? "กำลังส่ง..." : "ส่งอีเมลยืนยัน"}
                                            </button>
                                        </>
                                    )}
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
        <section className="rounded-xl border border-slate-200 p-4 print:border-slate-300 print:break-inside-avoid">
            <h4 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-700">
                <Icon size={15} className="text-indigo-500 print:hidden" />
                {title}
            </h4>
            <div className="space-y-2.5">{children}</div>
        </section>
    );
}

function InfoRow({ label, value, mono = false }) {
    return (
        <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-400">{label}</span>
            <span className={`text-right font-medium text-slate-800 ${mono ? "font-mono" : ""}`}>{value || "-"}</span>
        </div>
    );
}
