import GroupSubjectsTable from "../GroupSubjectsTable";
import VirtualizedCombobox from "../../../../components/common/VirtualizedCombobox";
import { BookOpen } from "lucide-react";

const inputClass =
    "w-full rounded-lg border border-slate-300 py-1.5 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30";

/**
 * SectionSubjectBuilder
 * -------------------------------------------------------------------------
 * 2. ชุดวิชาและชั่วโมงเรียน (Subjects & Total Hours)
 * Flat & Compact UI
 */
export default function SectionSubjectBuilder({
    subjectsInGroup = [],
    subjectOptions = [],
    allSubjectsCount = 0,
    showAllSubjects = false,
    onToggleShowAllSubjects,
    primarySubjectId = "",
    onPrimarySubjectChange,
    onAddSubject,
    onRemoveSubject,
    onMoeCodeChange,
}) {
    return (
        <div className="space-y-2 pb-3 border-b border-slate-200">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <BookOpen size={14} className="text-indigo-600" />
                    <span>2. ชุดวิชาและชั่วโมงเรียน (Subjects)</span>
                    <span className="text-red-500">*</span>
                </div>
            </div>

            <GroupSubjectsTable
                subjectsInGroup={subjectsInGroup}
                subjectOptions={subjectOptions}
                allSubjectsCount={allSubjectsCount}
                showAllSubjects={showAllSubjects}
                onToggleShowAllSubjects={onToggleShowAllSubjects}
                onAdd={onAddSubject}
                onRemove={onRemoveSubject}
                onMoeCodeChange={onMoeCodeChange}
            />

            {subjectsInGroup.length > 1 && (
                <div className="pt-1">
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                        วิชาหลัก (ใช้คำนวณรหัสและชื่อกลุ่ม)
                    </label>
                    <VirtualizedCombobox
                        value={primarySubjectId}
                        onChange={onPrimarySubjectChange}
                        options={subjectsInGroup.map((s) => ({
                            value: s.subject_id,
                            label: `${s.subject_code} - ${s.name_th} (${s.total_hours} ชม.)`,
                        }))}
                        placeholder="เลือกวิชาหลัก..."
                        className={inputClass}
                    />
                </div>
            )}
        </div>
    );
}
