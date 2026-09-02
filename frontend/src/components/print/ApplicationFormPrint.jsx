import { forwardRef, useMemo } from "react";
import { formatThaiDate } from "../../utils/dateUtils";
import logo from "../../assets/logo.png";

/**
 * Calculate age from birth date ISO string
 */
function calculateAge(birthDateIso) {
    if (!birthDateIso) return "";
    const birth = new Date(birthDateIso);
    if (isNaN(birth.getTime())) return "";
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age >= 0 ? age : "";
}

/**
 * Extract 13 individual digits from Citizen ID
 */
function getCitizenDigits(cid = "") {
    if (!cid) return Array(13).fill("");
    const clean = String(cid).replace(/\D/g, "");
    const digits = [];
    for (let i = 0; i < 13; i++) {
        digits.push(clean[i] || "");
    }
    return digits;
}

/**
 * Split Date into Day, Month, Year (B.E.)
 */
function getThaiDateParts(isoString) {
    if (!isoString) return { d: "", m: "", y: "" };
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return { d: "", m: "", y: "" };
    const thaiMonths = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    return {
        d: date.getDate(),
        m: thaiMonths[date.getMonth()],
        y: date.getFullYear() + 543
    };
}

/**
 * Determine study round/time slot from text
 */
function getStudyRound(obj) {
    if (!obj) return "";
    const text = `${obj.group_code || ""} ${obj.group_name || ""} ${obj.schedule_description || ""} ${obj.time_slot_name || ""} ${obj.time_slot_code || ""}`;
    if (text.includes("ค่ำ") || text.includes("17:") || text.includes("18:")) return "ค่ำ";
    if (text.includes("บ่าย") || text.includes("13:")) return "บ่าย";
    if (text.includes("เสาร์") || text.includes("อาทิตย์") || text.includes("ส-อา")) return "ส-อา";
    if (text.includes("เช้า") || text.includes("09:") || text.includes("08:")) return "เช้า";
    return "";
}

/**
 * ApplicationFormPrint
 * -----------------------------------------------------------------------------
 * Printable Official Short-Course Application Form (ใบสมัครเรียนหลักสูตรวิชาชีพระยะสั้น)
 *
 * Supports 3 Strictly Separated Modes:
 *  1. Mode A: Pure Blank Form (`isBlank={true}`) -> All applicant, batch, dates, & course table empty.
 *  2. Mode B: Group Blank Form (`isGroupBlank={true}`) -> Batch metadata, Start Date & Course Table pre-filled; applicant fields 100% blank.
 *  3. Mode C: Filled Student Form (`enrollment` object provided) -> Fully populated with student profile and batch info.
 */
const ApplicationFormPrint = forwardRef(function ApplicationFormPrint(
    {
        enrollment = null,
        groupData = null,
        batch = null,
        studentNo = "",
        isBlank = false,
        isGroupBlank = false,
    },
    ref
) {
    // ── 1. Determine Exact Print Mode ─────────────────────────────────────────
    const isPureBlank = isBlank || (!isGroupBlank && !enrollment && !groupData) || (enrollment?.is_pure_blank);
    const isGroupOnly = !isPureBlank && (isGroupBlank || Boolean(enrollment?.is_blank && enrollment?.study_group_id));
    const isFilled = !isPureBlank && !isGroupOnly && Boolean(enrollment);

    // Primary data sources
    const contextData = enrollment || groupData || {};
    const profile = isFilled ? (enrollment?.applicant_profile || {}) : {};

    // ── 2. Batch & Header Resolution ──────────────────────────────────────────
    const rawBatchName = isPureBlank ? "" : (contextData.batch_name || batch?.batch_name || "");
    const termMatch = /(\d+)\s*\/\s*(\d{4})/.exec(rawBatchName);

    const term = isPureBlank ? "" : (contextData.term || batch?.term || (termMatch ? termMatch[1] : ""));
    const academicYear = isPureBlank ? "" : (contextData.academic_year || batch?.academic_year || (termMatch ? termMatch[2] : ""));
    const batchNo = isPureBlank ? "" : (contextData.batch_no || batch?.batch_no || (termMatch ? termMatch[1] : ""));

    // Format batch sequence: {batch_no}/{academic_year} (e.g. 2/2569)
    const batchDisplay = isPureBlank
        ? ""
        : (batchNo && academicYear)
            ? `${batchNo}/${academicYear}`
            : rawBatchName;

    const applicationNo = isFilled
        ? (enrollment.application_no || String(enrollment.id || "").padStart(5, "0"))
        : "";

    // Start Date Sequential Fallback
    const startDateIso = isPureBlank
        ? null
        : (
            contextData.study_open_date ||
            contextData.start_date ||
            groupData?.study_open_date ||
            groupData?.start_date ||
            batch?.study_open_date
        );
    const startDateDisplay = startDateIso ? formatThaiDate(startDateIso) : "";

    const studentNoDisplay = isFilled
        ? (studentNo ? String(studentNo).padStart(2, "0") : (enrollment.student_no ? String(enrollment.student_no).padStart(2, "0") : ""))
        : "";

    // ── 3. Multi-Subject Course Table Resolution ──────────────────────────────
    const isAcMaintenanceFee = Boolean(
        contextData.is_ac_maintenance_fee ||
        groupData?.is_ac_maintenance_fee ||
        contextData.study_group?.is_ac_maintenance_fee ||
        contextData.study_groups?.is_ac_maintenance_fee
    );

    const isGroupWaived = Boolean(
        contextData.is_waived_fee ||
        contextData.is_free ||
        groupData?.is_waived_fee ||
        groupData?.is_free ||
        contextData.study_group?.is_waived_fee ||
        contextData.study_groups?.is_waived_fee
    );

    const rawSubjectsList = useMemo(() => {
        if (isPureBlank) return [];

        const list = (
            contextData.study_group?.study_group_subjects ||
            contextData.study_groups?.study_group_subjects ||
            contextData.study_group_subjects ||
            groupData?.study_group_subjects ||
            groupData?.study_group?.study_group_subjects ||
            groupData?.study_groups?.study_group_subjects ||
            contextData.subjects ||
            groupData?.subjects ||
            []
        );

        const groupTuitionRate = Number(contextData.tuition_rate_per_hour ?? groupData?.tuition_rate_per_hour ?? 1);
        const groupAppRate = Number(contextData.application_rate_per_subject ?? groupData?.application_rate_per_subject ?? 10);
        const groupAirRate = Number(contextData.air_con_rate_per_hour ?? groupData?.air_con_rate_per_hour ?? 5);

        if (Array.isArray(list) && list.length > 0) {
            return list.map((item) => {
                const subObj = item.subjects || item;
                const hours = Number(subObj.total_hours || item.total_hours || item.hours || 0);
                const isAc = item.is_ac_maintenance_fee !== undefined
                    ? Boolean(item.is_ac_maintenance_fee)
                    : isAcMaintenanceFee;
                const isWaived = item.is_waived_fee !== undefined
                    ? Boolean(item.is_waived_fee)
                    : isGroupWaived;

                const itemTuitionRate = Number(item.tuition_rate_per_hour ?? groupTuitionRate);
                const itemAppFee = Number(item.application_fee ?? item.application_rate_per_subject ?? groupAppRate);
                const itemAirRate = Number(item.air_con_rate_per_hour ?? groupAirRate);

                const tuition = isWaived ? null : (item.tuition_fee !== undefined && item.tuition_fee !== null ? Number(item.tuition_fee) : hours * itemTuitionRate);
                const regFee = isWaived ? null : itemAppFee;
                const acFee = isWaived ? null : (isAc ? hours * itemAirRate : 0);
                const total = isWaived ? null : ((tuition || 0) + (regFee || 0) + (acFee || 0));

                return {
                    subject_code: subObj.subject_code || item.moe_code || item.subject_code || "",
                    subject_name: subObj.subject_name || subObj.name_th || item.subject_name || item.name_th || "",
                    study_round: getStudyRound(item) || getStudyRound(contextData),
                    total_hours: hours,
                    is_ac: isAc,
                    is_waived: isWaived,
                    tuition_fee: tuition,
                    reg_fee: regFee,
                    ac_fee: acFee,
                    total_amount: total,
                };
            });
        }

        // Fallback for single subject / group
        const singleCode = contextData.subject_code || contextData.group_code || "";
        const singleName = contextData.subject_name || contextData.group_name || "";
        if (singleCode || singleName) {
            const hours = Number(contextData.total_hours || 0);
            const isAc = isAcMaintenanceFee;
            const isWaived = isGroupWaived;
            const singleAppFee = Number(contextData.application_fee ?? groupAppRate);
            const tuition = isWaived ? null : (contextData.tuition_fee !== undefined && contextData.tuition_fee !== null ? Number(contextData.tuition_fee) : hours * groupTuitionRate);
            const regFee = isWaived ? null : singleAppFee;
            const acFee = isWaived ? null : (isAc ? hours * groupAirRate : 0);
            const total = isWaived ? null : ((tuition || 0) + (regFee || 0) + (acFee || 0));

            return [{
                subject_code: singleCode,
                subject_name: singleName,
                study_round: getStudyRound(contextData),
                total_hours: hours,
                is_ac: isAc,
                is_waived: isWaived,
                tuition_fee: tuition,
                reg_fee: regFee,
                ac_fee: acFee,
                total_amount: total,
            }];
        }

        return [];
    }, [isPureBlank, contextData, groupData, isAcMaintenanceFee, isGroupWaived]);

    // Cap subjects to max 5 rows for standard print table
    const activeSubjects = rawSubjectsList.slice(0, 5);

    // Sum hours and fee itemizations dynamically
    const summaryCalculations = useMemo(() => {
        if (isPureBlank || activeSubjects.length === 0) {
            return {
                totalHours: "",
                totalTuition: "",
                totalReg: "",
                totalAc: "",
                grandTotal: "",
            };
        }

        const anyWaived = activeSubjects.every((s) => s.is_waived);
        const totalHours = activeSubjects.reduce((acc, s) => acc + (Number(s.total_hours) || 0), 0);

        if (anyWaived) {
            return {
                totalHours: totalHours > 0 ? totalHours : "",
                totalTuition: "-",
                totalReg: "-",
                totalAc: "-",
                grandTotal: "-",
            };
        }

        const totalTuition = activeSubjects.reduce((acc, s) => acc + (s.tuition_fee !== null ? Number(s.tuition_fee) : 0), 0);
        const totalReg = activeSubjects.reduce((acc, s) => acc + (s.reg_fee !== null ? Number(s.reg_fee) : 0), 0);
        const hasAc = activeSubjects.some((s) => s.is_ac);
        const totalAc = hasAc
            ? activeSubjects.reduce((acc, s) => acc + (s.ac_fee !== null ? Number(s.ac_fee) : 0), 0)
            : null;
        const grandTotal = totalTuition + totalReg + (totalAc || 0);

        return {
            totalHours: totalHours > 0 ? totalHours : "",
            totalTuition: totalTuition > 0 ? totalTuition.toLocaleString() : (totalTuition === 0 ? "0" : "-"),
            totalReg: totalReg > 0 ? totalReg.toLocaleString() : (totalReg === 0 ? "0" : "-"),
            totalAc: totalAc !== null ? (totalAc > 0 ? totalAc.toLocaleString() : "0") : "-",
            grandTotal: grandTotal > 0 ? grandTotal.toLocaleString() : (grandTotal === 0 ? "0" : "-"),
        };
    }, [isPureBlank, activeSubjects]);

    // ── 4. Applicant Profile Data (Strict: No Ghost Defaults) ──────────────────
    const isNewStudent = isFilled && (profile.student_type === "นักศึกษาใหม่" || enrollment.student_type === "นักศึกษาใหม่");
    const isOldStudent = isFilled && (profile.student_type === "นักศึกษาเก่า" || enrollment.student_type === "นักศึกษาเก่า");

    const digits = isFilled
        ? getCitizenDigits(profile.citizen_id || enrollment.citizen_id)
        : Array(13).fill("");

    const age = isFilled ? calculateAge(profile.birth_date) : "";

    const fullName = isFilled
        ? (profile.full_name || enrollment.applicant_name || "").trim()
        : "";
    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const isMale = isFilled && (profile.gender === "ชาย" || profile.title_name === "นาย" || profile.title_name === "เด็กชาย");
    const isFemale = isFilled && (profile.gender === "หญิง" || profile.title_name === "นาง" || profile.title_name === "นางสาว" || profile.title_name === "เด็กหญิง");

    const isSingle = isFilled && profile.marital_status === "โสด";
    const isMarried = isFilled && profile.marital_status === "สมรส";

    // Date Parts
    const applyDate = isFilled ? getThaiDateParts(enrollment.apply_date) : { d: "", m: "", y: "" };
    const birthDate = isFilled ? getThaiDateParts(profile.birth_date) : { d: "", m: "", y: "" };

    const passportNo = isFilled ? (profile.passport_no || "") : "";
    const isForeigner = isFilled && Boolean(passportNo || (profile.nationality && profile.nationality !== "ไทย"));

    // Receipt details
    const receiptBook = isFilled ? (enrollment.receipt_book_no || "") : "";
    const receiptNum = isFilled ? (enrollment.receipt_number || "") : "";

    // Helper for dotted blanks
    const Blank = ({ children, width, flex, align = "center", className = "" }) => {
        const style = { textAlign: align, minHeight: "1.2em" };
        if (width) style.width = width;
        if (flex) style.flex = flex;

        return (
            <span
                className={`inline-block border-b border-dotted border-black px-1 leading-tight whitespace-nowrap overflow-hidden text-ellipsis align-bottom ${className}`}
                style={style}
            >
                {children || <span className="invisible">-</span>}
            </span>
        );
    };

    // Helper for Checkboxes (Circle Checkmark)
    const CircleCheck = ({ checked, label, className = "ml-3" }) => (
        <span className={`inline-flex items-center gap-1.5 ${className}`}>
            <span className="flex items-center justify-center w-[14px] h-[14px] rounded-full border border-black text-[12px] font-bold leading-none shrink-0 pb-[1px]">
                {checked ? "✓" : ""}
            </span>
            <span className="whitespace-nowrap">{label}</span>
        </span>
    );

    return (
        <div
            ref={ref}
            className="application-print-root bg-white text-black font-['Sarabun',sans-serif] select-text"
            style={{
                width: "210mm",
                minHeight: "297mm",
                boxSizing: "border-box",
                padding: "8mm 12mm",
                margin: "0 auto",
                fontSize: "14px",
                lineHeight: "1.5",
                color: "#000",
                backgroundColor: "#fff",
            }}
        >
            <style orientation="portrait">{`
                @page { size: A4 portrait; margin: 0; }
                @media print {
                    html, body {
                        width: 210mm; height: 297mm;
                        margin: 0 !important; padding: 0 !important;
                        background: #fff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .application-print-root {
                        width: 210mm !important; min-height: 297mm !important;
                        padding: 8mm 12mm !important; box-sizing: border-box !important;
                    }
                }
            `}</style>

            {/* ════════ HEADER ZONE ════════ */}
            <div className="relative mb-2">
                <div className="flex items-start pr-[3.5cm]">
                    <div className="w-[3cm] h-[3cm] shrink-0">
                        <img src={logo} alt="logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-start pt-2">
                        <h1 className="text-[20px] font-bold text-black leading-tight">ใบสมัครเข้าเรียนหลักสูตรวิชาชีพระยะสั้น</h1>
                        <h2 className="text-[18px] font-bold text-black leading-snug">วิทยาลัยสารพัดช่างอุดรธานี</h2>
                        <div className="mt-2 flex items-baseline gap-4 text-[14px]">
                            <span>ภาคเรียนที่ <Blank width="30px">{term}</Blank></span>
                            <span>ปีการศึกษา <Blank width="50px">{academicYear}</Blank></span>
                            <span>รุ่นที่ <Blank width="60px">{batchDisplay}</Blank></span>
                        </div>
                    </div>
                </div>

                {/* Photo Box */}
                <div className="absolute top-0 right-0 w-[3cm] h-[4cm] border border-black flex flex-col items-center justify-center text-[12px] text-black bg-white">
                    <span>รูปถ่าย</span>
                    <span>ขนาด 3 x 4 ซม.</span>
                </div>

                <div className="flex items-baseline justify-between text-[14px] mt-1 pr-[3.5cm]">
                    <span>ใบสมัครเลขที่ <Blank width="60px">{applicationNo}</Blank></span>
                    <span>เริ่มเรียนวันที่ <Blank width="110px">{startDateDisplay}</Blank></span>
                    <span>เลขที่ <Blank width="50px">{studentNoDisplay}</Blank></span>
                </div>
            </div>

            {/* ════════ COURSE TABLE (EXACTLY 5 ROWS) ════════ */}
            <div className="mb-2 mt-3">
                <table className="w-full border border-black text-[13px] text-center table-fixed">
                    <thead>
                        <tr className="border-b border-black text-[13px]">
                            <th className="border-r border-black font-normal py-1 w-[5%]">ที่</th>
                            <th className="border-r border-black font-normal py-1 w-[14%]">รหัสวิชา</th>
                            <th className="border-r border-black font-normal py-1 w-[33%] text-center">ชื่อวิชา</th>
                            <th className="border-r border-black font-normal py-1 w-[11%]">จำนวนชั่วโมง</th>
                            <th className="border-r border-black font-normal py-1 w-[12%]">ค่าบำรุงการศึกษา</th>
                            <th className="border-r border-black font-normal py-1 w-[8%]">ค่าสมัคร</th>
                            <th className="border-r border-black font-normal py-1 w-[12%]">ค่าห้องปรับอากาศ</th>
                            <th className="font-normal py-1 w-[11%]">รวม (บาท)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Active Subjects Rows (1 to 5) */}
                        {activeSubjects.map((sub, idx) => {
                            const tuitionText = isPureBlank ? "" : (sub.is_waived ? "-" : (sub.tuition_fee !== null ? (sub.tuition_fee > 0 ? sub.tuition_fee.toLocaleString() : "0") : "-"));
                            const regText = isPureBlank ? "" : (sub.is_waived ? "-" : (sub.reg_fee !== null ? (sub.reg_fee > 0 ? sub.reg_fee.toLocaleString() : "0") : "-"));
                            const acText = isPureBlank ? "" : (sub.is_waived ? "-" : (sub.is_ac ? (sub.ac_fee > 0 ? sub.ac_fee.toLocaleString() : "0") : "-"));
                            const totalText = isPureBlank ? "" : (sub.is_waived ? "-" : (sub.total_amount !== null ? (sub.total_amount > 0 ? sub.total_amount.toLocaleString() : "0") : "-"));

                            return (
                                <tr key={idx} className="border-b border-dashed border-gray-400">
                                    <td className="border-r border-black py-1 px-1">{idx + 1}</td>
                                    <td className="border-r border-black py-1 px-1 truncate font-mono text-[12px]">{sub.subject_code || "-"}</td>
                                    <td className="border-r border-black py-1 px-2 text-left truncate">{sub.subject_name || "-"}</td>
                                    <td className="border-r border-black py-1 px-1 truncate">{sub.total_hours || "-"}</td>
                                    <td className="border-r border-black py-1 px-1 truncate">{tuitionText}</td>
                                    <td className="border-r border-black py-1 px-1 truncate">{regText}</td>
                                    <td className="border-r border-black py-1 px-1 truncate">{acText}</td>
                                    <td className="py-1 px-1 truncate">{totalText}</td>
                                </tr>
                            );
                        })}

                        {/* Empty Rows to guarantee exactly 5 rows in total */}
                        {[...Array(Math.max(0, 5 - activeSubjects.length))].map((_, i) => {
                            const isLast = i === Math.max(0, 5 - activeSubjects.length) - 1;
                            return (
                                <tr key={`empty-${i}`} className={!isLast ? "border-b border-dashed border-gray-400 h-7" : "h-7"}>
                                    <td className="border-r border-black">&nbsp;</td>
                                    <td className="border-r border-black">&nbsp;</td>
                                    <td className="border-r border-black">&nbsp;</td>
                                    <td className="border-r border-black">&nbsp;</td>
                                    <td className="border-r border-black">&nbsp;</td>
                                    <td className="border-r border-black">&nbsp;</td>
                                    <td className="border-r border-black">&nbsp;</td>
                                    <td>&nbsp;</td>
                                </tr>
                            );
                        })}

                        {/* Summary Row */}
                        <tr className="border-t border-black font-normal">
                            <td className="border-r border-black py-1 text-center font-bold">รวม</td>
                            <td className="border-r border-black py-1 text-center"></td>
                            <td className="border-r border-black py-1 text-center">
                                {isPureBlank ? "" : (activeSubjects.length > 0 ? `${activeSubjects.length} รายวิชา` : "")}
                            </td>
                            <td className="border-r border-black py-1">
                                {isPureBlank ? "" : (summaryCalculations.totalHours !== "" ? `${summaryCalculations.totalHours}` : "")}
                            </td>
                            <td className="border-r border-black py-1">
                                {isPureBlank ? "" : summaryCalculations.totalTuition}
                            </td>
                            <td className="border-r border-black py-1">
                                {isPureBlank ? "" : summaryCalculations.totalReg}
                            </td>
                            <td className="border-r border-black py-1">
                                {isPureBlank ? "" : summaryCalculations.totalAc}
                            </td>
                            <td className="py-1 font-semibold">
                                {isPureBlank ? "" : summaryCalculations.grandTotal}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ════════ FOREIGNER NOTE ════════ */}
            <div className="text-[13px] mb-1.5 flex items-baseline">
                <span>หมายเหตุ :</span>
                <span className="flex items-center justify-center w-[14px] h-[14px] rounded-full border border-black mx-2 translate-y-[2px] text-[12px] font-bold leading-none shrink-0 pb-[1px]">
                    {isForeigner ? "✓" : ""}
                </span>
                <span>เป็นคนซึ่งไม่มีสัญชาติไทย หนังสือเดินทางเลขที่</span>
                <Blank width="150px" className="mx-1">{passportNo}</Blank>
                <span>หลักสูตรปกติ ชำระค่าเล่าเรียน</span>
            </div>
            <div className="text-[13px] ml-16 -mt-1.5 mb-2">
                ชั่วโมงละ 30 บาท + ค่าสมัคร 10 บาท ส่วนหลักสูตรพิเศษชำระค่าเล่าเรียน 2 เท่าของคนซึ่งมีสัญชาติไทย
            </div>

            {/* ════════ APPLICANT INFO (100% Blank on Pure Blank / Group Blank) ════════ */}
            <div className="space-y-1.5 text-[14px]">
                {/* 1. */}
                <div className="flex items-baseline w-full">
                    <span>1. สมัครเรียนวันที่</span><Blank width="40px" className="mx-1">{applyDate.d}</Blank>
                    <span>เดือน</span><Blank width="100px" className="mx-1">{applyDate.m}</Blank>
                    <span>พ.ศ.</span><Blank width="50px" className="mx-1">{applyDate.y}</Blank>

                    <div className="ml-auto flex items-baseline mr-3">
                        <span>เป็นนักศึกษา</span>
                        <CircleCheck checked={isNewStudent} label="ใหม่" />
                        <CircleCheck checked={isOldStudent} label="เก่า" />
                    </div>
                </div>

                {/* 2. */}
                <div className="flex items-baseline w-full">
                    <span>2. ข้าพเจ้า (นาย/นาง/นางสาว)</span>
                    <Blank flex={1} className="mx-1">
                        {isFilled ? `${profile.title_name || ""}${firstName}` : ""}
                    </Blank>
                    <span>นามสกุล</span>
                    <Blank flex={1} className="mx-1">
                        {isFilled ? lastName : ""}
                    </Blank>

                    <div className="ml-2 flex mr-0.5 items-baseline">
                        <span>เพศ</span>
                        <CircleCheck checked={isMale} label="ชาย" />
                        <CircleCheck checked={isFemale} label="หญิง" />
                    </div>
                </div>

                <div className="flex items-baseline w-full">
                    <span>เกิดวันที่</span><Blank width="40px" className="mx-1">{birthDate.d}</Blank>
                    <span>เดือน</span><Blank width="100px" className="mx-1">{birthDate.m}</Blank>
                    <span>พ.ศ.</span><Blank width="50px" className="mx-1">{birthDate.y}</Blank>
                    <span>อายุ</span><Blank width="40px" className="mx-1">{age}</Blank><span>ปี</span>

                    <div className="ml-auto flex items-baseline">
                        <span>สถานภาพสมรส</span>
                        <CircleCheck checked={isSingle} label="โสด" />
                        <CircleCheck checked={isMarried} label="สมรส" />
                    </div>
                </div>

                {/* 3. Registered Address */}
                <div className="flex items-baseline w-full">
                    <span>3. ที่อยู่ตามทะเบียนบ้าน เลขที่</span><Blank width="60px" className="mx-1">{isFilled ? profile.house_no : ""}</Blank>
                    <span>หมู่ที่</span><Blank width="40px" className="mx-1">{isFilled ? profile.moo : ""}</Blank>
                    <span>ซอย</span><Blank width="100px" className="mx-1">{isFilled ? profile.soi : ""}</Blank>
                    <span>ถนน</span><Blank flex={1} className="ml-1">{isFilled ? profile.road : ""}</Blank>
                </div>
                <div className="flex items-baseline w-full gap-2">
                    <span className="flex-1 flex items-baseline">ตำบล<Blank flex={1} className="ml-1">{isFilled ? profile.subdistrict : ""}</Blank></span>
                    <span className="flex-1 flex items-baseline">อำเภอ<Blank flex={1} className="ml-1">{isFilled ? profile.district : ""}</Blank></span>
                    <span className="flex-1 flex items-baseline">จังหวัด<Blank flex={1} className="ml-1">{isFilled ? profile.province : ""}</Blank></span>
                    <span className="flex-none flex items-baseline">รหัสไปรษณีย์<Blank width="60px" className="ml-1">{isFilled ? profile.postal_code : ""}</Blank></span>
                    <span className="flex-none flex items-baseline">อาชีพ<Blank width="80px" className="ml-1">{isFilled ? profile.occupation : ""}</Blank></span>
                </div>

                {/* Citizen ID Grid */}
                <div className="flex items-center my-1.5 w-full">
                    <span className="mr-2">เลขประจำตัวประชาชน</span>
                    <div className="flex items-center shrink-0">
                        <span className="w-[18px] h-[22px] border border-black flex items-center justify-center text-[12px] font-mono">{digits[0]}</span>
                        <span className="w-1.5 text-center">-</span>
                        <div className="flex">
                            {digits.slice(1, 5).map((d, i) => (
                                <span key={i} className="w-[18px] h-[22px] border border-black -ml-px first:ml-0 flex items-center justify-center text-[12px] font-mono">{d}</span>
                            ))}
                        </div>
                        <span className="w-1.5 text-center">-</span>
                        <div className="flex">
                            {digits.slice(5, 10).map((d, i) => (
                                <span key={i} className="w-[18px] h-[22px] border border-black -ml-px first:ml-0 flex items-center justify-center text-[12px] font-mono">{d}</span>
                            ))}
                        </div>
                        <span className="w-1.5 text-center">-</span>
                        <div className="flex">
                            {digits.slice(10, 12).map((d, i) => (
                                <span key={i} className="w-[18px] h-[22px] border border-black -ml-px first:ml-0 flex items-center justify-center text-[12px] font-mono">{d}</span>
                            ))}
                        </div>
                        <span className="w-1.5 text-center">-</span>
                        <span className="w-[18px] h-[22px] border border-black flex items-center justify-center text-[12px] font-mono">{digits[12]}</span>
                    </div>

                    <span className="ml-auto flex items-baseline">สัญชาติ<Blank width="60px" className="ml-1">{isFilled ? (profile.nationality || "") : ""}</Blank></span>
                    <span className="ml-4 flex items-baseline">ศาสนา<Blank width="60px" className="ml-1">{isFilled ? (profile.religion || "") : ""}</Blank></span>
                </div>

                {/* 4. Education */}
                <div className="flex items-baseline w-full gap-2">
                    <span className="flex-none flex items-baseline">4. สำเร็จการศึกษาสูงสุด ระดับชั้น<Blank width="120px" className="ml-1">{isFilled ? profile.highest_education : ""}</Blank></span>
                    <span className="flex-1 flex items-baseline">จากสถานศึกษา<Blank flex={1} className="ml-1">{isFilled ? profile.previous_school : ""}</Blank></span>
                    <span className="flex-none flex items-baseline">จังหวัด<Blank width="100px" className="ml-1">{isFilled ? profile.school_province : ""}</Blank></span>
                </div>

                {/* 5. Current Address */}
                <div className="flex items-baseline w-full">
                    <span>5. ที่อยู่ปัจจุบันที่ติดต่อได้สะดวก บ้านเลขที่</span>
                    <Blank width="60px" className="mx-1">
                        {isFilled ? (profile.current_house_no || (profile.is_same_address ? profile.house_no : "")) : ""}
                    </Blank>
                    <span>หมู่ที่</span>
                    <Blank width="40px" className="mx-1">
                        {isFilled ? (profile.current_moo || (profile.is_same_address ? profile.moo : "")) : ""}
                    </Blank>
                    <span>ซอย</span>
                    <Blank width="100px" className="mx-1">
                        {isFilled ? (profile.current_soi || (profile.is_same_address ? profile.soi : "")) : ""}
                    </Blank>
                    <span>ถนน</span>
                    <Blank flex={1} className="ml-1">
                        {isFilled ? (profile.current_road || (profile.is_same_address ? profile.road : "")) : ""}
                    </Blank>
                </div>
                <div className="flex items-baseline w-full gap-2">
                    <span className="flex-1 flex items-baseline">
                        ตำบล<Blank flex={1} className="ml-1">
                            {isFilled ? (profile.current_subdistrict || (profile.is_same_address ? profile.subdistrict : "")) : ""}
                        </Blank>
                    </span>
                    <span className="flex-1 flex items-baseline">
                        อำเภอ<Blank flex={1} className="ml-1">
                            {isFilled ? (profile.current_district || (profile.is_same_address ? profile.district : "")) : ""}
                        </Blank>
                    </span>
                    <span className="flex-1 flex items-baseline">
                        จังหวัด<Blank flex={1} className="ml-1">
                            {isFilled ? (profile.current_province || (profile.is_same_address ? profile.province : "")) : ""}
                        </Blank>
                    </span>
                    <span className="flex-none flex items-baseline">
                        รหัสไปรษณีย์<Blank width="60px" className="ml-1">
                            {isFilled ? (profile.current_postal_code || (profile.is_same_address ? profile.postal_code : "")) : ""}
                        </Blank>
                    </span>
                    <span className="flex-none flex items-baseline">
                        โทรศัพท์<Blank width="100px" className="ml-1 font-mono">
                            {isFilled ? (profile.phone || enrollment.phone || "") : ""}
                        </Blank>
                    </span>
                </div>

                {/* 6. Certification */}
                <div className="pt-2 flex items-start gap-1">
                    <span>6.</span>
                    <span className="leading-relaxed">
                        ข้าพเจ้าขอรับรองว่า ข้อความข้างต้นนี้เป็นความจริงทุกประการ และได้ทราบระเบียบของวิทยาลัยเป็นอย่างดีแล้ว
                        และจะปฏิบัติตามโดยเคร่งครัด
                    </span>
                </div>

                <div className="flex justify-end pt-3 pr-8 pb-1">
                    <div className="text-center">
                        <div className="flex items-baseline">(ลงชื่อ) <Blank width="220px" className="mx-1"></Blank> ผู้สมัคร</div>
                    </div>
                </div>
            </div>

            {/* ════════ STAFF SIGN-OFF ZONE (ONE UNIFIED BOX) ════════ */}
            <div className="border border-black flex text-[13px] mt-2 mb-2">
                {/* Left: Registrar */}
                <div className="w-1/2 border-r border-black p-2 flex flex-col justify-between">
                    <div>
                        <p className="font-bold mb-2 pl-1">เจ้าหน้าที่รับสมัคร</p>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-1 pl-1">
                            <CircleCheck
                                checked={isFilled && Boolean(enrollment?.id_card_url || profile?.id_card_url)}
                                label="สำเนาบัตรประชาชน"
                                className=""
                            />
                            <CircleCheck checked={false} label="สำเนาทะเบียนบ้าน" className="" />
                            <CircleCheck checked={false} label="วุฒิการศึกษา" className="" />
                            <CircleCheck checked={false} label="รูปถ่าย 3 x 4 ซม." className="" />
                        </div>
                    </div>
                    <div className="text-center mt-5">
                        <div className="flex items-baseline justify-center">(ลงชื่อ) <Blank width="140px" className="mx-1"></Blank> เจ้าหน้าที่รับสมัคร</div>
                        <div className="mt-1 text-slate-700">........ / ........ / ........</div>
                    </div>
                </div>

                {/* Right: Finance */}
                <div className="w-1/2 p-2 flex flex-col justify-between">
                    <div>
                        <p className="font-bold mb-2 pl-1">เจ้าหน้าที่การเงิน</p>
                        <div className="flex items-baseline pl-1">
                            <span>ใบเสร็จรับเงิน เล่มที่</span><Blank width="60px" className="mx-1 font-mono">{receiptBook}</Blank>
                            <span className="ml-2">เลขที่</span><Blank width="60px" className="mx-1 font-mono">{receiptNum}</Blank>
                        </div>
                    </div>
                    <div className="text-center mt-5">
                        <div className="flex items-baseline justify-center">(ลงชื่อ) <Blank width="140px" className="mx-1"></Blank> เจ้าหน้าที่การเงิน</div>
                        <div className="mt-1 text-slate-700">........ / ........ / ........</div>
                    </div>
                </div>
            </div>

            {/* ════════ GUARDIAN CONSENT ════════ */}
            <div className="text-[13px]">
                <p className="font-bold mb-2">หนังสือให้ความยินยอมของผู้ปกครอง (สำหรับผู้สมัครที่อายุยังไม่ครบ 20 ปีบริบูรณ์)</p>
                <div className="flex items-baseline mb-1">
                    <span className="ml-10">ข้าพเจ้า</span><Blank width="220px" className="mx-1"></Blank>
                    <span className="ml-2">เกี่ยวข้องเป็น</span><Blank width="50px" className="mx-1"></Blank>
                    <span className="ml-2">ของ</span><Blank width="200px" className="mx-1"></Blank>
                </div>
                <span className="ml-2 mb-1">ซึ่งเป็นผู้สมัครเรียน ข้าพเจ้าขอรับรองว่าจะควบคุมดูแลผู้สมัคร ให้อยู่ในระเบียบวินัยของวิทยาลัยทุกประการ</span>

                <div className="flex justify-end pr-8 pt-1 mt-2">
                    <div className="text-center">
                        <div className="flex items-baseline">(ลงชื่อ) <Blank width="200px" className="mx-1"></Blank> ผู้ปกครอง</div>
                        <div className="mt-1 flex justify-center">( <Blank width="180px" className="mx-1"></Blank> )</div>
                    </div>
                </div>
            </div>

        </div>
    );
});

export default ApplicationFormPrint;