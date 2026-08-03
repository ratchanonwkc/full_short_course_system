import { useEffect, useMemo, useState } from "react";
import { Save, Trash2, X, Pencil } from "lucide-react";
import Swal from "sweetalert2";
import SearchableCombobox from "../../../components/common/SearchableCombobox";
import { getMajors, createMajor, updateMajor, deleteMajor } from "../services/academicStructureApi";

const inputClass =
    "w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40";

const EMPTY_FORM = {
    level_id: "",
    subject_type_id: "",
    department_id: "",
    name_th: "",
    name_en: "",
    short_name_th: "",
    head_teacher_id: "",
};

/**
 * MajorTab (สาขาวิชา/แผนก)
 * -------------------------------------------------------------------------
 * Cascading form: เลือกระดับชั้น + ประเภทวิชา -> กรอกรหัสแผนก 2 หลัก + ชื่อ -> เลือกหัวหน้าแผนก
 *
 * Props:
 * - levels: Array<{ id, level_name }>
 * - subjectTypes: Array<{ id, name_th }>
 * - teachers: Array<Teacher>
 */
export default function MajorTab({ levels = [], subjectTypes = [], teachers = [], onSaved }) {
    const [majors, setMajors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await getMajors();
            setMajors(data);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "โหลดข้อมูลสาขาวิชาไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const levelOptions = useMemo(() => levels.map((l) => ({ value: l.id, label: l.level_name })), [levels]);
    const subjectTypeOptions = useMemo(() => subjectTypes.map((t) => ({ value: t.id, label: t.name_th })), [subjectTypes]);
    const teacherOptions = useMemo(
        () =>
            teachers.map((t) => ({
                value: t.id,
                label: [t.prefix_name, t.first_name_th, t.last_name_th].filter(Boolean).join(" ") || `อาจารย์ #${t.id}`,
            })),
        [teachers]
    );

    const resetForm = () => {
        setForm(EMPTY_FORM);
        setEditingId(null);
    };

    const handleEdit = (major) => {
        setForm({
            level_id: major.level_id ?? "",
            subject_type_id: major.subject_type_id ?? "",
            department_id: major.department_id ?? "",
            name_th: major.name_th ?? "",
            name_en: major.name_en ?? "",
            short_name_th: major.short_name_th ?? "",
            head_teacher_id: major.head_teacher_id ?? "",
        });
        setEditingId(major.id);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.level_id || !form.subject_type_id || !form.department_id.trim() || !form.name_th.trim()) {
            Swal.fire({ icon: "warning", title: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ", confirmButtonColor: "#4f46e5" });
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                ...form,
                department_id: form.department_id.trim().padStart(2, "0"),
                head_teacher_id: form.head_teacher_id || null,
            };
            if (editingId) {
                await updateMajor(editingId, payload);
            } else {
                await createMajor(payload);
            }
            Swal.fire({
                toast: true, position: "top-end", icon: "success",
                title: editingId ? "บันทึกการแก้ไขสำเร็จ" : "เพิ่มสาขาวิชาสำเร็จ",
                showConfirmButton: false, timer: 2000, timerProgressBar: true,
            });
            resetForm();
            load();
            onSaved?.();
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

    const handleDelete = async (major) => {
        const result = await Swal.fire({
            title: "ยืนยันการลบสาขาวิชา?",
            html: `ต้องการลบ <b>${major.name_th}</b> ใช่หรือไม่<br/><span style="color:#94a3b8;font-size:13px">หากมีสาขางาน/รายวิชาใช้งานอยู่ จะไม่สามารถลบได้</span>`,
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
            await deleteMajor(major.id);
            Swal.fire({
                toast: true, position: "top-end", icon: "success",
                title: "ลบเรียบร้อยแล้ว", showConfirmButton: false, timer: 2000, timerProgressBar: true,
            });
            if (editingId === major.id) resetForm();
            load();
            onSaved?.();
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
            {/* Form */}
            <form
                onSubmit={handleSubmit}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
            >
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-800">
                        {editingId ? "✏️ แก้ไขสาขาวิชา/แผนก" : "➕ เพิ่มสาขาวิชา/แผนกใหม่"}
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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="ระดับชั้น">
                        <SearchableCombobox
                            value={form.level_id}
                            onChange={(v) => setForm((p) => ({ ...p, level_id: v }))}
                            options={levelOptions}
                            placeholder="เลือกระดับชั้น..."
                        />
                    </Field>
                    <Field label="ประเภทวิชา">
                        <SearchableCombobox
                            value={form.subject_type_id}
                            onChange={(v) => setForm((p) => ({ ...p, subject_type_id: v }))}
                            options={subjectTypeOptions}
                            placeholder="เลือกประเภทวิชา..."
                        />
                    </Field>
                    <Field label="รหัสแผนก (2 หลัก)">
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={2}
                            value={form.department_id}
                            onChange={(e) => setForm((p) => ({ ...p, department_id: e.target.value }))}
                            placeholder="เช่น 01"
                            className={inputClass}
                        />
                    </Field>
                    <Field label="ชื่อสาขาวิชา (ไทย)">
                        <input
                            type="text"
                            value={form.name_th}
                            onChange={(e) => setForm((p) => ({ ...p, name_th: e.target.value }))}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="ชื่อสาขาวิชา (English)">
                        <input
                            type="text"
                            value={form.name_en}
                            onChange={(e) => setForm((p) => ({ ...p, name_en: e.target.value }))}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="ชื่อย่อ">
                        <input
                            type="text"
                            value={form.short_name_th}
                            onChange={(e) => setForm((p) => ({ ...p, short_name_th: e.target.value }))}
                            placeholder="เช่น ช.ยนต์"
                            className={inputClass}
                        />
                    </Field>
                    <Field label="หัวหน้าแผนก" full>
                        <SearchableCombobox
                            value={form.head_teacher_id}
                            onChange={(v) => setForm((p) => ({ ...p, head_teacher_id: v }))}
                            options={teacherOptions}
                            placeholder="พิมพ์ค้นหาชื่ออาจารย์..."
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
                        {isSubmitting ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "เพิ่มสาขาวิชา"}
                    </button>
                </div>
            </form>

            {/* Table */}
            {loading ? (
                <p className="py-10 text-center text-sm text-slate-400">กำลังโหลดข้อมูล...</p>
            ) : majors.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">ยังไม่มีข้อมูลสาขาวิชา</p>
            ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                            <tr>
                                <th className="px-4 py-2.5">รหัสเต็ม</th>
                                <th className="px-4 py-2.5">สาขาวิชา</th>
                                <th className="px-4 py-2.5">ระดับชั้น</th>
                                <th className="px-4 py-2.5">ประเภทวิชา</th>
                                <th className="px-4 py-2.5">หัวหน้าแผนก</th>
                                <th className="px-4 py-2.5 text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {majors.map((m) => (
                                <tr key={m.id} className="hover:bg-slate-50/60">
                                    <td className="px-4 py-2.5 font-mono text-slate-500">{m.full_major_code}</td>
                                    <td className="px-4 py-2.5 font-medium text-slate-800">
                                        {m.name_th}
                                        {m.short_name_th && <span className="ml-1.5 text-xs text-slate-400">({m.short_name_th})</span>}
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-600">{m.level_name || "-"}</td>
                                    <td className="px-4 py-2.5 text-slate-600">{m.subject_type_name || "-"}</td>
                                    <td className="px-4 py-2.5 text-slate-600">{m.head_teacher_name || "-"}</td>
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
        <div className={full ? "sm:col-span-2 lg:col-span-3" : ""}>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
            {children}
        </div>
    );
}
