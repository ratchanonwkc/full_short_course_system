import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, CheckCircle, ShieldCheck } from "lucide-react";
import Swal from "sweetalert2";
import ApplicantFormFields, { EMPTY_APPLICANT } from "../components/ApplicantFormFields";
import PaymentStep from "../components/PaymentStep";
import { getStudyGroupDetail, uploadSlip, submitApplication } from "../services/publicApi";

/**
 * RegistrationPage — สมัครเรียนออนไลน์ (Public, No-Login)
 * route: /register/:studyGroupId
 * โครงสร้าง 6 ส่วนของฟอร์ม (ApplicantFormFields) + ขั้นตอนชำระเงิน (PaymentStep)
 */
export default function RegistrationPage() {
    const { studyGroupId } = useParams();
    const navigate = useNavigate();

    const [group, setGroup] = useState(null);
    const [loadingGroup, setLoadingGroup] = useState(true);
    const [formData, setFormData] = useState(EMPTY_APPLICANT);
    const [slipFile, setSlipFile] = useState(null);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        getStudyGroupDetail(studyGroupId)
            .then(setGroup)
            .catch(() => {
                Swal.fire("ไม่พบข้อมูลวิชานี้", "กรุณาเลือกวิชาใหม่อีกครั้ง", "error").then(() => navigate("/"));
            })
            .finally(() => setLoadingGroup(false));
    }, [studyGroupId, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.citizen_id.length !== 13) {
            Swal.fire("ข้อมูลไม่ถูกต้อง", "กรุณากรอกเลขประจำตัวประชาชนให้ครบ 13 หลัก", "warning");
            return;
        }
        if (group?.fee > 0 && !slipFile) {
            Swal.fire("แจ้งเตือน", "กรุณาอัปโหลดสลิปหลักฐานการโอนเงินก่อนส่งใบสมัคร", "warning");
            return;
        }
        if (!acceptedTerms) {
            Swal.fire("แจ้งเตือน", "กรุณายอมรับข้อตกลงและระเบียบของวิทยาลัย", "warning");
            return;
        }

        try {
            setSubmitting(true);
            let slip_url = null;
            if (slipFile) {
                const res = await uploadSlip(slipFile);
                slip_url = res.slip_url;
            }

            await submitApplication({
                applicant: formData,
                study_group_id: Number(studyGroupId),
                slip_url,
            });

            Swal.fire({
                icon: "success",
                title: "ส่งใบสมัครออนไลน์สำเร็จ!",
                text: "เจ้าหน้าที่จะตรวจสอบการชำระเงินของท่าน และแจ้งผลผ่านการตรวจสอบสถานะการสมัคร",
                confirmButtonColor: "#4f46e5",
            }).then(() => navigate("/"));
        } catch (error) {
            Swal.fire("เกิดข้อผิดพลาด", error.response?.data?.message || "ไม่สามารถส่งใบสมัครได้ โปรดตรวจสอบข้อมูลอีกครั้ง", "error");
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingGroup) {
        return <div className="flex min-h-[60vh] items-center justify-center text-slate-400">กำลังโหลดข้อมูล...</div>;
    }
    if (!group) return null;

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
                    <button
                        onClick={() => navigate("/")}
                        className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-indigo-600"
                    >
                        <ArrowLeft size={18} /> กลับไปหน้าเลือกวิชา
                    </button>
                    <span className="text-sm font-bold text-slate-400">ขั้นตอนกรอกประวัติและชำระเงิน</span>
                </div>
            </div>

            <div className="mx-auto max-w-5xl px-4 py-8">
                {/* Summary card */}
                <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                    <div className="mb-1 flex items-center gap-2 text-xs font-bold text-indigo-500">
                        <BookOpen size={14} /> วิชาที่สมัครเรียน
                    </div>
                    <h2 className="text-lg font-black text-indigo-900">{group.group_name}</h2>
                    <p className="mt-1 text-sm text-indigo-600">
                        รหัส {group.group_code} • {group.schedule_description || `${group.total_hours} ชั่วโมง`} •{" "}
                        {group.is_free ? "ไม่มีค่าใช้จ่าย" : `${group.fee.toLocaleString()} บาท`}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <ApplicantFormFields formData={formData} setFormData={setFormData} />

                    <PaymentStep amount={group.fee} slipFile={slipFile} setSlipFile={setSlipFile} />

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <label className="flex cursor-pointer items-start gap-3 select-none">
                            <input
                                type="checkbox"
                                checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                <ShieldCheck size={15} className="text-indigo-500 shrink-0" />
                                ข้าพเจ้าขอรับรองว่าข้อความดังกล่าวข้างต้นเป็นความจริงทุกประการ และยอมรับระเบียบข้อบังคับของวิทยาลัย
                            </span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-lg font-black text-white shadow-md transition active:scale-[0.99] disabled:opacity-50"
                    >
                        {submitting ? (
                            <>
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                กำลังส่งใบสมัคร...
                            </>
                        ) : (
                            <>
                                <CheckCircle size={22} /> ยืนยันการส่งใบสมัครออนไลน์
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
