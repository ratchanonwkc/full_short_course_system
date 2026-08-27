import { Fragment, useEffect, useMemo, useState, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
    X, User, Phone, GraduationCap, Wallet, Printer, Save, Send, Pencil,
    IdCard as IdCardIcon, MapPin, ZoomIn, ZoomOut, RotateCw, CheckCircle2,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import Swal from "sweetalert2";
import Combobox from "../../../components/common/Combobox";
import { formatThaiDate, formatThaiFullDate } from "../../../utils/dateUtils";
import { formatReceiptCode } from "../../../utils/receiptFormat";
import { updateApplicantDetails, sendConfirmationEmail, getEnrollmentById } from "../services/registrarApi";
import ApplicantFormFields, { EMPTY_APPLICANT } from "./ApplicantFormFields";
import ApplicationFormPrint from "../../../components/print/ApplicationFormPrint";

const STATUS_META = {
    pending_payment: { label: "รอชำระเงิน", className: "bg-amber-100 text-amber-700" },
    pending_verification: { label: "รอตรวจสอบสลิป", className: "bg-blue-100 text-blue-700" },
    paid: { label: "ชำระเงินแล้ว", className: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "สลิปไม่ถูกต้อง", className: "bg-red-100 text-red-700" },
    cancelled: { label: "ยกเลิก", className: "bg-slate-200 text-slate-500" },
};

/**
 * ApplicantDetailDrawer
 * -------------------------------------------------------------------------
 * Slide-over Side Sheet (right side) for detailed applicant profile view,
 * full registrar editing, and direct 1:1 Application Form printing.
 */
export default function ApplicantDetailDrawer({
    isOpen,
    onClose,
    enrollment,
    groupOptionsForBatch = [],
    onReassigned,
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState(EMPTY_APPLICANT);
    const [selectedGroupId, setSelectedGroupId] = useState("");
    const [saving, setSaving] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [detailedData, setDetailedData] = useState(null);

    const activeEnrollment = detailedData || enrollment;
    const printComponentRef = useRef(null);

    const handlePrint = useReactToPrint({
        contentRef: printComponentRef,
        documentTitle: `ใบสมัคร_${activeEnrollment?.applicant_name || activeEnrollment?.application_no || "application"}`,
    });

    useEffect(() => {
        if (isOpen && enrollment) {
            setSelectedGroupId(String(enrollment.study_group_id ?? ""));
            setEditForm({ ...EMPTY_APPLICANT, ...(enrollment.applicant_profile || {}) });
            setIsEditing(false);
            setZoom(1);
            setRotation(0);

            // Fetch fresh detailed enrollment data via REST API
            if (enrollment.id) {
                getEnrollmentById(enrollment.id)
                    .then((data) => {
                        if (data) {
                            setDetailedData(data);
                            if (data.applicant_profile) {
                                setEditForm({ ...EMPTY_APPLICANT, ...data.applicant_profile });
                            }
                        }
                    })
                    .catch((err) => {
                        console.error("Failed to load enrollment detail via REST API:", err);
                    });
            }
        } else {
            setDetailedData(null);
        }
    }, [isOpen, enrollment]);

    const hasGroupChanged = useMemo(
        () => Boolean(activeEnrollment && String(selectedGroupId) !== String(activeEnrollment.study_group_id ?? "")),
        [selectedGroupId, activeEnrollment]
    );

    const profile = useMemo(() => activeEnrollment?.applicant_profile || {}, [activeEnrollment]);
    const studentNo = activeEnrollment?.student_no ?? null;

    // All hooks called above unconditionally. Now safe to check if enrollment exists.
    if (!isOpen || !activeEnrollment) return null;

    const meta = STATUS_META[activeEnrollment.status] || STATUS_META.pending_payment;
    const receiptCode = formatReceiptCode(activeEnrollment.receipt_book_no, activeEnrollment.receipt_number);

    const registeredAddress = [
        profile.house_no,
        profile.moo && `หมู่ ${profile.moo}`,
        profile.soi && `ซอย ${profile.soi}`,
        profile.road && `ถนน ${profile.road}`,
        profile.subdistrict && `ต.${profile.subdistrict}`,
        profile.district && `อ.${profile.district}`,
        profile.province && `จ.${profile.province}`,
        profile.postal_code,
    ]
        .filter(Boolean)
        .join(" ");

    const currentAddress = profile.is_same_address
        ? "ใช้ที่อยู่เดียวกับที่อยู่ตามทะเบียนบ้าน"
        : [
            profile.current_house_no,
            profile.current_moo && `หมู่ ${profile.current_moo}`,
            profile.current_soi && `ซอย ${profile.current_soi}`,
            profile.current_road && `ถนน ${profile.current_road}`,
            profile.current_subdistrict && `ต.${profile.current_subdistrict}`,
            profile.current_district && `อ.${profile.current_district}`,
            profile.current_province && `จ.${profile.current_province}`,
            profile.current_postal_code,
        ]
            .filter(Boolean)
            .join(" ");

    const handleSave = async () => {
        if (!editForm.full_name?.trim()) {
            Swal.fire({ icon: "warning", title: "กรุณากรอกชื่อ-นามสกุล", confirmButtonColor: "#0270c7" });
            return;
        }
        if (editForm.citizen_id?.length !== 13) {
            Swal.fire({ icon: "warning", title: "เลขประจำตัวประชาชนต้องมี 13 หลัก", confirmButtonColor: "#0270c7" });
            return;
        }
        setSaving(true);
        try {
            const { id, ...applicantPayload } = editForm;
            const payload = {
                applicant: applicantPayload,
                ...(hasGroupChanged && { study_group_id: Number(selectedGroupId) }),
            };
            const updated = await updateApplicantDetails(activeEnrollment.id, payload);
            onReassigned?.({
                ...updated,
                applicant_name: `${editForm.title_name}${editForm.full_name.trim()}`,
                title_name: editForm.title_name,
                raw_full_name: editForm.full_name.trim(),
                citizen_id: editForm.citizen_id,
                phone: editForm.phone,
                email: editForm.email,
                applicant_profile: { ...editForm },
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
                confirmButtonColor: "#0270c7",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleSendEmail = async () => {
        setSendingEmail(true);
        try {
            await sendConfirmationEmail(activeEnrollment.id);
            Swal.fire({
                toast: true, position: "top-end", icon: "success",
                title: "ส่งอีเมลยืนยันเรียบร้อยแล้ว", showConfirmButton: false, timer: 2000, timerProgressBar: true,
            });
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "ส่งอีเมลไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#0270c7",
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
                    <div className="fixed inset-0 bg-slate-950/70 print:hidden" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-hidden print:static print:overflow-visible">
                    <div className="absolute inset-0 overflow-hidden print:static">
                        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 print:static print:max-w-none print:pl-0">
                            <Transition.Child
                                as={Fragment}
                                enter="transform transition ease-in-out duration-300"
                                enterFrom="translate-x-full" enterTo="translate-x-0"
                                leave="transform transition ease-in-out duration-200"
                                leaveFrom="translate-x-0" leaveTo="translate-x-full"
                            >
                                <Dialog.Panel className="pointer-events-auto flex h-full w-screen max-w-2xl flex-col bg-white shadow-xl print:w-full print:max-w-none">
                                    {/* Header — screen only */}
                                    <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4 print:hidden">
                                        <div className="min-w-0">
                                            <Dialog.Title className="truncate text-lg font-bold text-slate-900">{activeEnrollment.applicant_name}</Dialog.Title>
                                            <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsEditing((v) => !v)}
                                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${isEditing ? "bg-amber-100 text-amber-700" : "border border-slate-300 text-slate-600 hover:bg-slate-50"
                                                    }`}
                                            >
                                                <Pencil size={13} /> {isEditing ? "ยกเลิกแก้ไข" : "แก้ไขข้อมูลทั้งหมด"}
                                            </button>
                                            <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Screen View Body */}
                                    <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 print:hidden">
                                        {isEditing ? (
                                            /* ── Full edit mode ── */
                                            <ApplicantFormFields formData={editForm} setFormData={setEditForm} />
                                        ) : (
                                            <>
                                                <Section icon={User} title="ข้อมูลส่วนตัว">
                                                    <InfoRow label="คำนำหน้า" value={profile.title_name} />
                                                    <InfoRow label="ชื่อ-นามสกุล" value={activeEnrollment.applicant_name} />
                                                    <InfoRow label="เลขบัตรประชาชน" value={activeEnrollment.citizen_id} mono />
                                                    <InfoRow label="สถานะนักศึกษา" value={profile.student_type || activeEnrollment.student_type || "นักศึกษาใหม่"} />
                                                    <InfoRow label="เพศ" value={profile.gender} />
                                                    <InfoRow label="วันเกิด" value={formatThaiDate(profile.birth_date)} />
                                                    <InfoRow label="สถานภาพสมรส" value={profile.marital_status} />
                                                    <InfoRow label="สัญชาติ" value={profile.nationality} />
                                                    <InfoRow label="ศาสนา" value={profile.religion} />
                                                    <InfoRow label="อาชีพปัจจุบัน" value={profile.occupation} />
                                                </Section>

                                                {activeEnrollment.id_card_url && (
                                                    <Section icon={IdCardIcon} title="รูปบัตรประชาชน">
                                                        <div className="mb-2 flex items-center justify-end gap-1 print:hidden">
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
                                                        <div className="flex max-h-72 items-center justify-center overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                                                            <img
                                                                src={activeEnrollment.id_card_url}
                                                                alt="บัตรประชาชน"
                                                                style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transition: "transform 0.15s ease" }}
                                                                className="max-h-64 object-contain"
                                                            />
                                                        </div>
                                                    </Section>
                                                )}

                                                <Section icon={Phone} title="ช่องทางติดต่อ">
                                                    <InfoRow label="เบอร์โทร" value={profile.phone} />
                                                    <InfoRow label="อีเมล" value={profile.email} />
                                                </Section>

                                                <Section icon={MapPin} title="ที่อยู่">
                                                    <InfoRow label="ที่อยู่ตามทะเบียนบ้าน" value={registeredAddress} block />
                                                    <InfoRow label="ที่อยู่ปัจจุบัน" value={currentAddress} block />
                                                </Section>

                                                <Section icon={GraduationCap} title="วุฒิการศึกษา">
                                                    <InfoRow label="ระดับการศึกษา" value={profile.highest_education} />
                                                    <InfoRow label="สำเร็จการศึกษาจาก" value={profile.previous_school} />
                                                    <InfoRow label="จังหวัดของสถานศึกษา" value={profile.school_province} />
                                                </Section>

                                                <Section icon={GraduationCap} title="ข้อมูลการลงทะเบียน">
                                                    <InfoRow label="ใบสมัครเลขที่" value={activeEnrollment.application_no || String(activeEnrollment.id || "").padStart(5, "0")} mono />
                                                    <InfoRow label="เลขที่นักศึกษา (ในกลุ่ม)" value={studentNo ? String(studentNo).padStart(2, "0") : "-"} mono />
                                                    <InfoRow label="รุ่นการเรียน" value={activeEnrollment.batch_name || "-"} />
                                                    <div>
                                                        <label className="mb-1.5 block text-xs font-semibold text-slate-500">กลุ่มเรียน</label>
                                                        <p className="text-sm font-semibold text-slate-800">
                                                            {activeEnrollment.group_code} — {activeEnrollment.group_name}
                                                        </p>
                                                    </div>
                                                </Section>

                                                <Section icon={Wallet} title="สถานะการชำระเงิน">
                                                    <InfoRow label="วิธีชำระเงิน" value={activeEnrollment.payment_method === "counter_cash" ? "ชำระที่ห้องการเงิน" : "โอนเงินออนไลน์"} />
                                                    <InfoRow label="ยอดชำระ" value={`${Number(activeEnrollment.total_amount || 0).toLocaleString()} บาท`} />
                                                    {activeEnrollment.receipt_number && <InfoRow label="เลขที่ใบเสร็จ" value={receiptCode} mono />}
                                                    {activeEnrollment.payment_date && <InfoRow label="วันที่ชำระเงิน" value={formatThaiFullDate(activeEnrollment.payment_date)} />}
                                                    {activeEnrollment.slip_url && activeEnrollment.payment_method !== "counter_cash" && (
                                                        <div>
                                                            <label className="mb-1.5 block text-xs font-semibold text-slate-500">หลักฐานการโอนเงิน</label>
                                                            <img src={activeEnrollment.slip_url} alt="สลิป" className="max-h-56 rounded-lg border border-slate-200 object-contain" />
                                                        </div>
                                                    )}
                                                </Section>
                                            </>
                                        )}

                                        {/* Reassign group */}
                                        {isEditing && (
                                            <Section icon={GraduationCap} title="กลุ่มเรียนที่ลงทะเบียน">
                                                <Combobox value={selectedGroupId} onChange={setSelectedGroupId} options={groupOptionsForBatch} placeholder="เลือกกลุ่มเรียน..." />
                                                {hasGroupChanged && <p className="mt-1 text-xs font-semibold text-amber-600">* จะถูกย้ายกลุ่มเรียนเมื่อกด "บันทึกการแก้ไข"</p>}
                                            </Section>
                                        )}
                                    </div>

                                    {/* Isolated Printable Application Form Container */}
                                    <div className="hidden">
                                        <div ref={printComponentRef}>
                                            <ApplicationFormPrint enrollment={activeEnrollment} studentNo={studentNo} />
                                        </div>
                                    </div>

                                    {/* Footer — screen only */}
                                    <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 px-6 py-4 print:hidden">
                                        {isEditing ? (
                                            <button
                                                type="button"
                                                onClick={handleSave}
                                                disabled={saving}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                                            >
                                                <Save size={14} /> {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => handlePrint()}
                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
                                                >
                                                    <Printer size={16} /> พิมพ์ใบสมัคร
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleSendEmail}
                                                    disabled={sendingEmail || !profile.email}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-100 disabled:opacity-50"
                                                    title={!profile.email ? "ไม่มีอีเมลของผู้สมัคร" : undefined}
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
                </div>
            </Dialog>
        </Transition>
    );
}

function Section({ icon: Icon, title, children }) {
    return (
        <section className="rounded-xl border border-slate-200 p-4">
            <h4 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-700">
                <Icon size={15} className="text-blue-500" />
                {title}
            </h4>
            <div className="space-y-2.5">{children}</div>
        </section>
    );
}

function InfoRow({ label, value, mono = false, block = false }) {
    if (block) {
        return (
            <div>
                <p className="text-xs text-slate-400">{label}</p>
                <p className="mt-0.5 text-sm font-medium text-slate-800">{value || "-"}</p>
            </div>
        );
    }
    return (
        <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-400">{label}</span>
            <span className={`text-right font-medium text-slate-800 ${mono ? "font-mono" : ""}`}>{value || "-"}</span>
        </div>
    );
}