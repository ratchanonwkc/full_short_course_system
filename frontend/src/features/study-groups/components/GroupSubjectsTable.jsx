import { useState } from "react";
import { Plus, Trash2, BookOpen, Layers, CheckSquare, Square } from "lucide-react";
import VirtualizedCombobox from "../../../components/common/VirtualizedCombobox";

/**
 * GroupSubjectsTable
 * -------------------------------------------------------------------------
 * ตารางแสดง "รายวิชาย่อย" ภายในกลุ่มเรียน (ชุดวิชา)
 * - รองรับการค้นหาตามรหัสวิชา, ชื่อวิชา
 * - รองรับ Toggle "แสดงรายวิชาจากทุกแผนก/สาขา"
 * Flat & Compact UI
 */
export default function GroupSubjectsTable({
    subjectsInGroup = [],
    subjectOptions = [],
    allSubjectsCount = 0,
    showAllSubjects = false,
    onToggleShowAllSubjects,
    onAdd,
    onRemove,
    onMoeCodeChange,
}) {
    const [pickerValue, setPickerValue] = useState("");

    const totalHours = subjectsInGroup.reduce((sum, s) => sum + (Number(s.total_hours) || 0), 0);

    const handlePick = (subjectId) => {
        if (!subjectId) return;
        const opt = subjectOptions.find((o) => String(o.value) === String(subjectId));
        if (!opt) return;
        const alreadyAdded = subjectsInGroup.some((s) => String(s.subject_id) === String(subjectId));
        if (alreadyAdded) {
            setPickerValue("");
            return;
        }
        onAdd?.(opt);
        setPickerValue("");
    };

    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <BookOpen size={13} className="text-blue-600" />
                    <span>รายวิชาในกลุ่ม</span>
                </div>
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                    รวม {totalHours} ชม.
                </span>
            </div>

            <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                    <label className="inline-flex items-center gap-1.5 text-slate-700 font-semibold cursor-pointer select-none hover:text-blue-600 transition">
                        <input
                            type="checkbox"
                            checked={showAllSubjects}
                            onChange={(e) => onToggleShowAllSubjects?.(e.target.checked)}
                            className="h-3.5 w-3.5 rounded accent-blue-600 cursor-pointer"
                        />
                        <span>แสดงรายวิชาจากทุกแผนก/สาขา</span>
                    </label>
                    <span className="text-[10.5px] text-slate-500">
                        ({subjectOptions.length} วิชาพร้อมเลือก {allSubjectsCount > 0 && !showAllSubjects ? `/ ทั้งหมด ${allSubjectsCount}` : ""})
                    </span>
                </div>

                <VirtualizedCombobox
                    value={pickerValue}
                    onChange={handlePick}
                    options={subjectOptions}
                    placeholder="พิมพ์ค้นหารหัสวิชา หรือชื่อวิชา (เช่น 2101-2001, ช่างยนต์)..."
                    emptyText="ไม่พบรายวิชา — ลองติ๊ก 'แสดงรายวิชาจากทุกแผนก/สาขา'"
                    maxResults={200}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 bg-white"
                />
            </div>

            {subjectsInGroup.length === 0 ? (
                <p className="rounded-md bg-white py-2 text-center text-xs text-slate-400 border border-dashed border-slate-200">
                    ยังไม่มีรายวิชาในกลุ่มนี้ — ค้นหาและเลือกวิชาด้านบนเพื่อเพิ่ม
                </p>
            ) : (
                <div className="space-y-1">
                    <div className="grid grid-cols-[1fr_120px_50px_auto] gap-1.5 px-1 text-[10px] font-bold uppercase text-slate-400">
                        <span>รายวิชา</span>
                        <span>เลข ศธ.</span>
                        <span className="text-right">ชม.</span>
                        <span></span>
                    </div>
                    {subjectsInGroup.map((s) => (
                        <div
                            key={s._localId}
                            className="grid grid-cols-[1fr_120px_50px_auto] items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 shadow-2xs"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-slate-800">{s.subject_code}</p>
                                <p className="truncate text-[11px] text-slate-500">{s.name_th}</p>
                            </div>
                            <input
                                type="text"
                                value={s.moe_code || ""}
                                onChange={(e) => onMoeCodeChange?.(s._localId, e.target.value)}
                                placeholder="เช่น 691101001"
                                className="w-full rounded border border-slate-200 px-1.5 py-1 text-[11px] font-mono outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                            />
                            <span className="text-right text-xs font-semibold text-slate-700">{s.total_hours}</span>
                            <button
                                type="button"
                                title="นำออกจากกลุ่ม"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onRemove?.(s._localId);
                                }}
                                className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            >
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}