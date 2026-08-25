import { useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { Plus, Save, Trash2, Search, Pencil } from "lucide-react";
import Swal from "sweetalert2";
import SearchableCombobox from "../../../components/common/SearchableCombobox";
import SplitPanelLayout from "./SplitPanelLayout";
import FormStatusBanner from "./FormStatusBanner";
import { buildMinorCode, buildMinorCodePreview } from "../../../utils/academicCode";
import { getMinors, createMinor, updateMinor, deleteMinor } from "../services/academicStructureApi";

ModuleRegistry.registerModules([AllCommunityModule]);

const inputClass =
    "w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40";

const EMPTY_FORM = { major_id: "", sub_department_id: "", name_th: "", name_en: "" };

/**
 * MinorTab (สาขางาน/กลุ่มวิชา) — Split View
 * -------------------------------------------------------------------------
 * รหัสสาขางาน (Display/Preview เท่านั้น ไม่ใช่ subject_code):
 *   [ระดับชั้น 1 หลัก][ประเภทวิชา 1 หลัก][แผนกวิชา 2 หลัก] - [รหัสสาขางาน 1 หลัก]
 *   เช่น 1 + 1 + 04 + "-" + 1 -> "1104-1"
 *
 * ระดับชั้น/ประเภทวิชา มาจาก major ที่เลือก (สาขาวิชาต้นสังกัด) ไม่ใช่ field แยกในฟอร์มนี้
 *
 * Props:
 * - majors: Array<{ id, name_th, department_id, level_id, subject_type_id, level_name, subject_type_name }>
 */
export default function MinorTab({ majors = [] }) {
    const [filterMajorId, setFilterMajorId] = useState("");
    const [minors, setMinors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);
    const firstFieldRef = useRef(null);
    const isEditMode = Boolean(editingId);

    const majorOptions = useMemo(() => majors.map((m) => ({ value: m.id, label: m.name_th })), [majors]);
    const selectedFormMajor = majors.find((m) => String(m.id) === String(form.major_id));

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
                confirmButtonColor: "#0270c7",
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

    const focusFirstField = () => {
        requestAnimationFrame(() => firstFieldRef.current?.focus?.());
    };

    const handleEdit = (minor) => {
        setForm({
            major_id: minor.major_id ?? "",
            sub_department_id: minor.sub_department_id ?? "",
            name_th: minor.name_th ?? "",
            name_en: minor.name_en ?? "",
        });
        setEditingId(minor.id);
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
        if (!form.major_id || !form.sub_department_id.toString().trim() || !form.name_th.trim()) {
            Swal.fire({ icon: "warning", title: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ", confirmButtonColor: "#0270c7" });
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
            setIsMobileFormOpen(false);
            load(filterMajorId);
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
                confirmButtonColor: "#0270c7",
            });
        }
    };

    const filteredMinors = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return minors;
        return minors.filter(
            (m) => (m.name_th || "").toLowerCase().includes(term) || (m.major_name || "").toLowerCase().includes(term)
        );
    }, [minors, searchTerm]);

    // รหัสเต็มของสาขางาน (สำหรับแสดงในตาราง) คำนวณจากสูตรใหม่โดยใช้ level_id/subject_type_id ของ major ต้นสังกัด
    const minorCodeFor = (minor) => {
        // ข้อมูลจาก backend (academicMinors.service.js) join แค่ major_department_id มาให้
        // ส่วน level_id/subject_type_id ต้องดึงจาก majors prop (โหลดจาก parent) เพื่อความครบถ้วน
        const relatedMajor = majors.find((m) => String(m.id) === String(minor.major_id));
        return buildMinorCode({
            levelId: relatedMajor?.level_id,
            subjectTypeId: relatedMajor?.subject_type_id,
            departmentId: minor.major_department_id,
            subDepartmentId: minor.sub_department_id,
        }) || `${minor.major_department_id ?? ""}${minor.sub_department_id ?? ""}`; // fallback เผื่อหา major ไม่เจอ
    };

    const livePreviewCode = buildMinorCodePreview({
        levelId: selectedFormMajor?.level_id,
        subjectTypeId: selectedFormMajor?.subject_type_id,
        departmentId: selectedFormMajor?.department_id,
        subDepartmentId: form.sub_department_id,
    });
    const isPreviewComplete = Boolean(
        selectedFormMajor?.level_id &&
        selectedFormMajor?.subject_type_id &&
        selectedFormMajor?.department_id &&
        form.sub_department_id
    );

    const CodeRenderer = (params) => (
        <span className="font-mono font-semibold text-blue-700">{minorCodeFor(params.data)}</span>
    );

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
    // จัดกลุ่มข้อมูลด้วย major_id
    const columnDefs = useMemo(
        () => [
            { headerName: "รหัส", width: 110, cellRenderer: CodeRenderer },
            { field: "name_th", headerName: "สาขางาน", flex: 1.6, minWidth: 160, cellClass: "font-medium text-slate-800" },
            { field: "major_name", headerName: "สาขาวิชาต้นสังกัด", flex: 1.4, minWidth: 160 },
            {
                headerName: "จัดการ",
                pinned: "right",
                width: 100,
                sortable: false,
                filter: false,
                cellRenderer: ActionsRenderer,
            },
        ],
        [majors]
    );

    const defaultColDef = useMemo(() => ({ resizable: true, sortable: true, filter: true }), []);

    const grid = (
        <>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="w-full sm:max-w-[220px]">
                        <SearchableCombobox
                            value={filterMajorId}
                            onChange={(v) => {
                                setFilterMajorId(v);
                                setForm((p) => ({ ...p, major_id: v || p.major_id }));
                            }}
                            options={majorOptions}
                            placeholder="กรองตามสาขาวิชา..."
                        />
                    </div>
                    <div className="relative w-full sm:max-w-[220px]">
                        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="ค้นหาสาขางาน..."
                            className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                        />
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleStartCreate}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                    <Plus size={14} />
                    เพิ่มสาขางานใหม่
                </button>
            </div>

            <div className="min-h-[360px] flex-1 overflow-hidden rounded-lg border border-slate-200 lg:min-h-0">
                <AgGridReact
                    theme={themeQuartz}
                    rowData={filteredMinors}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    loading={loading}
                    domLayout="normal"
                    headerHeight={40}
                    rowHeight={42}
                    animateRows
                    overlayNoRowsTemplate="<span class='text-sm text-slate-400'>ยังไม่มีข้อมูลสาขางาน</span>"
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
                createLabel="เพิ่มสาขางาน/กลุ่มวิชาใหม่"
                editLabel="กำลังแก้ไขสาขางาน"
            />

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {/* Live code preview */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5">
                    <p className="mb-1 text-xs font-semibold text-blue-700">รหัสสาขางาน (Preview)</p>
                    <p
                        className={`font-mono text-lg font-bold ${isPreviewComplete ? "text-blue-700" : "text-slate-400"
                            }`}
                    >
                        {livePreviewCode}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                        สูตร: [ระดับชั้น][ประเภทวิชา][แผนกวิชา 2 หลัก] - [รหัสสาขางาน] เช่น 1104-1
                    </p>
                </div>

                <Field label="สาขาวิชาต้นสังกัด">
                    <SearchableCombobox
                        value={form.major_id}
                        onChange={(v) => setForm((p) => ({ ...p, major_id: v }))}
                        options={majorOptions}
                        placeholder="เลือกสาขาวิชาต้นสังกัด..."
                    />
                    {selectedFormMajor && (
                        <p className="mt-1 text-xs text-slate-400">
                            ระดับชั้น: {selectedFormMajor.level_name || selectedFormMajor.level_id || "-"} · ประเภทวิชา:{" "}
                            {selectedFormMajor.subject_type_name || selectedFormMajor.subject_type_id || "-"} · แผนก:{" "}
                            {selectedFormMajor.department_id || "-"}
                        </p>
                    )}
                </Field>
                <Field label="รหัสสาขางาน (1 หลัก)">
                    <input
                        ref={firstFieldRef}
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
                    {isSubmitting ? "กำลังบันทึก..." : isEditMode ? "บันทึกการแก้ไข" : "เพิ่มสาขางาน"}
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