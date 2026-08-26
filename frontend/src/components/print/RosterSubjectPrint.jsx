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
            className="roster-print-root bg-white text-black font-['Sarabun',sans-serif] p-8 select-text text-[13px] leading-normal"
            style={{ width: "210mm", minHeight: "297mm", margin: "0 auto", boxSizing: "border-box" }}
        >
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 12mm 15mm;
                    }
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .roster-print-root {
                        padding: 0 !important;
                        width: 100% !important;
                    }
                }
            `}</style>

            {/* ── Header ────────────────────────────────────────── */}
            <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-3 mb-2">
                    {logo && <img src={logo} alt="Logo" className="h-14 w-14 object-contain" />}
                    <div>
                        <h1 className="text-lg font-black tracking-tight text-slate-900">
                            แบบรายงานบัญชีรายชื่อนักศึกษาและบันทึกเวลาเรียน (ศธ. 02)
                        </h1>
                        <p className="text-xs font-semibold text-slate-700">
                            หลักสูตรวิชาชีพระยะสั้น
                        </p>
                    </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-left text-xs border border-black p-3 rounded-xs">
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
            <table className="w-full border-collapse border border-black text-xs">
                <thead>
                    <tr className="bg-slate-100 text-center font-bold">
                        <th className="border border-black p-1.5 w-10">ลำดับ</th>
                        <th className="border border-black p-1.5 w-36">เลขประจำตัวประชาชน</th>
                        <th className="border border-black p-1.5 text-left pl-3">ชื่อ - สกุล</th>
                        <th className="border border-black p-1.5 w-28">เบอร์โทรศัพท์</th>
                        <th className="border border-black p-1.5 w-24">สถานะการชำระ</th>
                        <th className="border border-black p-1.5 w-28">ลายมือชื่อ / หมายเหตุ</th>
                    </tr>
                </thead>
                <tbody>
                    {students.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="border border-black p-6 text-center text-slate-400">
                                ยังไม่มีนักศึกษาลงทะเบียนในรายวิชานี้
                            </td>
                        </tr>
                    ) : (
                        students.map((st, idx) => (
                            <tr key={st.citizen_id || idx} className="hover:bg-slate-50">
                                <td className="border border-black p-1.5 text-center font-medium">
                                    {st.seq_no || idx + 1}
                                </td>
                                <td className="border border-black p-1.5 text-center font-mono tracking-wider">
                                    {st.citizen_id || "-"}
                                </td>
                                <td className="border border-black p-1.5 pl-3 font-medium">
                                    {st.full_name || "-"}
                                </td>
                                <td className="border border-black p-1.5 text-center font-mono">
                                    {st.phone || "-"}
                                </td>
                                <td className="border border-black p-1.5 text-center font-semibold">
                                    {STATUS_TEXT[st.status] || st.status || "-"}
                                </td>
                                <td className="border border-black p-1.5"></td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* ── Signatures Footer ──────────────────────────────── */}
            <div className="mt-12 grid grid-cols-2 gap-8 text-center text-xs break-inside-avoid">
                <div>
                    <p className="mb-8">ลงชื่อ ................................................................. ครูผู้สอน</p>
                    <p>( {teacherName} )</p>
                    <p className="mt-1 text-slate-500">วันที่ ........ / .................... / ................</p>
                </div>
                <div>
                    <p className="mb-8">ลงชื่อ ................................................................. หัวหน้างานทะเบียน</p>
                    <p>( ................................................................. )</p>
                    <p className="mt-1 text-slate-500">วันที่ ........ / .................... / ................</p>
                </div>
            </div>
        </div>
    );
});

export default RosterSubjectPrint;
