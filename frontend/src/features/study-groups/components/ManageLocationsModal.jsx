import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Save, Trash2, Plus, MapPin, Star } from "lucide-react";
import Swal from "sweetalert2";
import { createLocation, updateLocation, deleteLocation } from "../services/studyGroupApi";

const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30";

/**
 * ManageLocationsModal
 * -------------------------------------------------------------------------
 * Small Modal Dialog สำหรับจัดการ Master Data ของ "สถานที่จัดเรียนร่วม" (locations)
 * แบบไม่ต้องเปลี่ยนหน้า — เปิดจากปุ่ม [⚙️] ข้าง Combobox เลือกสถานที่ในฟอร์มกลุ่มเรียน
 *
 * Props:
 * - isOpen, onClose
 * - items: Array<{ id, name, is_default }>
 * - onRefresh: () => void   -> เรียกหลัง create/update/delete สำเร็จ ให้ parent re-fetch list
 */
export default function ManageLocationsModal({ isOpen, onClose, items = [], onRefresh }) {
    const [editMap, setEditMap] = useState({});
    const [newName, setNewName] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [savingId, setSavingId] = useState(null);

    useEffect(() => {
        const initial = {};
        items.forEach((item) => {
            initial[item.id] = { name: item.name ?? "" };
        });
        setEditMap(initial);
    }, [items]);

    useEffect(() => {
        if (isOpen) setNewName("");
    }, [isOpen]);

    const handleAddNew = async () => {
        if (!newName.trim()) {
            Swal.fire({ icon: "warning", title: "กรุณากรอกชื่อสถานที่", confirmButtonColor: "#4f46e5" });
            return;
        }
        setIsAdding(true);
        try {
            await createLocation({ name: newName.trim() });
            setNewName("");
            Swal.fire({
                toast: true, position: "top-end", icon: "success",
                title: "เพิ่มสถานที่ใหม่เรียบร้อยแล้ว", showConfirmButton: false, timer: 2000, timerProgressBar: true,
            });
            onRefresh?.();
        } catch (err) {
            const isDuplicate = err?.response?.status === 400;
            Swal.fire({
                icon: "error",
                title: "เพิ่มรายการไม่สำเร็จ",
                text: err?.response?.data?.message || (isDuplicate ? "ชื่อสถานที่นี้มีอยู่แล้วในระบบ" : "กรุณาลองใหม่อีกครั้ง"),
                confirmButtonColor: "#4f46e5",
            });
        } finally {
            setIsAdding(false);
        }
    };

    const handleSave = async (item) => {
        const value = editMap[item.id]?.name || "";
        if (!value.trim()) {
            Swal.fire({ icon: "warning", title: "กรุณากรอกชื่อสถานที่", confirmButtonColor: "#4f46e5" });
            return;
        }
        setSavingId(item.id);
        try {
            await updateLocation(item.id, { name: value.trim() });
            Swal.fire({
                toast: true, position: "top-end", icon: "success",
                title: "บันทึกเรียบร้อยแล้ว", showConfirmButton: false, timer: 2000, timerProgressBar: true,
            });
            onRefresh?.();
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
            html: `ต้องการลบ <b>${item.name}</b> ใช่หรือไม่?<br/><span style="color:#94a3b8;font-size:13px">หากมีกลุ่มเรียนใช้งานอยู่ จะไม่สามารถลบได้</span>`,
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
            await deleteLocation(item.id);
            Swal.fire({
                toast: true, position: "top-end", icon: "success",
                title: "ลบเรียบร้อยแล้ว", showConfirmButton: false, timer: 2000, timerProgressBar: true,
            });
            onRefresh?.();
        } catch (err) {
            const isConflict = err?.response?.status === 409;
            Swal.fire({
                icon: "error",
                title: isConflict ? "ไม่สามารถลบได้" : "เกิดข้อผิดพลาด",
                text:
                    err?.response?.data?.message ||
                    (isConflict ? "ไม่สามารถลบได้เนื่องจากมีกลุ่มเรียนใช้งานสถานที่นี้อยู่" : "กรุณาลองใหม่อีกครั้ง"),
                confirmButtonColor: "#4f46e5",
            });
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[70]" onClose={onClose}>
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
                            <Dialog.Panel className="relative flex max-h-[75vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all">
                                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                                        <MapPin size={16} className="text-indigo-600" />
                                    </span>
                                    <Dialog.Title className="flex-1 text-base font-bold text-slate-900">
                                        จัดการสถานที่จัดเรียนร่วม
                                    </Dialog.Title>
                                    <button
                                        type="button" onClick={onClose}
                                        className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                    >
                                        <X size={17} />
                                    </button>
                                </div>

                                <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                                    <div className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 p-3">
                                        <p className="mb-2 text-xs font-semibold text-indigo-600">➕ เพิ่มสถานที่ใหม่</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleAddNew()}
                                                placeholder="ชื่อสถานที่ เช่น อาคาร 1, ศูนย์ฝึกอบรม"
                                                className={inputClass}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddNew}
                                                disabled={isAdding}
                                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                                            >
                                                <Plus size={13} />
                                                {isAdding ? "กำลังเพิ่ม..." : "เพิ่ม"}
                                            </button>
                                        </div>
                                    </div>

                                    {items.length === 0 ? (
                                        <p className="py-6 text-center text-sm text-slate-400">ไม่มีรายการ</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 transition hover:border-slate-300 hover:shadow-sm"
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <input
                                                            type="text"
                                                            value={editMap[item.id]?.name ?? ""}
                                                            onChange={(e) =>
                                                                setEditMap((prev) => ({
                                                                    ...prev,
                                                                    [item.id]: { name: e.target.value },
                                                                }))
                                                            }
                                                            className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
                                                        />
                                                        {item.is_default && (
                                                            <span title="ค่าเริ่มต้น" className="shrink-0 text-amber-500">
                                                                <Star size={14} fill="currentColor" />
                                                            </span>
                                                        )}
                                                    </div>
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