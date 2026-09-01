import { useRef, useState, useEffect } from "react";
import { Upload, CheckCircle2, FileText, Image as ImageIcon, AlertCircle } from "lucide-react";
import Swal from "sweetalert2";
import ApplicantFormFields from "../ApplicantFormFields";
import CourseSummaryBanner from "../CourseSummaryBanner";

export default function StepPersonalInfo({ selectedGroup, formData, setFormData, idCardFile, setIdCardFile }) {
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);

    const isPdf = idCardFile?.type === "application/pdf" || Boolean(idCardFile?.name?.toLowerCase().endsWith(".pdf"));

    useEffect(() => {
        if (!idCardFile || isPdf) {
            setPreview(null);
            return;
        }
        const url = URL.createObjectURL(idCardFile);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [idCardFile, isPdf]);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg", "application/pdf"];
        const fileExt = file.name.split(".").pop().toLowerCase();
        const isExtValid = ["jpg", "jpeg", "png", "webp", "pdf"].includes(fileExt);
        const isMimeValid = !file.type || allowedTypes.includes(file.type.toLowerCase());

        if (!isExtValid || !isMimeValid) {
            Swal.fire("รูปแบบไฟล์ไม่ถูกต้อง", "รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP) หรือไฟล์ PDF เท่านั้น", "error");
            e.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            Swal.fire("ไฟล์มีขนาดใหญ่เกินไป", "ขนาดไฟล์ต้องไม่เกิน 5MB", "warning");
            e.target.value = "";
            return;
        }

        setIdCardFile(file);
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return "";
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    return (
        <div className="space-y-6">
            <CourseSummaryBanner group={selectedGroup} />

            <ApplicantFormFields formData={formData} setFormData={setFormData} />

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="flex items-center gap-2 text-base font-black text-[#00204E]">
                        <FileText size={18} className="text-[#0270c7]" />
                        [6] แนบสำเนาบัตรประชาชน (รูปภาพหรือ PDF)
                        <span className="text-red-500">*</span>
                    </h3>
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                        จำเป็นต้องแนบ
                    </span>
                </div>

                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition ${
                        idCardFile
                            ? "border-emerald-300 bg-emerald-50/20 hover:bg-emerald-50/40"
                            : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/40"
                    }`}
                >
                    {idCardFile ? (
                        isPdf ? (
                            /* PDF Preview Card */
                            <div className="flex flex-col items-center gap-2 py-2">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 shadow-xs">
                                    <FileText size={32} />
                                </div>
                                <div className="text-center">
                                    <p className="max-w-md truncate font-semibold text-slate-800 text-sm">{idCardFile.name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        เอกสาร PDF • {formatFileSize(idCardFile.size)}
                                    </p>
                                </div>
                                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                                    <CheckCircle2 size={16} /> แนบไฟล์ PDF เรียบร้อยแล้ว
                                </p>
                                <span className="mt-1 text-xs text-blue-600 hover:underline">คลิกเพื่อเปลี่ยนไฟล์ใหม่</span>
                            </div>
                        ) : (
                            /* Image Preview Card */
                            <div className="flex flex-col items-center gap-2">
                                {preview && (
                                    <img
                                        src={preview}
                                        alt="สำเนาบัตรประชาชน"
                                        className="max-h-48 max-w-full rounded-lg object-contain border border-slate-200 shadow-xs"
                                    />
                                )}
                                <div className="text-center">
                                    <p className="max-w-md truncate font-semibold text-slate-800 text-sm">{idCardFile.name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        รูปภาพ • {formatFileSize(idCardFile.size)}
                                    </p>
                                </div>
                                <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                                    <CheckCircle2 size={16} /> แนบรูปภาพเรียบร้อยแล้ว
                                </p>
                                <span className="text-xs text-blue-600 hover:underline">คลิกเพื่อเปลี่ยนรูปภาพใหม่</span>
                            </div>
                        )
                    ) : (
                        <>
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                <Upload size={22} />
                            </div>
                            <p className="text-sm font-semibold text-slate-700">
                                คลิกเพื่ออัปโหลดสำเนาบัตรประชาชน <span className="text-red-500">(รูปภาพ หรือ PDF)</span>
                            </p>
                            <p className="text-xs text-slate-400">รองรับไฟล์ JPG, PNG, WEBP หรือ PDF (ขนาดไม่เกิน 5MB)</p>
                        </>
                    )}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                />
            </section>
        </div>
    );
}