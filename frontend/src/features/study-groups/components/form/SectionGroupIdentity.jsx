import { Zap, Tag } from "lucide-react";
import { GROUP_TYPE_LABELS } from "../../../../utils/groupCode";

const inputClass =
    "w-full rounded-lg border border-slate-300 py-1.5 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30";

const GROUP_TYPE_OPTIONS = Object.entries(GROUP_TYPE_LABELS).map(([value, label]) => ({ value, label }));

/**
 * SectionGroupIdentity
 * -------------------------------------------------------------------------
 * 4. ข้อมูลระบุตัวตนของกลุ่ม (Group Identity & Codes)
 * - กลุ่มที่ (group_no) & ประเภทกลุ่มเรียน (group_type) - Pure buttons
 * - Auto Fill & Code Preview (คำนวณรหัสกลุ่ม, รหัสห้อง, เลข ศธ., ชื่อกลุ่มอัตโนมัติ)
 * - รหัสกลุ่มเรียน (group_code), รหัสห้องเรียน (room_code), ชื่อกลุ่มเรียน (group_name)
 * Flat & Compact UI
 */
export default function SectionGroupIdentity({
    form,
    groupCodePreview,
    isAutoFilling,
    onAutoFill,
    onChange,
}) {
    return (
        <div className="space-y-3 pb-3 border-b border-slate-200">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <Tag size={14} className="text-amber-600" />
                    <span>4. ข้อมูลระบุตัวตนและรหัสกลุ่ม (Group Identity & Codes)</span>
                    <span className="text-red-500">*</span>
                </div>
            </div>

            {/* กลุ่มที่ (group_no) + ประเภทกลุ่มเรียน (group_type) */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                        กลุ่มที่ (Group No.) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={form.group_no}
                        onChange={onChange("group_no")}
                        className={inputClass}
                    />
                </div>
                <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                        ประเภทกลุ่มเรียน
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {GROUP_TYPE_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onChange("group_type")({ target: { value: opt.value } });
                                }}
                                className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition ${
                                    form.group_type === opt.value
                                        ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-500/30 shadow-2xs"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Auto Fill banner + preview */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-2.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900">
                        รหัสกลุ่มเรียน: <span className="font-mono text-blue-700">{form.group_code || groupCodePreview}</span>
                    </span>
                    <button
                        type="button"
                        onClick={onAutoFill}
                        disabled={isAutoFilling}
                        className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-bold text-white shadow-2xs transition hover:bg-amber-600 disabled:opacity-60"
                    >
                        <Zap size={12} />
                        {isAutoFilling ? "กำลังคำนวณ..." : "Auto Fill"}
                    </button>
                </div>
            </div>

            {/* รหัสกลุ่มเรียน & รหัสห้องเรียน */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                        รหัสกลุ่มเรียน (group_code) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={form.group_code}
                        onChange={onChange("group_code")}
                        placeholder="กด Auto Fill หรือพิมพ์เอง"
                        className={`${inputClass} font-mono`}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                        รหัสห้องเรียน (room_code)
                    </label>
                    <input
                        type="text"
                        value={form.room_code}
                        onChange={onChange("room_code")}
                        placeholder="กด Auto Fill หรือพิมพ์เอง"
                        className={`${inputClass} font-mono`}
                    />
                </div>
            </div>

            {/* ชื่อกลุ่มเรียน */}
            <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                    ชื่อกลุ่มเรียน (group_name) <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={form.group_name}
                    onChange={onChange("group_name")}
                    placeholder="เช่น อาหารไทย [ปกติ] (รอบ ช/1)"
                    className={inputClass}
                />
            </div>
        </div>
    );
}
