import { useEffect, useMemo, useState, useRef } from "react";
import { Plus, Pencil, X, Save, RotateCcw } from "lucide-react";
import Swal from "sweetalert2";
import ManageLocationsModal from "./ManageLocationsModal";
import useEnterKeyNav from "../../../hooks/useEnterKeyNav";
import SectionPrerequisites from "./form/SectionPrerequisites";
import SectionSubjectBuilder from "./form/SectionSubjectBuilder";
import SectionScheduleTimes from "./form/SectionScheduleTimes";
import SectionGroupIdentity from "./form/SectionGroupIdentity";
import SectionAssignments from "./form/SectionAssignments";
import SectionFeeSettings from "./form/SectionFeeSettings";
import SectionFormFooter from "./form/SectionFormFooter";
import {
    createStudyGroup,
    updateStudyGroup,
    getNextRoomSequence,
    getNextMoeSequence,
    getNextMoeCode,
    createLocation,
    getSubjectsInGroup,
    addSubjectToGroup,
    updateSubjectInGroup,
    removeSubjectFromGroup,
} from "../services/studyGroupApi";
import {
    ALL_STUDY_DAYS,
    WEEKDAYS,
    buildGroupCode,
    buildGroupCodePreview,
    buildRoomCode,
    buildMoeCode,
    buildGroupName,
    buildScheduleDescription,
    calculateNextConsecutiveMoeCode,
    currentBeYear2Digit,
} from "../../../utils/groupCode";

const EMPTY_FORM = {
    major_id: "",
    group_code: "",
    room_code: "",
    group_no: 1,
    group_type: "normal",
    group_name: "",
    status: "open",
    teacher_id: "",
    joint_location_id: 1,
    time_slot_id: "",
    has_footnote: false,
    footnote_text: "",
    max_seats: 20,
    total_hours: "",
    study_dates_description: "",
    study_days: ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"],
    custom_start_time: "",
    custom_end_time: "",
    start_date: "",
    end_date: "",
    education_type: "วิชาชีพระยะสั้น",
    student_type: "ประชาชนทั่วไป",
    tuition_fee: "0",
    application_fee: "10",
    application_rate_per_subject: "10",
    tuition_rate_per_hour: "1",
    air_con_rate_per_hour: "5",
    is_waived_fee: false,
    is_ac_maintenance_fee: false,
    registration_start_date: "",
    registration_end_date: "",
    time_code: "",
};

let localIdCounter = 0;
const nextLocalId = () => `local-${Date.now()}-${localIdCounter++}`;

/**
 * getDefaultTimesForSlot
 * -------------------------------------------------------------------------
 * Pre-populates standard 24-hour time strings ("HH:mm") based on time_slot range or shift codes
 */
function getDefaultTimesForSlot(slot) {
    let startTime = "";
    let endTime = "";

    if (slot?.time_range) {
        const match = /(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})/.exec(slot.time_range);
        if (match) {
            startTime = `${match[1].padStart(2, "0")}:${match[2]}`;
            endTime = `${match[3].padStart(2, "0")}:${match[4]}`;
        }
    }

    if (!startTime || !endTime) {
        const name = (slot?.time_name || "").trim();
        const code = (slot?.time_code || "").trim();
        if (code === "ช" || (name.includes("เช้า") && !name.includes("บ่าย"))) {
            startTime = "08:30";
            endTime = "12:30";
        } else if (code === "บ" || (name.includes("บ่าย") && !name.includes("เช้า"))) {
            startTime = "13:00";
            endTime = "17:00";
        } else if (code === "ค" || name.includes("ค่ำ")) {
            startTime = "17:30";
            endTime = "20:30";
        } else if (code === "พ" || name.includes("เช้า-บ่าย") || name.includes("เต็มวัน") || name.includes("ทั้งวัน")) {
            startTime = "08:30";
            endTime = "16:30";
        } else {
            startTime = "08:30";
            endTime = "12:30";
        }
    }

    return { startTime, endTime };
}

function extractTimeCodeFromGroupCode(groupCode) {
    if (!groupCode) return "";
    const match = /[ชบคพ]/.exec(groupCode);
    return match ? match[0] : "";
}

/**
 * calculateNextGroupNo
 * -------------------------------------------------------------------------
 * คำนวณลำดับกลุ่มที่ (group_no) อัตโนมัติจากกลุ่มที่มีอยู่แล้วในรุ่นการเรียนเดียวกัน
 */
function calculateNextGroupNo(existingGroups = [], subjectId, timeCode) {
    if (!subjectId || !timeCode) return 1;
    const matching = existingGroups.filter((g) => {
        const hasSubject =
            String(g.subject_id) === String(subjectId) ||
            (Array.isArray(g.subjects_in_group) && g.subjects_in_group.some((s) => String(s.subject_id) === String(subjectId)));
        const code = g.time_code || extractTimeCodeFromGroupCode(g.group_code);
        return hasSubject && code === timeCode;
    });
    if (matching.length === 0) return 1;
    const groupNos = matching.map((g) => Number(g.group_no) || 1);
    return Math.max(...groupNos) + 1;
}

/**
 * GroupFormPanel
 * -------------------------------------------------------------------------
 * Main Orchestrator component with Sticky Bottom Actions and Zero Ghost Blank Space
 */
export default function GroupFormPanel({
    batchId,
    batch = null,
    initialData = null,
    existingGroups = [],
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
    const [primarySubjectId, setPrimarySubjectId] = useState("");
    const [showAllSubjects, setShowAllSubjects] = useState(false);
    const isEditMode = Boolean(initialData);
    const { formRef, handleKeyDown } = useEnterKeyNav();

    const scheduleDescTouchedRef = useRef(false);

    const majorOptions = useMemo(
        () => majors.map((m) => ({ value: m.id, label: m.name_th })),
        [majors]
    );

    const selectedMajor = useMemo(
        () => majors.find((m) => String(m.id) === String(form.major_id)),
        [majors, form.major_id]
    );

    const subjectOptions = useMemo(() => {
        let source = subjects;

        if (!showAllSubjects && form.major_id) {
            const deptId = selectedMajor?.department_id ? String(selectedMajor.department_id) : "";
            const sameDeptMajorIds = new Set(
                majors
                    .filter((m) => deptId && String(m.department_id) === deptId)
                    .map((m) => String(m.id))
            );

            source = subjects.filter((s) => {
                // 1. General / Common subjects without a specific major or department assigned
                if (!s.major_id && !s.department_id) return true;
                // 2. Direct department_id match
                if (s.department_id && deptId && String(s.department_id) === deptId) return true;
                // 3. Exact major match
                if (s.major_id && String(s.major_id) === String(form.major_id)) return true;
                // 4. Same department major match
                if (s.major_id && sameDeptMajorIds.has(String(s.major_id))) return true;
                return false;
            });
        }

        return source.map((s) => {
            const majorName = s.major_name || majors.find((m) => String(m.id) === String(s.major_id))?.name_th || "";
            return {
                value: s.id,
                label: `${s.subject_code} - ${s.name_th}${majorName ? ` [${majorName}]` : ""} (${s.total_hours || 0} ชม.)`,
                subject_code: s.subject_code,
                name_th: s.name_th,
                name_en: s.name_en || "",
                total_hours: s.total_hours,
                major_id: s.major_id,
                department_id: s.department_id,
                major_name: majorName,
            };
        });
    }, [subjects, form.major_id, showAllSubjects, selectedMajor, majors]);

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
        () =>
            timeSlots.map((t) => ({
                value: t.id,
                label: `${t.time_name}${t.time_range ? ` (${t.time_range})` : ""}`,
                time_code: t.time_code,
                time_name: t.time_name,
                time_range: t.time_range,
            })),
        [timeSlots]
    );

    // ── Load / Reset Form on InitialData Change ──────────────────────────────
    useEffect(() => {
        scheduleDescTouchedRef.current = false;

        if (initialData) {
            const matchedSlot = timeSlots.find((t) =>
                initialData.time_slot_id
                    ? String(t.id) === String(initialData.time_slot_id)
                    : t.time_code === extractTimeCodeFromGroupCode(initialData.group_code)
            );

            const initialDays = Array.isArray(initialData.study_days) && initialData.study_days.length > 0
                ? initialData.study_days
                : (typeof initialData.study_days === 'string' && initialData.study_days.trim()
                    ? initialData.study_days.split(',').map((s) => s.trim()).filter(Boolean)
                    : ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"]);

            const initialSubjectsCount = Array.isArray(initialData.subjects) ? initialData.subjects.length : 1;
            const appRate = initialData.application_rate_per_subject
                ? String(initialData.application_rate_per_subject)
                : "10";
            const appFee = initialData.application_fee !== undefined && initialData.application_fee !== null
                ? String(initialData.application_fee)
                : String(initialSubjectsCount * Number(appRate));

            setForm({
                ...EMPTY_FORM,
                ...initialData,
                application_fee: appFee,
                application_rate_per_subject: appRate,
                time_slot_id: initialData.time_slot_id || matchedSlot?.id || "",
                study_days: initialDays,
                custom_start_time: initialData.custom_start_time || "",
                custom_end_time: initialData.custom_end_time || "",
                has_footnote: Boolean(initialData.has_footnote || initialData.footnote_text || (initialData.fee_exception_type && initialData.fee_exception_type !== 'none')),
                footnote_text: initialData.footnote_text || (initialData.fee_exception_type && initialData.fee_exception_type !== 'none' ? initialData.fee_exception_type : ""),
                group_no: initialData.group_no ?? 1,
                max_seats: initialData.max_seats ?? 20,
                status: initialData.status || "open",
                tuition_fee: String(initialData.tuition_fee ?? "0"),
                tuition_rate_per_hour: String(initialData.tuition_rate_per_hour ?? "1"),
                air_con_rate_per_hour: String(initialData.air_con_rate_per_hour ?? "5"),
                is_waived_fee: Boolean(initialData.is_waived_fee),
                is_ac_maintenance_fee: Boolean(initialData.is_ac_maintenance_fee),
                time_code: matchedSlot?.time_code || extractTimeCodeFromGroupCode(initialData.group_code),
            });
            scheduleDescTouchedRef.current = Boolean(initialData.study_dates_description);
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
            setForm({
                ...EMPTY_FORM,
                batch_id: batchId,
                registration_start_date: batch?.admit_open_date || "",
                registration_end_date: batch?.admit_close_date || "",
                start_date: batch?.study_open_date || "",
                end_date: batch?.study_close_date || "",
            });
            setSubjectsInGroup([]);
            setPrimarySubjectId("");
        }
        setRemovedSubjectIds([]);
    }, [initialData, batchId, batch, timeSlots]);

    // ── Form Handlers ────────────────────────────────────────────────────────
    const handleResetForm = (e) => {
        if (e) e.preventDefault();
        scheduleDescTouchedRef.current = false;
        setShowAllSubjects(false);
        setForm({
            ...EMPTY_FORM,
            batch_id: batchId,
            registration_start_date: batch?.admit_open_date || "",
            registration_end_date: batch?.admit_close_date || "",
            start_date: batch?.study_open_date || "",
            end_date: batch?.study_close_date || "",
        });
        setSubjectsInGroup([]);
        setRemovedSubjectIds([]);
        setPrimarySubjectId("");
        if (isEditMode) {
            onCancelEdit?.();
        }
    };

    const handleChange = (field) => (e) => {
        const { value, type, checked } = e.target;
        setForm((prev) => ({ ...prev, [field]: type === "checkbox" ? checked : value }));
    };

    const handleDateChange = (field) => (isoValue) => {
        setForm((prev) => ({ ...prev, [field]: isoValue }));
    };

    const handleMajorChange = (value) => {
        setForm((prev) => ({ ...prev, major_id: value }));
    };

    const handleTimeSlotChange = (e) => {
        const slotId = e.target.value;
        const slot = timeSlots.find((t) => String(t.id) === String(slotId));
        const timeCode = slot?.time_code || "";
        const { startTime, endTime } = getDefaultTimesForSlot(slot);

        const currentDays = form.study_days && form.study_days.length > 0 ? form.study_days : WEEKDAYS;
        const shouldAutoFill = !scheduleDescTouchedRef.current;

        // Auto calculate group_no based on subject and shift if in create mode
        let nextGroupNo = form.group_no;
        if (!isEditMode && primarySubjectId && timeCode) {
            nextGroupNo = calculateNextGroupNo(existingGroups, primarySubjectId, timeCode);
        }

        setForm((prev) => ({
            ...prev,
            time_slot_id: slotId,
            time_code: timeCode,
            group_no: nextGroupNo,
            custom_start_time: startTime || prev.custom_start_time,
            custom_end_time: endTime || prev.custom_end_time,
            study_days: currentDays,
            study_dates_description: shouldAutoFill
                ? buildScheduleDescription({
                      studyDays: currentDays,
                      startTime: startTime || prev.custom_start_time,
                      endTime: endTime || prev.custom_end_time,
                      timeRange: slot?.time_range,
                  })
                : prev.study_dates_description,
        }));
    };

    const handleScheduleDescChange = (e) => {
        scheduleDescTouchedRef.current = true;
        setForm((prev) => ({ ...prev, study_dates_description: e.target.value }));
    };

    const handleAutoBuildScheduleDesc = (e) => {
        e.preventDefault();
        scheduleDescTouchedRef.current = false;
        setForm((prev) => ({
            ...prev,
            study_dates_description: buildScheduleDescription({
                studyDays: prev.study_days,
                startTime: prev.custom_start_time,
                endTime: prev.custom_end_time,
                timeRange: timeSlots.find((t) => String(t.id) === String(prev.time_slot_id))?.time_range,
            }),
        }));
    };

    const handleToggleStudyDay = (day) => {
        setForm((prev) => {
            const current = prev.study_days || [];
            const nextDays = current.includes(day)
                ? current.filter((d) => d !== day)
                : [...current, day];
            const shouldAutoFill = !scheduleDescTouchedRef.current;
            return {
                ...prev,
                study_days: nextDays,
                study_dates_description: shouldAutoFill
                    ? buildScheduleDescription({
                          studyDays: nextDays,
                          startTime: prev.custom_start_time,
                          endTime: prev.custom_end_time,
                      })
                    : prev.study_dates_description,
            };
        });
    };

    const handleSetStudyDays = (days) => {
        setForm((prev) => {
            const shouldAutoFill = !scheduleDescTouchedRef.current;
            return {
                ...prev,
                study_days: days,
                study_dates_description: shouldAutoFill
                    ? buildScheduleDescription({
                          studyDays: days,
                          startTime: prev.custom_start_time,
                          endTime: prev.custom_end_time,
                      })
                    : prev.study_dates_description,
            };
        });
    };

    const handleCustomTimeChange = (field) => (e) => {
        const val = e.target.value;
        setForm((prev) => {
            const nextForm = { ...prev, [field]: val };
            const shouldAutoFill = !scheduleDescTouchedRef.current;
            if (shouldAutoFill) {
                nextForm.study_dates_description = buildScheduleDescription({
                    studyDays: nextForm.study_days,
                    startTime: nextForm.custom_start_time,
                    endTime: nextForm.custom_end_time,
                });
            }
            return nextForm;
        });
    };

    const handleRecalculateTuition = () => {
        const hours = Number(form.total_hours) || 0;
        const rate = Number(form.tuition_rate_per_hour) || 1;
        const appRate = Number(form.application_rate_per_subject ?? 10) || 10;
        const subjectsCount = subjectsInGroup.length || 1;
        const calculatedTuition = hours * rate;
        const calculatedAppFee = subjectsCount * appRate;
        setForm((prev) => ({
            ...prev,
            tuition_fee: String(calculatedTuition),
            application_fee: String(calculatedAppFee),
        }));
    };

    const handleTotalFeeChange = (e) => {
        const manualTotal = Number(e.target.value) || 0;
        const appFee = Number(form.application_fee) || 0;
        const airFee = form.is_ac_maintenance_fee ? (Number(form.total_hours) || 0) * (Number(form.air_con_rate_per_hour) || 5) : 0;
        const remainingTuition = Math.max(0, manualTotal - appFee - airFee);
        setForm((prev) => ({
            ...prev,
            tuition_fee: String(remainingTuition),
        }));
    };

    const handleToggleFreeTuition = (e) => {
        const checked = e.target.checked;
        setForm((prev) => ({
            ...prev,
            is_waived_fee: checked,
            tuition_fee: checked ? "0" : prev.tuition_fee,
        }));
    };

    const handleResetFeeRates = () => {
        const subjectsCount = subjectsInGroup.length || 1;
        setForm((prev) => ({
            ...prev,
            application_rate_per_subject: "10",
            application_fee: String(subjectsCount * 10),
            tuition_rate_per_hour: "1",
            air_con_rate_per_hour: "5",
        }));
    };

    const handleTotalHoursChange = (e) => {
        const val = e.target.value;
        setForm((prev) => {
            const h = Number(val) || 0;
            const rate = Number(prev.tuition_rate_per_hour) || 1;
            return {
                ...prev,
                total_hours: val,
                tuition_fee: prev.is_waived_fee ? "0" : String(h * rate),
            };
        });
    };

    const handleQuickAddLocation = async () => {
        const { value: name, isConfirmed } = await Swal.fire({
            title: "เพิ่มสถานที่ใหม่ด่วน",
            input: "text",
            inputPlaceholder: "ชื่อสถานที่",
            showCancelButton: true,
            confirmButtonText: "เพิ่ม",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#0270c7",
            preConfirm: (value) => {
                if (!value?.trim()) Swal.showValidationMessage("กรุณากรอกชื่อสถานที่");
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
                confirmButtonColor: "#0270c7",
            });
        } finally {
            setIsQuickAddingLocation(false);
        }
    };

    // ── Subjects In Group Handlers ────────────────────────────────────────────
    const handleAddSubjectToGroup = async (opt) => {
        const localId = nextLocalId();
        let generatedMoeCode = "";

        if (form.major_id) {
            const yearForMoe = batch?.academic_year || currentBeYear2Digit();
            const existingCodes = subjectsInGroup.filter((s) => s.moe_code?.trim()?.length >= 9);

            if (existingCodes.length > 0) {
                generatedMoeCode = calculateNextConsecutiveMoeCode(
                    subjectsInGroup,
                    "",
                    selectedMajor?.full_major_code ? `${currentBeYear2Digit()}${selectedMajor.full_major_code}` : ""
                );
            } else {
                try {
                    const baseCode = await getNextMoeCode(yearForMoe, form.major_id);
                    generatedMoeCode = baseCode || "";
                } catch (err) {
                    console.warn("Could not fetch MOE code via RPC:", err);
                    if (selectedMajor?.full_major_code) {
                        generatedMoeCode = calculateNextConsecutiveMoeCode(
                            [],
                            "",
                            `${currentBeYear2Digit()}${selectedMajor.full_major_code}`
                        );
                    }
                }
            }
        }

        setSubjectsInGroup((prev) => [
            ...prev,
            {
                _localId: localId,
                _persistedId: null,
                subject_id: opt.value,
                subject_code: opt.subject_code,
                name_th: opt.name_th,
                total_hours: opt.total_hours,
                moe_code: generatedMoeCode,
                sequence_order: prev.length + 1,
            },
        ]);

        const nextPrimaryId = primarySubjectId || String(opt.value);
        setPrimarySubjectId(nextPrimaryId);

        // Auto update group_no if time_code is already selected
        let updatedGroupNo = form.group_no;
        if (!isEditMode && form.time_code) {
            updatedGroupNo = calculateNextGroupNo(existingGroups, nextPrimaryId, form.time_code);
        }

        const nextSubjectsCount = subjectsInGroup.length + 1;
        setForm((prev) => {
            const currentTotal = Number(prev.total_hours) || 0;
            const newTotal = currentTotal + (Number(opt.total_hours) || 0);
            const rate = Number(prev.tuition_rate_per_hour) || 1;
            const appRate = Number(prev.application_rate_per_subject ?? 10) || 10;
            const newAppFee = nextSubjectsCount * appRate;
            return {
                ...prev,
                group_no: updatedGroupNo,
                total_hours: String(newTotal),
                tuition_fee: prev.is_waived_fee ? "0" : String(newTotal * rate),
                application_fee: prev.is_waived_fee ? "0" : String(newAppFee),
            };
        });
    };

    const handleRemoveSubjectFromGroup = (localId) => {
        setSubjectsInGroup((prev) => {
            const target = prev.find((s) => s._localId === localId);
            if (target?._persistedId) setRemovedSubjectIds((ids) => [...ids, target._persistedId]);
            const filtered = prev.filter((s) => s._localId !== localId);
            const nextSubjectsCount = filtered.length;
            const newTotal = filtered.reduce((sum, s) => sum + (Number(s.total_hours) || 0), 0);
            setForm((f) => {
                const rate = Number(f.tuition_rate_per_hour) || 1;
                const appRate = Number(f.application_rate_per_subject ?? 10) || 10;
                const newAppFee = (nextSubjectsCount || 1) * appRate;
                return {
                    ...f,
                    total_hours: String(newTotal),
                    tuition_fee: f.is_waived_fee ? "0" : String(newTotal * rate),
                    application_fee: f.is_waived_fee ? "0" : String(newAppFee),
                };
            });
            return filtered;
        });
    };

    const handleMoeCodeChange = (localId, value) => {
        setSubjectsInGroup((prev) => prev.map((s) => (s._localId === localId ? { ...s, moe_code: value } : s)));
    };

    const primarySubject =
        subjectsInGroup.find((s) => String(s.subject_id) === String(primarySubjectId)) || subjectsInGroup[0] || null;

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
                text: "Auto Fill ต้องใช้รหัสวิชาจากตารางวิชาย่อยด้านบนเพื่อคำนวณรหัสกลุ่มเรียน",
                confirmButtonColor: "#0270c7",
            });
            return;
        }
        if (!form.time_code || !form.group_no) {
            Swal.fire({ icon: "warning", title: "กรุณาเลือกรอบเรียนและกรอกกลุ่มที่ก่อน", confirmButtonColor: "#0270c7" });
            return;
        }
        if (!selectedMajor?.department_id || !selectedMajor?.full_major_code) {
            Swal.fire({
                icon: "warning",
                title: "กรุณาเลือกแผนกวิชาก่อน",
                text: "ใช้รหัสแผนกของแผนกวิชาที่เลือก เพื่อคำนวณรหัสห้องเรียนและเลข ศธ.",
                confirmButtonColor: "#0270c7",
            });
            return;
        }

        setIsAutoFilling(true);
        try {
            const fullMajorCode = selectedMajor.full_major_code;
            const beYear2 = currentBeYear2Digit();
            const yearForMoe = batch?.academic_year || beYear2;

            const groupCode = buildGroupCode({
                subjectCode: primarySubject.subject_code,
                timeCode: form.time_code,
                groupNo: form.group_no,
            });

            const roomSeqRes = await getNextRoomSequence(fullMajorCode);
            let roomCode = form.room_code;
            if (roomSeqRes.sequence) {
                roomCode = buildRoomCode({ fullMajorCode, roomSequence: roomSeqRes.sequence });
            } else if (roomSeqRes.message) {
                Swal.fire({ icon: "warning", title: "ไม่สามารถคำนวณรหัสห้องเรียนได้", text: roomSeqRes.message, confirmButtonColor: "#0270c7" });
            }

            let baseRpcCode = "";
            const hasAnyExistingCode = subjectsInGroup.some((s) => s.moe_code?.trim()?.length >= 9);
            if (!hasAnyExistingCode) {
                try {
                    baseRpcCode = (await getNextMoeCode(yearForMoe, form.major_id)) || "";
                } catch (err) {
                    console.warn("getNextMoeCode RPC failed, fallback to sequence:", err);
                    const moeSeqRes = await getNextMoeSequence(beYear2, fullMajorCode);
                    if (moeSeqRes.sequence) {
                        baseRpcCode = buildMoeCode({ beYear2Digit: beYear2, fullMajorCode, moeSequence: moeSeqRes.sequence });
                    }
                }
            }

            const updatedSubjects = [...subjectsInGroup];
            for (let i = 0; i < updatedSubjects.length; i++) {
                if (updatedSubjects[i].moe_code?.trim()) continue;

                const nextCode = calculateNextConsecutiveMoeCode(
                    updatedSubjects.slice(0, i),
                    baseRpcCode,
                    `${beYear2}${fullMajorCode}`
                );

                if (nextCode) {
                    updatedSubjects[i] = {
                        ...updatedSubjects[i],
                        moe_code: nextCode,
                    };
                }
            }
            setSubjectsInGroup(updatedSubjects);

            // Standard Thai Vocational Group Name: [ชื่อวิชา] [ประเภท] (รอบ [รหัสย่อรอบ]/[กลุ่มที่])
            const groupName = buildGroupName({
                subjectName: primarySubject.name_th,
                groupType: form.group_type,
                timeCode: form.time_code,
                groupNo: form.group_no,
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
                confirmButtonColor: "#0270c7",
            });
        } finally {
            setIsAutoFilling(false);
        }
    };

    // ── Form Submission ──────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.major_id) {
            Swal.fire({ icon: "warning", title: "กรุณาเลือกแผนกวิชา", confirmButtonColor: "#0270c7" });
            return;
        }
        if (!form.group_code?.trim()) {
            Swal.fire({ icon: "warning", title: "กรุณากรอกหรือ Auto Fill รหัสกลุ่มเรียนก่อน", confirmButtonColor: "#0270c7" });
            return;
        }
        if (!form.group_name?.trim()) {
            Swal.fire({ icon: "warning", title: "กรุณากรอกชื่อกลุ่มเรียน", confirmButtonColor: "#0270c7" });
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
                status: form.status,
                teacher_id: form.teacher_id || null,
                joint_location_id: form.joint_location_id || 1,
                time_slot_id: form.time_slot_id ? Number(form.time_slot_id) : null,
                has_footnote: Boolean(form.has_footnote),
                footnote_text: form.has_footnote ? (form.footnote_text?.trim() || null) : null,
                fee_exception_type: form.has_footnote ? (form.footnote_text?.trim() || "custom") : "none",
                max_seats: Number(form.max_seats) || 20,
                total_hours: Number(form.total_hours) || 0,
                study_days: form.study_days || [],
                custom_start_time: form.custom_start_time || null,
                custom_end_time: form.custom_end_time || null,
                study_dates_description: form.study_dates_description || null,
                start_date: form.start_date || null,
                end_date: form.end_date || null,
                education_type: form.education_type,
                student_type: form.student_type,
                tuition_fee: form.is_waived_fee ? 0 : (Number(form.tuition_fee) || 0),
                application_fee: Number(form.application_fee) || 0,
                tuition_rate_per_hour: Number(form.tuition_rate_per_hour) || 1,
                air_con_rate_per_hour: Number(form.air_con_rate_per_hour) || 5,
                is_waived_fee: Boolean(form.is_waived_fee),
                is_ac_maintenance_fee: Boolean(form.is_ac_maintenance_fee),
                registration_start_date: form.registration_start_date || null,
                registration_end_date: form.registration_end_date || null,
            };

            const savedGroup = isEditMode
                ? await updateStudyGroup(initialData.id, payload)
                : await createStudyGroup(payload);

            await Promise.all(removedSubjectIds.map((id) => removeSubjectFromGroup(id)));

            const yearForMoe = batch?.academic_year || currentBeYear2Digit();
            let baseRpcCode = "";
            const hasAnyCode = subjectsInGroup.some((s) => s.moe_code?.trim()?.length >= 9);
            if (!hasAnyCode && form.major_id) {
                try {
                    baseRpcCode = (await getNextMoeCode(yearForMoe, form.major_id)) || "";
                } catch (err) {
                    console.warn("Could not generate base moe code on submit:", err);
                }
            }

            const preparedSubjects = subjectsInGroup.map((s, index) => {
                if (s.moe_code?.trim()) {
                    return {
                        ...s,
                        sequence_order: s.sequence_order || index + 1,
                    };
                }

                const nextCode = calculateNextConsecutiveMoeCode(
                    subjectsInGroup.slice(0, index),
                    baseRpcCode,
                    selectedMajor?.full_major_code ? `${currentBeYear2Digit()}${selectedMajor.full_major_code}` : ""
                );

                return {
                    ...s,
                    moe_code: nextCode || null,
                    sequence_order: s.sequence_order || index + 1,
                };
            });

            await Promise.all(
                preparedSubjects.map((s) => {
                    const subjectPayload = {
                        study_group_id: savedGroup.id,
                        subject_id: s.subject_id,
                        moe_code: s.moe_code || null,
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
                confirmButtonColor: "#0270c7",
            });
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

    return (
        <form
            id="study-group-form"
            ref={formRef}
            onKeyDown={handleKeyDown}
            onSubmit={handleSubmit}
            className="flex h-full min-h-0 flex-col bg-white overflow-hidden"
        >
            {/* ── 1. Sticky Top Header Banner ── */}
            <div
                className={`flex items-center justify-between gap-2 border-b px-4 py-2.5 shrink-0 transition-colors ${
                    isEditMode ? "border-amber-200 bg-amber-50/90" : "border-emerald-200 bg-emerald-50/90"
                }`}
            >
                <div className="flex min-w-0 items-center gap-2">
                    <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-xs ${
                            isEditMode ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                    >
                        {isEditMode ? <Pencil size={12} /> : <Plus size={13} />}
                    </span>
                    <div className="min-w-0">
                        <p className={`text-[11px] font-bold uppercase tracking-wide leading-tight ${isEditMode ? "text-amber-700" : "text-emerald-700"}`}>
                            {isEditMode ? "กำลังแก้ไขกลุ่มเรียน" : "เพิ่มกลุ่มเรียนใหม่"}
                        </p>
                        {isEditMode && (
                            <p className="truncate text-xs font-semibold text-slate-800" title={form.group_code}>
                                {form.group_code}
                            </p>
                        )}
                    </div>
                </div>
                {isEditMode ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            onCancelEdit?.();
                        }}
                        title="ยกเลิกการแก้ไข / ล้างฟอร์ม"
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-semibold text-amber-700 shadow-2xs transition hover:bg-amber-100"
                    >
                        <X size={12} />
                        ยกเลิก
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleResetForm}
                        title="ล้างข้อมูลในฟอร์มเพื่อเริ่มใหม่"
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-500 shadow-2xs transition hover:bg-slate-100 hover:text-slate-800"
                    >
                        <RotateCcw size={11} />
                        ล้างฟอร์ม
                    </button>
                )}
            </div>

            {/* ── 2. Scrollable Form Body ── */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3.5 space-y-3.5">
                {/* Step 1: Prerequisites (Major & Batch) */}
                <SectionPrerequisites
                    majorId={form.major_id}
                    onMajorChange={handleMajorChange}
                    majorOptions={majorOptions}
                    batch={batch}
                />

                {/* Step 2: Subject Selection & Total Hours */}
                <SectionSubjectBuilder
                    subjectsInGroup={subjectsInGroup}
                    subjectOptions={subjectOptions}
                    allSubjectsCount={subjects.length}
                    showAllSubjects={showAllSubjects}
                    onToggleShowAllSubjects={setShowAllSubjects}
                    primarySubjectId={primarySubjectId}
                    onPrimarySubjectChange={setPrimarySubjectId}
                    onAddSubject={handleAddSubjectToGroup}
                    onRemoveSubject={handleRemoveSubjectFromGroup}
                    onMoeCodeChange={handleMoeCodeChange}
                />

                {/* Step 3: Schedule & Times (Shift, 24h Times, Study Days, Dates) */}
                <SectionScheduleTimes
                    form={form}
                    timeSlotOptions={timeSlotOptions}
                    isEditMode={isEditMode}
                    batch={batch}
                    onTimeSlotChange={handleTimeSlotChange}
                    onCustomTimeChange={handleCustomTimeChange}
                    onToggleStudyDay={handleToggleStudyDay}
                    onSetStudyDays={handleSetStudyDays}
                    onScheduleDescChange={handleScheduleDescChange}
                    onAutoBuildScheduleDesc={handleAutoBuildScheduleDesc}
                    onDateChange={handleDateChange}
                />

                {/* Step 4: Group Identity & Codes (Auto Fill & Group Name) */}
                <SectionGroupIdentity
                    form={form}
                    groupCodePreview={groupCodePreview}
                    isAutoFilling={isAutoFilling}
                    onAutoFill={handleAutoFill}
                    onChange={handleChange}
                />

                {/* Step 5: Assignments & Capacity (Teacher, Location, Max Seats) */}
                <SectionAssignments
                    form={form}
                    teacherOptions={teacherOptions}
                    locationOptions={locationOptions}
                    isQuickAddingLocation={isQuickAddingLocation}
                    onTeacherChange={(val) => setForm((prev) => ({ ...prev, teacher_id: val }))}
                    onLocationChange={(val) => setForm((prev) => ({ ...prev, joint_location_id: val }))}
                    onQuickAddLocation={handleQuickAddLocation}
                    onOpenManageLocations={() => setIsManageLocationsOpen(true)}
                    onChange={handleChange}
                    onTotalHoursChange={handleTotalHoursChange}
                />

                {/* Step 6: Fees & Footnotes (Editable Total, AC, Waiver, Footnote) */}
                <SectionFeeSettings
                    form={form}
                    locations={locations}
                    subjectsCount={subjectsInGroup.length}
                    onChange={handleChange}
                    onToggleFreeTuition={handleToggleFreeTuition}
                    onRecalculateTuition={handleRecalculateTuition}
                    onTotalFeeChange={handleTotalFeeChange}
                    onResetFeeRates={handleResetFeeRates}
                />

                {/* Step 7: Group Status Selector */}
                <SectionFormFooter
                    status={form.status}
                    onChange={handleChange}
                />
            </div>

            {/* ── 3. Sticky Bottom Form Action Footer ── */}
            <div className="p-3 border-t border-slate-200 bg-white/95 backdrop-blur flex items-center justify-between gap-2.5 flex-shrink-0 shadow-xs">
                <button
                    type="button"
                    onClick={handleResetForm}
                    title="ล้างข้อมูลทั้งหมดในฟอร์ม"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs"
                >
                    <RotateCcw size={13} />
                    <span>ล้างฟอร์ม</span>
                </button>

                <div className="flex items-center gap-2">
                    {isEditMode && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                onCancelEdit?.();
                            }}
                            className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-300 transition-colors shadow-2xs"
                        >
                            ยกเลิกแก้ไข
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-sm inline-flex items-center gap-1.5 transition-colors"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="animate-spin">⏳</span> กำลังบันทึก...
                            </>
                        ) : (
                            <>
                                <Save size={14} />
                                <span>{isEditMode ? "บันทึกการแก้ไข" : "บันทึกข้อมูลกลุ่มเรียน"}</span>
                            </>
                        )}
                    </button>
                </div>
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