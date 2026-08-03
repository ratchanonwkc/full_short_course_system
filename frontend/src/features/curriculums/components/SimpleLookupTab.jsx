import { useEffect, useState } from "react";
import { Plus, Save, Trash2, Search } from "lucide-react";
import Swal from "sweetalert2";

const inputClass =
    "w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40";

/**
 * SimpleLookupTab
 * -------------------------------------------------------------------------
 * ใช้ซ้ำได้กับ Lookup Table รูปแบบ "id + ชื่อ 1 ฟิลด์" เช่น curriculums (curriculum_name)
 * และ academic_levels (level_name) — โหลดรายการ, เพิ่มใหม่, แก้ไขแบบ inline, ลบ
 *
 * Props:
 * - title: string                 -> หัวข้อของแท็บ เช่น "หลักสูตร"
 * - primaryKey: string            -> ชื่อฟิลด์ เช่น "curriculum_name"
 * - placeholder: string
 * - fetchFn: () => Promise<Array>
 * - createFn: (payload) => Promise
 * - updateFn: (id, payload) => Promise
 * - deleteFn: (id) => Promise
 */
export default function SimpleLookupTab({ title, primaryKey, placeholder, fetchFn, createFn, updateFn, deleteFn }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editMap, setEditMap] = useState({});
    const [newValue, setNewValue] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [savingId, setSavingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    const load = async () => {
        setLoading(true);
        try {
            const data = await fetchFn();
            setItems(data);
            setEditMap(Object.fromEntries(data.map((item) => [item.id, item[primaryKey] ?? ""])));
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: `โหลดข้อมูล${title}ไม่สำเร็จ`,
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredItems = items.filter((item) => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return true;
        return (editMap[item.id] ?? item[primaryKey] ?? "").toLowerCase().includes(term);
    });

    const handleAdd = async () => {
        if (!newValue.trim()) {
            Swal.fire({ icon: "warning", title: "กรุณากรอกข้อมูลให้ครบ", confirmButtonColor: "#4f46e5" });
            return;
        }
        setIsAdding(true);
        try {
            await createFn({ [primaryKey]: newValue.trim() });
            setNewValue("");
            Swal.fire({
                toast: true, position: "top-end", icon: "success",
                title: `เพิ่ม${title}ใหม่เรียบร้อยแล้ว`, showConfirmButton: false, timer: 2000, timerProgressBar: true,
            });
            load();
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "เพิ่มรายการไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        } finally {
            setIsAdding(false);
        }
    };

    const handleSave = async (item) => {
        const value = editMap[item.id];
        if (!value?.trim()) {
            Swal.fire({ icon: "warning", title: "กรุณากรอกข้อมูลให้ครบ", confirmButtonColor: "#4f46e5" });
            return;
        }
        setSavingId(item.id);
        try {
            await updateFn(item.id, { [primaryKey]: value.trim() });
            Swal.fire({
                toast: true, position: "top-end", icon: "success",
                title: "บันทึกเรียบร้อยแล้ว", showConfirmButton: false, timer: 2000, timerProgressBar: true,
            });
            load();
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "บันทึกไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (item) => {
        const result = await Swal.fire({
            title: "ยืนยันการลบ?",
            html: `ต้องการลบ <b>${item[primaryKey]}</b> ใช่หรือไม่?<br/><span style="color:#94a3b8;font-size:13px">หากมีข้อมูลอ้างอิงอยู่ จะไม่สามารถลบได้</span>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ลบ",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#6b7280",
            reverseButtons: true,
        });
        if (!result.isConfirmed) return;

        try {
            await deleteFn(item.id);
            Swal.fire({
                toast: true, position: "top-end", icon: "success",
                title: "ลบเรียบร้อยแล้ว", showConfirmButton: false, timer: 2000, timerProgressBar: true,
            });
            load();
        } catch (err) {
            const isConflict = err?.response?.status === 409;
            Swal.fire({
                icon: "error",
                title: isConflict ? "ไม่สามารถลบได้" : "เกิดข้อผิดพลาด",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        }
    };

    return (
        <div className="space-y-4">
            {/* Add new */}
            <div className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 p-3">
                <p className="mb-2 text-xs font-semibold text-indigo-600">➕ เพิ่ม{title}ใหม่</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                        type="text"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                        placeholder={placeholder}
                        className={inputClass}
                    />
                    <button
                        type="button"
                        onClick={handleAdd}
                        disabled={isAdding}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                    >
                        <Plus size={14} />
                        {isAdding ? "กำลังเพิ่ม..." : "เพิ่ม"}
                    </button>
                </div>
            </div>

            {/* Search */}
            {items.length > 0 && (
                <div className="relative max-w-sm">
                    <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={`ค้นหา${title}...`}
                        className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                    />
                </div>
            )}

            {/* List */}
            {loading ? (
                <p className="py-10 text-center text-sm text-slate-400">กำลังโหลดข้อมูล...</p>
            ) : filteredItems.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">ไม่พบรายการ</p>
            ) : (
                <div className="space-y-2">
                    {filteredItems.map((item) => (
                        <div
                            key={item.id}
                            className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 transition hover:border-slate-300 hover:shadow-sm"
                        >
                            <input
                                type="text"
                                value={editMap[item.id] ?? ""}
                                onChange={(e) => setEditMap((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
                            />
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    title="บันทึก"
                                    onClick={() => handleSave(item)}
                                    disabled={savingId === item.id}
                                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
                                >
                                    <Save size={15} />
                                </button>
                                <button
                                    type="button"
                                    title="ลบ"
                                    onClick={() => handleDelete(item)}
                                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
