import { forwardRef } from "react";
import logo from "../../assets/logo.png";
import { formatThaiDate } from "../../utils/dateUtils";

const STATUS_TEXT = {
    paid: "ชำระเงินแล้ว",
    pending_payment: "รอชำระเงิน",
    pending_verification: "รอตรวจสอบ",
    rejected: "ถูกปฏิเสธ",
    cancelled: "ยกเลิก",
};

const RosterSubjectPrint = forwardRef(function RosterSubjectPrint(
    { groupData, subject, students = [] },
    ref
) {
    if (!subject) return null;

    const academicYear = groupData?.academic_year || "";
    const term = groupData?.term || "";
    const batchName = groupData?.batch_name || "";
    const groupName = groupData?.group_name || "";
    const teacherName = subject.teacher_name || groupData?.teacher_name || ".......................................................";

    return (
        <div
            ref={ref}
            className="roster-print-root bg-white text-black font-['TH_Sarabun_PSK','THSarabunPSK',sans-serif] p-8 select-text text-[15pt] leading-normal"
            style={{
                width: "210mm",
                minHeight: "297mm",
                margin: "0 auto",
                boxSizing: "border-box",
                fontFamily: "'TH Sarabun PSK', 'THSarabunPSK', sans-serif",
            }}
        >
            <style>{`
                @page {
                    size: A4 portrait;
                    margin: 12mm 15mm;
                }

                html, body {
                    font-family: 'TH Sarabun PSK', 'THSarabunPSK', sans-serif;
                }

                .roster-print-root,
                .roster-print-root * {
                    font-family: 'TH Sarabun PSK', 'THSarabunPSK', sans-serif !important;
                }

                @media print {
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        font-family: 'TH Sarabun PSK', 'THSarabunPSK', sans-serif !important;
                    }
                    .roster-print-root {
                        padding: 0 !important;
                        width: 100% !important;
                        font-family: 'TH Sarabun PSK', 'THSarabunPSK', sans-serif !important;
                    }
                    table, th, td {
                        font-family: 'TH Sarabun PSK', 'THSarabunPSK', sans-serif !important;
                    }
                }
            `}</style>

            {/* ── Header ────────────────────────────────────────── */}
            <div className="text-center mb-5">
                <div className="flex items-center justify-center gap-3 mb-2">
                    {logo && <img src={logo} alt="Logo" className="h-16 w-16 object-contain" />}
                    <div>
                        <h1 className="text-[18pt] font-bold tracking-tight text-black leading-snug">
                            แบบรายงานบัญชีรายชื่อนักศึกษาและบันทึกเวลาเรียน (ศธ. 02)
                        </h1>
                        <p className="text-[16pt] font-normal text-black">
                            หลักสูตรวิชาชีพระยะสั้น
                        </p>
                    </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-left text-[15pt] border border-black p-3">
                    <div>
                        <span className="font-bold">กลุ่มเรียน:</span> {groupName || "-"}
                    </div>
                    <div>
                        <span className="font-bold">รุ่นการศึกษา:</span> {batchName || "-"} {term && academicYear && `(ภาคเรียนที่ ${term}/${academicYear})`}
                    </div>
                    <div>
                        <span className="font-bold">รหัสวิชา:</span> <span className="font-mono font-bold">{subject.subject_code || "-"}</span>
                        <span className="ml-3 font-bold">รหัส ศธ.:</span> <span className="font-mono font-bold">{subject.moe_code || "-"}</span>
                    </div>
                    <div>
                        <span className="font-bold">ชื่อวิชา:</span> <span className="font-bold">{subject.subject_name || "-"}</span>
                    </div>
                    <div>
                        <span className="font-bold">ครูผู้สอน:</span> {teacherName}
                    </div>
                    <div>
                        <span className="font-bold">จำนวนนักศึกษาทั้งหมด:</span> <span className="font-bold">{students.length}</span> คน
                    </div>
                </div>
            </div>

            {/* ── Students Table ─────────────────────────────────── */}
            <table className="w-full border-collapse border border-black text-[15pt] leading-snug">
                <thead>
                    <tr className="bg-slate-100 text-center font-bold text-[15pt]">
                        <th className="border border-black p-1 w-10 font-bold text-[15pt]">ลำดับ</th>
                        <th className="border border-black p-1 w-36 font-bold text-[15pt]">เลขประจำตัวประชาชน</th>
                        <th className="border border-black p-1 text-left pl-2 font-bold text-[15pt]">ชื่อ - สกุล</th>
                        <th className="border border-black p-1 w-28 font-bold text-[15pt]">เบอร์โทรศัพท์</th>
                        <th className="border border-black p-1 w-24 font-bold text-[15pt]">สถานะการชำระ</th>
                        <th className="border border-black p-1 w-28 font-bold text-[15pt]">ลายมือชื่อ / หมายเหตุ</th>
                    </tr>
                </thead>
                <tbody>
                    {students.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="border border-black p-6 text-center text-slate-400 text-[15pt]">
                                ยังไม่มีนักศึกษาลงทะเบียนในรายวิชานี้
                            </td>
                        </tr>
                    ) : (
                        students.map((st, idx) => (
                            <tr key={st.citizen_id || idx} className="hover:bg-slate-50 text-[15pt]">
                                <td className="border border-black p-1 text-center font-normal text-[15pt]">
                                    {st.seq_no || idx + 1}
                                </td>
                                <td className="border border-black p-1 text-center font-mono tracking-wider text-[14pt]">
                                    {st.citizen_id || "-"}
                                </td>
                                <td className="border border-black p-1 pl-2 font-normal text-[15pt]">
                                    {st.full_name || "-"}
                                </td>
                                <td className="border border-black p-1 text-center font-mono text-[14pt]">
                                    {st.phone || "-"}
                                </td>
                                <td className="border border-black p-1 text-center font-medium text-[15pt]">
                                    {STATUS_TEXT[st.status] || st.status || "-"}
                                </td>
                                <td className="border border-black p-1"></td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* ── Signatures Footer ──────────────────────────────── */}
            <div className="mt-10 grid grid-cols-2 gap-8 text-center text-[16pt] font-normal break-inside-avoid text-black">
                <div>
                    <p className="mb-6">ลงชื่อ ................................................................. ครูผู้สอน</p>
                    <p>( {teacherName} )</p>
                    <p className="mt-1 text-black">วันที่ ........ / .................... / ................</p>
                </div>
                <div>
                    <p className="mb-6">ลงชื่อ ................................................................. หัวหน้างานทะเบียน</p>
                    <p>( ................................................................. )</p>
                    <p className="mt-1 text-black">วันที่ ........ / .................... / ................</p>
                </div>
            </div>
        </div>
    );
});

export default RosterSubjectPrint;
