import { useState } from "react";
import { User, MapPin, GraduationCap, PhoneCall, IdCard } from "lucide-react";
import MaskedDateInput from "../../../components/common/MaskedDateInput";
import { lookupPostalCode } from "../services/publicApi";

const inputCls =
    "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none";
const labelCls = "mb-1.5 block text-sm font-bold text-slate-600";

/**
 * ApplicantFormFields — ฟอร์มประวัติผู้สมัคร 6 ส่วน (ล้อตามคอลัมน์ตาราง applicants)
 * ใช้ร่วมกันทั้งฟอร์มสมัครออนไลน์ (public) และฟอร์ม Walk-in (registrar staff)
 *
 * props:
 * - formData, setFormData: ควบคุมจากภายนอก (controlled)
 * - showCitizenIdReader: แสดงปุ่ม "อ่านบัตรประชาชน" (ใช้เฉพาะ registrar walk-in)
 * - onReadSmartCard: callback เมื่อกดปุ่มอ่านบัตร (mock)
 */
export default function ApplicantFormFields({
    formData,
    setFormData,
    showCitizenIdReader = false,
    onReadSmartCard,
}) {
    const [postalLoading, setPostalLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    };

    const handlePostalChange = async (e) => {
        const code = e.target.value.replace(/\D/g, "").slice(0, 5);
        setFormData((prev) => ({ ...prev, postal_code: code }));

        if (code.length === 5) {
            setPostalLoading(true);
            try {
                const results = await lookupPostalCode(code);
                if (results?.length > 0) {
                    const first = results[0];
                    setFormData((prev) => ({
                        ...prev,
                        postal_code: code,
                        subdistrict: first.subdistrict,
                        district: first.district,
                        province: first.province,
                    }));
                }
            } catch {
                /* silent — ผู้ใช้กรอกเองต่อได้ */
            } finally {
                setPostalLoading(false);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* ส่วนที่ 1: คำนำหน้า + ชื่อ + เพศ + วันเกิด */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                    <User size={18} className="text-indigo-600" /> [1] ข้อมูลส่วนตัวผู้สมัคร
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                        <label className={labelCls}>คำนำหน้า *</label>
                        <select name="title_name" value={formData.title_name} onChange={handleChange} className={inputCls} required>
                            <option value="นาย">นาย</option>
                            <option value="นาง">นาง</option>
                            <option value="นางสาว">นางสาว</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className={labelCls}>ชื่อ - นามสกุล *</label>
                        <input type="text" required name="full_name" value={formData.full_name} onChange={handleChange} placeholder="กรอกชื่อและนามสกุลจริง" className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>เพศ *</label>
                        <select name="gender" value={formData.gender} onChange={handleChange} className={inputCls} required>
                            <option value="ชาย">ชาย</option>
                            <option value="หญิง">หญิง</option>
                            <option value="อื่นๆ">อื่นๆ</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>วัน/เดือน/ปีเกิด *</label>
                        <MaskedDateInput
                            value={formData.birth_date}
                            onChange={(iso) => setFormData((prev) => ({ ...prev, birth_date: iso }))}
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>สถานภาพสมรส *</label>
                        <select name="marital_status" value={formData.marital_status} onChange={handleChange} className={inputCls}>
                            <option value="โสด">โสด</option>
                            <option value="สมรส">สมรส</option>
                            <option value="หม้าย">หม้าย</option>
                            <option value="หย่าร้าง">หย่าร้าง</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* ส่วนที่ 2: เลขบัตรประชาชน + อาชีพ */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="flex items-center gap-2 text-base font-black text-[#00204E]">
                        <IdCard size={18} className="text-indigo-600" /> [2] เอกสารยืนยันตัวตนและอาชีพ
                    </h3>
                    {showCitizenIdReader && (
                        <button
                            type="button"
                            onClick={onReadSmartCard}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                            <IdCard size={14} /> อ่านบัตรประชาชน (Smart Card)
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <label className={labelCls}>เลขประจำตัวประชาชน (13 หลัก) *</label>
                        <input
                            type="text"
                            required
                            maxLength={13}
                            inputMode="numeric"
                            name="citizen_id"
                            value={formData.citizen_id}
                            onChange={(e) => handleChange({ target: { name: "citizen_id", value: e.target.value.replace(/\D/g, ""), type: "text" } })}
                            placeholder="กรอกเลขบัตรประชาชน 13 หลัก"
                            className={`${inputCls} font-mono tracking-widest`}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>อาชีพปัจจุบัน</label>
                        <input type="text" name="occupation" value={formData.occupation} onChange={handleChange} placeholder="เช่น นักเรียน, ค้าขาย" className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className={labelCls}>สัญชาติ</label>
                            <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>ศาสนา</label>
                            <input type="text" name="religion" value={formData.religion} onChange={handleChange} className={inputCls} />
                        </div>
                    </div>
                </div>
            </section>

            {/* ส่วนที่ 3: ที่อยู่ตามทะเบียนบ้าน + Address Autofill */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                    <MapPin size={18} className="text-indigo-600" /> [3] ที่อยู่ตามทะเบียนบ้าน
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <label className={labelCls}>ที่อยู่ (บ้านเลขที่ / หมู่ / ซอย / ถนน) *</label>
                        <textarea rows={2} required name="registered_address" value={formData.registered_address} onChange={handleChange} placeholder="กรอกที่อยู่ตามทะเบียนบ้าน" className={`${inputCls} text-sm`} />
                    </div>
                    <div>
                        <label className={labelCls}>รหัสไปรษณีย์ * {postalLoading && <span className="text-indigo-500">(กำลังค้นหา...)</span>}</label>
                        <input type="text" required maxLength={5} inputMode="numeric" value={formData.postal_code} onChange={handlePostalChange} placeholder="เช่น 10110" className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>ตำบล/แขวง *</label>
                        <input type="text" required name="subdistrict" value={formData.subdistrict} onChange={handleChange} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>อำเภอ/เขต *</label>
                        <input type="text" required name="district" value={formData.district} onChange={handleChange} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>จังหวัด *</label>
                        <input type="text" required name="province" value={formData.province} onChange={handleChange} className={inputCls} />
                    </div>
                </div>
            </section>

            {/* ส่วนที่ 4: วุฒิการศึกษา */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                    <GraduationCap size={18} className="text-indigo-600" /> [4] ประวัติการศึกษาสูงสุด
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                        <label className={labelCls}>ระดับการศึกษา</label>
                        <select name="highest_education" value={formData.highest_education} onChange={handleChange} className={inputCls}>
                            <option value="มัธยมศึกษาตอนต้น (ม.3)">มัธยมศึกษาตอนต้น (ม.3)</option>
                            <option value="มัธยมศึกษาตอนปลาย (ม.6)">มัธยมศึกษาตอนปลาย (ม.6)</option>
                            <option value="ประกาศนียบัตรวิชาชีพ (ปวช.)">ประกาศนียบัตรวิชาชีพ (ปวช.)</option>
                            <option value="ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)">ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)</option>
                            <option value="ปริญญาตรีหรือสูงกว่า">ปริญญาตรีหรือสูงกว่า</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>สำเร็จการศึกษาจากสถานศึกษา</label>
                        <input type="text" name="previous_school" value={formData.previous_school} onChange={handleChange} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>จังหวัดของสถานศึกษา</label>
                        <input type="text" name="school_province" value={formData.school_province} onChange={handleChange} className={inputCls} />
                    </div>
                </div>
            </section>

            {/* ส่วนที่ 5-6: ที่อยู่ปัจจุบัน + ช่องทางติดต่อ */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                    <PhoneCall size={18} className="text-indigo-600" /> [5-6] ที่อยู่ปัจจุบันและช่องทางติดต่อ
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className={labelCls}>เบอร์โทรศัพท์ *</label>
                        <input type="tel" required maxLength={10} name="phone" value={formData.phone} onChange={handleChange} placeholder="0812345678" className={`${inputCls} font-bold tracking-wider`} />
                    </div>
                    <div>
                        <label className={labelCls}>ที่อยู่ปัจจุบันที่ติดต่อได้สะดวก *</label>
                        <textarea rows={2} required name="current_address" value={formData.current_address} onChange={handleChange} placeholder="หากเหมือนที่อยู่ตามทะเบียนบ้าน พิมพ์ว่า 'ตามทะเบียนบ้าน' ได้" className={`${inputCls} text-sm`} />
                    </div>
                </div>
            </section>
        </div>
    );
}

export const EMPTY_APPLICANT = {
    citizen_id: "",
    title_name: "นาย",
    full_name: "",
    gender: "ชาย",
    birth_date: "",
    marital_status: "โสด",
    registered_address: "",
    occupation: "",
    nationality: "ไทย",
    religion: "พุทธ",
    highest_education: "มัธยมศึกษาตอนปลาย (ม.6)",
    previous_school: "",
    school_province: "",
    current_address: "",
    phone: "",
    postal_code: "",
    subdistrict: "",
    district: "",
    province: "",
};
