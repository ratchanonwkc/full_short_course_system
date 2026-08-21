import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import Swal from "sweetalert2";
import Stepper from "../../../components/common/Stepper";
import StepPersonalInfo from "../components/registration-steps/StepPersonalInfo";
import StepCourseSelection from "../components/registration-steps/StepCourseSelection";
import StepPayment from "../components/registration-steps/StepPayment";
import StepReview from "../components/registration-steps/StepReview";
import { EMPTY_APPLICANT } from "../components/ApplicantFormFields";
import { getStudyGroupDetail, uploadSlip, uploadIdCard, submitApplication } from "../services/publicApi";

const STEP_LABELS = ["ข้อมูลส่วนตัว", "เลือกวิชา", "ชำระเงิน", "ตรวจสอบและยืนยัน"];

/**
 * RegistrationPage — Multi-step registration (studyGroupId is optional; when
 * omitted the applicant picks their course in Step 2 via StepCourseSelection).
 * route: /register/:studyGroupId?
 */
export default function RegistrationPage() {
    const { studyGroupId } = useParams();
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState(EMPTY_APPLICANT);
    const [idCardFile, setIdCardFile] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState("online_transfer");
    const [slipFile, setSlipFile] = useState(null);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [loadingGroup, setLoadingGroup] = useState(Boolean(studyGroupId));
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!studyGroupId) return;
        getStudyGroupDetail(studyGroupId)
            .then(setSelectedGroup)
            .catch(() => {
                Swal.fire("ไม่พบข้อมูลวิชานี้", "กรุณาเลือกวิชาใหม่อีกครั้ง", "error").then(() => navigate("/"));
            })
            .finally(() => setLoadingGroup(false));
    }, [studyGroupId, navigate]);

    const validateStep = (s) => {
        if (s === 1) {
            if (!formData.full_name.trim()) return "กรุณากรอกชื่อ-นามสกุล";
            if (formData.citizen_id.length !== 13) return "กรุณากรอกเลขประจำตัวประชาชนให้ครบ 13 หลัก";
            if (!formData.phone.trim()) return "กรุณากรอกเบอร์โทรศัพท์";
            if (!formData.birth_date) return "กรุณากรอกวันเกิด";
            return null;
        }
        if (s === 2) return !selectedGroup ? "กรุณาเลือกวิชาที่ต้องการสมัคร" : null;
        if (s === 3) {
            if (selectedGroup?.fee > 0 && paymentMethod === "online_transfer" && !slipFile) return "กรุณาอัปโหลดสลิปหลักฐานการโอนเงิน";
            return null;
        }
        return null;
    };

    const handleNext = () => {
        const err = validateStep(step);
        if (err) {
            Swal.fire("ข้อมูลไม่ครบถ้วน", err, "warning");
            return;
        }
        setStep((s) => Math.min(4, s + 1));
        window.scrollTo({ top: 0, behavior: "smooth" });
    };
    const handleBack = () => {
        setStep((s) => Math.max(1, s - 1));
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleSubmit = async () => {
        if (!acceptedTerms) {
            Swal.fire("แจ้งเตือน", "กรุณายอมรับข้อตกลงและระเบียบของวิทยาลัย", "warning");
            return;
        }
        try {
            setSubmitting(true);
            let slip_url = null;
            let id_card_url = null;
            if (slipFile) slip_url = (await uploadSlip(slipFile)).slip_url;
            if (idCardFile) id_card_url = (await uploadIdCard(idCardFile)).id_card_url;

            await submitApplication({
                applicant: { ...formData, id_card_url },
                study_group_id: Number(selectedGroup.id),
                slip_url,
                payment_method: paymentMethod,
            });

            Swal.fire({
                icon: "success",
                title: "ส่งใบสมัครออนไลน์สำเร็จ!",
                text: "เจ้าหน้าที่จะตรวจสอบใบสมัครของท่าน และแจ้งผลผ่านการตรวจสอบสถานะการสมัคร",
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

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
                <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
                    <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-indigo-600">
                        <ArrowLeft size={18} /> กลับไปหน้าเลือกวิชา
                    </button>
                    <span className="text-sm font-bold text-slate-400">ขั้นตอนที่ {step} จาก 4</span>
                </div>
            </div>

            <div className="mx-auto max-w-3xl px-4 py-8">
                <Stepper steps={STEP_LABELS} currentStep={step} />

                {step === 1 && <StepPersonalInfo formData={formData} setFormData={setFormData} idCardFile={idCardFile} setIdCardFile={setIdCardFile} />}
                {step === 2 && <StepCourseSelection selectedGroup={selectedGroup} onSelectGroup={setSelectedGroup} lockedGroupId={studyGroupId} />}
                {step === 3 && (
                    <StepPayment amount={selectedGroup?.fee || 0} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} slipFile={slipFile} setSlipFile={setSlipFile} />
                )}
                {step === 4 && (
                    <>
                        <StepReview formData={formData} selectedGroup={selectedGroup} paymentMethod={paymentMethod} slipFile={slipFile} idCardFile={idCardFile} />
                        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                            <label className="flex cursor-pointer items-start gap-3 select-none">
                                <input
                                    type="checkbox"
                                    checked={acceptedTerms}
                                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm font-semibold text-slate-700">
                                    ข้าพเจ้าขอรับรองว่าข้อความดังกล่าวข้างต้นเป็นความจริงทุกประการ และยอมรับระเบียบข้อบังคับของวิทยาลัย
                                </span>
                            </label>
                        </div>
                    </>
                )}

                <div className="mt-6 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={handleBack}
                        disabled={step === 1}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <ArrowLeft size={16} /> ย้อนกลับ
                    </button>

                    {step < 4 ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]"
                        >
                            ถัดไป <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
                        >
                            {submitting ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> กำลังส่งใบสมัคร...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={18} /> ยืนยันการส่งใบสมัคร
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
