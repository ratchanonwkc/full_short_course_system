import { useRef, useState, useEffect } from "react";
import { IdCard, Upload, CheckCircle2 } from "lucide-react";
import ApplicantFormFields from "../ApplicantFormFields";
import CourseSummaryBanner from "../CourseSummaryBanner";

export default function StepPersonalInfo({ selectedGroup, formData, setFormData, idCardFile, setIdCardFile }) {
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!idCardFile) {
            setPreview(null);
            return;
        }
        const url = URL.createObjectURL(idCardFile);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [idCardFile]);

    return (
        <div className="space-y-6">
            <CourseSummaryBanner group={selectedGroup} />

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                    <IdCard size={18} className="text-indigo-600" /> รูปถ่ายบัตรประชาชน (สำหรับอ้างอิง)
                </h3>
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40"
                >
                    {preview ? (
                        <>
                            <img src={preview} alt="บัตรประชาชน" className="max-h-48 rounded-lg object-contain" />
                            <p className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
                                <CheckCircle2 size={14} /> แนบไฟล์แล้ว: {idCardFile?.name}
                            </p>
                        </>
                    ) : (
                        <>
                            <Upload size={28} className="text-slate-400" />
                            <p className="text-sm font-semibold text-slate-500">คลิกเพื่ออัปโหลดรูปบัตรประชาชน (JPG, PNG)</p>
                        </>
                    )}
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={(e) => e.target.files?.[0] && setIdCardFile(e.target.files[0])}
                    className="hidden"
                />
            </section>

            <ApplicantFormFields formData={formData} setFormData={setFormData} />
        </div>
    );
}