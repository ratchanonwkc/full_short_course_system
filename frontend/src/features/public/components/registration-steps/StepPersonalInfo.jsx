import { useRef, useState, useEffect } from "react";
import { IdCard, Upload, CheckCircle2, Image as ImageIcon } from "lucide-react";
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

            <ApplicantFormFields formData={formData} setFormData={setFormData} />

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                    <ImageIcon size={18} className="text-[#0270c7]" /> [6] แนบรูปถ่ายบัตรประชาชน (ทางเลือก / สำหรับอ้างอิง)
                </h3>
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-blue-400 hover:bg-blue-50/40"
                >
                    {preview ? (
                        <>
                            <img src={preview} alt="บัตรประชาชน" className="max-h-44 rounded-lg object-contain shadow-xs" />
                            <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                                <CheckCircle2 size={15} /> แนบไฟล์เรียบร้อย: {idCardFile?.name}
                            </p>
                            <span className="text-xs text-slate-400">คลิกเพื่อเปลี่ยนรูปภาพ</span>
                        </>
                    ) : (
                        <>
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                <Upload size={22} />
                            </div>
                            <p className="text-sm font-semibold text-slate-600">
                                คลิกเพื่ออัปโหลดรูปบัตรประชาชน (JPG, PNG)
                            </p>
                            <p className="text-xs text-slate-400">ขนาดไฟล์ไม่เกิน 5MB</p>
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
        </div>
    );
}