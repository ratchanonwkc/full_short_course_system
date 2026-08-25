import { useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { Plus, Save, Trash2, Search, Pencil } from "lucide-react";
import Swal from "sweetalert2";
import SearchableCombobox from "../../../components/common/SearchableCombobox";
import SplitPanelLayout from "./SplitPanelLayout";
import FormStatusBanner from "./FormStatusBanner";
import useSingleOptionDefault from "../../../hooks/useSingleOptionDefault";
import { getMajors, createMajor, updateMajor, deleteMajor } from "../services/academicStructureApi";

ModuleRegistry.registerModules([AllCommunityModule]);

const inputClass =
    "w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40";

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
 * MajorTab (สาขาวิชา/แผนก) — Split View
 * -------------------------------------------------------------------------
 * ฝั่งซ้าย: AG-Grid list + Search
 * ฝั่งขวา: Cascading form (ระดับชั้น + ประเภทวิชา -> รหัสแผนก 2 หลัก -> ชื่อ -> หัวหน้าแผนก)
 *
 * Props:
 * - levels: Array<{ id, level_name }>
 * - subjectTypes: Array<{ id, name_th }>
 * - teachers: Array<Teacher>
 */
export default function MajorTab({ levels = [], subjectTypes = [], teachers = [], onSaved }) {
    const [majors, setMajors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);
    const firstFieldRef = useRef(null);
    const isEditMode = Boolean(editingId);

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
                confirmButtonColor: "#0270c7",
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

    // Default value อัตโนมัติเมื่อมีตัวเลือกระดับชั้นเพียงรายการเดียว (เฉพาะตอนสร้างใหม่)
    useSingleOptionDefault(levelOptions, form.level_id, (v) => setForm((p) => ({ ...p, level_id: v })), !isEditMode);

    const resetForm = () => {
        setForm(EMPTY_FORM);
        setEditingId(null);
    };

    const focusFirstField = () => {
        requestAnimationFrame(() => firstFieldRef.current?.focus?.());
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
        setIsMobileFormOpen(true);
        focusFirstField();
    };

    const handleStartCreate = () => {
        resetForm();
        setIsMobileFormOpen(true);
        focusFirstField();
    };

    const handleCancelEdit = () => {
        resetForm();
        setIsMobileFormOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.level_id || !form.subject_type_id || !form.department_id.toString().trim() || !form.name_th.trim()) {
            Swal.fire({ icon: "warning", title: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ", confirmButtonColor: "#0270c7" });
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                ...form,
                department_id: form.department_id.toString().trim().padStart(2, "0"),
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
            setIsMobileFormOpen(false);
            load();
            onSaved?.();
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "บันทึกข้อมูลไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาตรวจสอบข้อมูลแล้วลองใหม่อีกครั้ง",
                confirmButtonColor: "#0270c7",
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
                confirmButtonColor: "#0270c7",
            });
        }
    };

    const filteredMajors = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return majors;
        return majors.filter(
            (m) =>
                (m.name_th || "").toLowerCase().includes(term) ||
                (m.full_major_code || "").toLowerCase().includes(term) ||
                (m.short_name_th || "").toLowerCase().includes(term)
        );
    }, [majors, searchTerm]);

    const ActionsRenderer = (params) => (
        <div className="flex h-full items-center gap-1.5">
            <button
                type="button"
                title="แก้ไข"
                onClick={() => handleEdit(params.data)}
                className="rounded-md p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
            >
                <Pencil size={15} />
            </button>
            <button
                type="button"
                title="ลบ"
                onClick={() => handleDelete(params.data)}
                className="rounded-md p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
            >
                <Trash2 size={15} />
            </button>
        </div>
    );

    const columnDefs = useMemo(
        () => [
            { field: "full_major_code", headerName: "รหัสเต็ม", width: 110, cellClass: "font-mono text-slate-500" },
            { field: "name_th", headerName: "สาขาวิชา", flex: 1.6, minWidth: 160, cellClass: "font-medium text-slate-800" },
            { field: "level_name", headerName: "ระดับชั้น", flex: 1, minWidth: 110 },
            { field: "subject_type_name", headerName: "ประเภทวิชา", flex: 1, minWidth: 120 },
            { field: "head_teacher_name", headerName: "หัวหน้าแผนก", flex: 1.2, minWidth: 140 },
            {
                headerName: "จัดการ",
                pinned: "right",
                width: 100,
                sortable: false,
                filter: false,
                cellRenderer: ActionsRenderer,
            },
        ],
        []
    );

    const defaultColDef = useMemo(() => ({ resizable: true, sortable: true, filter: true }), []);

    const grid = (
        <>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                    <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="ค้นหาสาขาวิชา..."
                        className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                    />
                </div>
                <button
                    type="button"
                    onClick={handleStartCreate}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                    <Plus size={14} />
                    เพิ่มสาขาวิชาใหม่
                </button>
            </div>

            <div className="min-h-[360px] flex-1 overflow-hidden rounded-lg border border-slate-200 lg:min-h-0">
                <AgGridReact
                    theme={themeQuartz}
                    rowData={filteredMajors}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    loading={loading}
                    domLayout="normal"
                    headerHeight={40}
                    rowHeight={42}
                    animateRows
                    overlayNoRowsTemplate="<span class='text-sm text-slate-400'>ยังไม่มีข้อมูลสาขาวิชา</span>"
                    getRowId={(params) => String(params.data.id)}
                    getRowClass={(params) =>
                        editingId && String(params.data.id) === String(editingId) ? "bg-amber-50" : undefined
                    }
                    onRowClicked={(params) => handleEdit(params.data)}
                    rowStyle={{ cursor: "pointer" }}
                    className="h-full w-full"
                />
            </div>
        </>
    );

    const form_ = (
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <FormStatusBanner
                mode={isEditMode ? "edit" : "create"}
                editingLabel={form.name_th}
                onCancelEdit={handleCancelEdit}
                createLabel="เพิ่มสาขาวิชา/แผนกใหม่"
                editLabel="กำลังแก้ไขสาขาวิชา"
            />

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <Field label="ระดับชั้น">
                    <SearchableCombobox
                        id="major-level"
                        value={form.level_id}
                        onChange={(v) => setForm((p) => ({ ...p, level_id: v }))}
                        options={levelOptions}
                        placeholder="เลือกระดับชั้น..."
                    />
                    {levelOptions.length === 1 && !isEditMode && (
                        <p className="mt-1 text-xs text-slate-400">* เลือกให้อัตโนมัติ (มีข้อมูลเพียงรายการเดียว)</p>
                    )}
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
                        ref={firstFieldRef}
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
                <Field label="หัวหน้าแผนก">
                    <SearchableCombobox
                        value={form.head_teacher_id}
                        onChange={(v) => setForm((p) => ({ ...p, head_teacher_id: v }))}
                        options={teacherOptions}
                        placeholder="พิมพ์ค้นหาชื่ออาจารย์..."
                    />
                </Field>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-4">
                {isEditMode && (
                    <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        ยกเลิก
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <Save size={15} />
                    {isSubmitting ? "กำลังบันทึก..." : isEditMode ? "บันทึกการแก้ไข" : "เพิ่มสาขาวิชา"}
                </button>
            </div>
        </form>
    );

    return (
        <SplitPanelLayout
            grid={grid}
            form={form_}
            isFormOpen={isMobileFormOpen}
            onCloseForm={() => setIsMobileFormOpen(false)}
        />
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
            {children}
        </div>
    );
}