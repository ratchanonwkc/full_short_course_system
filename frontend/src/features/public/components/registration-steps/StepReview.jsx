import { CheckCircle, User, BookOpen, Wallet, IdCard, MapPin, GraduationCap, PhoneCall } from "lucide-react";

export default function StepReview({ formData, selectedGroup, paymentMethod, slipFile, idCardFile }) {
    const registeredAddress = [
        formData.house_no,
        formData.moo && `หมู่ ${formData.moo}`,
        formData.soi && `ซอย ${formData.soi}`,
        formData.road && `ถนน ${formData.road}`,
        formData.subdistrict && `ต.${formData.subdistrict}`,
        formData.district && `อ.${formData.district}`,
        formData.province && `จ.${formData.province}`,
        formData.postal_code,
    ]
        .filter(Boolean)
        .join(" ");

    const currentAddress = formData.is_same_address
        ? "ใช้ที่อยู่เดียวกับที่อยู่ตามทะเบียนบ้าน"
        : [
            formData.current_house_no,
            formData.current_moo && `หมู่ ${formData.current_moo}`,
            formData.current_soi && `ซอย ${formData.current_soi}`,
            formData.current_road && `ถนน ${formData.current_road}`,
            formData.current_subdistrict && `ต.${formData.current_subdistrict}`,
            formData.current_district && `อ.${formData.current_district}`,
            formData.current_province && `จ.${formData.current_province}`,
            formData.current_postal_code,
        ]
            .filter(Boolean)
            .join(" ");

    return (
        <div className="space-y-5">
            {/* ข้อมูลส่วนตัว */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                    <User size={18} className="text-blue-600" /> ข้อมูลส่วนตัว
                </h3>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <ReviewRow label="คำนำหน้า" value={formData.title_name} />
                    <ReviewRow label="ชื่อ-นามสกุล" value={formData.full_name} />
                    <ReviewRow label="เลขบัตรประชาชน" value={formData.citizen_id} mono />
                    <ReviewRow label="เพศ" value={formData.gender} />
                    <ReviewRow label="วันเกิด" value={formData.birth_date} />
                    <ReviewRow label="สถานภาพสมรส" value={formData.marital_status} />
                    <ReviewRow label="สัญชาติ" value={formData.nationality} />
                    <ReviewRow label="ศาสนา" value={formData.religion} />
                    <ReviewRow label="อาชีพปัจจุบัน" value={formData.occupation} />
                </dl>
                <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
                    {idCardFile ? (
                        (idCardFile.type === "application/pdf" || idCardFile.name?.toLowerCase().endsWith(".pdf")) ? (
                            <span className="text-red-600 flex items-center gap-1.5">
                                <span className="font-bold rounded bg-red-100 px-1.5 py-0.5 text-[10px]">PDF</span>
                                แนบสำเนาบัตรประชาชนแล้ว ({idCardFile.name})
                            </span>
                        ) : (
                            <span className="text-blue-600 flex items-center gap-1.5">
                                <IdCard size={14} />
                                แนบสำเนาบัตรประชาชนแล้ว ({idCardFile.name})
                            </span>
                        )
                    ) : (
                        <span className="text-red-500 font-bold">ยังไม่ได้แนบสำเนาบัตรประชาชน</span>
                    )}
                </p>
            </section>

            {/* ที่อยู่ */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                    <MapPin size={18} className="text-blue-600" /> ที่อยู่
                </h3>
                <dl className="grid grid-cols-1 gap-3 text-sm">
                    <ReviewRow label="ที่อยู่ตามทะเบียนบ้าน" value={registeredAddress} full />
                    <ReviewRow label="ที่อยู่ปัจจุบัน" value={currentAddress} full />
                </dl>
            </section>

            {/* วุฒิการศึกษา */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                    <GraduationCap size={18} className="text-blue-600" /> วุฒิการศึกษา
                </h3>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <ReviewRow label="ระดับการศึกษา" value={formData.highest_education} />
                    <ReviewRow label="สำเร็จการศึกษาจากสถานศึกษา" value={formData.previous_school} />
                    <ReviewRow label="จังหวัดของสถานศึกษา" value={formData.school_province} />
                </dl>
            </section>

            {/* ช่องทางติดต่อ */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                    <PhoneCall size={18} className="text-blue-600" /> ช่องทางติดต่อ
                </h3>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <ReviewRow label="เบอร์โทรศัพท์" value={formData.phone} />
                    <ReviewRow label="อีเมล" value={formData.email} />
                </dl>
            </section>

            {/* วิชาที่สมัครเรียน */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                    <BookOpen size={18} className="text-blue-600" /> วิชาที่สมัครเรียน
                </h3>
                <p className="text-sm font-bold text-slate-800">{selectedGroup?.group_name}</p>
                <p className="text-sm text-slate-500">
                    รหัส {selectedGroup?.group_code} • {selectedGroup?.schedule_description || `${selectedGroup?.total_hours} ชั่วโมง`} • {selectedGroup?.location_name}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                    {selectedGroup?.is_free ? "ไม่มีค่าใช้จ่าย" : `${selectedGroup?.fee.toLocaleString()} บาท`}
                </p>
            </section>

            {/* การชำระเงิน */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                    <Wallet size={18} className="text-blue-600" /> การชำระเงิน
                </h3>
                {selectedGroup?.fee > 0 ? (
                    <>
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
                    </>
                ) : (
                    <p className="text-sm font-semibold text-emerald-600">ไม่มีค่าใช้จ่าย</p>
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