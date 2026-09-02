import MaskedDateInput from "../../../../components/common/MaskedDateInput";
import { Clock, Zap } from "lucide-react";
import { ALL_STUDY_DAYS, WEEKDAYS, WEEKENDS } from "../../../../utils/groupCode";

const inputClass =
    "w-full rounded-lg border border-slate-300 py-1.5 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30";

/**
 * SectionScheduleTimes
 * -------------------------------------------------------------------------
 * 3. กำหนดการ วัน-เวลาเรียน (Schedule & Times)
 * - Pure State-driven buttons สำหรับวันเรียน 7 วัน ป้องกัน Focus Snap / Scroll Jumping
 * Flat & Compact UI
 */
export default function SectionScheduleTimes({
    form,
    timeSlotOptions = [],
    isEditMode = false,
    batch = null,
    onTimeSlotChange,
    onCustomTimeChange,
    onToggleStudyDay,
    onSetStudyDays,
    onScheduleDescChange,
    onAutoBuildScheduleDesc,
    onDateChange,
}) {
    return (
        <div className="space-y-3 pb-3 border-b border-slate-200">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <Clock size={14} className="text-sky-600" />
                    <span>3. กำหนดการและรอบเวลาเรียน (Schedule & Times)</span>
                    <span className="text-red-500">*</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">ระบบ 24 ชม. (HH:mm)</span>
            </div>

            {/* Row 1: รอบเรียน (Shift) + ช่วงเวลาเรียนแบบ 24 ชม. */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                        รอบการเรียน (Shift) <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={form.time_slot_id || ""}
                        onChange={onTimeSlotChange}
                        className={inputClass}
                    >
                        <option value="">-- เลือกรอบเรียน --</option>
                        {timeSlotOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                        เวลาเริ่มเรียน (24 ชม.)
                    </label>
                    <input
                        type="time"
                        step="60"
                        value={form.custom_start_time || ""}
                        onChange={onCustomTimeChange("custom_start_time")}
                        className={`${inputClass} [color-scheme:light] font-mono`}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                        เวลาสิ้นสุด (24 ชม.)
                    </label>
                    <input
                        type="time"
                        step="60"
                        value={form.custom_end_time || ""}
                        onChange={onCustomTimeChange("custom_end_time")}
                        className={`${inputClass} [color-scheme:light] font-mono`}
                    />
                </div>
            </div>

            {/* Row 2: วันเรียน (7 วัน + 4 ปุ่มลัด) - Pure Buttons */}
            <div className="space-y-1.5 rounded-lg bg-slate-50 p-2.5 border border-slate-200/80">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <label className="text-xs font-bold text-slate-700">
                        วันเรียนในสัปดาห์ (Study Days)
                    </label>
                    <div className="flex flex-wrap items-center gap-1">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                onSetStudyDays(WEEKDAYS);
                            }}
                            className="rounded border border-blue-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 transition shadow-2xs"
                        >
                            จันทร์ - ศุกร์
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                onSetStudyDays(WEEKENDS);
                            }}
                            className="rounded border border-purple-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-purple-700 hover:bg-purple-50 transition shadow-2xs"
                        >
                            เสาร์ - อาทิตย์
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                onSetStudyDays(ALL_STUDY_DAYS);
                            }}
                            className="rounded border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 transition shadow-2xs"
                        >
                            ทุกวัน
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                onSetStudyDays([]);
                            }}
                            className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 transition shadow-2xs"
                        >
                            ล้าง
                        </button>
                    </div>
                </div>

                {/* 7 Day Pure Buttons */}
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 md:grid-cols-7 pt-0.5">
                    {ALL_STUDY_DAYS.map((day) => {
                        const isSelected = (form.study_days || []).includes(day);
                        return (
                            <button
                                key={day}
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onToggleStudyDay(day);
                                }}
                                className={`flex items-center justify-center rounded-md border py-1.5 px-1 text-xs font-semibold transition-all ${
                                    isSelected
                                        ? "border-blue-600 bg-blue-600 text-white shadow-2xs"
                                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                                }`}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Row 3: รูปแบบวันเรียน (คำอธิบาย) */}
            <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                    รูปแบบวันเรียน (คำอธิบายสำหรับตารางประกาศ)
                </label>
                <div className="flex items-center gap-1.5">
                    <input
                        type="text"
                        value={form.study_dates_description || ""}
                        onChange={onScheduleDescChange}
                        placeholder="เช่น เรียนวันจันทร์ - ศุกร์ เวลา 08:30 - 12:30 น."
                        className={inputClass}
                    />
                    <button
                        type="button"
                        onClick={onAutoBuildScheduleDesc}
                        title="สร้างข้อความอัตโนมัติจากวันและเวลาที่เลือก"
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition shadow-2xs"
                    >
                        <Zap size={12} />
                        สร้างอัตโนมัติ
                    </button>
                </div>
            </div>

            {/* Row 4: ช่วงวันที่ (วันเริ่มเรียน, วันจบเรียน, วันเปิดรับสมัคร, วันปิดรับสมัคร) */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 pt-1">
                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">วันเริ่มเรียน</label>
                    <MaskedDateInput
                        value={form.start_date}
                        onChange={onDateChange("start_date")}
                        calendar="BE"
                        className={inputClass}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">วันจบเรียน</label>
                    <MaskedDateInput
                        value={form.end_date}
                        onChange={onDateChange("end_date")}
                        calendar="BE"
                        className={inputClass}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">วันเปิดรับสมัคร</label>
                    <MaskedDateInput
                        value={form.registration_start_date}
                        onChange={onDateChange("registration_start_date")}
                        calendar="BE"
                        className={inputClass}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">วันปิดรับสมัคร</label>
                    <MaskedDateInput
                        value={form.registration_end_date}
                        onChange={onDateChange("registration_end_date")}
                        calendar="BE"
                        className={inputClass}
                    />
                </div>
            </div>
            {!isEditMode && batch && (
                <p className="-mt-1 text-[11px] text-slate-400">
                    * วันที่เริ่มต้นดึงมาจากรุ่นการเรียน "{batch.batch_name}" สามารถปรับเปลี่ยนได้
                </p>
            )}
        </div>
    );
}
