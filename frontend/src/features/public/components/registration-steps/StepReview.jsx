import { CheckCircle, User, BookOpen, Wallet, IdCard } from "lucide-react";

export default function StepReview({ formData, selectedGroup, paymentMethod, slipFile, idCardFile }) {
    return (
        <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                    <User size={18} className="text-indigo-600" /> ข้อมูลส่วนตัว
                </h3>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <ReviewRow label="ชื่อ-นามสกุล" value={`${formData.title_name}${formData.full_name}`} />
                    <ReviewRow label="เลขบัตรประชาชน" value={formData.citizen_id} mono />
                    <ReviewRow label="เบอร์โทร" value={formData.phone} />
                    <ReviewRow label="วันเกิด" value={formData.birth_date} />
                    <ReviewRow
                        label="ที่อยู่ตามทะเบียนบ้าน"
                        value={[formData.house_no, formData.moo && `หมู่ ${formData.moo}`, formData.subdistrict, formData.district, formData.province, formData.postal_code]
                            .filter(Boolean)
                            .join(" ")}
                        full
                    />
                </dl>
                <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <IdCard size={13} /> {idCardFile ? `แนบรูปบัตรประชาชนแล้ว (${idCardFile.name})` : "ไม่ได้แนบรูปบัตรประชาชน"}
                </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                    <BookOpen size={18} className="text-indigo-600" /> วิชาที่สมัครเรียน
                </h3>
                <p className="text-sm font-bold text-slate-800">{selectedGroup?.group_name}</p>
                <p className="text-sm text-slate-500">
                    รหัส {selectedGroup?.group_code} • {selectedGroup?.is_free ? "ไม่มีค่าใช้จ่าย" : `${selectedGroup?.fee.toLocaleString()} บาท`}
                </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                    <Wallet size={18} className="text-indigo-600" /> การชำระเงิน
                </h3>
                <p className="text-sm text-slate-700">{paymentMethod === "counter_cash" ? "ชำระเงินที่ห้องการเงิน" : "โอนเงินออนไลน์"}</p>
                {paymentMethod !== "counter_cash" && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        {slipFile ? (
                            <>
                                <CheckCircle size={13} className="text-emerald-500" /> แนบสลิปแล้ว: {slipFile.name}
                            </>
                        ) : (
                            "ยังไม่ได้แนบสลิป"
                        )}
                    </p>
                )}
            </section>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                กรุณาตรวจสอบข้อมูลทั้งหมดให้ถูกต้องก่อนกดยืนยันการส่งใบสมัคร
            </div>
        </div>
    );
}

function ReviewRow({ label, value, mono = false, full = false }) {
    return (
        <div className={full ? "sm:col-span-2" : ""}>
            <dt className="text-xs text-slate-400">{label}</dt>
            <dd className={`font-medium text-slate-800 ${mono ? "font-mono" : ""}`}>{value || "-"}</dd>
        </div>
    );
}
