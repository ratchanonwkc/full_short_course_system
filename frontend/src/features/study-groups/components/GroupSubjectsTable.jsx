import { useState } from "react";
import { Plus, Trash2, BookOpen } from "lucide-react";
import VirtualizedCombobox from "../../../components/common/VirtualizedCombobox";

/**
 * GroupSubjectsTable
 * -------------------------------------------------------------------------
 * ตารางแสดง "รายวิชาย่อย" ภายในกลุ่มเรียน (ใช้กรณีกลุ่มเรียนเป็น "ชุดวิชา" ที่ประกอบด้วย
 * หลายรายวิชา) พร้อมปุ่ม [ + เพิ่มวิชาเข้ากลุ่ม ] และคำนวณชั่วโมงรวมอัตโนมัติ
 *
 * ทำงานแบบ "local list" ล้วนๆ (ยังไม่ยิง API ทันทีที่กด + เพราะกลุ่มเรียนอาจยังไม่ถูกสร้าง
 * ในโหมด create) — parent (GroupFormPanel) เป็นผู้ถืออาร์เรย์ subjectsInGroup ไว้ใน state
 * แล้วค่อย sync ไป backend (POST/PUT/DELETE study-group-subjects) ตอนกด "บันทึกข้อมูล"
 *
 * Props:
 * - subjectsInGroup: Array<{ _localId, subject_id, subject_code, name_th, total_hours, moe_code }>
 * - subjectOptions: Array<{ value, label, subject_code, name_th, total_hours }>  -> ตัวเลือกวิชาทั้งหมด
 * - onAdd: (subjectOption) => void
 * - onRemove: (localId) => void
 * - onMoeCodeChange: (localId, value) => void
 */
export default function GroupSubjectsTable({
    subjectsInGroup = [],
    subjectOptions = [],
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
        // กันเพิ่มวิชาซ้ำ
        const alreadyAdded = subjectsInGroup.some((s) => String(s.subject_id) === String(subjectId));
        if (alreadyAdded) {
            setPickerValue("");
            return;
        }
        onAdd?.(opt);
        setPickerValue("");
    };

    return (
        <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                    <BookOpen size={15} className="text-indigo-500" />
                    ตารางวิชาย่อย (ชุดวิชา)
                </p>
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600">
                    รวม {totalHours} ชม.
                </span>
            </div>

            <div className="mb-3 flex items-center gap-2">
                <div className="flex-1">
                    <VirtualizedCombobox
                        value={pickerValue}
                        onChange={handlePick}
                        options={subjectOptions}
                        placeholder="พิมพ์ค้นหารายวิชาเพื่อเพิ่มเข้ากลุ่ม..."
                        emptyText="ไม่พบรายวิชา"
                        className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
                    />
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-indigo-300 px-3 py-2 text-xs font-semibold text-indigo-500">
                    <Plus size={13} />
                    เพิ่มวิชาเข้ากลุ่ม
                </span>
            </div>

            {subjectsInGroup.length === 0 ? (
                <p className="rounded-lg bg-slate-50 py-4 text-center text-xs text-slate-400">
                    ยังไม่มีรายวิชาในกลุ่มนี้ — ค้นหาและเลือกวิชาด้านบนเพื่อเพิ่ม
                </p>
            ) : (
                <div className="space-y-1.5">
                    <div className="grid grid-cols-[1fr_1fr_70px_auto] gap-2 px-1 text-[11px] font-semibold text-slate-400">
                        <span>รายวิชา</span>
                        <span>เลข ศธ. (moe_code)</span>
                        <span className="text-right">ชม.</span>
                        <span></span>
                    </div>
                    {subjectsInGroup.map((s) => (
                        <div
                            key={s._localId}
                            className="grid grid-cols-[1fr_1fr_70px_auto] items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">{s.subject_code}</p>
                                <p className="truncate text-xs text-slate-500">{s.name_th}</p>
                            </div>
                            <input
                                type="text"
                                value={s.moe_code || ""}
                                onChange={(e) => onMoeCodeChange?.(s._localId, e.target.value)}
                                placeholder="เช่น 691101001"
                                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs font-mono outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
                            />
                            <span className="text-right text-sm font-medium text-slate-600">{s.total_hours}</span>
                            <button
                                type="button"
                                title="นำออกจากกลุ่ม"
                                onClick={() => onRemove?.(s._localId)}
                                className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}