import { Fragment, useEffect, useMemo, useState } from "react";
import { Combobox, Dialog, Tab, Transition } from "@headlessui/react";
import { X, ClipboardCopy, Save, Layers, FilePlus2, Zap, ChevronsUpDown, Check, XCircle } from "lucide-react";
import Swal from "sweetalert2";
import {
    createBatch,
    updateBatch,
    createBulkYearBatches,
    getLatestPersonnel,
} from "../services/batchApi";
import ThaiDateInput from "../../../components/common/ThaiDateInput";

const STATUS_OPTIONS = [
    { value: "planning", label: "วางแผน" },
    { value: "admitting", label: "เปิดรับสมัคร" },
    { value: "studying", label: "กำลังเรียน" },
    { value: "ended", label: "จบหลักสูตรแล้ว" },
    { value: "cancelled", label: "ยกเลิก" },
];

const TABS = ["ข้อมูลรุ่น", "กำหนดการ & ชั่วโมง", "ผู้รับผิดชอบ"];

// ฝ่ายบริหาร: ผอ. + รองฯ 4 ฝ่าย
const EXEC_ROLES = [
    { key: "director_id", label: "ผู้อำนวยการ (ผอ.)" },
    { key: "deputy_academic_id", label: "รองฯ ฝ่ายวิชาการ" },
    { key: "deputy_resources_id", label: "รองฯ ฝ่ายบริหารทรัพยากร" },
    { key: "deputy_planning_id", label: "รองฯ ฝ่ายแผนงานและความร่วมมือ" },
    { key: "deputy_activities_id", label: "รองฯ ฝ่ายกิจกรรมนักศึกษา" },
];

// ฝ่ายปฏิบัติการ: หัวหน้างาน 4 ฝ่าย
const OPS_ROLES = [
    { key: "head_registration_id", label: "หัวหน้างานทะเบียน" },
    { key: "head_curriculum_id", label: "หัวหน้างานหลักสูตร" },
    { key: "head_planning_id", label: "หัวหน้างานแผนงาน" },
    { key: "head_evaluation_id", label: "หัวหน้างานวัดผลประเมินผล" },
];

const ALL_ROLES = [...EXEC_ROLES, ...OPS_ROLES];

const EMPTY_FORM = {
    // Tab 1
    academic_year: "",
    term: "",
    batch_no: "",
    batch_name: "",
    status: "planning",
    // Tab 2
    batch_start_date: "",
    batch_end_date: "",
    admit_open_date: "",
    admit_close_date: "",
    study_open_date: "",
    study_close_date: "",
    total_hours: "",
    // Tab 3 (director_signature_url / head_registration_signature_url ถูกซ่อนไว้ชั่วคราว)
    ...Object.fromEntries(ALL_ROLES.map((r) => [r.key, ""])),
};

const CURRENT_BE_YEAR = String(new Date().getFullYear() + 543);

const EMPTY_BULK_COMMON = {
    academic_year: CURRENT_BE_YEAR,
    ...Object.fromEntries(ALL_ROLES.map((r) => [r.key, ""])),
};

// รุ่น 1/Y, 2/Y = เทอม 1 | รุ่น 3/Y, 4/Y = เทอม 2
const EMPTY_BULK_ROWS = [1, 2, 3, 4].map((batch_no) => ({
    batch_no,
    term: batch_no <= 2 ? 1 : 2,
    batch_start_date: "",
    batch_end_date: "",
    admit_open_date: "",
    admit_close_date: "",
    study_open_date: "",
    study_close_date: "",
    total_hours: "",
}));

/**
 * BatchFormModal
 * -------------------------------------------------------------------------
 * Modal for a "batch" (รุ่นการเรียน) matching the `public.batches` schema,
 * with two creation modes:
 * - Single Batch: create/edit one batch through a 3-tab form
 * - Bulk Year Setup: create a full academic year (2 terms / 4 batches) at once
 *
 * Notes on schema mapping:
 * - academic_year is varchar(4) -> plain text input, max length 4 (พ.ศ. ตามที่ผู้ใช้กรอกเอง)
 * - term is smallint (1 or 2) -> select limited to 1 / 2
 * - batch_no is smallint (1-4) -> select limited to 1-4
 * - ฟิลด์วันที่ทั้งหมด (batch_start_date ฯลฯ) ยังคงเก็บใน state เป็น ISO ค.ศ. "YYYY-MM-DD"
 *   เหมือนเดิม (เพื่อยิงเข้า backend ตรง ๆ) แต่แสดงผล/รับ input เป็นไทย+พ.ศ. ผ่าน ThaiDateInput
 * - director_signature_url / head_registration_signature_url are part of the
 *   schema but intentionally hidden from this form for now
 *
 * Props:
 * - isOpen: boolean
 * - initialData: Batch | null       -> null = create mode, object = edit mode (always single-batch)
 * - onClose: () => void
 * - onSaved: (batch) => void        -> called once per saved batch (single mode: 1 call, bulk mode: 4 calls)
 * - teachers: Array<Teacher>        -> รายชื่ออาจารย์จริงจาก GET /teachers (public.teachers, มี prefix_name/
 *                                       first_name_th/last_name_th) ให้หน้า BatchesPage ดึงมาส่งเป็น prop
 * - teachersLoading: boolean        -> true ระหว่างที่ BatchesPage ยังโหลดรายชื่ออาจารย์อยู่
 */
export default function BatchFormModal({
    isOpen,
    initialData = null,
    onClose,
    onSaved,
    teachers = [],
    teachersLoading = false,
}) {
    const [mode, setMode] = useState("single"); // "single" | "bulk"
    const [form, setForm] = useState(EMPTY_FORM);
    const [bulkCommon, setBulkCommon] = useState(EMPTY_BULK_COMMON);
    const [bulkRows, setBulkRows] = useState(EMPTY_BULK_ROWS);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditMode = Boolean(initialData);

    useEffect(() => {
        if (isOpen) {
            setMode("single");
            setForm(initialData ? { ...EMPTY_FORM, ...initialData } : EMPTY_FORM);
            setBulkCommon(EMPTY_BULK_COMMON);
            setBulkRows(EMPTY_BULK_ROWS);
        }
    }, [isOpen, initialData]);

    const handleChange = (field) => (e) => {
        const { value } = e.target;
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    // สำหรับฟิลด์วันที่ (ThaiDateInput ส่งค่ากลับมาเป็น ISO string ตรง ๆ ไม่ใช่ event)
    const handleDateChange = (field) => (isoValue) => {
        setForm((prev) => ({ ...prev, [field]: isoValue }));
    };

    const handleComboChange = (field) => (value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleBulkCommonChange = (field) => (e) => {
        const { value } = e.target;
        setBulkCommon((prev) => ({ ...prev, [field]: value }));
    };

    const handleBulkCommonComboChange = (field) => (value) => {
        setBulkCommon((prev) => ({ ...prev, [field]: value }));
    };

    const handleBulkRowChange = (index, field) => (e) => {
        const { value } = e.target;
        setBulkRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    };

    // สำหรับฟิลด์วันที่ในแต่ละแถวของโหมด Bulk Year
    const handleBulkRowDateChange = (index, field) => (isoValue) => {
        setBulkRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: isoValue } : row)));
    };

    // ต่อ "คำนำหน้า + ชื่อ + นามสกุล" จากข้อมูลอาจารย์จริงให้เป็น label เดียวใน Combobox
    // (เผื่อ backend ยังไม่ join prefix_name มาให้ ก็ยัง fallback ไปที่ชื่อ-นามสกุลเฉย ๆ ได้)
    const teacherOptions = useMemo(
        () =>
            teachers.map((t) => ({
                value: t.id,
                label:
                    t.name ||
                    [t.prefix_name, t.first_name_th, t.last_name_th].filter(Boolean).join(" ") ||
                    `อาจารย์ #${t.id}`,
            })),
        [teachers]
    );

    const handleCopyFromLatest = async () => {
        try {
            // ยิง GET /batches/latest-personnel จริง -> ได้ ID อาจารย์ทั้ง 9 ตำแหน่งจากรุ่นล่าสุด
            const data = await getLatestPersonnel();

            setForm((prev) => ({
                ...prev,
                ...Object.fromEntries(ALL_ROLES.map((r) => [r.key, data[r.key] ?? ""])),
            }));

            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: "คัดลอกข้อมูลผู้รับผิดชอบเรียบร้อยแล้ว",
                showConfirmButton: false,
                timer: 2200,
                timerProgressBar: true,
            });
        } catch (err) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: err?.response?.data?.message || "ไม่สามารถคัดลอกข้อมูลได้",
                showConfirmButton: false,
                timer: 2200,
            });
        }
    };

    const handleCopyFromPreviousYear = async () => {
        try {
            // หมายเหตุ: ฝั่ง backend (batches.routes.js) ยังมีแค่ endpoint
            // GET /batches/latest-personnel (ดึงจากรุ่นล่าสุดตาม id ไม่ได้กรองตามปีการศึกษา)
            // จึงใช้ endpoint เดียวกันไปพลางก่อน ถ้าต้องการดึง "เฉพาะปีก่อนหน้า" จริง ๆ
            // ควรเพิ่ม endpoint ใหม่ฝั่ง backend เช่น
            // GET /batches/latest-personnel?academic_year=${Number(bulkCommon.academic_year) - 1}
            const data = await getLatestPersonnel();

            setBulkCommon((prev) => ({
                ...prev,
                ...Object.fromEntries(ALL_ROLES.map((r) => [r.key, data[r.key] ?? ""])),
            }));

            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: "คัดลอกผู้บริหารจากปีก่อนหน้าเรียบร้อยแล้ว",
                showConfirmButton: false,
                timer: 2200,
                timerProgressBar: true,
            });
        } catch (err) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: err?.response?.data?.message || "ไม่สามารถคัดลอกข้อมูลผู้บริหารได้",
                showConfirmButton: false,
                timer: 2200,
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // โหมดแก้ไข -> PUT /batches/:id, โหมดสร้างใหม่ -> POST /batches
            // (form.*_date เป็น ISO ค.ศ. อยู่แล้วจาก ThaiDateInput จึงส่งตรง ๆ ได้เลย)
            const data = isEditMode ? await updateBatch(form.id, form) : await createBatch(form);

            onSaved?.(data);

            Swal.fire({
                icon: "success",
                title: isEditMode ? "บันทึกการแก้ไขสำเร็จ" : "สร้างรุ่นการเรียนสำเร็จ",
                text: `${data.batch_name || "รุ่นการเรียน"} ถูกบันทึกเรียบร้อยแล้ว`,
                confirmButtonColor: "#4f46e5",
            });
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

    const handleBulkSubmit = async (e) => {
        e.preventDefault();

        if (!bulkCommon.academic_year) {
            Swal.fire({
                icon: "warning",
                title: "กรุณากรอกปีการศึกษา",
                confirmButtonColor: "#4f46e5",
            });
            return;
        }

        const responsibleFields = Object.fromEntries(ALL_ROLES.map((r) => [r.key, bulkCommon[r.key]]));

        const payload = bulkRows.map((row) => ({
            academic_year: bulkCommon.academic_year,
            term: row.term,
            batch_no: row.batch_no,
            batch_name: `รุ่น ${row.batch_no}/${bulkCommon.academic_year}`,
            status: "planning",
            batch_start_date: row.batch_start_date,
            batch_end_date: row.batch_end_date,
            admit_open_date: row.admit_open_date,
            admit_close_date: row.admit_close_date,
            study_open_date: row.study_open_date,
            study_close_date: row.study_close_date,
            total_hours: row.total_hours,
            ...responsibleFields,
        }));

        setIsSubmitting(true);
        try {
            // ยิง POST /batches/bulk-year ครั้งเดียวพร้อม Array 4 Items
            // backend (batches.controller.js) จะ insert ทีเดียวแล้วตอบกลับ { message, count, data }
            const { data } = await createBulkYearBatches(payload);

            data.forEach((item) => onSaved?.(item));

            Swal.fire({
                icon: "success",
                title: "สร้างรุ่นการเรียนยกปีสำเร็จ",
                text: `สร้างรุ่นการเรียนปีการศึกษา ${bulkCommon.academic_year} ทั้ง 4 รุ่นเรียบร้อยแล้ว`,
                confirmButtonColor: "#4f46e5",
            });
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "สร้างรุ่นการเรียนยกปีไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาตรวจสอบข้อมูลแล้วลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
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
                            <Dialog.Panel className="relative flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                                {/* Header */}
                                <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
                                    <Dialog.Title className="text-lg font-bold text-slate-900">
                                        {isEditMode ? "แก้ไขรุ่นการเรียน" : "สร้างรุ่นการเรียนใหม่"}
                                    </Dialog.Title>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Mode toggle - only when creating a new batch */}
                                {!isEditMode && (
                                    <div className="flex justify-center border-b border-slate-100 bg-slate-50/60 px-6 py-3">
                                        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                                            <button
                                                type="button"
                                                onClick={() => setMode("single")}
                                                className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition sm:text-sm ${mode === "single"
                                                    ? "bg-indigo-600 text-white shadow-sm"
                                                    : "text-slate-500 hover:text-slate-700"
                                                    }`}
                                            >
                                                <FilePlus2 size={14} />
                                                สร้างทีละรุ่น
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setMode("bulk")}
                                                className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition sm:text-sm ${mode === "bulk"
                                                    ? "bg-indigo-600 text-white shadow-sm"
                                                    : "text-slate-500 hover:text-slate-700"
                                                    }`}
                                            >
                                                <Layers size={14} />
                                                สร้างยกปีการศึกษา (2 เทอม 4 รุ่น)
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {mode === "single" ? (
                                    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                                        <Tab.Group>
                                            <Tab.List className="flex gap-1 border-b border-slate-100 bg-slate-50/60 px-6">
                                                {TABS.map((label) => (
                                                    <Tab key={label} as={Fragment}>
                                                        {({ selected }) => (
                                                            <button
                                                                type="button"
                                                                className={`relative px-3 py-3 text-sm font-semibold outline-none transition ${selected ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"
                                                                    }`}
                                                            >
                                                                {label}
                                                                {selected && (
                                                                    <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-indigo-600" />
                                                                )}
                                                            </button>
                                                        )}
                                                    </Tab>
                                                ))}
                                            </Tab.List>

                                            <Tab.Panels className="flex-1 overflow-y-auto px-6 py-5">
                                                {/* Tab 1: ข้อมูลรุ่น */}
                                                <Tab.Panel className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                    <Field label="ปีการศึกษา" htmlFor="academic_year">
                                                        <input
                                                            id="academic_year"
                                                            type="text"
                                                            inputMode="numeric"
                                                            maxLength={4}
                                                            value={form.academic_year}
                                                            onChange={handleChange("academic_year")}
                                                            placeholder="เช่น 2570"
                                                            className={inputClass}
                                                            required
                                                        />
                                                    </Field>

                                                    <Field label="ภาคเรียน" htmlFor="term">
                                                        <select id="term" value={form.term} onChange={handleChange("term")} className={inputClass} required>
                                                            <option value="">เลือกภาคเรียน</option>
                                                            <option value="1">ภาคเรียนที่ 1</option>
                                                            <option value="2">ภาคเรียนที่ 2</option>
                                                        </select>
                                                    </Field>

                                                    <Field label="รุ่นที่" htmlFor="batch_no">
                                                        <select id="batch_no" value={form.batch_no} onChange={handleChange("batch_no")} className={inputClass} required>
                                                            <option value="">เลือกรุ่นที่</option>
                                                            <option value="1">1</option>
                                                            <option value="2">2</option>
                                                            <option value="3">3</option>
                                                            <option value="4">4</option>
                                                        </select>
                                                    </Field>

                                                    <Field label="สถานะ" htmlFor="status">
                                                        <select id="status" value={form.status} onChange={handleChange("status")} className={inputClass}>
                                                            {STATUS_OPTIONS.map((opt) => (
                                                                <option key={opt.value} value={opt.value}>
                                                                    {opt.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </Field>

                                                    <Field label="ชื่อรุ่น" htmlFor="batch_name" full>
                                                        <input
                                                            id="batch_name"
                                                            type="text"
                                                            maxLength={50}
                                                            value={form.batch_name}
                                                            onChange={handleChange("batch_name")}
                                                            placeholder='เช่น "รุ่น 1/2570"'
                                                            className={inputClass}
                                                            required
                                                        />
                                                    </Field>
                                                </Tab.Panel>

                                                {/* Tab 2: กำหนดการ & ชั่วโมง */}
                                                <Tab.Panel className="space-y-5">
                                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                                        <DateRangeGroup
                                                            title="ช่วงเวลารุ่น"
                                                            startId="batch_start_date"
                                                            startValue={form.batch_start_date}
                                                            onStartChange={handleDateChange("batch_start_date")}
                                                            endId="batch_end_date"
                                                            endValue={form.batch_end_date}
                                                            onEndChange={handleDateChange("batch_end_date")}
                                                        />
                                                        <DateRangeGroup
                                                            title="ช่วงรับสมัคร"
                                                            startId="admit_open_date"
                                                            startValue={form.admit_open_date}
                                                            onStartChange={handleDateChange("admit_open_date")}
                                                            endId="admit_close_date"
                                                            endValue={form.admit_close_date}
                                                            onEndChange={handleDateChange("admit_close_date")}
                                                        />
                                                        <DateRangeGroup
                                                            title="ช่วงเวลาเรียน"
                                                            startId="study_open_date"
                                                            startValue={form.study_open_date}
                                                            onStartChange={handleDateChange("study_open_date")}
                                                            endId="study_close_date"
                                                            endValue={form.study_close_date}
                                                            onEndChange={handleDateChange("study_close_date")}
                                                        />
                                                    </div>

                                                    <Field label="จำนวนชั่วโมงรวม" htmlFor="total_hours">
                                                        <input
                                                            id="total_hours"
                                                            type="number"
                                                            min="0"
                                                            value={form.total_hours}
                                                            onChange={handleChange("total_hours")}
                                                            placeholder="เช่น 120"
                                                            className={`${inputClass} sm:w-48`}
                                                        />
                                                    </Field>
                                                </Tab.Panel>

                                                {/* Tab 3: ผู้รับผิดชอบ */}
                                                <Tab.Panel className="space-y-5">
                                                    <button
                                                        type="button"
                                                        onClick={handleCopyFromLatest}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
                                                    >
                                                        <ClipboardCopy size={14} />
                                                        คัดลอกข้อมูลผู้รับผิดชอบจากรุ่นล่าสุด
                                                    </button>

                                                    <ResponsibleCard title="ฝ่ายบริหาร (ผอ. และ รองฯ 4 ฝ่าย)" roles={EXEC_ROLES}>
                                                        {EXEC_ROLES.map((role) => (
                                                            <Field key={role.key} label={role.label} htmlFor={role.key}>
                                                                <TeacherCombobox
                                                                    id={role.key}
                                                                    value={form[role.key]}
                                                                    onChange={handleComboChange(role.key)}
                                                                    options={teacherOptions}
                                                                    disabled={teachersLoading}
                                                                />
                                                            </Field>
                                                        ))}
                                                    </ResponsibleCard>

                                                    <ResponsibleCard title="ฝ่ายปฏิบัติการ (หัวหน้างาน 4 ฝ่าย)" roles={OPS_ROLES}>
                                                        {OPS_ROLES.map((role) => (
                                                            <Field key={role.key} label={role.label} htmlFor={role.key}>
                                                                <TeacherCombobox
                                                                    id={role.key}
                                                                    value={form[role.key]}
                                                                    onChange={handleComboChange(role.key)}
                                                                    options={teacherOptions}
                                                                    disabled={teachersLoading}
                                                                />
                                                            </Field>
                                                        ))}
                                                    </ResponsibleCard>
                                                </Tab.Panel>
                                            </Tab.Panels>
                                        </Tab.Group>

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
                                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                <Save size={15} />
                                                {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <form onSubmit={handleBulkSubmit} className="flex min-h-0 flex-1 flex-col">
                                        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                                            {/* ปีการศึกษา + auto-fill ผู้บริหาร */}
                                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                                    <Field label="ปีการศึกษา" htmlFor="bulk_academic_year">
                                                        <input
                                                            id="bulk_academic_year"
                                                            type="text"
                                                            inputMode="numeric"
                                                            maxLength={4}
                                                            value={bulkCommon.academic_year}
                                                            onChange={handleBulkCommonChange("academic_year")}
                                                            placeholder="เช่น 2570"
                                                            className={`${inputClass} sm:w-40`}
                                                            required
                                                        />
                                                    </Field>
                                                    <button
                                                        type="button"
                                                        onClick={handleCopyFromPreviousYear}
                                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 sm:text-sm"
                                                    >
                                                        <Zap size={14} />
                                                        คัดลอกผู้บริหารจากปีก่อนหน้า (Auto-fill)
                                                    </button>
                                                </div>

                                                <div className="mt-4 space-y-4">
                                                    <ResponsibleCard title="ฝ่ายบริหาร (ผอ. และ รองฯ 4 ฝ่าย)" roles={EXEC_ROLES} bare>
                                                        {EXEC_ROLES.map((role) => (
                                                            <Field key={role.key} label={role.label} htmlFor={`bulk_${role.key}`}>
                                                                <TeacherCombobox
                                                                    id={`bulk_${role.key}`}
                                                                    value={bulkCommon[role.key]}
                                                                    onChange={handleBulkCommonComboChange(role.key)}
                                                                    options={teacherOptions}
                                                                    disabled={teachersLoading}
                                                                />
                                                            </Field>
                                                        ))}
                                                    </ResponsibleCard>
                                                    <ResponsibleCard title="ฝ่ายปฏิบัติการ (หัวหน้างาน 4 ฝ่าย)" roles={OPS_ROLES} bare>
                                                        {OPS_ROLES.map((role) => (
                                                            <Field key={role.key} label={role.label} htmlFor={`bulk_${role.key}`}>
                                                                <TeacherCombobox
                                                                    id={`bulk_${role.key}`}
                                                                    value={bulkCommon[role.key]}
                                                                    onChange={handleBulkCommonComboChange(role.key)}
                                                                    options={teacherOptions}
                                                                    disabled={teachersLoading}
                                                                />
                                                            </Field>
                                                        ))}
                                                    </ResponsibleCard>
                                                </div>
                                            </div>

                                            {/* กำหนดการรายรุ่น */}
                                            <div className="space-y-4">
                                                <p className="text-sm font-semibold text-slate-700">
                                                    กำหนดการรายรุ่น (เทอม 1: รุ่น 1-2 · เทอม 2: รุ่น 3-4)
                                                </p>
                                                {bulkRows.map((row, index) => (
                                                    <div
                                                        key={row.batch_no}
                                                        className={`rounded-xl border p-4 ${row.term === 2 ? "border-indigo-100 bg-indigo-50/20" : "border-slate-200"
                                                            }`}
                                                    >
                                                        <div className="mb-3 flex items-center gap-2">
                                                            <span className="text-sm font-bold text-slate-900">
                                                                รุ่น {row.batch_no}/{bulkCommon.academic_year || "…"}
                                                            </span>
                                                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                                                เทอม {row.term}
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                                            <DateRangeGroup
                                                                title="ช่วงเวลารุ่น"
                                                                startId={`row${index}_batch_start_date`}
                                                                startValue={row.batch_start_date}
                                                                onStartChange={handleBulkRowDateChange(index, "batch_start_date")}
                                                                endId={`row${index}_batch_end_date`}
                                                                endValue={row.batch_end_date}
                                                                onEndChange={handleBulkRowDateChange(index, "batch_end_date")}
                                                            />
                                                            <DateRangeGroup
                                                                title="ช่วงรับสมัคร"
                                                                startId={`row${index}_admit_open_date`}
                                                                startValue={row.admit_open_date}
                                                                onStartChange={handleBulkRowDateChange(index, "admit_open_date")}
                                                                endId={`row${index}_admit_close_date`}
                                                                endValue={row.admit_close_date}
                                                                onEndChange={handleBulkRowDateChange(index, "admit_close_date")}
                                                            />
                                                            <DateRangeGroup
                                                                title="ช่วงเวลาเรียน"
                                                                startId={`row${index}_study_open_date`}
                                                                startValue={row.study_open_date}
                                                                onStartChange={handleBulkRowDateChange(index, "study_open_date")}
                                                                endId={`row${index}_study_close_date`}
                                                                endValue={row.study_close_date}
                                                                onEndChange={handleBulkRowDateChange(index, "study_close_date")}
                                                            />
                                                        </div>

                                                        <div className="mt-3">
                                                            <Field label="จำนวนชั่วโมงรวม" htmlFor={`row${index}_total_hours`}>
                                                                <input
                                                                    id={`row${index}_total_hours`}
                                                                    type="number"
                                                                    min="0"
                                                                    value={row.total_hours}
                                                                    onChange={handleBulkRowChange(index, "total_hours")}
                                                                    placeholder="เช่น 120"
                                                                    className={`${inputClass} sm:w-48`}
                                                                />
                                                            </Field>
                                                        </div>
                                                    </div>
                                                ))}
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
                                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                <Save size={15} />
                                                {isSubmitting ? "กำลังสร้าง 4 รุ่น..." : "สร้างรุ่นการเรียนทั้งปี (4 รุ่น)"}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

const inputClass =
    "w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40";

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

/** Reusable group of "start date - end date" inputs (ใช้ ThaiDateInput แสดงผลไทย/พ.ศ.) */
function DateRangeGroup({ title, startId, startValue, onStartChange, endId, endValue, onEndChange, required = false }) {
    return (
        <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-500">{title}</p>
            <div className="space-y-2">
                <Field label="วันเริ่มต้น" htmlFor={startId}>
                    <ThaiDateInput
                        id={startId}
                        value={startValue}
                        onChange={onStartChange}
                        required={required}
                    />
                </Field>
                <Field label="วันสิ้นสุด" htmlFor={endId}>
                    <ThaiDateInput
                        id={endId}
                        value={endValue}
                        onChange={onEndChange}
                        required={required}
                    />
                </Field>
            </div>
        </div>
    );
}

/** Card wrapper grouping a set of responsible-teacher fields */
function ResponsibleCard({ title, children, bare = false }) {
    const content = <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
    if (bare) {
        return (
            <div>
                <p className="mb-3 text-sm font-bold text-slate-800">{title}</p>
                {content}
            </div>
        );
    }
    return (
        <div className="rounded-xl border border-slate-200 p-4">
            <p className="mb-3 text-sm font-bold text-slate-800">{title}</p>
            {content}
        </div>
    );
}

/**
 * TeacherCombobox
 * -------------------------------------------------------------------------
 * Searchable teacher picker built on Headless UI's <Combobox>. Lets the user
 * type to filter by name instead of scrolling a long <select>.
 *
 * Props:
 * - id: string
 * - value: string | number | ""     -> selected teacher id
 * - onChange: (id) => void
 * - options: Array<{ value, label }>
 * - disabled: boolean               -> true ระหว่างรอโหลดรายชื่ออาจารย์จริงจาก GET /teachers
 */
function TeacherCombobox({ id, value, onChange, options, disabled = false }) {
    const [query, setQuery] = useState("");
    const selected = options.find((o) => String(o.value) === String(value)) || null;

    const filtered =
        query === ""
            ? options
            : options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

    return (
        <Combobox value={selected} onChange={(opt) => onChange(opt ? opt.value : "")} disabled={disabled}>
            <div className="relative">
                <div className="relative">
                    <Combobox.Input
                        id={id}
                        className={`${inputClass} pr-16 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
                        displayValue={(opt) => opt?.label || ""}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={disabled ? "กำลังโหลดรายชื่ออาจารย์..." : "พิมพ์ค้นหาชื่ออาจารย์..."}
                        autoComplete="off"
                    />
                    <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
                        {selected && (
                            <button
                                type="button"
                                onClick={() => onChange("")}
                                className="rounded p-1 text-slate-400 hover:text-slate-600"
                                tabIndex={-1}
                            >
                                <XCircle size={14} />
                            </button>
                        )}
                        <Combobox.Button className="rounded p-1 text-slate-400 hover:text-slate-600">
                            <ChevronsUpDown size={14} />
                        </Combobox.Button>
                    </div>
                </div>
                <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                    afterLeave={() => setQuery("")}
                >
                    <Combobox.Options
                        anchor={{ to: "bottom start", gap: 4 }}
                        className="z-[100] w-[var(--input-width)] max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
                    >
                        {filtered.length === 0 ? (
                            <div className="px-3 py-2 text-slate-400">
                                {disabled ? "กำลังโหลดรายชื่ออาจารย์..." : "ไม่พบรายชื่ออาจารย์"}
                            </div>
                        ) : (
                            filtered.map((opt) => (
                                <Combobox.Option
                                    key={opt.value}
                                    value={opt}
                                    className={({ active }) =>
                                        `flex cursor-pointer items-center justify-between px-3 py-2 ${active ? "bg-indigo-50 text-indigo-600" : "text-slate-700"
                                        }`
                                    }
                                >
                                    {({ selected: isSelected }) => (
                                        <>
                                            <span className={isSelected ? "font-semibold" : ""}>{opt.label}</span>
                                            {isSelected && <Check size={14} />}
                                        </>
                                    )}
                                </Combobox.Option>
                            ))
                        )}
                    </Combobox.Options>
                </Transition>
            </div>
        </Combobox>
    );
}