import { useEffect, useMemo, useState } from "react";
import { Save, Zap, Plus, Settings, X, Pencil } from "lucide-react";
import Swal from "sweetalert2";
import VirtualizedCombobox from "../../../components/common/VirtualizedCombobox";
import MaskedDateInput from "../../../components/common/MaskedDateInput";
import ManageLocationsModal from "./ManageLocationsModal";
import GroupSubjectsTable from "./GroupSubjectsTable";
import useEnterKeyNav from "../../../hooks/useEnterKeyNav";
import {
    createStudyGroup,
    updateStudyGroup,
    getNextRoomSequence,
    getNextMoeSequence,
    createLocation,
    getSubjectsInGroup,
    addSubjectToGroup,
    updateSubjectInGroup,
    removeSubjectFromGroup,
} from "../services/studyGroupApi";
import {
    GROUP_TYPE_LABELS,
    buildGroupCode,
    buildGroupCodePreview,
    buildRoomCode,
    buildMoeCode,
    buildGroupName,
    currentBeYear2Digit,
} from "../../../utils/groupCode";

const inputClass =
    "w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40";

const GROUP_TYPE_OPTIONS = Object.entries(GROUP_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const EMPTY_FORM = {
    major_id: "",
    group_code: "",
    room_code: "",
    group_no: 1,
    group_type: "normal",
    group_name: "",
    teacher_id: "",
    joint_location_id: 1,
    max_seats: 20,
    total_hours: "",
    study_dates_description: "",
    start_date: "",
    end_date: "",
    education_type: "วิชาชีพระยะสั้น",
    student_type: "ประชาชนทั่วไป",
    tuition_fee: "0",
    application_fee: "10",
    is_waived_fee: false,
    is_ac_maintenance_fee: false,
    registration_start_date: "",
    registration_end_date: "",
    time_code: "",
};

let localIdCounter = 0;
const nextLocalId = () => `local-${Date.now()}-${localIdCounter++}`;

/**
 * GroupFormPanel
 * -------------------------------------------------------------------------
 * Form ฝั่งขวาของ Split View สำหรับสร้าง/แก้ไข "กลุ่มเรียน" (study_groups)
 * ผูกกับ batchId ที่ได้รับมาจาก URL param เสมอ
 *
 * Props:
 * - batchId: string|number
 * - initialData: StudyGroup | null   -> null = create mode
 * - onSaved: (group) => void
 * - onCancelEdit: () => void
 * - majors: Array<AcademicMajor>     -> ใช้เลือกแผนกวิชา + ดึง department_id สำหรับ Auto Fill
 * - subjects: Array<Subject>         -> ใช้เลือกวิชา/ชุดวิชา
 * - teachers: Array<Teacher>
 * - locations: Array<Location>
 * - timeSlots: Array<{ id, time_code, time_name, time_range }>
 * - onLocationsRefresh: () => void
 */
export default function GroupFormPanel({
    batchId,
    initialData = null,
    onSaved,
    onCancelEdit,
    majors = [],
    subjects = [],
    teachers = [],
    locations = [],
    timeSlots = [],
    onLocationsRefresh,
}) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [subjectsInGroup, setSubjectsInGroup] = useState([]);
    const [removedSubjectIds, setRemovedSubjectIds] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [isManageLocationsOpen, setIsManageLocationsOpen] = useState(false);
    const [isQuickAddingLocation, setIsQuickAddingLocation] = useState(false);
    const isEditMode = Boolean(initialData);
    const { formRef, handleKeyDown } = useEnterKeyNav();

    const majorOptions = useMemo(
        () => majors.map((m) => ({ value: m.id, label: m.name_th })),
        [majors]
    );
    const subjectOptions = useMemo(
        () =>
            subjects.map((s) => ({
                value: s.id,
                label: `${s.subject_code} - ${s.name_th}`,
                subject_code: s.subject_code,
                name_th: s.name_th,
                total_hours: s.total_hours,
            })),
        [subjects]
    );
    const teacherOptions = useMemo(
        () =>
            teachers.map((t) => ({
                value: t.id,
                label: [t.prefix_name, t.first_name_th, t.last_name_th].filter(Boolean).join(" ") || `อาจารย์ #${t.id}`,
            })),
        [teachers]
    );
    const locationOptions = useMemo(
        () => locations.map((l) => ({ value: l.id, label: l.name })),
        [locations]
    );
    const timeSlotOptions = useMemo(
        () => timeSlots.map((t) => ({ value: t.time_code, label: `${t.time_code} (${t.time_name} ${t.time_range || ""})` })),
        [timeSlots]
    );

    const selectedMajor = majors.find((m) => String(m.id) === String(form.major_id));
    const [primarySubjectId, setPrimarySubjectId] = useState(""); // วิชาหลักที่ใช้คำนวณ group_code

    // ── โหลด/รีเซ็ตฟอร์มเมื่อสลับโหมดสร้าง/แก้ไข ──────────────────────────────
    useEffect(() => {
        if (initialData) {
            setForm({
                ...EMPTY_FORM,
                ...initialData,
                group_no: initialData.group_no ?? 1,
                max_seats: initialData.max_seats ?? 20,
                tuition_fee: String(initialData.tuition_fee ?? "0"),
                application_fee: String(initialData.application_fee ?? "10"),
                time_code: extractTimeCodeFromGroupCode(initialData.group_code),
            });
            // โหลดรายวิชาย่อยของกลุ่มนี้จาก backend
            (async () => {
                try {
                    const rows = await getSubjectsInGroup(initialData.id);
                    setSubjectsInGroup(
                        rows.map((r) => ({
                            _localId: nextLocalId(),
                            _persistedId: r.id,
                            subject_id: r.subject_id,
                            subject_code: r.subject_code,
                            name_th: r.name_th,
                            total_hours: r.total_hours,
                            moe_code: r.moe_code || "",
                            sequence_order: r.sequence_order,
                        }))
                    );
                } catch {
                    setSubjectsInGroup([]);
                }
            })();
            setPrimarySubjectId("");
        } else {
            setForm({ ...EMPTY_FORM, batch_id: batchId });
            setSubjectsInGroup([]);
            setPrimarySubjectId("");
        }
        setRemovedSubjectIds([]);
    }, [initialData, batchId]);

    const handleChange = (field) => (e) => {
        const { value, type, checked } = e.target;
        setForm((prev) => ({ ...prev, [field]: type === "checkbox" ? checked : value }));
    };
    const handleComboChange = (field) => (value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };
    const handleDateChange = (field) => (isoValue) => {
        setForm((prev) => ({ ...prev, [field]: isoValue }));
    };

    // ── Quick add ด่วน [+] ข้าง Combobox สถานที่ (เปิด SweetAlert prompt แล้วสร้างทันที) ──
    const handleQuickAddLocation = async () => {
        const { value: name, isConfirmed } = await Swal.fire({
            title: "เพิ่มสถานที่ใหม่ด่วน",
            input: "text",
            inputPlaceholder: "ชื่อสถานที่",
            showCancelButton: true,
            confirmButtonText: "เพิ่ม",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#4f46e5",
            preConfirm: (value) => {
                if (!value?.trim()) {
                    Swal.showValidationMessage("กรุณากรอกชื่อสถานที่");
                }
                return value;
            },
        });
        if (!isConfirmed || !name?.trim()) return;

        setIsQuickAddingLocation(true);
        try {
            const newLoc = await createLocation({ name: name.trim() });
            setForm((prev) => ({ ...prev, joint_location_id: newLoc.id }));
            onLocationsRefresh?.();
            Swal.fire({
                toast: true, position: "top-end", icon: "success",
                title: "เพิ่มสถานที่ใหม่และเลือกใช้แล้ว", showConfirmButton: false, timer: 2000, timerProgressBar: true,
            });
        } catch (err) {
            const isDuplicate = err?.response?.status === 400;
            Swal.fire({
                icon: "error",
                title: "เพิ่มสถานที่ไม่สำเร็จ",
                text: err?.response?.data?.message || (isDuplicate ? "ชื่อสถานที่นี้มีอยู่แล้ว" : "กรุณาลองใหม่อีกครั้ง"),
                confirmButtonColor: "#4f46e5",
            });
        } finally {
            setIsQuickAddingLocation(false);
        }
    };

    // ── ตารางวิชาย่อย ──────────────────────────────────────────────────────
    const handleAddSubjectToGroup = (opt) => {
        setSubjectsInGroup((prev) => [
            ...prev,
            {
                _localId: nextLocalId(),
                _persistedId: null,
                subject_id: opt.value,
                subject_code: opt.subject_code,
                name_th: opt.name_th,
                total_hours: opt.total_hours,
                moe_code: "",
            },
        ]);
        // ถ้ายังไม่มีวิชาหลักเลือกไว้ (สำหรับคำนวณ group_code) ให้ใช้ตัวแรกที่เพิ่มเป็นค่าเริ่มต้น
        setPrimarySubjectId((prev) => prev || String(opt.value));
        // Auto-sum total_hours ของกลุ่มจากผลรวมวิชาย่อย (ผู้ใช้แก้ไขเองต่อได้)
        setForm((prev) => {
            const currentTotal = Number(prev.total_hours) || 0;
            return { ...prev, total_hours: String(currentTotal + (Number(opt.total_hours) || 0)) };
        });
    };
    const handleRemoveSubjectFromGroup = (localId) => {
        setSubjectsInGroup((prev) => {
            const target = prev.find((s) => s._localId === localId);
            if (target?._persistedId) setRemovedSubjectIds((ids) => [...ids, target._persistedId]);
            const next = prev.filter((s) => s._localId !== localId);
            return next;
        });
    };
    const handleMoeCodeChange = (localId, value) => {
        setSubjectsInGroup((prev) => prev.map((s) => (s._localId === localId ? { ...s, moe_code: value } : s)));
    };

    // ── รหัสวิชาหลัก (ใช้คำนวณ group_code) — ถ้ามีวิชาย่อยหลายตัว ใช้ตัวที่เลือกไว้เป็น primary ──
    const primarySubject =
        subjectsInGroup.find((s) => String(s.subject_id) === String(primarySubjectId)) || subjectsInGroup[0] || null;

    // ── Live preview ของ group_code ระหว่างกรอก (ยังไม่กด Auto Fill) ──────────
    const groupCodePreview = buildGroupCodePreview({
        subjectCode: primarySubject?.subject_code,
        timeCode: form.time_code,
        groupNo: form.group_no,
    });

    // ── ⚡ Auto Fill ──────────────────────────────────────────────────────────
    const handleAutoFill = async () => {
        if (!primarySubject) {
            Swal.fire({
                icon: "warning",
                title: "กรุณาเพิ่มรายวิชาเข้ากลุ่มก่อน",
                text: "Auto Fill ต้องใช้รหัสวิชาจากตารางวิชาย่อยด้านล่างเพื่อคำนวณรหัสกลุ่มเรียน",
                confirmButtonColor: "#4f46e5",
            });
            return;
        }
        if (!form.time_code || !form.group_no) {
            Swal.fire({
                icon: "warning",
                title: "กรุณาเลือกรอบเรียนและกรอกกลุ่มที่ก่อน",
                confirmButtonColor: "#4f46e5",
            });
            return;
        }
        if (!selectedMajor?.department_id) {
            Swal.fire({
                icon: "warning",
                title: "กรุณาเลือกแผนกวิชาก่อน",
                text: "ใช้รหัสแผนกของแผนกวิชาที่เลือก เพื่อคำนวณรหัสห้องเรียนและเลข ศธ.",
                confirmButtonColor: "#4f46e5",
            });
            return;
        }

        setIsAutoFilling(true);
        try {
            const departmentId = selectedMajor.department_id;
            const beYear2 = currentBeYear2Digit();

            // 1) group_code
            const groupCode = buildGroupCode({
                subjectCode: primarySubject.subject_code,
                timeCode: form.time_code,
                groupNo: form.group_no,
            });

            // 2) room_code -> ต้องถามลำดับถัดไปจาก backend (กันชนกับห้องที่ใช้ไปแล้วในแผนกเดียวกัน)
            const roomSeqRes = await getNextRoomSequence(departmentId);
            let roomCode = form.room_code;
            if (roomSeqRes.sequence) {
                roomCode = buildRoomCode({ departmentId, roomSequence: roomSeqRes.sequence });
                console.log(roomCode);
                console.log(departmentId, roomSeqRes.sequence);
            } else if (roomSeqRes.message) {
                Swal.fire({ icon: "warning", title: "ไม่สามารถคำนวณรหัสห้องเรียนได้", text: roomSeqRes.message, confirmButtonColor: "#4f46e5" });
            }

            // 3) moe_code ต่อวิชาย่อยแต่ละแถวที่ยังไม่มีเลข ศธ.
            const updatedSubjects = [...subjectsInGroup];
            for (let i = 0; i < updatedSubjects.length; i++) {
                if (updatedSubjects[i].moe_code?.trim()) continue; // มีอยู่แล้ว ไม่ทับ
                const moeSeqRes = await getNextMoeSequence(beYear2, departmentId);
                if (moeSeqRes.sequence) {
                    updatedSubjects[i] = {
                        ...updatedSubjects[i],
                        moe_code: buildMoeCode({ beYear2Digit: beYear2, departmentId, moeSequence: moeSeqRes.sequence }),
                    };
                } else if (moeSeqRes.message) {
                    Swal.fire({ icon: "warning", title: "ไม่สามารถคำนวณเลข ศธ. ได้", text: moeSeqRes.message, confirmButtonColor: "#4f46e5" });
                    break;
                }
            }
            setSubjectsInGroup(updatedSubjects);

            // 4) group_name
            const teacher = teachers.find((t) => String(t.id) === String(form.teacher_id));
            const teacherLabel = teacher
                ? [teacher.prefix_name, teacher.first_name_th, teacher.last_name_th].filter(Boolean).join(" ")
                : "";
            const groupName = buildGroupName({
                subjectName: primarySubject.name_th,
                groupType: form.group_type,
                timeCode: form.time_code,
                groupNo: form.group_no,
                teacherName: teacherLabel,
            });

            setForm((prev) => ({
                ...prev,
                group_code: groupCode,
                room_code: roomCode,
                group_name: groupName,
            }));

            Swal.fire({
                toast: true, position: "top-end", icon: "success",
                title: "คำนวณรหัส/ชื่อกลุ่มเรียนอัตโนมัติเรียบร้อยแล้ว",
                showConfirmButton: false, timer: 2200, timerProgressBar: true,
            });
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "Auto Fill ไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        } finally {
            setIsAutoFilling(false);
        }
    };

    // ── ค่าธรรมเนียมสุทธิ (แสดง preview เฉยๆ ไม่ได้ส่งเป็น field แยกไป backend) ──
    const acFeePerHour = form.is_ac_maintenance_fee ? 1 : 0;
    const estimatedTuition = form.is_waived_fee
        ? 0
        : (Number(form.tuition_fee) || 0) + acFeePerHour * (Number(form.total_hours) || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.major_id) {
            Swal.fire({ icon: "warning", title: "กรุณาเลือกแผนกวิชา", confirmButtonColor: "#4f46e5" });
            return;
        }
        if (!form.group_code?.trim()) {
            Swal.fire({ icon: "warning", title: "กรุณากรอกหรือ Auto Fill รหัสกลุ่มเรียนก่อน", confirmButtonColor: "#4f46e5" });
            return;
        }
        if (!form.group_name?.trim()) {
            Swal.fire({ icon: "warning", title: "กรุณากรอกชื่อกลุ่มเรียน", confirmButtonColor: "#4f46e5" });
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                batch_id: batchId,
                major_id: form.major_id,
                group_code: form.group_code.trim(),
                room_code: form.room_code?.trim() || null,
                group_no: Number(form.group_no) || 1,
                group_type: form.group_type,
                group_name: form.group_name.trim(),
                teacher_id: form.teacher_id || null,
                joint_location_id: form.joint_location_id || 1,
                max_seats: Number(form.max_seats) || 20,
                total_hours: Number(form.total_hours) || 0,
                study_dates_description: form.study_dates_description || null,
                start_date: form.start_date || null,
                end_date: form.end_date || null,
                education_type: form.education_type,
                student_type: form.student_type,
                tuition_fee: Number(form.tuition_fee) || 0,
                application_fee: Number(form.application_fee) || 0,
                is_waived_fee: Boolean(form.is_waived_fee),
                is_ac_maintenance_fee: Boolean(form.is_ac_maintenance_fee),
                registration_start_date: form.registration_start_date || null,
                registration_end_date: form.registration_end_date || null,
            };

            const savedGroup = isEditMode
                ? await updateStudyGroup(initialData.id, payload)
                : await createStudyGroup(payload);

            // Sync รายวิชาย่อย: ลบที่ถูกนำออก, อัปเดต/สร้างที่เหลือ
            await Promise.all(removedSubjectIds.map((id) => removeSubjectFromGroup(id)));
            await Promise.all(
                subjectsInGroup.map((s) => {
                    const subjectPayload = {
                        study_group_id: savedGroup.id,
                        subject_id: s.subject_id,
                        moe_code: s.moe_code?.trim() || null,
                        sequence_order: s.sequence_order || 1,
                    };
                    return s._persistedId
                        ? updateSubjectInGroup(s._persistedId, subjectPayload)
                        : addSubjectToGroup(subjectPayload);
                })
            );

            onSaved?.(savedGroup);
            Swal.fire({
                icon: "success",
                title: isEditMode ? "บันทึกการแก้ไขสำเร็จ" : "สร้างกลุ่มเรียนสำเร็จ",
                text: `${savedGroup.group_code || form.group_code} ถูกบันทึกเรียบร้อยแล้ว`,
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
        <form ref={formRef} onKeyDown={handleKeyDown} onSubmit={handleSubmit} className="flex h-full flex-col">
            {/* Status banner */}
            <div
                className={`flex items-center justify-between gap-3 border-b px-5 py-4 transition-colors ${isEditMode ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"
                    }`}
            >
                <div className="flex min-w-0 items-center gap-2.5">
                    <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isEditMode ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
                            }`}
                    >
                        {isEditMode ? <Pencil size={14} /> : <Plus size={16} />}
                    </span>
                    <div className="min-w-0">
                        <p className={`text-xs font-bold uppercase tracking-wide ${isEditMode ? "text-amber-700" : "text-emerald-700"}`}>
                            {isEditMode ? "กำลังแก้ไข" : "เพิ่มกลุ่มเรียนใหม่"}
                        </p>
                        {isEditMode && (
                            <p className="truncate text-sm font-semibold text-slate-800" title={form.group_code}>
                                {form.group_code}
                            </p>
                        )}
                    </div>
                </div>
                {isEditMode && (
                    <button
                        type="button"
                        onClick={onCancelEdit}
                        title="ยกเลิกการแก้ไข / ล้างฟอร์ม"
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100"
                    >
                        <X size={13} />
                        ยกเลิกแก้ไข
                    </button>
                )}
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                {/* แผนกวิชา */}
                <Field label="แผนกวิชา">
                    <VirtualizedCombobox
                        value={form.major_id}
                        onChange={handleComboChange("major_id")}
                        options={majorOptions}
                        placeholder="เลือกแผนกวิชา..."
                        className={inputClass}
                    />
                </Field>

                {/* ตารางวิชาย่อย */}
                <GroupSubjectsTable
                    subjectsInGroup={subjectsInGroup}
                    subjectOptions={subjectOptions}
                    onAdd={handleAddSubjectToGroup}
                    onRemove={handleRemoveSubjectFromGroup}
                    onMoeCodeChange={handleMoeCodeChange}
                />
                {subjectsInGroup.length > 1 && (
                    <Field label="วิชาหลัก (ใช้คำนวณรหัสกลุ่มเรียน)">
                        <VirtualizedCombobox
                            value={primarySubjectId}
                            onChange={setPrimarySubjectId}
                            options={subjectsInGroup.map((s) => ({
                                value: s.subject_id,
                                label: `${s.subject_code} - ${s.name_th}`,
                            }))}
                            placeholder="เลือกวิชาหลัก..."
                            className={inputClass}
                        />
                    </Field>
                )}

                {/* รอบเรียน + กลุ่มที่ */}
                <div className="grid grid-cols-2 gap-3">
                    <Field label="รอบเรียน (time_slot)">
                        <select value={form.time_code} onChange={handleChange("time_code")} className={inputClass}>
                            <option value="">เลือกรอบเรียน</option>
                            {timeSlotOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="กลุ่มที่ (group_no)">
                        <input
                            type="number"
                            min="1"
                            value={form.group_no}
                            onChange={handleChange("group_no")}
                            className={inputClass}
                        />
                    </Field>
                </div>

                {/* ประเภทกลุ่มเรียน */}
                <Field label="ประเภทกลุ่มเรียน">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {GROUP_TYPE_OPTIONS.map((opt) => (
                            <label
                                key={opt.value}
                                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${form.group_type === opt.value
                                    ? "border-indigo-400 bg-indigo-50 text-indigo-700 font-semibold"
                                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="group_type"
                                    value={opt.value}
                                    checked={form.group_type === opt.value}
                                    onChange={handleChange("group_type")}
                                    className="accent-indigo-600"
                                />
                                {opt.label}
                            </label>
                        ))}
                    </div>
                </Field>

                {/* Auto Fill button + code previews */}
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold text-indigo-700">รหัสกลุ่มเรียน (Preview)</p>
                        <button
                            type="button"
                            onClick={handleAutoFill}
                            disabled={isAutoFilling}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-60"
                        >
                            <Zap size={13} />
                            {isAutoFilling ? "กำลังคำนวณ..." : "Auto Fill"}
                        </button>
                    </div>
                    <p className="font-mono text-lg font-bold text-indigo-700">
                        {form.group_code || groupCodePreview}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                        สูตร: {"{รหัสวิชา}"}-{"{รอบ}"}{"{กลุ่มที่}"} — กด Auto Fill เพื่อคำนวณรหัสห้องเรียน, เลข ศธ.
                        และชื่อกลุ่มเรียนให้อัตโนมัติ
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="รหัสกลุ่มเรียน (group_code)">
                        <input
                            type="text"
                            value={form.group_code}
                            onChange={handleChange("group_code")}
                            placeholder="กด Auto Fill หรือกรอกเอง"
                            className={`${inputClass} font-mono`}
                        />
                    </Field>
                    <Field label="รหัสห้องเรียน (room_code)">
                        <input
                            type="text"
                            value={form.room_code}
                            onChange={handleChange("room_code")}
                            placeholder="กด Auto Fill หรือกรอกเอง"
                            className={`${inputClass} font-mono`}
                        />
                    </Field>
                </div>

                <Field label="ชื่อกลุ่มเรียน (group_name)">
                    <input
                        type="text"
                        value={form.group_name}
                        onChange={handleChange("group_name")}
                        placeholder="กด Auto Fill เพื่อสร้างชื่อ หรือกรอกเอง"
                        className={inputClass}
                    />
                </Field>

                {/* ผู้สอน */}
                <Field label="ครูผู้สอน">
                    <VirtualizedCombobox
                        value={form.teacher_id}
                        onChange={handleComboChange("teacher_id")}
                        options={teacherOptions}
                        placeholder="พิมพ์ค้นหาชื่อครูผู้สอน..."
                        className={inputClass}
                    />
                </Field>

                {/* สถานที่จัดเรียนร่วม */}
                <Field label="สถานที่จัดเรียนร่วม">
                    <div className="flex items-stretch gap-1.5">
                        <div className="min-w-0 flex-1">
                            <VirtualizedCombobox
                                value={form.joint_location_id}
                                onChange={handleComboChange("joint_location_id")}
                                options={locationOptions}
                                placeholder="เลือกสถานที่..."
                                className={inputClass}
                            />
                        </div>
                        <button
                            type="button"
                            title="เพิ่มสถานที่ใหม่ด่วน"
                            onClick={handleQuickAddLocation}
                            disabled={isQuickAddingLocation}
                            className="flex shrink-0 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-60"
                        >
                            <Plus size={15} />
                        </button>
                        <button
                            type="button"
                            title="จัดการรายการสถานที่"
                            onClick={() => setIsManageLocationsOpen(true)}
                            className="flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-slate-500 transition hover:bg-slate-100"
                        >
                            <Settings size={15} />
                        </button>
                    </div>
                </Field>

                {/* ช่วงวันที่ */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="วันเริ่มเรียน">
                        <MaskedDateInput
                            value={form.start_date}
                            onChange={handleDateChange("start_date")}
                            calendar="BE"
                            className={inputClass}
                        />
                    </Field>
                    <Field label="วันจบเรียน">
                        <MaskedDateInput
                            value={form.end_date}
                            onChange={handleDateChange("end_date")}
                            calendar="BE"
                            className={inputClass}
                        />
                    </Field>
                    <Field label="วันเปิดรับสมัคร">
                        <MaskedDateInput
                            value={form.registration_start_date}
                            onChange={handleDateChange("registration_start_date")}
                            calendar="BE"
                            className={inputClass}
                        />
                    </Field>
                    <Field label="วันปิดรับสมัคร">
                        <MaskedDateInput
                            value={form.registration_end_date}
                            onChange={handleDateChange("registration_end_date")}
                            calendar="BE"
                            className={inputClass}
                        />
                    </Field>
                </div>

                <Field label="รูปแบบวันเรียน (คำอธิบาย)">
                    <input
                        type="text"
                        value={form.study_dates_description}
                        onChange={handleChange("study_dates_description")}
                        placeholder="เช่น ทุกวันเสาร์-อาทิตย์"
                        className={inputClass}
                    />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="จำนวนที่นั่งสูงสุด">
                        <input
                            type="number"
                            min="1"
                            value={form.max_seats}
                            onChange={handleChange("max_seats")}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="ชั่วโมงรวม">
                        <input
                            type="number"
                            min="0"
                            value={form.total_hours}
                            onChange={handleChange("total_hours")}
                            className={inputClass}
                        />
                    </Field>
                </div>

                {/* ค่าธรรมเนียม */}
                <div className="rounded-xl border border-slate-200 p-4">
                    <p className="mb-3 text-sm font-bold text-slate-800">ค่าธรรมเนียม</p>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="ค่าสมัคร (บาท)">
                            <input
                                type="number"
                                min="0"
                                value={form.application_fee}
                                onChange={handleChange("application_fee")}
                                className={inputClass}
                            />
                        </Field>
                        <Field label="ค่าเรียน (บาท)">
                            <input
                                type="number"
                                min="0"
                                value={form.tuition_fee}
                                onChange={handleChange("tuition_fee")}
                                disabled={form.is_waived_fee}
                                className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                            />
                        </Field>
                    </div>
                    <div className="mt-3 space-y-2">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                checked={form.is_waived_fee}
                                onChange={handleChange("is_waived_fee")}
                                className="h-4 w-4 accent-indigo-600"
                            />
                            ฟรีค่าเรียน
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                checked={form.is_ac_maintenance_fee}
                                onChange={handleChange("is_ac_maintenance_fee")}
                                className="h-4 w-4 accent-indigo-600"
                            />
                            ค่าบำรุงแอร์ (+1 บาท/ชม.)
                        </label>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                        ประมาณการค่าเรียนรวม:{" "}
                        <span className="font-semibold text-indigo-600">{estimatedTuition.toLocaleString()} บาท</span>
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-4">
                {isEditMode && (
                    <button
                        type="button"
                        onClick={onCancelEdit}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        ยกเลิก
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <Save size={15} />
                    {isSubmitting ? "กำลังบันทึก..." : isEditMode ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}
                </button>
            </div>

            <ManageLocationsModal
                isOpen={isManageLocationsOpen}
                onClose={() => setIsManageLocationsOpen(false)}
                items={locations}
                onRefresh={onLocationsRefresh}
            />
        </form>
    );
}

function extractTimeCodeFromGroupCode(groupCode) {
    if (!groupCode) return "";
    const match = /[ชบคพ]/.exec(groupCode);
    return match ? match[0] : "";
}

function Field({ label, children }) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
            {children}
        </div>
    );
}