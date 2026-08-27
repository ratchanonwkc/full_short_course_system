import { Fragment, useState, useEffect, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
    X, Users, Printer, BookOpen, Clock, CheckCircle2, XCircle, FileText,
    Loader2, Search, GraduationCap, ChevronRight, AlertCircle, Eye
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import Swal from "sweetalert2";
import { getStudyGroupRosterBySubject } from "../services/studyGroupApi";
import { getEnrollmentById } from "../../registrar/services/registrarApi";
import RosterSubjectPrint from "../../../components/print/RosterSubjectPrint";
import ApplicationFormPrint from "../../../components/print/ApplicationFormPrint";

const STATUS_META = {
    paid: { label: "ชำระเงินแล้ว", color: "bg-emerald-100 text-emerald-700" },
    pending_payment: { label: "รอชำระเงิน", color: "bg-amber-100 text-amber-700" },
    pending_verification: { label: "รอตรวจสอบสลิป", color: "bg-blue-100 text-blue-700" },
    rejected: { label: "ถูกปฏิเสธ", color: "bg-red-100 text-red-700" },
    cancelled: { label: "ยกเลิก", color: "bg-slate-200 text-slate-600" },
};

export default function StudyGroupRosterModal({ isOpen, onClose, studyGroupId, groupTitle = "" }) {
    const [loading, setLoading] = useState(false);
    const [rosterData, setRosterData] = useState(null);
    const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");

    // Printing specific student application form
    const [studentToPrint, setStudentToPrint] = useState(null);
    const [loadingPrint, setLoadingPrint] = useState(false);

    const rosterPrintRef = useRef(null);
    const applicationPrintRef = useRef(null);

    const handlePrintRoster = useReactToPrint({
        contentRef: rosterPrintRef,
        documentTitle: `รายชื่อนักศึกษา_ศธ02_${rosterData?.group_name || "roster"}`,
    });

    const handlePrintApplication = useReactToPrint({
        contentRef: applicationPrintRef,
        documentTitle: `ใบสมัคร_${studentToPrint?.applicant_name || studentToPrint?.full_name || "application"}`,
    });

    useEffect(() => {
        if (isOpen && studyGroupId) {
            setLoading(true);
            setRosterData(null);
            setActiveSubjectIndex(0);
            setSearchTerm("");

            getStudyGroupRosterBySubject(studyGroupId)
                .then((data) => {
                    setRosterData(data);
                })
                .catch((err) => {
                    Swal.fire({
                        icon: "error",
                        title: "โหลดรายชื่อนักศึกษาไม่สำเร็จ",
                        text: err.response?.data?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์",
                    });
                })
                .finally(() => setLoading(false));
        } else {
            setRosterData(null);
        }
    }, [isOpen, studyGroupId]);

    const activeSubject = rosterData?.subjects?.[activeSubjectIndex] || null;

    const filteredStudents = (activeSubject?.students || []).filter((st) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase().trim();
        return (
            st.full_name?.toLowerCase().includes(q) ||
            st.citizen_id?.includes(q) ||
            st.phone?.includes(q)
        );
    });

    const handleViewStudentApplication = async (student) => {
        setLoadingPrint(true);
        try {
            let fullEnrollment = null;
            if (student.enrollment_id) {
                try {
                    fullEnrollment = await getEnrollmentById(student.enrollment_id);
                } catch {
                    // non-blocking fallback
                }
            }

            const profile = fullEnrollment?.applicant_profile || student.applicant_profile || {
                full_name: student.full_name,
                citizen_id: student.citizen_id,
                phone: student.phone,
            };

            const printPayload = {
                ...(fullEnrollment || {}),
                id: student.enrollment_id || student.seq_no,
                student_no: student.seq_no,
                application_no: student.application_no || fullEnrollment?.application_no || String(student.seq_no).padStart(5, "0"),
                status: student.status,
                applicant_name: student.full_name || fullEnrollment?.applicant_name,
                citizen_id: student.citizen_id || fullEnrollment?.citizen_id,
                phone: student.phone || fullEnrollment?.phone,
                applicant_profile: profile,
                apply_date: student.apply_date || fullEnrollment?.apply_date,
                receipt_book_no: student.receipt_book_no || fullEnrollment?.receipt_book_no,
                receipt_number: student.receipt_number || fullEnrollment?.receipt_number,
                total_amount: student.total_amount ?? fullEnrollment?.total_amount ?? rosterData?.total_amount,
                batch_name: rosterData?.batch_name || fullEnrollment?.batch_name,
                academic_year: rosterData?.academic_year || fullEnrollment?.academic_year,
                term: rosterData?.term || fullEnrollment?.term,
                batch_no: rosterData?.batch_no || fullEnrollment?.batch_no,
                study_open_date: rosterData?.study_open_date || fullEnrollment?.study_open_date,
                start_date: rosterData?.start_date || fullEnrollment?.start_date,
                group_code: rosterData?.group_code || fullEnrollment?.group_code,
                group_name: rosterData?.group_name || fullEnrollment?.group_name,
                schedule_description: rosterData?.schedule_description || fullEnrollment?.schedule_description,
                subjects: rosterData?.subjects || fullEnrollment?.subjects || (activeSubject ? [activeSubject] : []),
            };

            setStudentToPrint(printPayload);
            setTimeout(() => {
                handlePrintApplication();
            }, 150);
        } catch (err) {
            Swal.fire("ไม่สามารถพิมพ์ได้", "เกิดข้อผิดพลาดในการดึงข้อมูลใบสมัคร", "error");
        } finally {
            setLoadingPrint(false);
        }
    };

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog onClose={onClose} className="relative z-50">
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
                        <Dialog.Panel className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                            {/* ── Modal Header ───────────────────────────────── */}
                            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 px-6 py-4 text-white">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white">
                                        <Users size={22} />
                                    </span>
                                    <div>
                                        <Dialog.Title className="text-base sm:text-lg font-bold flex items-center gap-2">
                                            <span>รายชื่อนักศึกษาตามรายวิชา (ศธ.02)</span>
                                            <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-semibold">
                                                {rosterData?.batch_name || ""}
                                            </span>
                                        </Dialog.Title>
                                        <p className="text-xs text-blue-100 font-medium">
                                            {rosterData?.group_name || groupTitle || "กลุ่มเรียนวิชาชีพระยะสั้น"}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={onClose}
                                    className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* ── Loading State ──────────────────────────────── */}
                            {loading && (
                                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                                    <Loader2 size={40} className="animate-spin text-blue-600 mb-3" />
                                    <p className="text-sm font-semibold text-slate-600">กำลังโหลดข้อมูลรายชื่อนักศึกษา (ศธ.02)...</p>
                                </div>
                            )}

                            {!loading && rosterData && (
                                <>
                                    {/* ── Subject Tabs (1 subject = 1 รหัส ศธ.) ─── */}
                                    <div className="border-b border-slate-200 bg-slate-50 px-6 pt-3">
                                        <div className="flex items-center gap-2 overflow-x-auto pb-px">
                                            {rosterData.subjects?.map((sub, idx) => {
                                                const isActive = idx === activeSubjectIndex;
                                                return (
                                                    <button
                                                        key={sub.moe_code || sub.subject_code || idx}
                                                        type="button"
                                                        onClick={() => setActiveSubjectIndex(idx)}
                                                        className={`group relative flex items-center gap-2.5 rounded-t-xl px-4 py-2.5 text-xs font-bold transition shrink-0 ${
                                                            isActive
                                                                ? "bg-white text-blue-700 shadow-xs border-t-2 border-t-blue-600 border-x border-slate-200"
                                                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                                        }`}
                                                    >
                                                        <BookOpen size={14} className={isActive ? "text-blue-600" : "text-slate-400"} />
                                                        <div className="text-left">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-mono">{sub.subject_code || "-"}</span>
                                                                {sub.moe_code && (
                                                                    <span className="rounded bg-blue-50 px-1 text-[10px] text-blue-600 font-mono">
                                                                        ศธ.{sub.moe_code}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[11px] block font-semibold truncate max-w-[200px]">
                                                                {sub.subject_name || "วิชา"}
                                                            </span>
                                                        </div>
                                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                            isActive ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-600"
                                                        }`}>
                                                            {sub.students?.length || 0}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* ── Active Tab Details & Actions Bar ───────── */}
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 bg-white px-6 py-3.5">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-black text-slate-900">
                                                    {activeSubject?.subject_name}
                                                </h3>
                                                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                                    รหัสวิชา: {activeSubject?.subject_code}
                                                </span>
                                                <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                                    รหัส ศธ.: {activeSubject?.moe_code || "-"}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                ครูผู้สอน: <span className="font-semibold text-slate-700">{activeSubject?.teacher_name || "อาจารย์ประจำวิชา"}</span>
                                                {" • "}นักศึกษาลงทะเบียน: <span className="font-bold text-slate-900">{activeSubject?.students?.length || 0}</span> คน
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Search box inside modal */}
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    placeholder="ค้นหาชื่อ / เลข ปชช."
                                                    className="w-48 rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                                                />
                                                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            </div>

                                            {/* Print ศธ.02 Button */}
                                            <button
                                                type="button"
                                                onClick={handlePrintRoster}
                                                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
                                            >
                                                <Printer size={14} />
                                                <span>พิมพ์ใบรายชื่อ/เช็คชื่อ (ศธ.02)</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* ── Student Roster Table ───────────────────── */}
                                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                                        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700 font-bold">
                                                        <th className="py-3 px-4 w-14 text-center">ลำดับ</th>
                                                        <th className="py-3 px-4 w-40">เลขประจำตัวประชาชน</th>
                                                        <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                                                        <th className="py-3 px-4 w-36">เบอร์โทรศัพท์</th>
                                                        <th className="py-3 px-4 w-32 text-center">สถานะชำระเงิน</th>
                                                        <th className="py-3 px-4 w-32 text-center">การจัดการ</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {filteredStudents.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} className="py-12 text-center text-slate-400">
                                                                {searchTerm ? "ไม่พบนักศึกษาที่ตรงกับคำค้นหา" : "ยังไม่มีนักศึกษาลงทะเบียนในรายวิชานี้"}
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        filteredStudents.map((st, idx) => {
                                                            const meta = STATUS_META[st.status] || STATUS_META.pending_payment;
                                                            return (
                                                                <tr key={st.citizen_id || idx} className="hover:bg-blue-50/30 transition">
                                                                    <td className="py-2.5 px-4 text-center font-bold text-slate-500">
                                                                        {st.seq_no || idx + 1}
                                                                    </td>
                                                                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-800 tracking-wider">
                                                                        {st.citizen_id || "-"}
                                                                    </td>
                                                                    <td className="py-2.5 px-4 font-bold text-slate-900">
                                                                        {st.full_name || "-"}
                                                                    </td>
                                                                    <td className="py-2.5 px-4 font-mono text-slate-600">
                                                                        {st.phone || "-"}
                                                                    </td>
                                                                    <td className="py-2.5 px-4 text-center">
                                                                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.color}`}>
                                                                            {meta.label}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-2.5 px-4 text-center">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleViewStudentApplication(st)}
                                                                            title="ดู/พิมพ์ใบสมัคร"
                                                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition shadow-2xs"
                                                                        >
                                                                            <Printer size={12} /> ดู/พิมพ์ใบสมัคร
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>

            {/* ── Hidden Print Components ────────────────────────────── */}
            <div className="hidden">
                {activeSubject && (
                    <RosterSubjectPrint
                        ref={rosterPrintRef}
                        groupData={rosterData}
                        subject={activeSubject}
                        students={activeSubject.students || []}
                    />
                )}

                {studentToPrint && (
                    <ApplicationFormPrint
                        ref={applicationPrintRef}
                        enrollment={studentToPrint}
                        studentNo={studentToPrint.student_no || studentToPrint.id}
                    />
                )}
            </div>
        </Transition>
    );
}
