import { forwardRef } from "react";
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
    const clean = (cid || "").replace(/\D/g, "");
    const digits = [];
    for (let i = 0; i < 13; i++) {
        digits.push(clean[i] || "");
    }
    return digits;
}

/**
 * Split Date into Day, Month, Year
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
 * Determine study round/time slot
 */
function getStudyRound(enrollment) {
    const text = `${enrollment.group_code || ""} ${enrollment.group_name || ""} ${enrollment.schedule_description || ""}`;
    if (text.includes("ค่ำ") || text.includes("17:") || text.includes("18:")) return "ค่ำ";
    if (text.includes("บ่าย") || text.includes("13:")) return "บ่าย";
    if (text.includes("เสาร์") || text.includes("อาทิตย์") || text.includes("ส-อา")) return "ส-อา";
    if (text.includes("เช้า") || text.includes("09:") || text.includes("08:")) return "เช้า";
    return "ปกติ";
}

const ApplicationFormPrint = forwardRef(function ApplicationFormPrint(
    { enrollment, studentNo },
    ref
) {
    if (!enrollment) return null;

    const profile = enrollment.applicant_profile || {};
    const applicationNo = enrollment.application_no || String(enrollment.id || "").padStart(5, "0");
    const isOldStudent = profile.student_type === "นักศึกษาเก่า" || enrollment.student_type === "นักศึกษาเก่า";
    const digits = getCitizenDigits(profile.citizen_id || enrollment.citizen_id);
    const age = calculateAge(profile.birth_date);

    const fullName = profile.full_name || enrollment.applicant_name || "";
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Batch metadata parsing
    const batchName = enrollment.batch_name || "";
    const termMatch = /(\d+)\s*\/\s*(\d{4})/.exec(batchName);
    const term = enrollment.term || (termMatch ? termMatch[1] : "");
    const academicYear = enrollment.academic_year || (termMatch ? termMatch[2] : "");
    const batchNo = enrollment.batch_no || (termMatch ? termMatch[1] : "");

    // Format: 2/2569
    const batchDisplay = (batchNo && academicYear) ? `${batchNo}/${academicYear}` : batchName;

    // Date Parts
    const applyDate = getThaiDateParts(enrollment.apply_date);
    const birthDate = getThaiDateParts(profile.birth_date);

    // Course Data (Resolved from subjects table joined via study_groups -> study_group_subjects -> subjects)
    const courseCode =
        enrollment.subject_code ||
        enrollment.study_groups?.study_group_subjects?.[0]?.subjects?.subject_code ||
        enrollment.subjects_list?.[0]?.subject_code ||
        enrollment.study_group?.subject_code ||
        enrollment.group_code ||
        "-";
    const courseName = `${enrollment.subject_name || enrollment.group_name || "หลักสูตรวิชาชีพระยะสั้น"} ${enrollment.teacher_name ? `(ผู้สอน: ${enrollment.teacher_name})` : ""}`.trim();
    const studyRound = getStudyRound(enrollment);
    const totalHours = enrollment.total_hours || 75;
    const totalAmount = Number(enrollment.total_amount || enrollment.fee || 0);

    const receiptBook = enrollment.receipt_book_no || "";
    const receiptNum = enrollment.receipt_number || "";

    // Helper for dotted blanks
    const Blank = ({ children, width, flex, align = "center", className = "" }) => {
        const style = { textAlign: align, minHeight: '1.2em' };
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

    // Helper for Checkboxes (Customizable margin for grids)
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
                    <span>เริ่มเรียนวันที่ <Blank width="110px">{formatThaiDate(enrollment.study_open_date || enrollment.apply_date)}</Blank></span>
                    <span>เลขที่ <Blank width="50px">{studentNo}</Blank></span>
                </div>
            </div>

            {/* ════════ COURSE TABLE ════════ */}
            <div className="mb-2 mt-3">
                <table className="w-full border border-black text-[14px] text-center table-fixed">
                    <thead>
                        <tr className="border-b border-black">
                            <th className="border-r border-black font-normal py-1 w-[14%]">รหัสวิชา</th>
                            <th className="border-r border-black font-normal py-1 w-[52%]">สมัครเรียนวิชา</th>
                            <th className="border-r border-black font-normal py-1 w-[10%]">รอบ</th>
                            <th className="border-r border-black font-normal py-1 w-[12%]">จำนวนชั่วโมง</th>
                            <th className="font-normal py-1 w-[12%]">ค่าเรียน</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* 1st Row (Filled) */}
                        <tr className="border-b border-dashed border-gray-400">
                            <td className="border-r border-black py-1 px-1 truncate">{courseCode}</td>
                            <td className="border-r border-black py-1 px-2 text-left truncate">{courseName}</td>
                            <td className="border-r border-black py-1 px-1 truncate">{studyRound}</td>
                            <td className="border-r border-black py-1 px-1 truncate">{totalHours}</td>
                            <td className="py-1 px-1 truncate">{totalAmount > 0 ? totalAmount.toLocaleString() : "0"}</td>
                        </tr>
                        {/* Empty Rows (2-5) */}
                        {[...Array(4)].map((_, i) => (
                            <tr key={i} className={i !== 3 ? "border-b border-dashed border-gray-400 h-7" : "h-7"}>
                                <td className="border-r border-black"></td>
                                <td className="border-r border-black"></td>
                                <td className="border-r border-black"></td>
                                <td className="border-r border-black"></td>
                                <td></td>
                            </tr>
                        ))}
                        {/* Summary Row */}
                        <tr className="border-t border-black font-normal">
                            <td className="border-r border-black py-1 text-center">รวม</td>
                            <td className="border-r border-black py-1 text-center">1 รายวิชา</td>
                            <td className="border-r border-black py-1"></td>
                            <td className="border-r border-black py-1">{totalHours} ชั่วโมง</td>
                            <td className="py-1">{totalAmount > 0 ? totalAmount.toLocaleString() : "0"} บาท</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ════════ FOREIGNER NOTE ════════ */}
            <div className="text-[13px] mb-1.5 flex items-baseline">
                <span>หมายเหตุ :</span>
                <span className="flex items-center justify-center w-[14px] h-[14px] rounded-full border border-black mx-2 translate-y-[2px]" />
                <span>เป็นคนซึ่งไม่มีสัญชาติไทย หนังสือเดินทางเลขที่</span>
                <Blank width="150px" className="mx-1">{profile.passport_no}</Blank>
                <span>หลักสูตรปกติ ชำระค่าเล่าเรียน</span>
            </div>
            <div className="text-[13px] ml-16 -mt-1.5 mb-2">
                ชั่วโมงละ 30 บาท + ค่าสมัคร 10 บาท ส่วนหลักสูตรพิเศษชำระค่าเล่าเรียน 2 เท่าของคนซึ่งมีสัญชาติไทย
            </div>

            {/* ════════ APPLICANT INFO ════════ */}
            <div className="space-y-1.5 text-[14px]">
                {/* 1. */}
                <div className="flex items-baseline w-full">
                    <span>1. สมัครเรียนวันที่</span><Blank width="40px" className="mx-1">{applyDate.d}</Blank>
                    <span>เดือน</span><Blank width="100px" className="mx-1">{applyDate.m}</Blank>
                    <span>พ.ศ.</span><Blank width="50px" className="mx-1">{applyDate.y}</Blank>

                    <div className="ml-auto flex items-baseline mr-3">
                        <span>เป็นนักศึกษา</span>
                        <CircleCheck checked={!isOldStudent} label="ใหม่" />
                        <CircleCheck checked={isOldStudent} label="เก่า" />
                    </div>
                </div>

                {/* 2. */}
                <div className="flex items-baseline w-full">
                    <span>2. ข้าพเจ้า (นาย/นาง/นางสาว)</span>
                    <Blank flex={1} className="mx-1">{profile.title_name || ""}{firstName}</Blank>
                    <span>นามสกุล</span>
                    <Blank flex={1} className="mx-1">{lastName}</Blank>

                    <div className="ml-2 flex mr-0.5 items-baseline">
                        <span>เพศ</span>
                        <CircleCheck checked={profile.gender === "ชาย"} label="ชาย" />
                        <CircleCheck checked={profile.gender === "หญิง"} label="หญิง" />
                    </div>
                </div>

                <div className="flex items-baseline w-full">
                    <span>เกิดวันที่</span><Blank width="40px" className="mx-1">{birthDate.d}</Blank>
                    <span>เดือน</span><Blank width="100px" className="mx-1">{birthDate.m}</Blank>
                    <span>พ.ศ.</span><Blank width="50px" className="mx-1">{birthDate.y}</Blank>
                    <span>อายุ</span><Blank width="40px" className="mx-1">{age}</Blank><span>ปี</span>

                    <div className="ml-auto flex items-baseline">
                        <span>สถานภาพสมรส</span>
                        <CircleCheck checked={profile.marital_status === "โสด" || !profile.marital_status} label="โสด" />
                        <CircleCheck checked={profile.marital_status === "สมรส"} label="สมรส" />
                    </div>
                </div>

                {/* 3. */}
                <div className="flex items-baseline w-full">
                    <span>3. ที่อยู่ตามทะเบียนบ้าน เลขที่</span><Blank width="60px" className="mx-1">{profile.house_no}</Blank>
                    <span>หมู่ที่</span><Blank width="40px" className="mx-1">{profile.moo}</Blank>
                    <span>ซอย</span><Blank width="100px" className="mx-1">{profile.soi}</Blank>
                    <span>ถนน</span><Blank flex={1} className="ml-1">{profile.road}</Blank>
                </div>
                <div className="flex items-baseline w-full gap-2">
                    <span className="flex-1 flex items-baseline">ตำบล<Blank flex={1} className="ml-1">{profile.subdistrict}</Blank></span>
                    <span className="flex-1 flex items-baseline">อำเภอ<Blank flex={1} className="ml-1">{profile.district}</Blank></span>
                    <span className="flex-1 flex items-baseline">จังหวัด<Blank flex={1} className="ml-1">{profile.province}</Blank></span>
                    <span className="flex-none flex items-baseline">รหัสไปรษณีย์<Blank width="60px" className="ml-1">{profile.postal_code}</Blank></span>
                    <span className="flex-none flex items-baseline">อาชีพ<Blank width="80px" className="ml-1">{profile.occupation}</Blank></span>
                </div>

                {/* ID Grid */}
                <div className="flex items-center my-1.5 w-full">
                    <span className="mr-2">เลขประจำตัวประชาชน</span>
                    <div className="flex items-center shrink-0">
                        <span className="w-[18px] h-[22px] border border-black flex items-center justify-center text-[12px]">{digits[0]}</span>
                        <span className="w-1.5 text-center">-</span>
                        <div className="flex">
                            {digits.slice(1, 5).map((d, i) => (
                                <span key={i} className="w-[18px] h-[22px] border border-black -ml-px first:ml-0 flex items-center justify-center text-[12px]">{d}</span>
                            ))}
                        </div>
                        <span className="w-1.5 text-center">-</span>
                        <div className="flex">
                            {digits.slice(5, 10).map((d, i) => (
                                <span key={i} className="w-[18px] h-[22px] border border-black -ml-px first:ml-0 flex items-center justify-center text-[12px]">{d}</span>
                            ))}
                        </div>
                        <span className="w-1.5 text-center">-</span>
                        <div className="flex">
                            {digits.slice(10, 12).map((d, i) => (
                                <span key={i} className="w-[18px] h-[22px] border border-black -ml-px first:ml-0 flex items-center justify-center text-[12px]">{d}</span>
                            ))}
                        </div>
                        <span className="w-1.5 text-center">-</span>
                        <span className="w-[18px] h-[22px] border border-black flex items-center justify-center text-[12px]">{digits[12]}</span>
                    </div>

                    <span className="ml-auto flex items-baseline">สัญชาติ<Blank width="60px" className="ml-1">{profile.nationality || "ไทย"}</Blank></span>
                    <span className="ml-4 flex items-baseline">ศาสนา<Blank width="60px" className="ml-1">{profile.religion || "พุทธ"}</Blank></span>
                </div>

                {/* 4. */}
                <div className="flex items-baseline w-full gap-2">
                    <span className="flex-none flex items-baseline">4. สำเร็จการศึกษาสูงสุด ระดับชั้น<Blank width="120px" className="ml-1">{profile.highest_education}</Blank></span>
                    <span className="flex-1 flex items-baseline">จากสถานศึกษา<Blank flex={1} className="ml-1">{profile.previous_school}</Blank></span>
                    <span className="flex-none flex items-baseline">จังหวัด<Blank width="100px" className="ml-1">{profile.school_province}</Blank></span>
                </div>

                {/* 5. */}
                <div className="flex items-baseline w-full">
                    <span>5. ที่อยู่ปัจจุบันที่ติดต่อได้สะดวก บ้านเลขที่</span><Blank width="60px" className="mx-1">{profile.current_house_no}</Blank>
                    <span>หมู่ที่</span><Blank width="40px" className="mx-1">{profile.current_moo}</Blank>
                    <span>ซอย</span><Blank width="100px" className="mx-1">{profile.current_soi}</Blank>
                    <span>ถนน</span><Blank flex={1} className="ml-1">{profile.current_road}</Blank>
                </div>
                <div className="flex items-baseline w-full gap-2">
                    <span className="flex-1 flex items-baseline">ตำบล<Blank flex={1} className="ml-1">{profile.current_subdistrict}</Blank></span>
                    <span className="flex-1 flex items-baseline">อำเภอ<Blank flex={1} className="ml-1">{profile.current_district}</Blank></span>
                    <span className="flex-1 flex items-baseline">จังหวัด<Blank flex={1} className="ml-1">{profile.current_province}</Blank></span>
                    <span className="flex-none flex items-baseline">รหัสไปรษณีย์<Blank width="60px" className="ml-1">{profile.current_postal_code}</Blank></span>
                    <span className="flex-none flex items-baseline">โทรศัพท์<Blank width="100px" className="ml-1 font-mono">{profile.phone}</Blank></span>
                </div>

                {/* 6. */}
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
                            <CircleCheck checked={!!enrollment.id_card_url} label="สำเนาบัตรประชาชน" className="" />
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
                        <div className="mt-2 flex items-baseline pl-1">
                            <span>ได้รับเงินค่าสมัครและค่าเรียนจำนวน:</span>
                            <span className="ml-2 font-bold underline">
                                {totalAmount > 0 ? `${totalAmount.toLocaleString()} บาท` : "......... บาท"}
                            </span>
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

                <div className="flex justify-end pr-8 pt-1">
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