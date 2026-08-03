import { useEffect, useMemo, useState } from "react";
import { Save, Trash2, X, Pencil } from "lucide-react";
import Swal from "sweetalert2";
import SearchableCombobox from "../../../components/common/SearchableCombobox";
import { getMinors, createMinor, updateMinor, deleteMinor } from "../services/academicStructureApi";

const inputClass =
    "w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40";

const EMPTY_FORM = { major_id: "", sub_department_id: "", name_th: "", name_en: "" };

/**
 * MinorTab (สาขางาน/กลุ่มวิชา)
 * -------------------------------------------------------------------------
 * เลือกสาขาวิชา (major_id) ก่อน แล้วรายการสาขางานจะกรองตาม major ที่เลือกโดยอัตโนมัติ
 *
 * Props:
 * - majors: Array<{ id, name_th, department_id }>
 */
export default function MinorTab({ majors = [] }) {
    const [filterMajorId, setFilterMajorId] = useState("");
    const [minors, setMinors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const majorOptions = useMemo(() => majors.map((m) => ({ value: m.id, label: m.name_th })), [majors]);

    const load = async (majorId) => {
        setLoading(true);
        try {
            const data = await getMinors(majorId ? { major_id: majorId } : {});
            setMinors(data);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "โหลดข้อมูลสาขางานไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load(filterMajorId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterMajorId]);

    const resetForm = () => {
        setForm({ ...EMPTY_FORM, major_id: filterMajorId || "" });
        setEditingId(null);
    };

    const handleEdit = (minor) => {
        setForm({
            major_id: minor.major_id ?? "",
            sub_department_id: minor.sub_department_id ?? "",
            name_th: minor.name_th ?? "",
            name_en: minor.name_en ?? "",
        });
        setEditingId(minor.id);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.major_id || !form.sub_department_id.toString().trim() || !form.name_th.trim()) {
            Swal.fire({ icon: "warning", title: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ", confirmButtonColor: "#4f46e5" });
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = { ...form, sub_department_id: String(form.sub_department_id).trim() };
            if (editingId) {
                await updateMinor(editingId, payload);
            } else {
                await createMinor(payload);
            }
            Swal.fire({
                toast: true, position: "top-end", icon: "success",
                title: editingId ? "บันทึกการแก้ไขสำเร็จ" : "เพิ่มสาขางานสำเร็จ",
                showConfirmButton: false, timer: 2000, timerProgressBar: true,
            });
            resetForm();
            load(filterMajorId);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "บันทึกข้อมูลไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาตรวจสอบข้อมูลแล้วลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (minor) => {
        const result = await Swal.fire({
            title: "ยืนยันการลบสาขางาน?",
            html: `ต้องการลบ <b>${minor.name_th}</b> ใช่หรือไม่<br/><span style="color:#94a3b8;font-size:13px">หากมีรายวิชาใช้งานอยู่ จะไม่สามารถลบได้</span>`,
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
            await deleteMinor(minor.id);
            Swal.fire({
                toast: true, position: "top-end", icon: "success",
                title: "ลบเรียบร้อยแล้ว", showConfirmButton: false, timer: 2000, timerProgressBar: true,
            });
            if (editingId === minor.id) resetForm();
            load(filterMajorId);
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
        <div className="space-y-5">
            {/* Filter by major */}
            <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">กรองตามสาขาวิชา</label>
                <div className="max-w-sm">
                    <SearchableCombobox
                        value={filterMajorId}
                        onChange={(v) => {
                            setFilterMajorId(v);
                            setForm((p) => ({ ...p, major_id: v || p.major_id }));
                        }}
                        options={majorOptions}
                        placeholder="เลือกสาขาวิชาเพื่อกรองรายการ..."
                    />
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-800">
                        {editingId ? "✏️ แก้ไขสาขางาน/กลุ่มวิชา" : "➕ เพิ่มสาขางาน/กลุ่มวิชาใหม่"}
                    </p>
                    {editingId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
                        >
                            <X size={13} /> ยกเลิกการแก้ไข
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="สาขาวิชา" full>
                        <SearchableCombobox
                            value={form.major_id}
                            onChange={(v) => setForm((p) => ({ ...p, major_id: v }))}
                            options={majorOptions}
                            placeholder="เลือกสาขาวิชาต้นสังกัด..."
                        />
                    </Field>
                    <Field label="รหัสสาขางาน (1 หลัก)">
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={form.sub_department_id}
                            onChange={(e) => setForm((p) => ({ ...p, sub_department_id: e.target.value }))}
                            placeholder="เช่น 1"
                            className={inputClass}
                        />
                    </Field>
                    <Field label="ชื่อสาขางาน (ไทย)">
                        <input
                            type="text"
                            value={form.name_th}
                            onChange={(e) => setForm((p) => ({ ...p, name_th: e.target.value }))}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="ชื่อสาขางาน (English)">
                        <input
                            type="text"
                            value={form.name_en}
                            onChange={(e) => setForm((p) => ({ ...p, name_en: e.target.value }))}
                            className={inputClass}
                        />
                    </Field>
                </div>

                <div className="mt-3 flex justify-end">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                    >
                        <Save size={14} />
                        {isSubmitting ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "เพิ่มสาขางาน"}
                    </button>
                </div>
            </form>

            {/* Table */}
            {loading ? (
                <p className="py-10 text-center text-sm text-slate-400">กำลังโหลดข้อมูล...</p>
            ) : minors.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">ยังไม่มีข้อมูลสาขางาน</p>
            ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                            <tr>
                                <th className="px-4 py-2.5">รหัส</th>
                                <th className="px-4 py-2.5">สาขางาน</th>
                                <th className="px-4 py-2.5">สาขาวิชาต้นสังกัด</th>
                                <th className="px-4 py-2.5 text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {minors.map((m) => (
                                <tr key={m.id} className="hover:bg-slate-50/60">
                                    <td className="px-4 py-2.5 font-mono text-slate-500">
                                        {m.major_department_id}{m.sub_department_id}
                                    </td>
                                    <td className="px-4 py-2.5 font-medium text-slate-800">{m.name_th}</td>
                                    <td className="px-4 py-2.5 text-slate-600">{m.major_name || "-"}</td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                type="button"
                                                title="แก้ไข"
                                                onClick={() => handleEdit(m)}
                                                className="rounded-md p-1.5 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                title="ลบ"
                                                onClick={() => handleDelete(m)}
                                                className="rounded-md p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function Field({ label, full = false, children }) {
    return (
        <div className={full ? "sm:col-span-2 lg:col-span-4" : ""}>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
            {children}
        </div>
    );
}
