import { useState, useRef, useEffect } from "react";
import { User, MapPin, GraduationCap, PhoneCall, IdCard, CheckCircle2, Loader2, Sparkles, AlertCircle } from "lucide-react";
import Swal from "sweetalert2";
import BirthDateField from "./BirthDateField";
import ThaiAddressTypeahead from "../../../components/common/ThaiAddressTypeahead";
import { lookupApplicantByCitizenId } from "../services/publicApi";

const inputCls =
    "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition";
const labelCls = "mb-1.5 block text-sm font-bold text-slate-600";

/**
 * 13-Cell Segmented Citizen ID Input Component
 * Groups digits as: 1 - 4 - 5 - 2 - 1
 */
function CitizenId13Grid({ value = "", onChange, disabled = false, autoFocus = false }) {
    const inputRef = useRef(null);
    const digits = (value || "").replace(/\D/g, "").slice(0, 13).split("");
    const [isFocused, setIsFocused] = useState(false);

    // Grouping pattern: [1, 4, 5, 2, 1]
    // Indices: 0 | 1,2,3,4 | 5,6,7,8,9 | 10,11 | 12
    const cellGroups = [
        [0],
        [1, 2, 3, 4],
        [5, 6, 7, 8, 9],
        [10, 11],
        [12],
    ];

    const handleContainerClick = () => {
        if (!disabled && inputRef.current) {
            inputRef.current.focus();
        }
    };

    return (
        <div className="w-full">
            {/* Hidden native input overlaid or focused for seamless mobile/desktop typing & paste */}
            <div
                onClick={handleContainerClick}
                className={`relative flex flex-wrap items-center justify-center gap-1 sm:gap-2 rounded-2xl border p-3 sm:p-4 cursor-text transition-all select-none ${
                    isFocused
                        ? "border-blue-500 bg-blue-50/20 ring-4 ring-blue-500/10"
                        : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                }`}
            >
                <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={13}
                    value={value}
                    onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, "").slice(0, 13);
                        onChange(cleaned);
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    disabled={disabled}
                    autoFocus={autoFocus}
                    className="absolute inset-0 h-full w-full opacity-0 cursor-text z-10"
                    aria-label="เลขประจำตัวประชาชน 13 หลัก"
                />

                {cellGroups.map((group, groupIdx) => (
                    <div key={groupIdx} className="flex items-center gap-1 sm:gap-1.5">
                        {group.map((cellIdx) => {
                            const char = digits[cellIdx] || "";
                            const isCurrent = isFocused && cellIdx === digits.length;
                            const isFilled = Boolean(char);

                            return (
                                <div
                                    key={cellIdx}
                                    className={`flex h-10 w-7 sm:h-12 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl border text-base sm:text-lg font-black font-mono transition-all ${
                                        isCurrent
                                            ? "border-[#0270c7] bg-white ring-2 ring-blue-400 text-[#0270c7] scale-105 shadow-sm"
                                            : isFilled
                                            ? "border-slate-400 bg-white text-slate-800 shadow-xs"
                                            : "border-slate-200 bg-white/80 text-slate-300"
                                    }`}
                                >
                                    {char || (isCurrent ? <span className="animate-pulse text-[#0270c7]">|</span> : "")}
                                </div>
                            );
                        })}
                        {groupIdx < cellGroups.length - 1 && (
                            <span className="text-slate-300 font-bold px-0.5 sm:px-1">-</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * ApplicantFormFields — ฟอร์มประวัติผู้สมัครแบบ "Citizen ID First & Auto-Lookup"
 * 
 * Flow การทำงาน:
 * 1. ผู้สมัคร/เจ้าหน้าที่กรอกเลขบัตรประชาชน 13 หลักเป็นขั้นตอนแรก
 * 2. เมื่อกรอกครบ 13 หลัก ระบบจะค้นหาประวัติในฐานข้อมูล Supabase อัตโนมัติ:
 *    - ถ้านักศึกษาเก่า: แจ้งเตือนยืนยันโหลดข้อมูลเดิม ถ้าตกลงจะกรอกข้อมูลทั้งหมดอัตโนมัติ
 *    - ถ้านักศึกษาใหม่: ปลดล็อคฟิลด์ข้อมูลให้กรอกข้อมูลใหม่
 */
export default function ApplicantFormFields({
    formData,
    setFormData,
    showCitizenIdReader = false,
    onReadSmartCard,
}) {
    const lastCheckedCidRef = useRef(null);
    const [isSearching, setIsSearching] = useState(false);
    const [lookupResult, setLookupResult] = useState(null); // 'found_old' | 'not_found_new' | null

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    };

    const handleAddressField = (scope) => (field) => (e) => {
        const key = scope === "registered" ? field : `current_${field}`;
        setFormData((prev) => ({ ...prev, [key]: e.target.value }));
    };

    const handleCitizenIdInput = async (cid) => {
        setFormData((prev) => ({ ...prev, citizen_id: cid }));

        if (cid.length === 13 && cid !== lastCheckedCidRef.current) {
            lastCheckedCidRef.current = cid;
            setIsSearching(true);
            try {
                const data = await lookupApplicantByCitizenId(cid);

                if (data) {
                    setLookupResult("found_old");
                    const fullName = `${data.title_name || ""}${data.full_name || ""}`;
                    
                    Swal.fire({
                        title: "พบข้อมูลในระบบ (นักศึกษาเก่า)",
                        html: `พบประวัติของคุณ <b>${fullName}</b> ในระบบของวิทยาลัย<br/><span class="text-sm text-slate-500 mt-2 block">ต้องการนำข้อมูลเดิมมาใช้เพื่อความสะดวกรวดเร็วหรือไม่?</span>`,
                        icon: "info",
                        showCancelButton: true,
                        confirmButtonColor: "#0270c7",
                        cancelButtonColor: "#64748b",
                        confirmButtonText: "นำข้อมูลเดิมมาใช้",
                        cancelButtonText: "กรอกข้อมูลใหม่",
                        reverseButtons: true,
                    }).then((result) => {
                        if (result.isConfirmed) {
                            setFormData((prev) => ({
                                ...prev,
                                citizen_id: cid,
                                student_type: "นักศึกษาเก่า",
                                title_name: data.title_name || prev.title_name || "นาย",
                                full_name: data.full_name || prev.full_name || "",
                                gender: data.gender || prev.gender || "ชาย",
                                birth_date: data.birth_date ? data.birth_date.slice(0, 10) : prev.birth_date,
                                marital_status: data.marital_status || prev.marital_status || "โสด",
                                house_no: data.house_no || "",
                                moo: data.moo || "",
                                soi: data.soi || "",
                                road: data.road || "",
                                subdistrict: data.subdistrict || "",
                                district: data.district || "",
                                province: data.province || "",
                                postal_code: data.postal_code || "",
                                occupation: data.occupation || "",
                                nationality: data.nationality || "ไทย",
                                religion: data.religion || "พุทธ",
                                highest_education:
                                    data.highest_education || prev.highest_education || "มัธยมศึกษาตอนปลาย (ม.6)",
                                previous_school: data.previous_school || "",
                                school_province: data.school_province || "",
                                phone: data.phone || "",
                                email: data.email || prev.email || "",
                                is_same_address: data.is_same_address !== false,
                                current_house_no: data.current_house_no || "",
                                current_moo: data.current_moo || "",
                                current_soi: data.current_soi || "",
                                current_road: data.current_road || "",
                                current_subdistrict: data.current_subdistrict || "",
                                current_district: data.current_district || "",
                                current_province: data.current_province || "",
                                current_postal_code: data.current_postal_code || "",
                            }));

                            Swal.fire({
                                toast: true,
                                position: "top-end",
                                icon: "success",
                                title: "นำข้อมูลเดิมมาใช้เรียบร้อยแล้ว",
                                showConfirmButton: false,
                                timer: 2500,
                                timerProgressBar: true,
                            });
                        } else {
                            setFormData((prev) => ({
                                ...prev,
                                student_type: "นักศึกษาใหม่",
                            }));
                        }
                    });
                } else {
                    setLookupResult("not_found_new");
                    setFormData((prev) => ({
                        ...prev,
                        student_type: "นักศึกษาใหม่",
                    }));
                }
            } catch {
                setLookupResult("not_found_new");
                setFormData((prev) => ({
                    ...prev,
                    student_type: "นักศึกษาใหม่",
                }));
            } finally {
                setIsSearching(false);
            }
        } else if (cid.length < 13) {
            lastCheckedCidRef.current = null;
            setLookupResult(null);
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

    const cidLength = (formData.citizen_id || "").length;
    const isCidComplete = cidLength === 13;

    return (
        <div className="space-y-6">
            {/* ══════════════════════════════════════════════════════════════════════
                ส่วนที่ 1 (GATEWAY): เลขประจำตัวประชาชน 13 หลัก & ค้นหาอัตโนมัติ
            ══════════════════════════════════════════════════════════════════════ */}
            <section className="rounded-2xl border-2 border-blue-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold text-sm">
                            1
                        </div>
                        <div>
                            <h3 className="text-base font-black text-[#00204E] flex items-center gap-2">
                                <IdCard size={18} className="text-[#0270c7]" /> เลขประจำตัวประชาชน (Citizen ID) *
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                กรอกเลขประจำตัวประชาชน 13 หลักเพื่อตรวจสอบประวัติในระบบ
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isSearching ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#0270c7] animate-pulse">
                                <Loader2 size={13} className="animate-spin" /> กำลังตรวจสอบข้อมูล...
                            </span>
                        ) : formData.student_type === "นักศึกษาเก่า" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={13} /> นักศึกษาเก่า (พบประวัติเดิม)
                            </span>
                        ) : isCidComplete ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600 border border-blue-100">
                                <Sparkles size={13} /> นักศึกษาใหม่
                            </span>
                        ) : (
                            <span className="text-xs font-bold text-slate-400">
                                กรอกแล้ว {cidLength}/13 หลัก
                            </span>
                        )}

                        {showCitizenIdReader && (
                            <button
                                type="button"
                                onClick={onReadSmartCard}
                                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs"
                            >
                                <IdCard size={14} /> อ่านบัตรประชาชน (Smart Card)
                            </button>
                        )}
                    </div>
                </div>

                {/* 13-Cell Segmented Input */}
                <CitizenId13Grid
                    value={formData.citizen_id || ""}
                    onChange={handleCitizenIdInput}
                    autoFocus={!formData.citizen_id}
                />

                {!isCidComplete && (
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                        <AlertCircle size={13} /> ระบบจะตรวจสอบประวัตินักศึกษาเก่าอัตโนมัติเมื่อกรอกครบ 13 หลัก
                    </p>
                )}
            </section>

            {/* ══════════════════════════════════════════════════════════════════════
                ส่วนที่ 2: ข้อมูลส่วนตัวผู้สมัคร
            ══════════════════════════════════════════════════════════════════════ */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                    <User size={18} className="text-[#0270c7]" /> [2] ข้อมูลส่วนตัวผู้สมัคร
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                        <label className={labelCls}>คำนำหน้า *</label>
                        <select
                            name="title_name"
                            value={formData.title_name || "นาย"}
                            onChange={handleChange}
                            className={inputCls}
                            required
                        >
                            <option value="นาย">นาย</option>
                            <option value="นาง">นาง</option>
                            <option value="นางสาว">นางสาว</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className={labelCls}>ชื่อ - นามสกุล *</label>
                        <input
                            type="text"
                            required
                            name="full_name"
                            value={formData.full_name || ""}
                            onChange={handleChange}
                            placeholder="กรอกชื่อและนามสกุลจริง (ไม่ต้องใส่คำนำหน้า)"
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>เพศ *</label>
                        <select
                            name="gender"
                            value={formData.gender || "ชาย"}
                            onChange={handleChange}
                            className={inputCls}
                            required
                        >
                            <option value="ชาย">ชาย</option>
                            <option value="หญิง">หญิง</option>
                            <option value="อื่นๆ">อื่นๆ</option>
                        </select>
                    </div>
                    <BirthDateField
                        value={formData.birth_date || ""}
                        onChange={(iso) => setFormData((prev) => ({ ...prev, birth_date: iso }))}
                    />
                    <div>
                        <label className={labelCls}>สถานภาพสมรส *</label>
                        <select
                            name="marital_status"
                            value={formData.marital_status || "โสด"}
                            onChange={handleChange}
                            className={inputCls}
                        >
                            <option value="โสด">โสด</option>
                            <option value="สมรส">สมรส</option>
                            <option value="หม้าย">หม้าย</option>
                            <option value="หย่าร้าง">หย่าร้าง</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>อาชีพปัจจุบัน</label>
                        <input
                            type="text"
                            name="occupation"
                            value={formData.occupation || ""}
                            onChange={handleChange}
                            placeholder="เช่น นักเรียน, รับจ้าง, ธุรกิจส่วนตัว"
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>สัญชาติ</label>
                        <input
                            type="text"
                            name="nationality"
                            value={formData.nationality || "ไทย"}
                            onChange={handleChange}
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>ศาสนา</label>
                        <input
                            type="text"
                            name="religion"
                            value={formData.religion || "พุทธ"}
                            onChange={handleChange}
                            className={inputCls}
                        />
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════════════
                ส่วนที่ 3: ที่อยู่ตามทะเบียนบ้าน
            ══════════════════════════════════════════════════════════════════════ */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                    <MapPin size={18} className="text-[#0270c7]" /> [3] ที่อยู่ตามทะเบียนบ้าน
                </h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                        <label className={labelCls}>บ้านเลขที่ *</label>
                        <input
                            id="registered_house_no"
                            type="text"
                            required
                            value={formData.house_no || ""}
                            onChange={handleAddressField("registered")("house_no")}
                            placeholder="เช่น 123/4"
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>หมู่</label>
                        <input
                            type="text"
                            value={formData.moo || ""}
                            onChange={handleAddressField("registered")("moo")}
                            placeholder="เช่น 4"
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>ซอย</label>
                        <input
                            type="text"
                            value={formData.soi || ""}
                            onChange={handleAddressField("registered")("soi")}
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>ถนน</label>
                        <input
                            type="text"
                            value={formData.road || ""}
                            onChange={handleAddressField("registered")("road")}
                            className={inputCls}
                        />
                    </div>
                </div>
                <div className="mt-4">
                    <ThaiAddressTypeahead
                        subdistrict={formData.subdistrict || ""}
                        district={formData.district || ""}
                        province={formData.province || ""}
                        postalCode={formData.postal_code || ""}
                        onChangeField={(field, val) =>
                            setFormData((prev) => ({ ...prev, [field]: val }))
                        }
                        onSelectAddress={(addr) =>
                            setFormData((prev) => ({
                                ...prev,
                                subdistrict: addr.subdistrict,
                                district: addr.district,
                                province: addr.province,
                                postal_code: addr.postal_code,
                            }))
                        }
                        nextFocusSelector="#registered_house_no"
                    />
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════════════
                ส่วนที่ 4: ประวัติการศึกษาสูงสุด
            ══════════════════════════════════════════════════════════════════════ */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                    <GraduationCap size={18} className="text-[#0270c7]" /> [4] ประวัติการศึกษาสูงสุด
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                        <label className={labelCls}>ระดับการศึกษา</label>
                        <select
                            name="highest_education"
                            value={formData.highest_education || "มัธยมศึกษาตอนปลาย (ม.6)"}
                            onChange={handleChange}
                            className={inputCls}
                        >
                            <option value="มัธยมศึกษาตอนต้น (ม.3)">มัธยมศึกษาตอนต้น (ม.3)</option>
                            <option value="มัธยมศึกษาตอนปลาย (ม.6)">มัธยมศึกษาตอนปลาย (ม.6)</option>
                            <option value="ประกาศนียบัตรวิชาชีพ (ปวช.)">ประกาศนียบัตรวิชาชีพ (ปวช.)</option>
                            <option value="ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)">ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)</option>
                            <option value="ปริญญาตรีหรือสูงกว่า">ปริญญาตรีหรือสูงกว่า</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>สำเร็จการศึกษาจากสถานศึกษา</label>
                        <input
                            type="text"
                            name="previous_school"
                            value={formData.previous_school || ""}
                            onChange={handleChange}
                            placeholder="เช่น โรงเรียนอุดรพิทยานุกูล"
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>จังหวัดของสถานศึกษา</label>
                        <input
                            type="text"
                            name="school_province"
                            value={formData.school_province || ""}
                            onChange={handleChange}
                            placeholder="เช่น อุดรธานี"
                            className={inputCls}
                        />
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════════════
                ส่วนที่ 5: ที่อยู่ปัจจุบันและช่องทางติดต่อ
            ══════════════════════════════════════════════════════════════════════ */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                    <PhoneCall size={18} className="text-[#0270c7]" /> [5] ที่อยู่ปัจจุบันและช่องทางติดต่อ
                </h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className={labelCls}>เบอร์โทรศัพท์ *</label>
                            <input
                                type="tel"
                                required
                                maxLength={10}
                                name="phone"
                                value={formData.phone || ""}
                                onChange={handleChange}
                                placeholder="0812345678"
                                className={`${inputCls} font-bold tracking-wider`}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>อีเมล (สำหรับส่งใบเสร็จ/ยืนยัน)</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email || ""}
                                onChange={handleChange}
                                placeholder="name@example.com"
                                className={inputCls}
                            />
                        </div>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 select-none text-sm font-semibold text-slate-600 pt-1">
                        <input
                            type="checkbox"
                            checked={Boolean(formData.is_same_address)}
                            onChange={handleSameAddressToggle}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        ใช้ที่อยู่เดียวกับที่อยู่ตามทะเบียนบ้าน
                    </label>

                    {!formData.is_same_address && (
                        <>
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 pt-2">
                                <div>
                                    <label className={labelCls}>บ้านเลขที่ *</label>
                                    <input
                                        id="current_house_no"
                                        type="text"
                                        required
                                        value={formData.current_house_no || ""}
                                        onChange={handleAddressField("current")("house_no")}
                                        placeholder="เช่น 123/4"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>หมู่</label>
                                    <input
                                        type="text"
                                        value={formData.current_moo || ""}
                                        onChange={handleAddressField("current")("moo")}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>ซอย</label>
                                    <input
                                        type="text"
                                        value={formData.current_soi || ""}
                                        onChange={handleAddressField("current")("soi")}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>ถนน</label>
                                    <input
                                        type="text"
                                        value={formData.current_road || ""}
                                        onChange={handleAddressField("current")("road")}
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <ThaiAddressTypeahead
                                    subdistrict={formData.current_subdistrict || ""}
                                    district={formData.current_district || ""}
                                    province={formData.current_province || ""}
                                    postalCode={formData.current_postal_code || ""}
                                    onChangeField={(field, val) =>
                                        setFormData((prev) => ({ ...prev, [`current_${field}`]: val }))
                                    }
                                    onSelectAddress={(addr) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            current_subdistrict: addr.subdistrict,
                                            current_district: addr.district,
                                            current_province: addr.province,
                                            current_postal_code: addr.postal_code,
                                        }))
                                    }
                                    nextFocusSelector="#current_house_no"
                                />
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
    student_type: "นักศึกษาใหม่",
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
    email: "",
    postal_code: "",
    subdistrict: "",
    district: "",
    province: "",
    current_postal_code: "",
    current_subdistrict: "",
    current_district: "",
    current_province: "",
};
