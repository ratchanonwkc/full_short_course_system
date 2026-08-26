import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Search, Loader2, Sparkles, RotateCcw } from "lucide-react";
import Swal from "sweetalert2";
import { trackApplicant } from "../services/publicApi";
import ApplicantTrackingCard from "../components/ApplicantTrackingCard";
import CitizenId13Grid from "../../../components/common/CitizenId13Grid";

export default function ApplicantTrackingPage() {
    const [searchParams] = useSearchParams();
    const cidParam = searchParams.get("citizen_id") || "";

    const [citizenId, setCitizenId] = useState(cidParam);
    const [loading, setLoading] = useState(false);
    const [trackingData, setTrackingData] = useState(null);
    const [selectedEnrollmentId, setSelectedEnrollmentId] = useState(null);

    const fetchTracking = async (cid) => {
        const clean = (cid || "").replace(/\D/g, "");
        if (clean.length !== 13) {
            Swal.fire("ข้อมูลไม่ถูกต้อง", "กรุณากรอกเลขประจำตัวประชาชนให้ครบ 13 หลัก", "warning");
            return;
        }

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
        if (cidParam && cidParam.length === 13) {
            setCitizenId(cidParam);
            fetchTracking(cidParam);
        }
    }, [cidParam]);

    const handleSearch = (e) => {
        e?.preventDefault();
        fetchTracking(citizenId);
    };

    const handleReset = () => {
        setCitizenId("");
        setTrackingData(null);
        setSelectedEnrollmentId(null);
    };

    const activeEnrollment = trackingData?.enrollments?.find(
        (e) => String(e.id) === String(selectedEnrollmentId)
    ) || trackingData?.enrollments?.[0];

    return (
        <div className="min-h-screen bg-slate-50/70 py-10 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 mb-3">
                        <FileText size={14} /> ระบบติดตามสถานะผู้สมัครออนไลน์
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        ตรวจสอบสถานะและแก้ไขข้อมูลใบสมัคร
                    </h1>
                    <p className="mt-2 text-sm text-slate-600 max-w-lg mx-auto">
                        กรอกเลขประจำตัวประชาชน 13 หลักเพื่อตรวจสอบสถานะการสมัคร ชำระเงิน หรือแก้ไขข้อมูลส่วนตัว
                    </p>
                </div>

                {/* 13-Digit Segmented Box Entry */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 shadow-xs mb-6">
                    <form onSubmit={handleSearch} className="flex flex-col items-center gap-5">
                        <div className="w-full max-w-2xl">
                            <label className="mb-2 block text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                กรุณากรอกเลขประจำตัวประชาชน 13 หลัก
                            </label>
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
                        </div>

                        <div className="flex items-center justify-center gap-3">
                            <button
                                type="submit"
                                disabled={loading || citizenId.length !== 13}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                <span>ตรวจสอบสถานะ</span>
                            </button>

                            {citizenId && (
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
                                >
                                    <RotateCcw size={15} />
                                    <span>ล้างข้อมูล</span>
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Tracking Result Card */}
                {trackingData && (
                    <div className="space-y-4">
                        {/* Multi-Enrollment Tabs */}
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

                        {activeEnrollment && (
                            <ApplicantTrackingCard
                                key={activeEnrollment.id}
                                applicant={trackingData.applicant}
                                enrollment={activeEnrollment}
                                onUpdated={() => fetchTracking(citizenId)}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
