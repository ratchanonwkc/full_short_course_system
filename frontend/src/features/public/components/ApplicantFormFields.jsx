import { useEffect, useState } from "react";
import { User, MapPin, GraduationCap, PhoneCall, IdCard } from "lucide-react";
import MaskedDateInput from "../../../components/common/MaskedDateInput";
import useThaiAddress from "../../../hooks/useThaiAddress";

const inputCls =
    "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none";
const labelCls = "mb-1.5 block text-sm font-bold text-slate-600";

/**
 * ApplicantFormFields — ฟอร์มประวัติผู้สมัคร 6 ส่วน (ล้อตามคอลัมน์ตาราง applicants)
 * ใช้ร่วมกันทั้งฟอร์มสมัครออนไลน์ (public) และฟอร์ม Walk-in (registrar staff)
 *
 * Address is now structured (house_no / moo / soi / road / subdistrict / district /
 * province / postal_code) instead of a single free-text textarea, for both the
 * registered address and the current address. Postal code lookup runs entirely
 * client-side via useThaiAddress (no server round-trip).
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
    const { ready: addressReady, lookupByPostalCode } = useThaiAddress();
    const [registeredPostalLoading, setRegisteredPostalLoading] = useState(false);
    const [currentPostalLoading, setCurrentPostalLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    };

    // Generic handler for the structured address blocks. `scope` is "registered" or "current".
    const handleAddressField = (scope) => (field) => (e) => {
        const key = scope === "registered" ? field : `current_${field}`;
        setFormData((prev) => ({ ...prev, [key]: e.target.value }));
    };

    const handlePostalChange = (scope) => (e) => {
        const code = e.target.value.replace(/\D/g, "").slice(0, 5);
        const codeKey = scope === "registered" ? "postal_code" : "current_postal_code";
        const setLoading = scope === "registered" ? setRegisteredPostalLoading : setCurrentPostalLoading;

        setFormData((prev) => ({ ...prev, [codeKey]: code }));

        if (code.length === 5 && addressReady) {
            setLoading(true);
            // Client-side lookup — synchronous in practice, wrapped for UX consistency
            const results = lookupByPostalCode(code);
            if (results.length > 0) {
                const first = results[0];
                const prefix = scope === "registered" ? "" : "current_";
                setFormData((prev) => ({
                    ...prev,
                    [codeKey]: code,
                    [`${prefix}subdistrict`]: first.subdistrict,
                    [`${prefix}district`]: first.district,
                    [`${prefix}province`]: first.province,
                }));
            }
            setLoading(false);
        }
    };

    const handleSameAddressToggle = (e) => {
        const checked = e.target.checked;
        setFormData((prev) => ({
            ...prev,
            is_same_address: checked,
            ...(checked
                ? {
                      current_house_no: prev.house_no,
                      current_moo: prev.moo,
                      current_soi: prev.soi,
                      current_road: prev.road,
                      current_subdistrict: prev.subdistrict,
                      current_district: prev.district,
                      current_province: prev.province,
                      current_postal_code: prev.postal_code,
                  }
                : {}),
        }));
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

            {/* ส่วนที่ 3: ที่อยู่ตามทะเบียนบ้าน — Structured fields */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                    <MapPin size={18} className="text-indigo-600" /> [3] ที่อยู่ตามทะเบียนบ้าน
                </h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                        <label className={labelCls}>บ้านเลขที่ *</label>
                        <input type="text" required value={formData.house_no || ""} onChange={handleAddressField("registered")("house_no")} placeholder="เช่น 123/4" className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>หมู่</label>
                        <input type="text" value={formData.moo || ""} onChange={handleAddressField("registered")("moo")} placeholder="เช่น 4" className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>ซอย</label>
                        <input type="text" value={formData.soi || ""} onChange={handleAddressField("registered")("soi")} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>ถนน</label>
                        <input type="text" value={formData.road || ""} onChange={handleAddressField("registered")("road")} className={inputCls} />
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className={labelCls}>
                            รหัสไปรษณีย์ * {registeredPostalLoading && <span className="text-indigo-500">(กำลังค้นหา...)</span>}
                        </label>
                        <input type="text" required maxLength={5} inputMode="numeric" value={formData.postal_code} onChange={handlePostalChange("registered")} placeholder="เช่น 10110" className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>ตำบล/แขวง *</label>
                        <input type="text" required value={formData.subdistrict} onChange={handleAddressField("registered")("subdistrict")} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>อำเภอ/เขต *</label>
                        <input type="text" required value={formData.district} onChange={handleAddressField("registered")("district")} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>จังหวัด *</label>
                        <input type="text" required value={formData.province} onChange={handleAddressField("registered")("province")} className={inputCls} />
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

            {/* ส่วนที่ 5-6: ที่อยู่ปัจจุบัน (structured) + ช่องทางติดต่อ */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                    <PhoneCall size={18} className="text-indigo-600" /> [5-6] ที่อยู่ปัจจุบันและช่องทางติดต่อ
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className={labelCls}>เบอร์โทรศัพท์ *</label>
                        <input type="tel" required maxLength={10} name="phone" value={formData.phone} onChange={handleChange} placeholder="0812345678" className={`${inputCls} font-bold tracking-wider`} />
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 select-none text-sm font-semibold text-slate-600">
                        <input
                            type="checkbox"
                            checked={Boolean(formData.is_same_address)}
                            onChange={handleSameAddressToggle}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        ใช้ที่อยู่เดียวกับที่อยู่ตามทะเบียนบ้าน
                    </label>

                    {!formData.is_same_address && (
                        <>
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                <div>
                                    <label className={labelCls}>บ้านเลขที่ *</label>
                                    <input type="text" required value={formData.current_house_no || ""} onChange={handleAddressField("current")("house_no")} placeholder="เช่น 123/4" className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>หมู่</label>
                                    <input type="text" value={formData.current_moo || ""} onChange={handleAddressField("current")("moo")} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>ซอย</label>
                                    <input type="text" value={formData.current_soi || ""} onChange={handleAddressField("current")("soi")} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>ถนน</label>
                                    <input type="text" value={formData.current_road || ""} onChange={handleAddressField("current")("road")} className={inputCls} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className={labelCls}>
                                        รหัสไปรษณีย์ * {currentPostalLoading && <span className="text-indigo-500">(กำลังค้นหา...)</span>}
                                    </label>
                                    <input type="text" required maxLength={5} inputMode="numeric" value={formData.current_postal_code || ""} onChange={handlePostalChange("current")} placeholder="เช่น 10110" className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>ตำบล/แขวง *</label>
                                    <input type="text" required value={formData.current_subdistrict || ""} onChange={handleAddressField("current")("subdistrict")} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>อำเภอ/เขต *</label>
                                    <input type="text" required value={formData.current_district || ""} onChange={handleAddressField("current")("district")} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>จังหวัด *</label>
                                    <input type="text" required value={formData.current_province || ""} onChange={handleAddressField("current")("province")} className={inputCls} />
                                </div>
                            </div>
                        </>
                    )}
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
    house_no: "",
    moo: "",
    soi: "",
    road: "",
    occupation: "",
    nationality: "ไทย",
    religion: "พุทธ",
    highest_education: "มัธยมศึกษาตอนปลาย (ม.6)",
    previous_school: "",
    school_province: "",
    is_same_address: true,
    current_house_no: "",
    current_moo: "",
    current_soi: "",
    current_road: "",
    phone: "",
    postal_code: "",
    subdistrict: "",
    district: "",
    province: "",
    current_postal_code: "",
    current_subdistrict: "",
    current_district: "",
    current_province: "",
};
