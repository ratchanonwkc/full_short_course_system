import { useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { Plus, Save, Trash2, Search, Pencil } from "lucide-react";
import Swal from "sweetalert2";
import SplitPanelLayout from "./SplitPanelLayout";
import FormStatusBanner from "./FormStatusBanner";

ModuleRegistry.registerModules([AllCommunityModule]);

const inputClass =
    "w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40";

/**
 * SimpleLookupSplitTab
 * -------------------------------------------------------------------------
 * เวอร์ชัน Split View ของ SimpleLookupTab เดิม ใช้กับ Lookup Table รูปแบบ
 * "id + ชื่อ 1 ฟิลด์" เช่น curriculums (curriculum_name), academic_levels (level_name)
 *
 * - ฝั่งซ้าย: AG-Grid list พร้อม Search
 * - ฝั่งขวา: Form พร้อม Banner บอกโหมดสร้าง/แก้ไขชัดเจน
 * - รองรับ Default Value อัตโนมัติ ถ้ามีข้อมูลแค่รายการเดียว (ผ่าน props)
 *
 * Props:
 * - title, primaryKey, placeholder
 * - fetchFn / createFn / updateFn / deleteFn
 */
export default function SimpleLookupSplitTab({ title, primaryKey, placeholder, fetchFn, createFn, updateFn, deleteFn }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [value, setValue] = useState("");
    const [editingItem, setEditingItem] = useState(null); // null = create mode
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);
    const inputRef = useRef(null);
    const gridRef = useRef(null);

    const isEditMode = Boolean(editingItem);

    const load = async () => {
        setLoading(true);
        try {
            const data = await fetchFn();
            setItems(data);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: `โหลดข้อมูล${title}ไม่สำเร็จ`,
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#0270c7",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Default value อัตโนมัติเมื่อมีข้อมูลเพียงรายการเดียว (เฉพาะตอนสร้างใหม่) ──
    useEffect(() => {
        if (!isEditMode && !value && items.length === 1) {
            setValue(items[0][primaryKey] ?? "");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, isEditMode]);

    const resetForm = () => {
        setValue("");
        setEditingItem(null);
    };

    const focusInput = () => {
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const handleStartEdit = (item) => {
        setEditingItem(item);
        setValue(item[primaryKey] ?? "");
        focusInput();
        setIsMobileFormOpen(true);
    };

    const handleStartCreate = () => {
        resetForm();
        focusInput();
        setIsMobileFormOpen(true);
    };

    const handleCancelEdit = () => {
        resetForm();
        setIsMobileFormOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!value.trim()) {
            Swal.fire({ icon: "warning", title: "กรุณากรอกข้อมูลให้ครบ", confirmButtonColor: "#0270c7" });
            return;
        }
        setIsSubmitting(true);
        try {
            if (isEditMode) {
                await updateFn(editingItem.id, { [primaryKey]: value.trim() });
            } else {
                await createFn({ [primaryKey]: value.trim() });
            }
            Swal.fire({
                toast: true, position: "top-end", icon: "success",
                title: isEditMode ? "บันทึกการแก้ไขสำเร็จ" : `เพิ่ม${title}ใหม่เรียบร้อยแล้ว`,
                showConfirmButton: false, timer: 2000, timerProgressBar: true,
            });
            resetForm();
            setIsMobileFormOpen(false);
            load();
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "บันทึกไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#0270c7",
            });
        } finally {
            setIsSubmitting(false);
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
            if (editingItem?.id === item.id) resetForm();
            load();
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

    const filteredItems = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return items;
        return items.filter((item) => (item[primaryKey] ?? "").toLowerCase().includes(term));
    }, [items, searchTerm, primaryKey]);

    const ActionsRenderer = (params) => (
        <div className="flex h-full items-center gap-1.5">
            <button
                type="button"
                title="แก้ไข"
                onClick={() => handleStartEdit(params.data)}
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
            { field: primaryKey, headerName: title, flex: 2, cellClass: "font-medium text-slate-800" },
            {
                headerName: "จัดการ",
                pinned: "right",
                width: 100,
                sortable: false,
                filter: false,
                cellRenderer: ActionsRenderer,
            },
        ],
        [primaryKey, title]
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
                        placeholder={`ค้นหา${title}...`}
                        className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                    />
                </div>
                <button
                    type="button"
                    onClick={handleStartCreate}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                    <Plus size={14} />
                    เพิ่ม{title}ใหม่
                </button>
            </div>

            <div className="min-h-[360px] flex-1 overflow-hidden rounded-lg border border-slate-200 lg:min-h-0">
                <AgGridReact
                    theme={themeQuartz}
                    ref={gridRef}
                    rowData={filteredItems}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    loading={loading}
                    domLayout="normal"
                    headerHeight={40}
                    rowHeight={42}
                    animateRows
                    overlayNoRowsTemplate={`<span class='text-sm text-slate-400'>ไม่พบข้อมูล${title}</span>`}
                    getRowId={(params) => String(params.data.id)}
                    getRowClass={(params) =>
                        editingItem && String(params.data.id) === String(editingItem.id)
                            ? "bg-amber-50"
                            : undefined
                    }
                    onRowClicked={(params) => handleStartEdit(params.data)}
                    rowStyle={{ cursor: "pointer" }}
                    className="h-full w-full"
                />
            </div>
        </>
    );

    const form = (
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <FormStatusBanner
                mode={isEditMode ? "edit" : "create"}
                editingLabel={editingItem?.[primaryKey]}
                onCancelEdit={handleCancelEdit}
                createLabel={`เพิ่ม${title}ใหม่`}
                editLabel={`แก้ไข${title}`}
            />

            <div className="flex-1 space-y-4 px-5 py-5">
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">{title}</label>
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        className={inputClass}
                        autoFocus
                    />
                    {items.length === 1 && !isEditMode && (
                        <p className="mt-1.5 text-xs text-slate-400">
                            * ระบบเลือกค่านี้ให้อัตโนมัติ เนื่องจากมีข้อมูลอยู่เพียงรายการเดียว
                        </p>
                    )}
                </div>
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
                    {isSubmitting ? "กำลังบันทึก..." : isEditMode ? "บันทึกการแก้ไข" : "เพิ่มรายการ"}
                </button>
            </div>
        </form>
    );

    return (
        <SplitPanelLayout
            grid={grid}
            form={form}
            isFormOpen={isMobileFormOpen}
            onCloseForm={() => setIsMobileFormOpen(false)}
        />
    );
}