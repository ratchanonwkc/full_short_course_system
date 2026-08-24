import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Save, Plus, Settings } from "lucide-react";
import Swal from "sweetalert2";
import axiosInstance from "../../../config/axiosInstance";
import ManageMasterModal from "./ManageMasterModal";
import VirtualizedCombobox from "../../../components/common/VirtualizedCombobox";

// Meta shared with ManageMasterModal's TYPE_META (kept local here to avoid a circular import)
const QUICK_ADD_META = {
    prefix: {
        title: "เพิ่มคำนำหน้าชื่อใหม่",
        primaryPlaceholder: "ชื่อย่อ เช่น นาย",
        secondaryPlaceholder: "ชื่อเต็ม เช่น นาย",
        hasSecondary: true,
        primaryKey: "short_name",
        secondaryKey: "full_name",
    },
    position: {
        title: "เพิ่มตำแหน่งหลักใหม่",
        primaryPlaceholder: "เช่น ครู, อาจารย์",
        hasSecondary: false,
        primaryKey: "position_name",
    },
    sub_position: {
        title: "เพิ่มหน้าที่พิเศษใหม่",
        primaryPlaceholder: "เช่น หัวหน้างาน, ที่ปรึกษา",
        hasSecondary: false,
        primaryKey: "sub_position_name",
    },
};

// Map ประเภท master data ฝั่ง UI (singular, snake_case) -> segment ของ REST endpoint
// ต้องตรงกับ TABLE_MAP ใน masterData.controller.js: prefixes | positions | sub-positions
const MASTER_API_TYPE = {
    prefix: "prefixes",
    position: "positions",
    sub_position: "sub-positions",
};

const EMPTY_FORM = {
    citizen_id: "",
    prefix_id: "",
    first_name_th: "",
    last_name_th: "",
    first_name_en: "",
    last_name_en: "",
    phone: "",
    email: "",
    position_id: "",
    sub_position_id: "",
    is_active: true,
};

/**
 * TeacherFormModal
 * -------------------------------------------------------------------------
 * Create / edit form for a `public.teachers` record.
 *
 * หมายเหตุ performance: ช่อง คำนำหน้าชื่อ / ตำแหน่งหลัก / หน้าที่พิเศษ ใช้
 * <VirtualizedCombobox> (src/components/common) ซึ่ง debounce การพิมพ์ค้นหา
 * และ virtualize รายการที่ render จริง แก้ปัญหา list ยาวแล้ว UI กระตุก/หน่วง
 *
 * Props:
 * - isOpen: boolean
 * - initialData: Teacher | null      -> null = create mode
 * - onClose: () => void
 * - onSaved: (teacher) => void
 * - prefixes: Array<{ id, short_name, full_name }>
 * - positions: Array<{ id, position_name }>
 * - subPositions: Array<{ id, sub_position_name }>
 * - onMasterCreated: (type, newItem) => void   -> called after a quick-add succeeds,
 *                                                  so the parent page can append it
 *                                                  to its master lists
 * - onMastersRefresh: () => void               -> called when ManageMasterModal closes,
 *                                                  so the parent page can re-fetch masters
 */
export default function TeacherFormModal({
    isOpen,
    initialData = null,
    onClose,
    onSaved,
    prefixes = [],
    positions = [],
    subPositions = [],
    onMasterCreated,
    onMastersRefresh,
}) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [quickAdd, setQuickAdd] = useState({ open: false, type: null });
    const [manage, setManage] = useState({ open: false, type: null });
    const isEditMode = Boolean(initialData);

    useEffect(() => {
        if (isOpen) {
            setForm(initialData ? { ...EMPTY_FORM, ...initialData } : EMPTY_FORM);
        }
    }, [isOpen, initialData]);

    const handleChange = (field) => (e) => {
        const { value } = e.target;
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleComboChange = (field) => (value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const prefixOptions = useMemo(
        () => prefixes.map((p) => ({ value: p.id, label: p.full_name ? `${p.short_name} (${p.full_name})` : p.short_name })),
        [prefixes]
    );
    const positionOptions = useMemo(
        () => positions.map((p) => ({ value: p.id, label: p.position_name })),
        [positions]
    );
    const subPositionOptions = useMemo(
        () => subPositions.map((p) => ({ value: p.id, label: p.sub_position_name })),
        [subPositions]
    );

    const FIELD_BY_TYPE = {
        prefix: "prefix_id",
        position: "position_id",
        sub_position: "sub_position_id",
    };

    const MANAGE_ITEMS_BY_TYPE = {
        prefix: prefixes,
        position: positions,
        sub_position: subPositions,
    };

    const openQuickAdd = (type) => setQuickAdd({ open: true, type });
    const closeQuickAdd = () => setQuickAdd({ open: false, type: null });

    const openManage = (type) => setManage({ open: true, type });
    const closeManage = () => {
        setManage({ open: false, type: null });
        // Sync the (possibly edited/deleted) master lists back into this form's dropdowns
        onMastersRefresh?.();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // ตัด field ที่ backend ไม่ต้องการ/เป็นค่า derived ออกก่อนส่ง (เช่น *_name ที่ join มา)
            const { prefix_name, position_name, sub_position_name, created_at, ...payload } = form;

            const { data } = isEditMode
                ? await axiosInstance.put(`/teachers/${form.id}`, payload)
                : await axiosInstance.post("/teachers", payload);

            onSaved?.(data);

            Swal.fire({
                icon: "success",
                title: isEditMode ? "บันทึกการแก้ไขสำเร็จ" : "เพิ่มอาจารย์สำเร็จ",
                text: `${[form.first_name_th, form.last_name_th].filter(Boolean).join(" ") || "ข้อมูลอาจารย์"} ถูกบันทึกเรียบร้อยแล้ว`,
                confirmButtonColor: "#0270c7",
            });
        } catch (err) {
            // 400 มาจาก backend กรณีเลขบัตรประชาชน/อีเมลซ้ำ (Unique Violation, code 23505)
            const isDuplicate = err?.response?.status === 400;
            Swal.fire({
                icon: "error",
                title: "บันทึกข้อมูลไม่สำเร็จ",
                text:
                    err?.response?.data?.message ||
                    (isDuplicate
                        ? "เลขบัตรประชาชนหรืออีเมลนี้มีในระบบแล้ว"
                        : "กรุณาตรวจสอบข้อมูลแล้วลองใหม่อีกครั้ง"),
                confirmButtonColor: "#0270c7",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={onClose}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-slate-900/50" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-200"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-150"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                                    {/* Header */}
                                    <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
                                        <Dialog.Title className="text-lg font-bold text-slate-900">
                                            {isEditMode ? "แก้ไขข้อมูลอาจารย์" : "เพิ่มอาจารย์ใหม่"}
                                        </Dialog.Title>
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                                        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                <Field label="เลขบัตรประชาชน" htmlFor="citizen_id" full>
                                                    <input
                                                        id="citizen_id"
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={13}
                                                        value={form.citizen_id}
                                                        onChange={handleChange("citizen_id")}
                                                        placeholder="เลขบัตรประชาชน 13 หลัก"
                                                        className={inputClass}
                                                        required
                                                    />
                                                </Field>

                                                <Field label="คำนำหน้าชื่อ" htmlFor="prefix_id">
                                                    <MasterCombobox
                                                        id="prefix_id"
                                                        value={form.prefix_id}
                                                        onChange={handleComboChange("prefix_id")}
                                                        options={prefixOptions}
                                                        placeholder="พิมพ์ค้นหาคำนำหน้าชื่อ..."
                                                        emptyText="ไม่พบคำนำหน้าชื่อ"
                                                        onQuickAdd={() => openQuickAdd("prefix")}
                                                        onManage={() => openManage("prefix")}
                                                    />
                                                </Field>

                                                <Field label="สถานะการใช้งาน" htmlFor="is_active">
                                                    <select
                                                        id="is_active"
                                                        value={form.is_active ? "1" : "0"}
                                                        onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.value === "1" }))}
                                                        className={inputClass}
                                                    >
                                                        <option value="1">ใช้งานอยู่</option>
                                                        <option value="0">ระงับการใช้งาน</option>
                                                    </select>
                                                </Field>

                                                <Field label="ชื่อจริง (ไทย)" htmlFor="first_name_th">
                                                    <input
                                                        id="first_name_th"
                                                        type="text"
                                                        value={form.first_name_th}
                                                        onChange={handleChange("first_name_th")}
                                                        className={inputClass}
                                                        required
                                                    />
                                                </Field>
                                                <Field label="นามสกุล (ไทย)" htmlFor="last_name_th">
                                                    <input
                                                        id="last_name_th"
                                                        type="text"
                                                        value={form.last_name_th}
                                                        onChange={handleChange("last_name_th")}
                                                        className={inputClass}
                                                        required
                                                    />
                                                </Field>

                                                <Field label="ชื่อจริง (English)" htmlFor="first_name_en">
                                                    <input
                                                        id="first_name_en"
                                                        type="text"
                                                        value={form.first_name_en}
                                                        onChange={handleChange("first_name_en")}
                                                        className={inputClass}
                                                    />
                                                </Field>
                                                <Field label="นามสกุล (English)" htmlFor="last_name_en">
                                                    <input
                                                        id="last_name_en"
                                                        type="text"
                                                        value={form.last_name_en}
                                                        onChange={handleChange("last_name_en")}
                                                        className={inputClass}
                                                    />
                                                </Field>

                                                <Field label="อีเมล" htmlFor="email">
                                                    <input
                                                        id="email"
                                                        type="email"
                                                        value={form.email}
                                                        onChange={handleChange("email")}
                                                        placeholder="name@example.com"
                                                        className={inputClass}
                                                    />
                                                </Field>
                                                <Field label="เบอร์โทร" htmlFor="phone">
                                                    <input
                                                        id="phone"
                                                        type="tel"
                                                        value={form.phone}
                                                        onChange={handleChange("phone")}
                                                        placeholder="0812345678"
                                                        className={inputClass}
                                                    />
                                                </Field>

                                                <Field label="ตำแหน่งหลัก" htmlFor="position_id">
                                                    <MasterCombobox
                                                        id="position_id"
                                                        value={form.position_id}
                                                        onChange={handleComboChange("position_id")}
                                                        options={positionOptions}
                                                        placeholder="พิมพ์ค้นหาตำแหน่งหลัก..."
                                                        emptyText="ไม่พบตำแหน่งหลัก"
                                                        onQuickAdd={() => openQuickAdd("position")}
                                                        onManage={() => openManage("position")}
                                                    />
                                                </Field>
                                                <Field label="หน้าที่พิเศษ" htmlFor="sub_position_id">
                                                    <MasterCombobox
                                                        id="sub_position_id"
                                                        value={form.sub_position_id}
                                                        onChange={handleComboChange("sub_position_id")}
                                                        options={subPositionOptions}
                                                        placeholder="พิมพ์ค้นหาหน้าที่พิเศษ..."
                                                        emptyText="ไม่พบหน้าที่พิเศษ"
                                                        onQuickAdd={() => openQuickAdd("sub_position")}
                                                        onManage={() => openManage("sub_position")}
                                                    />
                                                </Field>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                                            >
                                                ยกเลิก
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                <Save size={15} />
                                                {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Quick Add - เพิ่มรายการ master data ด่วนแล้ว auto-select */}
            <QuickAddModal
                isOpen={quickAdd.open}
                type={quickAdd.type}
                onClose={closeQuickAdd}
                onCreated={(type, newItem) => {
                    onMasterCreated?.(type, newItem);
                    setForm((prev) => ({ ...prev, [FIELD_BY_TYPE[type]]: newItem.id }));
                    closeQuickAdd();
                }}
            />

            {/* Manage - ดูทั้งหมด/แก้ไข/ลบ master data */}
            <ManageMasterModal
                isOpen={manage.open}
                type={manage.type || "position"}
                items={manage.type ? MANAGE_ITEMS_BY_TYPE[manage.type] : []}
                onClose={closeManage}
                onRefresh={onMastersRefresh}
            />
        </>
    );
}

const inputClass =
    "w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40";

function Field({ label, htmlFor, full = false, children }) {
    return (
        <div className={full ? "sm:col-span-2" : ""}>
            <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
                {label}
            </label>
            {children}
        </div>
    );
}

/**
 * MasterCombobox
 * -------------------------------------------------------------------------
 * บาง wrapper รอบ <VirtualizedCombobox> ที่เพิ่มปุ่ม "+" (quick add) และ
 * "⚙" (manage list) ไว้ด้านข้าง — ตัว search/filter/virtualization ทั้งหมด
 * ถูกยกไปให้ VirtualizedCombobox จัดการแทน (src/components/common)
 */
function MasterCombobox({ id, value, onChange, options, placeholder, emptyText, onQuickAdd, onManage }) {
    return (
        <div className="flex items-stretch gap-1.5">
            <div className="min-w-0 flex-1">
                <VirtualizedCombobox
                    id={id}
                    value={value}
                    onChange={onChange}
                    options={options}
                    placeholder={placeholder}
                    emptyText={emptyText}
                    className={inputClass}
                />
            </div>

            <button
                type="button"
                title="เพิ่มรายการใหม่ด่วน"
                onClick={onQuickAdd}
                className="flex shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-blue-600 transition hover:bg-blue-100"
            >
                <Plus size={15} />
            </button>
            <button
                type="button"
                title="จัดการรายการทั้งหมด"
                onClick={onManage}
                className="flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-slate-500 transition hover:bg-slate-100"
            >
                <Settings size={15} />
            </button>
        </div>
    );
}

/**
 * QuickAddModal
 * -------------------------------------------------------------------------
 * Tiny dialog for adding a single master-data item without leaving the
 * teacher form. Press Enter (or the button) to save; the new item is then
 * auto-selected in the calling combobox via `onCreated`.
 */
function QuickAddModal({ isOpen, type, onClose, onCreated }) {
    const meta = QUICK_ADD_META[type] || QUICK_ADD_META.position;
    const [primary, setPrimary] = useState("");
    const [secondary, setSecondary] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setPrimary("");
            setSecondary("");
        }
    }, [isOpen, type]);

    const handleSave = async () => {
        if (!primary.trim()) {
            Swal.fire({ icon: "warning", title: "กรุณากรอกชื่อรายการ", confirmButtonColor: "#0270c7" });
            return;
        }
        setIsSaving(true);
        try {
            const payload = {
                [meta.primaryKey]: primary.trim(),
                ...(meta.hasSecondary && { [meta.secondaryKey]: secondary.trim() }),
            };
            const { data } = await axiosInstance.post(`/${MASTER_API_TYPE[type]}`, payload);

            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: "เพิ่มรายการใหม่เรียบร้อยแล้ว",
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true,
            });

            onCreated?.(type, data);
        } catch (err) {
            const isDuplicate = err?.response?.status === 400;
            Swal.fire({
                icon: "error",
                title: "เพิ่มรายการไม่สำเร็จ",
                text: err?.response?.data?.message || (isDuplicate ? "รายการนี้มีอยู่แล้วในระบบ" : "กรุณาลองใหม่อีกครั้ง"),
                confirmButtonColor: "#0270c7",
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[70]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-150"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/60" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-150"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-100"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white p-5 text-left shadow-2xl transition-all">
                                <div className="mb-3 flex items-center justify-between">
                                    <Dialog.Title className="text-sm font-bold text-slate-900">{meta.title}</Dialog.Title>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        autoFocus
                                        value={primary}
                                        onChange={(e) => setPrimary(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && !meta.hasSecondary && handleSave()}
                                        placeholder={meta.primaryPlaceholder}
                                        className={inputClass}
                                    />
                                    {meta.hasSecondary && (
                                        <input
                                            type="text"
                                            value={secondary}
                                            onChange={(e) => setSecondary(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleSave()}
                                            placeholder={meta.secondaryPlaceholder}
                                            className={inputClass}
                                        />
                                    )}
                                </div>

                                <div className="mt-4 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                                    >
                                        <Plus size={13} />
                                        {isSaving ? "กำลังบันทึก..." : "เพิ่มและเลือกใช้"}
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