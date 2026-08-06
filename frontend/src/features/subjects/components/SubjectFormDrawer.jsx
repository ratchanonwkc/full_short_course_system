import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Save, Lock, Unlock, Loader2, AlertTriangle } from "lucide-react";
import Swal from "sweetalert2";
import SearchableCombobox from "../../../components/common/SearchableCombobox";
import useSubjectCode from "../../../hooks/useSubjectCode";
import { DURATION_GROUPS, suggestDurationGroup } from "../constants";
import { createSubject, updateSubject } from "../services/subjectApi";
import useSingleOptionDefault from "../../../hooks/useSingleOptionDefault";

const inputClass =
    "w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40";

const EMPTY_FORM = {
    level_id: "",
    curriculum_id: "",
    subject_type_id: "",
    major_id: "",
    minor_id: "",
    duration_group: "",
    name_th: "",
    name_en: "",
    theory_hours: "0",
    practice_hours: "0",
    total_hours: "0",
    credits: "0",
    credit_fee: "0",
    subject_code: "",
};

/**
 * SubjectFormDrawer
 * -------------------------------------------------------------------------
 * Slide-over drawer สำหรับเพิ่ม/แก้ไขรายวิชา พร้อม Cascading Dropdowns และระบบ
 * Auto-generate รหัสวิชา Real-time (useSubjectCode) ที่มีปุ่ม Lock/Unlock ให้แก้ไขเองได้
 *
 * Props:
 * - isOpen, onClose, onSaved(subject)
 * - initialData: Subject | null
 * - levels, curriculums, subjectTypes: Array<{ id, ... }>
 * - majors: Array<AcademicMajor>   -> ทั้งหมด (จะ filter ตาม level_id/subject_type_id ในนี้)
 * - minors: Array<AcademicMinor>   -> ทั้งหมด (จะ filter ตาม major_id ในนี้)
 */
export default function SubjectFormDrawer({
    isOpen,
    onClose,
    onSaved,
    initialData = null,
    levels = [],
    curriculums = [],
    subjectTypes = [],
    majors = [],
    minors = [],
}) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditMode = Boolean(initialData);

    const levelOptions = useMemo(() => levels.map((l) => ({ value: l.id, label: l.level_name })), [levels]);
    const curriculumOptions = useMemo(
        () => curriculums.map((c) => ({ value: c.id, label: c.curriculum_name })),
        [curriculums]
    );
    const subjectTypeOptions = useMemo(() => subjectTypes.map((t) => ({ value: t.id, label: t.name_th })), [subjectTypes]);
    useSingleOptionDefault(levelOptions, form.level_id, (v) => setForm((p) => ({ ...p, level_id: v })), !isEditMode);
    useSingleOptionDefault(curriculumOptions, form.curriculum_id, (v) => setForm((p) => ({ ...p, curriculum_id: v })), !isEditMode);
    // Cascading: สาขาวิชา ต้องกรองตามระดับชั้น + ประเภทวิชาที่เลือกไว้ก่อน
    const filteredMajors = useMemo(
        () =>
            majors.filter(
                (m) =>
                    (!form.level_id || String(m.level_id) === String(form.level_id)) &&
                    (!form.subject_type_id || String(m.subject_type_id) === String(form.subject_type_id))
            ),
        [majors, form.level_id, form.subject_type_id]
    );
    const majorOptions = useMemo(
        () => filteredMajors.map((m) => ({ value: m.id, label: m.name_th })),
        [filteredMajors]
    );

    // Cascading: สาขางาน ต้องกรองตามสาขาวิชาที่เลือก
    const filteredMinors = useMemo(
        () => minors.filter((m) => !form.major_id || String(m.major_id) === String(form.major_id)),
        [minors, form.major_id]
    );
    const minorOptions = useMemo(() => filteredMinors.map((m) => ({ value: m.id, label: m.name_th })), [filteredMinors]);

    const selectedMajor = filteredMajors.find((m) => String(m.id) === String(form.major_id));
    const selectedMinor = filteredMinors.find((m) => String(m.id) === String(form.minor_id));

    // ล้าง field ลูกเมื่อ field แม่เปลี่ยน เพื่อไม่ให้ major/minor ค้างเป็นค่าที่ไม่สัมพันธ์กัน
    const handleLevelChange = (v) => setForm((p) => ({ ...p, level_id: v, major_id: "", minor_id: "" }));
    const handleSubjectTypeChange = (v) => setForm((p) => ({ ...p, subject_type_id: v, major_id: "", minor_id: "" }));
    const handleMajorChange = (v) => setForm((p) => ({ ...p, major_id: v, minor_id: "" }));

    // ─── Auto-calculate total_hours จาก theory + practice (แก้ไขเองภายหลังได้) ──
    const handleTheoryChange = (e) => {
        const theory = e.target.value;
        setForm((p) => {
            const total = (Number(theory) || 0) + (Number(p.practice_hours) || 0);
            return { ...p, theory_hours: theory, total_hours: String(total) };
        });
    };
    const handlePracticeChange = (e) => {
        const practice = e.target.value;
        setForm((p) => {
            const total = (Number(p.theory_hours) || 0) + (Number(practice) || 0);
            return { ...p, practice_hours: practice, total_hours: String(total) };
        });
    };

    // แนะนำช่วงระยะเวลาเรียนอัตโนมัติเมื่อชั่วโมงรวมเปลี่ยน (ถ้าผู้ใช้ยังไม่ได้เลือกเอง)
    useEffect(() => {
        if (!form.duration_group) {
            const suggested = suggestDurationGroup(form.total_hours);
            if (suggested) setForm((p) => ({ ...p, duration_group: suggested }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.total_hours]);

    // ─── Subject code auto-generation ───────────────────────────────────────
    // สำคัญ: initialLocked = !isEditMode
    // - โหมดสร้างใหม่ (isEditMode=false) -> locked=true -> auto-calculate รหัสวิชาให้ตามปกติ
    // - โหมดแก้ไข (isEditMode=true)      -> locked=false -> "ไม่" auto-calculate ทับ
    //   เพราะรหัสวิชาเดิม (จาก initialData) ถูกต้องอยู่แล้ว การปล่อยให้ hook คำนวณ sequence
    //   ถัดไปใหม่ทันทีที่เปิดฟอร์ม (โดยไม่รู้ว่ากำลังแก้ไขวิชาตัวไหนอยู่ ไม่ได้ exclude ตัวเอง
    //   ออกจากการนับ) จะได้รหัสที่ไปชนกับวิชาอื่นที่มีอยู่แล้วในกลุ่มเดียวกัน แล้วพอกด Save
    //   backend จะตอบ 400 "รหัสวิชานี้มีอยู่แล้วในระบบ" ทั้งที่ผู้ใช้ไม่ได้ตั้งใจเปลี่ยนรหัสวิชาเลย
    //   ผู้ใช้ยังกดปุ่ม Unlock เองได้ตามปกติถ้าต้องการเปลี่ยนรหัสวิชาตอนแก้ไข
    const { code, setManualCode, locked, setLocked, isCalculating, sequenceWarning } = useSubjectCode({
        levelId: form.level_id,
        subjectTypeId: form.subject_type_id,
        department: selectedMajor?.department_id,
        subDepartment: selectedMinor?.sub_department_id,
        durationGroup: form.duration_group,
        minorId: form.minor_id,
        initialLocked: !isEditMode,
    });

    // เปิด/ปิดฟอร์ม หรือสลับรายการที่แก้ไข -> reset form + sync locked ให้ตรงกับ mode เสมอ
    // (ป้องกัน state ของ locked ค้างจากการเปิดฟอร์มครั้งก่อนหน้า เช่น ปิดฟอร์มตอน unlock ค้างไว้
    // แล้วเปิดฟอร์มแก้ไขวิชาอื่นต่อทันที)
    useEffect(() => {
        if (isOpen) {
            setForm(initialData ? { ...EMPTY_FORM, ...initialData } : EMPTY_FORM);
            setLocked(!initialData);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialData]);

    // sync ค่าที่ hook คำนวณได้ลงในฟอร์ม (ยกเว้นตอนแก้ไขวิชาเดิมที่ subject_code มีอยู่แล้วและยัง lock)
    useEffect(() => {
        if (locked) setForm((p) => ({ ...p, subject_code: code || p.subject_code }));
    }, [code, locked]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.level_id || !form.subject_type_id || !form.major_id || !form.minor_id || !form.duration_group) {
            Swal.fire({ icon: "warning", title: "กรุณาเลือกข้อมูลโครงสร้างวิชาให้ครบ", confirmButtonColor: "#4f46e5" });
            return;
        }
        if (!form.name_th.trim()) {
            Swal.fire({ icon: "warning", title: "กรุณากรอกชื่อวิชา", confirmButtonColor: "#4f46e5" });
            return;
        }
        if (!form.subject_code.trim()) {
            Swal.fire({ icon: "warning", title: "ไม่พบรหัสวิชา กรุณาตรวจสอบข้อมูล", confirmButtonColor: "#4f46e5" });
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                level_id: form.level_id,
                curriculum_id: form.curriculum_id || null,
                subject_type_id: form.subject_type_id,
                major_id: form.major_id,
                minor_id: form.minor_id,
                duration_group: form.duration_group,
                name_th: form.name_th.trim(),
                name_en: form.name_en?.trim() || null,
                theory_hours: Number(form.theory_hours) || 0,
                practice_hours: Number(form.practice_hours) || 0,
                total_hours: Number(form.total_hours) || 0,
                credits: Number(form.credits) || 0,
                credit_fee: Number(form.credit_fee) || 0,
                subject_code: form.subject_code.trim(),
            };

            const saved = isEditMode ? await updateSubject(form.id, payload) : await createSubject(payload);

            onSaved?.(saved);
            Swal.fire({
                icon: "success",
                title: isEditMode ? "บันทึกการแก้ไขสำเร็จ" : "เพิ่มรายวิชาสำเร็จ",
                text: `${form.subject_code} - ${form.name_th}`,
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

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/50" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                            <Transition.Child
                                as={Fragment}
                                enter="transform transition ease-in-out duration-300"
                                enterFrom="translate-x-full" enterTo="translate-x-0"
                                leave="transform transition ease-in-out duration-200"
                                leaveFrom="translate-x-0" leaveTo="translate-x-full"
                            >
                                <Dialog.Panel className="pointer-events-auto flex h-full w-screen max-w-2xl flex-col bg-white shadow-xl">
                                    {/* Header */}
                                    <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
                                        <Dialog.Title className="text-lg font-bold text-slate-900">
                                            {isEditMode ? "แก้ไขรายวิชา" : "เพิ่มรายวิชาใหม่"}
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
                                            {/* Subject code preview */}
                                            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
                                                <div className="mb-2 flex items-center justify-between">
                                                    <label className="text-xs font-semibold text-indigo-700">รหัสวิชา (Subject Code)</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setLocked((v) => !v)}
                                                        title={locked ? "ปลดล็อกเพื่อแก้ไขรหัสวิชาเอง" : "ล็อกกลับไปคำนวณอัตโนมัติ"}
                                                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${locked
                                                            ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                                            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                                            }`}
                                                    >
                                                        {locked ? <Lock size={12} /> : <Unlock size={12} />}
                                                        {locked ? "คำนวณอัตโนมัติ" : "แก้ไขเอง"}
                                                    </button>
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={form.subject_code}
                                                        onChange={(e) => {
                                                            setForm((p) => ({ ...p, subject_code: e.target.value }));
                                                            setManualCode(e.target.value);
                                                        }}
                                                        disabled={locked}
                                                        placeholder="เลือกโครงสร้างวิชาให้ครบเพื่อคำนวณรหัสวิชาอัตโนมัติ"
                                                        className={`${inputClass} font-mono text-base disabled:bg-white disabled:text-indigo-700 disabled:font-semibold`}
                                                    />
                                                    {isCalculating && (
                                                        <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-indigo-400" />
                                                    )}
                                                </div>
                                                {isEditMode && locked && (
                                                    <p className="mt-1.5 text-xs text-slate-400">
                                                        * รหัสวิชานี้ถูกล็อกไว้กับข้อมูลเดิม กด "แก้ไขเอง" หากต้องการเปลี่ยนรหัสวิชา
                                                    </p>
                                                )}
                                                {sequenceWarning && (
                                                    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-amber-600">
                                                        <AlertTriangle size={12} /> {sequenceWarning}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Cascading structure */}
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                <Field label="ระดับชั้น">
                                                    <SearchableCombobox
                                                        value={form.level_id}
                                                        onChange={handleLevelChange}
                                                        options={levelOptions}
                                                        placeholder="เลือกระดับชั้น..."
                                                    />
                                                </Field>
                                                <Field label="หลักสูตร">
                                                    <SearchableCombobox
                                                        value={form.curriculum_id}
                                                        onChange={(v) => setForm((p) => ({ ...p, curriculum_id: v }))}
                                                        options={curriculumOptions}
                                                        placeholder="เลือกหลักสูตร..."
                                                    />
                                                </Field>
                                                <Field label="ประเภทวิชา">
                                                    <SearchableCombobox
                                                        value={form.subject_type_id}
                                                        onChange={handleSubjectTypeChange}
                                                        options={subjectTypeOptions}
                                                        placeholder="เลือกประเภทวิชา..."
                                                    />
                                                </Field>
                                                <Field label="ช่วงระยะเวลาเรียน">
                                                    <select
                                                        value={form.duration_group}
                                                        onChange={(e) => setForm((p) => ({ ...p, duration_group: e.target.value }))}
                                                        className={inputClass}
                                                    >
                                                        <option value="">เลือกช่วงระยะเวลาเรียน</option>
                                                        {DURATION_GROUPS.map((d) => (
                                                            <option key={d.value} value={d.value}>
                                                                {d.value} = {d.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </Field>
                                                <Field label="สาขาวิชา/แผนก">
                                                    <SearchableCombobox
                                                        value={form.major_id}
                                                        onChange={handleMajorChange}
                                                        options={majorOptions}
                                                        placeholder={form.level_id && form.subject_type_id ? "เลือกสาขาวิชา..." : "เลือกระดับชั้น/ประเภทวิชาก่อน"}
                                                        disabled={!form.level_id || !form.subject_type_id}
                                                    />
                                                </Field>
                                                <Field label="สาขางาน/กลุ่มวิชา">
                                                    <SearchableCombobox
                                                        value={form.minor_id}
                                                        onChange={(v) => setForm((p) => ({ ...p, minor_id: v }))}
                                                        options={minorOptions}
                                                        placeholder={form.major_id ? "เลือกสาขางาน..." : "เลือกสาขาวิชาก่อน"}
                                                        disabled={!form.major_id}
                                                    />
                                                </Field>
                                            </div>

                                            <div className="h-px bg-slate-100" />

                                            {/* Names */}
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                <Field label="ชื่อวิชา (ไทย)" full>
                                                    <input
                                                        type="text"
                                                        value={form.name_th}
                                                        onChange={(e) => setForm((p) => ({ ...p, name_th: e.target.value }))}
                                                        className={inputClass}
                                                        required
                                                    />
                                                </Field>
                                                <Field label="ชื่อวิชา (English)" full>
                                                    <input
                                                        type="text"
                                                        value={form.name_en}
                                                        onChange={(e) => setForm((p) => ({ ...p, name_en: e.target.value }))}
                                                        className={inputClass}
                                                    />
                                                </Field>
                                            </div>

                                            {/* Hours & credits */}
                                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                                <Field label="ทฤษฎี (ชม.)">
                                                    <input
                                                        type="number" min="0" step="0.5"
                                                        value={form.theory_hours}
                                                        onChange={handleTheoryChange}
                                                        className={inputClass}
                                                    />
                                                </Field>
                                                <Field label="ปฏิบัติ (ชม.)">
                                                    <input
                                                        type="number" min="0" step="0.5"
                                                        value={form.practice_hours}
                                                        onChange={handlePracticeChange}
                                                        className={inputClass}
                                                    />
                                                </Field>
                                                <Field label="รวมชั่วโมงเรียน">
                                                    <input
                                                        type="number" min="0" step="0.5"
                                                        value={form.total_hours}
                                                        onChange={(e) => setForm((p) => ({ ...p, total_hours: e.target.value }))}
                                                        className={inputClass}
                                                    />
                                                </Field>
                                                <Field label="หน่วยกิต">
                                                    <input
                                                        type="number" min="0" step="0.5"
                                                        value={form.credits}
                                                        onChange={(e) => setForm((p) => ({ ...p, credits: e.target.value }))}
                                                        className={inputClass}
                                                    />
                                                </Field>
                                                <Field label="ค่าหน่วยกิต/ค่าธรรมเนียม">
                                                    <input
                                                        type="number" min="0" step="1"
                                                        value={form.credit_fee}
                                                        onChange={(e) => setForm((p) => ({ ...p, credit_fee: e.target.value }))}
                                                        className={inputClass}
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
                                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                </div>
            </Dialog>
        </Transition>
    );
}

function Field({ label, full = false, children }) {
    return (
        <div className={full ? "sm:col-span-2" : ""}>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
            {children}
        </div>
    );
}