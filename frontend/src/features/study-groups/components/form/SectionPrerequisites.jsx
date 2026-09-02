import VirtualizedCombobox from "../../../../components/common/VirtualizedCombobox";
import { GraduationCap, Calendar } from "lucide-react";

const inputClass =
    "w-full rounded-lg border border-slate-300 py-1.5 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30";

/**
 * SectionPrerequisites
 * -------------------------------------------------------------------------
 * 1. แผนกวิชา & รุ่นการเรียน (Prerequisites & Filters)
 * Flat & Compact UI
 */
export default function SectionPrerequisites({
    majorId,
    onMajorChange,
    majorOptions = [],
    batch = null,
}) {
    return (
        <div className="space-y-2 pb-3 border-b border-slate-200">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <GraduationCap size={14} className="text-blue-600" />
                    <span>1. แผนกวิชา (Department)</span>
                    <span className="text-red-500">*</span>
                </div>
                {batch && (
                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        <Calendar size={11} className="text-slate-400" />
                        <span>{batch.batch_name}</span>
                        {batch.academic_year && <span>(ปี {batch.academic_year})</span>}
                    </div>
                )}
            </div>

            <VirtualizedCombobox
                value={majorId}
                onChange={onMajorChange}
                options={majorOptions}
                placeholder="เลือกแผนกวิชา..."
                className={inputClass}
            />
            {!majorId && (
                <p className="text-[11px] text-amber-600 font-medium">
                    * เลือกแผนกวิชาก่อนเพื่อกรองรายวิชาและสร้างรหัสห้อง/เลข ศธ.
                </p>
            )}
        </div>
    );
}
