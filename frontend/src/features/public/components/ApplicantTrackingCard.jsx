import { useState, useRef, useMemo } from "react";
import {
    FileText, CheckCircle2, Clock, XCircle, AlertTriangle, Printer, Pencil, Save, X,
    IdCard, Receipt, Upload, Eye, User, MapPin, GraduationCap, Phone, Mail, Sparkles,
    ShieldCheck, Calendar, BookOpen, UserCheck, AlertCircle, RefreshCcw, Loader2
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import Swal from "sweetalert2";
import { formatThaiDate, formatThaiFullDate } from "../../../utils/dateUtils";
import ThaiAddressTypeahead from "../../../components/common/ThaiAddressTypeahead";
import BirthDateField from "./BirthDateField";
import ApplicationFormPrint from "../../../components/print/ApplicationFormPrint";
import DocumentPreviewModal from "./DocumentPreviewModal";
import { uploadSlip, updateApplicantEnrollment } from "../services/publicApi";

const STATUS_META = {
    pending_payment: { label: "รอการชำระเงิน", color: "text-amber-700 bg-amber-50 border-amber-200", icon: Clock },
    pending_verification: { label: "รอตรวจสอบการชำระเงิน", color: "text-blue-700 bg-blue-50 border-blue-200", icon: Clock },
    paid: { label: "ชำระเงินสำเร็จ / ยืนยันแล้ว", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
    rejected: { label: "ถูกปฏิเสธ / ต้องแก้ไข", color: "text-red-700 bg-red-50 border-red-200", icon: XCircle },
    cancelled: { label: "ยกเลิกใบสมัคร", color: "text-slate-600 bg-slate-100 border-slate-200", icon: XCircle },
};

const inputCls =
    "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition disabled:bg-slate-100 disabled:text-slate-400";
const labelCls = "mb-1 block text-xs font-bold text-slate-600";

export default function ApplicantTrackingCard({ applicant, enrollment, onUpdated }) {
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingSlip, setUploadingSlip] = useState(false);
    const [selectedNewSlip, setSelectedNewSlip] = useState(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null); // { url, title }

    const printComponentRef = useRef(null);

    const isPaid = enrollment.status === "paid";
    const meta = STATUS_META[enrollment.status] || STATUS_META.pending_payment;
    const StatusIcon = meta.icon;

    // Build form edit state
    const [formData, setFormData] = useState({
        title_name: applicant?.title_name || "นาย",
        full_name: applicant?.full_name || "",
        gender: applicant?.gender || "ชาย",
        birth_date: applicant?.birth_date || "",
        marital_status: applicant?.marital_status || "โสด",
        nationality: applicant?.nationality || "ไทย",
        religion: applicant?.religion || "พุทธ",
        occupation: applicant?.occupation || "",
        highest_education: applicant?.highest_education || "มัธยมศึกษาตอนปลาย (ม.6)",
        previous_school: applicant?.previous_school || "",
        school_province: applicant?.school_province || "",
        phone: applicant?.phone || "",
        email: applicant?.email || "",
        house_no: applicant?.house_no || "",
        moo: applicant?.moo || "",
        soi: applicant?.soi || "",
        road: applicant?.road || "",
        subdistrict: applicant?.subdistrict || "",
        district: applicant?.district || "",
        province: applicant?.province || "",
        postal_code: applicant?.postal_code || "",
        is_same_address: applicant?.is_same_address ?? true,
        current_house_no: applicant?.current_house_no || "",
        current_moo: applicant?.current_moo || "",
        current_soi: applicant?.current_soi || "",
        current_road: applicant?.current_road || "",
        current_subdistrict: applicant?.current_subdistrict || "",
        current_district: applicant?.current_district || "",
        current_province: applicant?.current_province || "",
        current_postal_code: applicant?.current_postal_code || "",
    });

    const handlePrint = useReactToPrint({
        contentRef: printComponentRef,
        documentTitle: `ใบสมัคร_${applicant?.full_name || enrollment?.application_no || "application"}`,
    });

    // Merge print data
    const printEnrollmentData = useMemo(() => {
        return {
            ...enrollment,
            applicant_name: `${applicant?.title_name || ""}${applicant?.full_name || ""}`,
            citizen_id: applicant?.citizen_id,
            applicant_profile: {
                ...applicant,
                ...formData,
            },
            group_name: enrollment.study_group?.group_name || enrollment.subject_name,
            group_code: enrollment.study_group?.group_code || enrollment.subject_code,
            batch_name: enrollment.study_group?.batch_name || enrollment.batch_name || "",
            academic_year: enrollment.study_group?.academic_year || enrollment.academic_year || "",
            term: enrollment.study_group?.term || enrollment.term || "",
            batch_no: enrollment.study_group?.batch_no || enrollment.batch_no || "",
            study_open_date: enrollment.study_open_date || enrollment.study_group?.study_open_date || null,
            start_date: enrollment.start_date || enrollment.study_group?.start_date || null,
            total_hours: enrollment.study_group?.total_hours || 75,
            schedule_description: enrollment.study_group?.schedule_description || "",
            teacher_name: enrollment.study_group?.teacher_name || "",
            subjects: enrollment.study_group?.study_group_subjects || enrollment.subjects || [],
        };
    }, [enrollment, applicant, formData]);

    const handleSaveApplicant = async (e) => {
        e.preventDefault();
        if (isPaid) {
            Swal.fire("ไม่อนุญาตให้แก้ไข", "ไม่อนุญาตให้แก้ไขข้อมูล เนื่องจากได้รับการยืนยันการชำระเงินแล้ว", "warning");
            return;
        }

        setSaving(true);
        try {
            await updateApplicantEnrollment(enrollment.id, {
                applicant: formData,
            });

            Swal.fire({
                icon: "success",
                title: "บันทึกข้อมูลเรียบร้อยแล้ว",
                text: "ข้อมูลส่วนตัวและที่อยู่ของผู้สมัครได้รับการอัปเดตแล้ว",
                timer: 2000,
                showConfirmButton: false,
            });
            setIsEditing(false);
            onUpdated?.();
        } catch (err) {
            Swal.fire("เกิดข้อผิดพลาด", err.response?.data?.message || "ไม่สามารถบันทึกข้อมูลได้", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleUploadNewSlip = async () => {
        if (!selectedNewSlip) {
            Swal.fire("แจ้งเตือน", "กรุณาเลือกไฟล์สลิปการโอนเงิน", "warning");
            return;
        }

        setUploadingSlip(true);
        try {
            const { slip_url } = await uploadSlip(selectedNewSlip);
            await updateApplicantEnrollment(enrollment.id, { slip_url });

            Swal.fire({
                icon: "success",
                title: "อัปโหลดสลิปสำเร็จ",
                text: "ระบบได้ส่งข้อมูลสลิปใหม่ให้เจ้าหน้าที่ตรวจสอบเรียบร้อยแล้ว",
            });
            setShowUploadModal(false);
            setSelectedNewSlip(null);
            onUpdated?.();
        } catch (err) {
            Swal.fire("เกิดข้อผิดพลาด", err.response?.data?.message || "ไม่สามารถอัปโหลดสลิปได้", "error");
        } finally {
            setUploadingSlip(false);
        }
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all">
            {/* ── Top Header Banner ─────────────────────────────────── */}
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/40 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white uppercase tracking-wider">
                                ใบสมัคร #{enrollment.application_no || String(enrollment.id).padStart(5, "0")}
                            </span>
                            <span className="text-xs text-slate-500">
                                วันที่สมัคร: {formatThaiDate(enrollment.apply_date)}
                            </span>
                        </div>
                        <h2 className="mt-1 text-lg sm:text-xl font-black text-slate-900 leading-snug">
                            {enrollment.study_group?.group_name || enrollment.subject_name || "หลักสูตรวิชาชีพระยะสั้น"}
                        </h2>
                    </div>

                    {/* Status Pill */}
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${meta.color}`}>
                            <StatusIcon size={14} className="shrink-0" />
                            {meta.label}
                        </span>
                    </div>
                </div>

                {/* Paid Verified Lock Banner */}
                {isPaid && (
                    <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-2.5 text-xs font-semibold text-emerald-800">
                        <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                        <div>
                            <span className="font-bold">ชำระเงินเรียบร้อยแล้ว (ไม่สามารถแก้ไขข้อมูลได้)</span>
                            {enrollment.receipt_number && (
                                <span className="ml-2 text-emerald-700">
                                    • ใบเสร็จเล่มที่ {enrollment.receipt_book_no || "-"} เลขที่ {enrollment.receipt_number} ({formatThaiDate(enrollment.receipt_date)})
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Rejection Alert Box */}
                {enrollment.status === "rejected" && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
                        <div className="flex items-start gap-2">
                            <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-red-900">ใบสมัครหรือหลักฐานการชำระเงินต้องได้รับการแก้ไข</p>
                                {enrollment.rejection_reason && (
                                    <p className="mt-1 text-red-700">
                                        <span className="font-semibold">เหตุผล:</span> {enrollment.rejection_reason}
                                    </p>
                                )}
                                <p className="mt-1 text-red-600">
                                    กรุณากดปุ่ม <strong>"แก้ไขข้อมูลใบสมัคร"</strong> หรือ <strong>"อัปโหลดสลิปใหม่"</strong> ด้านล่างเพื่อส่งข้อมูลใหม่อีกครั้ง
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Action Buttons Bar ───────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:px-6">
                <div className="flex flex-wrap items-center gap-2">
                    {/* ID Card Preview Button */}
                    {applicant?.id_card_url ? (
                        <button
                            type="button"
                            onClick={() => setPreviewDoc({ url: applicant.id_card_url, title: "บัตรประจำตัวประชาชนที่แนบ" })}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition shadow-2xs"
                        >
                            <IdCard size={14} className="text-blue-600" />
                            ดูบัตรประชาชนที่แนบ
                        </button>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <IdCard size={13} /> ไม่มีรูปบัตร ปชช.
                        </span>
                    )}

                    {/* Slip Preview Button */}
                    {enrollment.slip_url ? (
                        <button
                            type="button"
                            onClick={() => setPreviewDoc({ url: enrollment.slip_url, title: "สลิปหลักฐานการโอนเงิน" })}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition shadow-2xs"
                        >
                            <Receipt size={14} className="text-emerald-600" />
                            ดูสลิปโอนเงิน
                        </button>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <Receipt size={13} /> ยังไม่ได้แนบสลิป
                        </span>
                    )}

                    {/* Re-upload Slip Button (if not paid) */}
                    {!isPaid && (
                        <button
                            type="button"
                            onClick={() => setShowUploadModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition shadow-2xs"
                        >
                            <Upload size={14} className="text-amber-700" />
                            {enrollment.slip_url ? "อัปโหลดสลิปใหม่" : "แนบสลิปโอนเงิน"}
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Print Button */}
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs"
                    >
                        <Printer size={14} className="text-slate-600" />
                        พิมพ์ใบสมัคร
                    </button>

                    {/* Inline Edit Button (if not paid) */}
                    {!isPaid && !isEditing && (
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-2xs"
                        >
                            <Pencil size={13} />
                            แก้ไขข้อมูลใบสมัคร
                        </button>
                    )}
                </div>
            </div>

            {/* ── Main Detail Content (Matching Official Form Layout) ──── */}
            <div className="p-4 sm:p-6">
                {isEditing ? (
                    /* ── INLINE EDIT FORM ────────────────────────────── */
                    <form onSubmit={handleSaveApplicant} className="space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <h3 className="flex items-center gap-2 text-sm font-black text-blue-700">
                                <Pencil size={16} /> แก้ไขข้อมูลผู้สมัคร
                            </h3>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                                >
                                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                    บันทึกการแก้ไข
                                </button>
                            </div>
                        </div>

                        {/* Section 1: ข้อมูลส่วนตัว */}
                        <div>
                            <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                <User size={14} className="text-blue-600" /> 1. ข้อมูลส่วนตัว
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                    <label className={labelCls}>คำนำหน้าชื่อ</label>
                                    <select
                                        value={formData.title_name}
                                        onChange={(e) => setFormData({ ...formData, title_name: e.target.value })}
                                        className={inputCls}
                                    >
                                        <option value="นาย">นาย</option>
                                        <option value="นาง">นาง</option>
                                        <option value="นางสาว">นางสาว</option>
                                        <option value="เด็กชาย">เด็กชาย</option>
                                        <option value="เด็กหญิง">เด็กหญิง</option>
                                    </select>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={labelCls}>ชื่อ - นามสกุล *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>เพศ</label>
                                    <select
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                        className={inputCls}
                                    >
                                        <option value="ชาย">ชาย</option>
                                        <option value="หญิง">หญิง</option>
                                    </select>
                                </div>

                                <div className="sm:col-span-2">
                                    <label className={labelCls}>วัน/เดือน/ปีเกิด (พ.ศ.)</label>
                                    <BirthDateField
                                        value={formData.birth_date}
                                        onChange={(iso) => setFormData({ ...formData, birth_date: iso })}
                                    />
                                </div>

                                <div>
                                    <label className={labelCls}>สัญชาติ</label>
                                    <input
                                        type="text"
                                        value={formData.nationality}
                                        onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>ศาสนา</label>
                                    <input
                                        type="text"
                                        value={formData.religion}
                                        onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                                        className={inputCls}
                                    />
                                </div>

                                <div>
                                    <label className={labelCls}>สถานภาพ</label>
                                    <select
                                        value={formData.marital_status}
                                        onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                                        className={inputCls}
                                    >
                                        <option value="โสด">โสด</option>
                                        <option value="สมรส">สมรส</option>
                                        <option value="หม้าย">หม้าย</option>
                                        <option value="หย่าร้าง">หย่าร้าง</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>อาชีพ</label>
                                    <input
                                        type="text"
                                        value={formData.occupation}
                                        onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>เบอร์โทรศัพท์ติดต่อ *</label>
                                    <input
                                        type="tel"
                                        required
                                        maxLength={10}
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
                                        className={`${inputCls} font-mono`}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>อีเมล</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: ที่อยู่ตามทะเบียนบ้าน */}
                        <div className="border-t border-slate-100 pt-4">
                            <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                <MapPin size={14} className="text-emerald-600" /> 2. ที่อยู่ตามทะเบียนบ้าน
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                <div>
                                    <label className={labelCls}>บ้านเลขที่ *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.house_no}
                                        onChange={(e) => setFormData({ ...formData, house_no: e.target.value })}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>หมู่</label>
                                    <input
                                        type="text"
                                        value={formData.moo}
                                        onChange={(e) => setFormData({ ...formData, moo: e.target.value })}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>ซอย</label>
                                    <input
                                        type="text"
                                        value={formData.soi}
                                        onChange={(e) => setFormData({ ...formData, soi: e.target.value })}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>ถนน</label>
                                    <input
                                        type="text"
                                        value={formData.road}
                                        onChange={(e) => setFormData({ ...formData, road: e.target.value })}
                                        className={inputCls}
                                    />
                                </div>
                            </div>

                            <ThaiAddressTypeahead
                                subdistrict={formData.subdistrict}
                                district={formData.district}
                                province={formData.province}
                                postalCode={formData.postal_code}
                                onChangeField={(field, val) => setFormData({ ...formData, [field]: val })}
                                onSelectAddress={(addr) => setFormData({
                                    ...formData,
                                    subdistrict: addr.subdistrict,
                                    district: addr.district,
                                    province: addr.province,
                                    postal_code: addr.postal_code,
                                })}
                            />
                        </div>

                        {/* Section 3: ข้อมูลการศึกษาเดิม */}
                        <div className="border-t border-slate-100 pt-4">
                            <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                <GraduationCap size={14} className="text-purple-600" /> 3. ข้อมูลการศึกษาเดิม
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className={labelCls}>วุฒิการศึกษาสูงสุด</label>
                                    <input
                                        type="text"
                                        value={formData.highest_education}
                                        onChange={(e) => setFormData({ ...formData, highest_education: e.target.value })}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>สถานศึกษาเดิม</label>
                                    <input
                                        type="text"
                                        value={formData.previous_school}
                                        onChange={(e) => setFormData({ ...formData, previous_school: e.target.value })}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>จังหวัดสถานศึกษา</label>
                                    <input
                                        type="text"
                                        value={formData.school_province}
                                        onChange={(e) => setFormData({ ...formData, school_province: e.target.value })}
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Bottom Form Actions */}
                        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                บันทึกการแก้ไขข้อมูล
                            </button>
                        </div>
                    </form>
                ) : (
                    /* ── READ-ONLY OFFICIAL VIEW ───────────────────────── */
                    <div className="space-y-6">
                        {/* 1. Course Information Card */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                            <h3 className="mb-3 flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                                <BookOpen size={15} className="text-blue-600" /> ข้อมูลกลุ่มเรียนและรายวิชา
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                <div>
                                    <span className="text-slate-400 block font-medium">รหัสวิชา (Subject Code)</span>
                                    <span className="font-mono font-bold text-slate-800 text-sm">
                                        {enrollment.subject_code || "-"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block font-medium">รหัส ศธ. (MOE Code)</span>
                                    <span className="font-mono font-bold text-blue-700 text-sm">
                                        {enrollment.moe_code || "-"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block font-medium">รุ่นการศึกษา (Batch)</span>
                                    <span className="font-semibold text-slate-800">
                                        {enrollment.study_group?.batch_name || "-"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block font-medium">ครูผู้สอน</span>
                                    <span className="font-semibold text-slate-800">
                                        {enrollment.study_group?.teacher_name || "อาจารย์ประจำวิชา"}
                                    </span>
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="text-slate-400 block font-medium">กำหนดการเรียน</span>
                                    <span className="text-slate-700">
                                        {enrollment.study_group?.schedule_description || "ตามตารางที่กำหนด"} (รวม {enrollment.study_group?.total_hours || 75} ชั่วโมง)
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block font-medium">ยอดเงินค่าลงทะเบียน</span>
                                    <span className="font-bold text-slate-900 text-sm">
                                        {Number(enrollment.total_amount || 0).toLocaleString()} บาท
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block font-medium">ช่องทางการชำระ</span>
                                    <span className="font-semibold text-slate-700">
                                        {enrollment.payment_method === "walk_in_cash" ? "ชำระเงินสดที่เคาน์เตอร์" : "โอนเงินผ่านธนาคาร"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 2. Personal Profile Information */}
                        <div>
                            <h3 className="mb-3 flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                                <User size={15} className="text-blue-600" /> ข้อมูลส่วนตัวผู้สมัคร
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
                                <div>
                                    <span className="text-slate-400 block font-medium">เลขประจำตัวประชาชน</span>
                                    <span className="font-mono font-bold text-slate-900 text-sm tracking-wider">
                                        {applicant?.citizen_id}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block font-medium">ชื่อ - นามสกุล</span>
                                    <span className="font-bold text-slate-800 text-sm">
                                        {applicant?.title_name}{applicant?.full_name}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block font-medium">วัน/เดือน/ปีเกิด</span>
                                    <span className="font-medium text-slate-800">
                                        {applicant?.birth_date ? formatThaiDate(applicant.birth_date) : "-"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block font-medium">เพศ / สถานภาพ</span>
                                    <span className="font-medium text-slate-800">
                                        {applicant?.gender || "-"} / {applicant?.marital_status || "-"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block font-medium">สัญชาติ / ศาสนา</span>
                                    <span className="font-medium text-slate-800">
                                        {applicant?.nationality || "ไทย"} / {applicant?.religion || "พุทธ"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block font-medium">อาชีพ</span>
                                    <span className="font-medium text-slate-800">
                                        {applicant?.occupation || "-"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block font-medium">เบอร์โทรศัพท์</span>
                                    <span className="font-mono font-bold text-blue-700 text-sm">
                                        {applicant?.phone || "-"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block font-medium">อีเมล</span>
                                    <span className="font-medium text-slate-800">
                                        {applicant?.email || "-"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 3. Address Information */}
                        <div className="border-t border-slate-100 pt-4">
                            <h3 className="mb-3 flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                                <MapPin size={15} className="text-emerald-600" /> ที่อยู่ตามทะเบียนบ้าน
                            </h3>
                            <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                {[
                                    applicant?.house_no && `บ้านเลขที่ ${applicant.house_no}`,
                                    applicant?.moo && `หมู่ ${applicant.moo}`,
                                    applicant?.soi && `ซอย ${applicant.soi}`,
                                    applicant?.road && `ถนน ${applicant.road}`,
                                    applicant?.subdistrict && `ต.${applicant.subdistrict}`,
                                    applicant?.district && `อ.${applicant.district}`,
                                    applicant?.province && `จ.${applicant.province}`,
                                    applicant?.postal_code && applicant.postal_code,
                                ].filter(Boolean).join(" ") || "ไม่ระบุ"}
                            </p>
                        </div>

                        {/* 4. Education Information */}
                        <div className="border-t border-slate-100 pt-4">
                            <h3 className="mb-3 flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                                <GraduationCap size={15} className="text-purple-600" /> ข้อมูลการศึกษาเดิม
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                <div>
                                    <span className="text-slate-400 block font-medium">วุฒิการศึกษาสูงสุด</span>
                                    <span className="font-medium text-slate-800">{applicant?.highest_education || "-"}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block font-medium">สถานศึกษาเดิม</span>
                                    <span className="font-medium text-slate-800">{applicant?.previous_school || "-"}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block font-medium">จังหวัด</span>
                                    <span className="font-medium text-slate-800">{applicant?.school_province || "-"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Re-upload Slip Modal ───────────────────────────────── */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Upload size={16} className="text-blue-600" /> อัปโหลดสลิปการโอนเงินใหม่
                            </h3>
                            <button onClick={() => setShowUploadModal(false)} className="rounded p-1 text-slate-400 hover:text-slate-700">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-4 space-y-3">
                            <p className="text-xs text-slate-600">
                                กรุณาแนบรูปภาพสลิปการโอนเงินที่ชัดเจน (รองรับไฟล์ .JPG, .PNG, .WEBP หรือ .PDF)
                            </p>

                            <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp,.pdf"
                                onChange={(e) => setSelectedNewSlip(e.target.files?.[0] || null)}
                                className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-700 cursor-pointer"
                            />

                            {selectedNewSlip && (
                                <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                    <CheckCircle2 size={13} /> เลือกไฟล์: {selectedNewSlip.name}
                                </p>
                            )}

                            <div className="mt-6 flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowUploadModal(false)}
                                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    disabled={!selectedNewSlip || uploadingSlip}
                                    onClick={handleUploadNewSlip}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {uploadingSlip ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                    ยืนยันการส่งสลิป
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Document Preview Modal (ID Card / Slip) ───────────── */}
            {previewDoc && (
                <DocumentPreviewModal
                    isOpen={Boolean(previewDoc)}
                    onClose={() => setPreviewDoc(null)}
                    title={previewDoc.title}
                    url={previewDoc.url}
                />
            )}

            {/* ── Hidden Print Component ───────────────────────────── */}
            <div className="hidden">
                <ApplicationFormPrint
                    ref={printComponentRef}
                    enrollment={printEnrollmentData}
                    studentNo={enrollment.student_no}
                />
            </div>
        </div>
    );
}
