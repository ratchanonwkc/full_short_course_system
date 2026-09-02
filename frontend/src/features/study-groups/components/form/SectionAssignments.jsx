import VirtualizedCombobox from "../../../../components/common/VirtualizedCombobox";
import { Users, Plus, Settings } from "lucide-react";

const inputClass =
    "w-full rounded-lg border border-slate-300 py-1.5 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30";

/**
 * SectionAssignments
 * -------------------------------------------------------------------------
 * 5. ผู้สอนและสถานที่ (Assignment & Capacity)
 * Flat & Compact UI
 */
export default function SectionAssignments({
    form,
    teacherOptions = [],
    locationOptions = [],
    isQuickAddingLocation = false,
    onTeacherChange,
    onLocationChange,
    onQuickAddLocation,
    onOpenManageLocations,
    onChange,
    onTotalHoursChange,
}) {
    return (
        <div className="space-y-3 pb-3 border-b border-slate-200">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <Users size={14} className="text-emerald-600" />
                    <span>5. ผู้สอน สถานที่ และจำนวนรับ (Assignments & Capacity)</span>
                </div>
            </div>

            {/* ครูผู้สอน */}
            <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                    ครูผู้สอน (Teacher)
                </label>
                <VirtualizedCombobox
                    value={form.teacher_id}
                    onChange={onTeacherChange}
                    options={teacherOptions}
                    placeholder="พิมพ์ค้นหาชื่อครูผู้สอน..."
                    className={inputClass}
                />
            </div>

            {/* สถานที่จัดเรียนร่วม */}
            <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                    สถานที่จัดเรียนร่วม (Location)
                </label>
                <div className="flex items-stretch gap-1.5">
                    <div className="min-w-0 flex-1">
                        <VirtualizedCombobox
                            value={form.joint_location_id}
                            onChange={onLocationChange}
                            options={locationOptions}
                            placeholder="เลือกสถานที่..."
                            className={inputClass}
                        />
                    </div>
                    <button
                        type="button"
                        title="เพิ่มสถานที่ใหม่ด่วน"
                        onClick={onQuickAddLocation}
                        disabled={isQuickAddingLocation}
                        className="flex shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-blue-600 transition hover:bg-blue-100 disabled:opacity-60 shadow-2xs"
                    >
                        <Plus size={14} />
                    </button>
                    <button
                        type="button"
                        title="จัดการรายการสถานที่"
                        onClick={onOpenManageLocations}
                        className="flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-slate-600 transition hover:bg-slate-100 shadow-2xs"
                    >
                        <Settings size={14} />
                    </button>
                </div>
            </div>

            {/* จำนวนที่นั่ง & ชั่วโมงรวม */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                        จำนวนที่นั่งสูงสุด (Max Seats) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={form.max_seats}
                        onChange={onChange("max_seats")}
                        className={inputClass}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                        ชั่วโมงรวม (Total Hours)
                    </label>
                    <input
                        type="number"
                        min="0"
                        value={form.total_hours}
                        onChange={onTotalHoursChange}
                        placeholder="กรอก หรือคำนวณจากชุดวิชา"
                        className={inputClass}
                    />
                </div>
            </div>
        </div>
    );
}
