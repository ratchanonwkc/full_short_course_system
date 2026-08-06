import { Plus, Pencil, X } from "lucide-react";

/**
 * FormStatusBanner
 * -------------------------------------------------------------------------
 * แสดงสถานะของฟอร์มให้ชัดเจนว่ากำลัง "สร้างใหม่" หรือ "แก้ไข" รายการไหนอยู่
 * เพื่อแก้ปัญหาเดิมที่ผู้ใช้กดแก้ไขแล้วไม่รู้ตัวว่าเปลี่ยนโหมด
 *
 * Props:
 * - mode: "create" | "edit"
 * - editingLabel: string          -> ชื่อรายการที่กำลังแก้ไข (โหมด edit เท่านั้น)
 * - onCancelEdit: () => void      -> ยกเลิกการแก้ไข กลับไปโหมดสร้างใหม่
 * - createLabel / editLabel: string  -> ข้อความหัวเรื่อง (ปรับได้ต่อแท็บ)
 */
export default function FormStatusBanner({
    mode = "create",
    editingLabel = "",
    onCancelEdit,
    createLabel = "เพิ่มข้อมูลใหม่",
    editLabel = "กำลังแก้ไข",
}) {
    const isEdit = mode === "edit";

    return (
        <div
            className={`flex items-center justify-between gap-3 border-b px-5 py-4 transition-colors ${isEdit ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"
                }`}
        >
            <div className="flex min-w-0 items-center gap-2.5">
                <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isEdit ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
                        }`}
                >
                    {isEdit ? <Pencil size={14} /> : <Plus size={16} />}
                </span>
                <div className="min-w-0">
                    <p className={`text-xs font-bold uppercase tracking-wide ${isEdit ? "text-amber-700" : "text-emerald-700"}`}>
                        {isEdit ? editLabel : createLabel}
                    </p>
                    {isEdit && editingLabel && (
                        <p className="truncate text-sm font-semibold text-slate-800" title={editingLabel}>
                            {editingLabel}
                        </p>
                    )}
                </div>
            </div>

            {isEdit && (
                <button
                    type="button"
                    onClick={onCancelEdit}
                    title="ยกเลิกการแก้ไข / ล้างฟอร์ม"
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100"
                >
                    <X size={13} />
                    ยกเลิกแก้ไข
                </button>
            )}
        </div>
    );
}