import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Save, Trash2, Plus, Tag, Search } from "lucide-react";
import Swal from "sweetalert2";
import axiosInstance from "../../../config/axiosInstance";

const TYPE_META = {
    prefix: {
        title: "จัดการคำนำหน้าชื่อ",
        namePlaceholder: "ชื่อย่อ เช่น นาย",
        secondaryPlaceholder: "ชื่อเต็ม เช่น นาย",
        hasSecondary: true,
        secondaryKey: "full_name",
        primaryKey: "short_name",
        secondaryLabel: "ชื่อเต็ม",
        primaryLabel: "ชื่อย่อ",
    },
    position: {
        title: "จัดการตำแหน่งหลัก",
        namePlaceholder: "เช่น ครู, อาจารย์",
        hasSecondary: false,
        primaryKey: "position_name",
        primaryLabel: "ชื่อตำแหน่ง",
    },
    sub_position: {
        title: "จัดการหน้าที่พิเศษ",
        namePlaceholder: "เช่น หัวหน้างาน, ที่ปรึกษา",
        hasSecondary: false,
        primaryKey: "sub_position_name",
        primaryLabel: "ชื่อหน้าที่พิเศษ",
    },
};

// Map ประเภท master data ฝั่ง UI (singular, snake_case) -> segment ของ REST endpoint
// ต้องตรงกับ TABLE_MAP ใน masterData.controller.js: prefixes | positions | sub-positions
const MASTER_API_TYPE = {
    prefix: "prefixes",
    position: "positions",
    sub_position: "sub-positions",
};

/**
 * ManageMasterModal
 * ─────────────────────────────────────────────────────────────────────────
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - type: "prefix" | "position" | "sub_position"
 * - items: Array<object>   → list fetched from API/Supabase
 * - onRefresh: () => void  → callback to re-fetch the items list after changes
 */
export default function ManageMasterModal({
    isOpen,
    onClose,
    type = "position",
    items = [],
    onRefresh,
}) {
    const meta = TYPE_META[type] || TYPE_META.position;
    const apiType = MASTER_API_TYPE[type] || MASTER_API_TYPE.position;

    // local edit state per row: { [id]: { primary, secondary } }
    const [editMap, setEditMap] = useState({});
    // new item form
    const [newPrimary, setNewPrimary] = useState("");
    const [newSecondary, setNewSecondary] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [savingId, setSavingId] = useState(null);
    // search / filter for the items list
    const [searchTerm, setSearchTerm] = useState("");

    // Populate editMap when items list changes
    useEffect(() => {
        const initial = {};
        items.forEach((item) => {
            initial[item.id] = {
                primary: item[meta.primaryKey] ?? "",
                secondary: meta.hasSecondary ? (item[meta.secondaryKey] ?? "") : "",
            };
        });
        setEditMap(initial);
    }, [items, meta]);

    // Reset the search box whenever the modal is reopened or switches type
    useEffect(() => {
        if (isOpen) setSearchTerm("");
    }, [isOpen, type]);

    const handleFieldChange = (id, field, val) => {
        setEditMap((prev) => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
    };

    // Filter by the *live edit values* so a just-edited row stays searchable,
    // and fall back to the original item fields (covers rows not yet touched).
    const filteredItems = items.filter((item) => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return true;
        const edited = editMap[item.id];
        const primary = (edited?.primary ?? item[meta.primaryKey] ?? "").toLowerCase();
        const secondary = meta.hasSecondary
            ? (edited?.secondary ?? item[meta.secondaryKey] ?? "").toLowerCase()
            : "";
        return primary.includes(term) || secondary.includes(term);
    });

    const handleSave = async (item) => {
        const values = editMap[item.id] || {};
        if (!values.primary?.trim()) {
            Swal.fire({ icon: "warning", title: "กรุณากรอกข้อมูลให้ครบ", confirmButtonColor: "#0270c7" });
            return;
        }
        setSavingId(item.id);
        try {
            const payload = {
                [meta.primaryKey]: values.primary.trim(),
                ...(meta.hasSecondary && { [meta.secondaryKey]: values.secondary.trim() }),
            };
            await axiosInstance.put(`/${apiType}/${item.id}`, payload);

            Swal.fire({
                toast: true, position: "top-end", icon: "success",
                title: "บันทึกเรียบร้อยแล้ว", showConfirmButton: false,
                timer: 2000, timerProgressBar: true,
            });
            onRefresh?.();
        } catch (err) {
            const isDuplicate = err?.response?.status === 400;
            Swal.fire({
                icon: "error",
                title: "บันทึกไม่สำเร็จ",
                text: err?.response?.data?.message || (isDuplicate ? "ชื่อรายการนี้มีอยู่แล้วในระบบ" : "กรุณาลองใหม่อีกครั้ง"),
                confirmButtonColor: "#0270c7",
            });
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (item) => {
        const result = await Swal.fire({
            title: "ยืนยันการลบ?",
            html: `ต้องการลบ <b>${item[meta.primaryKey]}</b> ใช่หรือไม่?<br/><span style="color:#94a3b8;font-size:13px">หากมีอาจารย์ใช้งานอยู่ จะไม่สามารถลบได้</span>`,
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
            await axiosInstance.delete(`/${apiType}/${item.id}`);

            Swal.fire({
                toast: true, position: "top-end", icon: "success",
                title: "ลบเรียบร้อยแล้ว", showConfirmButton: false,
                timer: 2000, timerProgressBar: true,
            });
            onRefresh?.();
        } catch (err) {
            // Backend ส่ง 409 กลับมาเมื่อมี Foreign Key Constraint (มีอาจารย์ใช้งานรายการนี้อยู่)
            const isConflict = err?.response?.status === 409;
            Swal.fire({
                icon: "error",
                title: isConflict ? "ไม่สามารถลบได้" : "เกิดข้อผิดพลาด",
                text:
                    err?.response?.data?.message ||
                    (isConflict
                        ? "ไม่สามารถลบได้เนื่องจากมีข้อมูลอาจารย์ใช้งานรายการนี้อยู่"
                        : "กรุณาลองใหม่อีกครั้ง"),
                confirmButtonColor: "#0270c7",
            });
        }
    };

    const handleAddNew = async () => {
        if (!newPrimary.trim()) {
            Swal.fire({ icon: "warning", title: "กรุณากรอกข้อมูลให้ครบ", confirmButtonColor: "#0270c7" });
            return;
        }
        setIsAdding(true);
        try {
            const payload = {
                [meta.primaryKey]: newPrimary.trim(),
                ...(meta.hasSecondary && { [meta.secondaryKey]: newSecondary.trim() }),
            };
            await axiosInstance.post(`/${apiType}`, payload);

            setNewPrimary("");
            setNewSecondary("");
            Swal.fire({
                toast: true, position: "top-end", icon: "success",
                title: "เพิ่มรายการใหม่เรียบร้อยแล้ว", showConfirmButton: false,
                timer: 2000, timerProgressBar: true,
            });
            onRefresh?.();
        } catch (err) {
            const isDuplicate = err?.response?.status === 400;
            Swal.fire({
                icon: "error",
                title: "เพิ่มรายการไม่สำเร็จ",
                text: err?.response?.data?.message || (isDuplicate ? "ชื่อรายการนี้มีอยู่แล้วในระบบ" : "กรุณาลองใหม่อีกครั้ง"),
                confirmButtonColor: "#0270c7",
            });
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[60]" onClose={onClose}>
                {/* Backdrop */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/60" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="relative flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all">

                                {/* Header */}
                                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                                        <Tag size={16} className="text-blue-600" />
                                    </span>
                                    <Dialog.Title className="flex-1 text-base font-bold text-slate-900">
                                        {meta.title}
                                    </Dialog.Title>
                                    <button
                                        type="button" onClick={onClose}
                                        className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                    >
                                        <X size={17} />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">

                                    {/* Add-new form */}
                                    <div className="rounded-xl border border-dashed border-blue-300 bg-blue-50/40 p-3">
                                        <p className="mb-2 text-xs font-semibold text-blue-600">➕ เพิ่มรายการใหม่</p>
                                        <div className={`grid gap-2 ${meta.hasSecondary ? "grid-cols-2" : "grid-cols-1"}`}>
                                            <input
                                                type="text"
                                                value={newPrimary}
                                                onChange={(e) => setNewPrimary(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleAddNew()}
                                                placeholder={meta.namePlaceholder}
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                                            />
                                            {meta.hasSecondary && (
                                                <input
                                                    type="text"
                                                    value={newSecondary}
                                                    onChange={(e) => setNewSecondary(e.target.value)}
                                                    onKeyDown={(e) => e.key === "Enter" && handleAddNew()}
                                                    placeholder={meta.secondaryPlaceholder}
                                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                                                />
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleAddNew}
                                            disabled={isAdding}
                                            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                                        >
                                            <Plus size={13} />
                                            {isAdding ? "กำลังเพิ่ม..." : "เพิ่มรายการ"}
                                        </button>
                                    </div>

                                    {/* Search / filter */}
                                    {items.length > 0 && (
                                        <div className="relative">
                                            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="ค้นหารายการ..."
                                                className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                                            />
                                        </div>
                                    )}

                                    {/* Existing items list */}
                                    {items.length === 0 ? (
                                        <p className="py-6 text-center text-sm text-slate-400">ไม่มีรายการ</p>
                                    ) : filteredItems.length === 0 ? (
                                        <p className="py-6 text-center text-sm text-slate-400">
                                            ไม่พบรายการที่ตรงกับ "{searchTerm}"
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {/* Column headers */}
                                            <div
                                                className={`grid items-center gap-2 px-1 text-xs font-semibold text-slate-400 ${meta.hasSecondary ? "grid-cols-[1fr_1fr_auto]" : "grid-cols-[1fr_auto]"}`}
                                            >
                                                <span>{meta.primaryLabel}</span>
                                                {meta.hasSecondary && <span>{meta.secondaryLabel}</span>}
                                                <span>จัดการ</span>
                                            </div>

                                            {filteredItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className={`grid items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 transition hover:border-slate-300 hover:shadow-sm ${meta.hasSecondary ? "grid-cols-[1fr_1fr_auto]" : "grid-cols-[1fr_auto]"}`}
                                                >
                                                    <input
                                                        type="text"
                                                        value={editMap[item.id]?.primary ?? ""}
                                                        onChange={(e) => handleFieldChange(item.id, "primary", e.target.value)}
                                                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
                                                    />
                                                    {meta.hasSecondary && (
                                                        <input
                                                            type="text"
                                                            value={editMap[item.id]?.secondary ?? ""}
                                                            onChange={(e) => handleFieldChange(item.id, "secondary", e.target.value)}
                                                            className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
                                                        />
                                                    )}
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

                                {/* Footer */}
                                <div className="flex justify-end border-t border-slate-100 px-5 py-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                                    >
                                        ปิด
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}