import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { Users, UserPlus, IdCard, X } from "lucide-react";
import { getStudyGroups } from "../../study-groups/services/studyGroupApi";
import { getEnrollments, createWalkinEnrollment, cancelEnrollment } from "../../enrollments/services/enrollmentApi";
import ApplicantFormFields, { EMPTY_APPLICANT } from "../../public/components/ApplicantFormFields";

const STATUS_META = {
    pending_payment: { label: "รอชำระเงิน", className: "bg-amber-100 text-amber-700" },
    pending_verification: { label: "รอตรวจสอบสลิป", className: "bg-blue-100 text-blue-700" },
    paid: { label: "ชำระเงินแล้ว", className: "bg-emerald-100 text-emerald-700" },
    cancelled: { label: "ยกเลิก", className: "bg-slate-200 text-slate-500" },
};

function StatusBadge({ status }) {
    const meta = STATUS_META[status] || STATUS_META.pending_payment;
    return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>{meta.label}</span>;
}

/**
 * RegistrarEnrollmentsPage — Group Enrollment Manager + Walk-in Registration
 */
export default function RegistrarEnrollmentsPage() {
    const [groups, setGroups] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState("");
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [walkinOpen, setWalkinOpen] = useState(false);

    useEffect(() => {
        getStudyGroups().then((data) => {
            setGroups(data);
            if (data.length > 0) setSelectedGroupId(String(data[0].id));
        });
    }, []);

    const loadEnrollments = async (groupId) => {
        if (!groupId) return;
        setLoading(true);
        try {
            const data = await getEnrollments({ study_group_id: groupId });
            setEnrollments(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEnrollments(selectedGroupId);
    }, [selectedGroupId]);

    const currentGroup = useMemo(() => groups.find((g) => String(g.id) === String(selectedGroupId)), [groups, selectedGroupId]);

    const handleCancel = async (enrollment) => {
        const result = await Swal.fire({
            title: "ยืนยันยกเลิกใบสมัครนี้?",
            text: `${enrollment.applicant_name}`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ยกเลิกใบสมัคร",
            cancelButtonText: "ปิด",
            confirmButtonColor: "#dc2626",
        });
        if (result.isConfirmed) {
            await cancelEnrollment(enrollment.id);
            loadEnrollments(selectedGroupId);
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-xl font-black text-slate-800">
                        <Users size={22} className="text-indigo-600" /> จัดการผู้เรียนในกลุ่มเรียน (งานทะเบียน)
                    </h1>
                    <p className="text-sm text-slate-500">ดูรายชื่อนักเรียนที่ลงทะเบียน พร้อมสถานะการชำระเงินของแต่ละกลุ่มเรียน</p>
                </div>
                <button
                    onClick={() => setWalkinOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
                >
                    <UserPlus size={16} /> ลงทะเบียน Walk-in
                </button>
            </div>

            <div className="mb-4 flex items-center gap-3">
                <label className="text-sm font-bold text-slate-600">เลือกกลุ่มเรียน:</label>
                <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold focus:border-indigo-500 focus:outline-none"
                >
                    {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                            {g.group_code} — {g.group_name}
                        </option>
                    ))}
                </select>
                {currentGroup && (
                    <span className="text-sm font-semibold text-slate-500">
                        ที่นั่ง {currentGroup.current_seats}/{currentGroup.max_seats}
                    </span>
                )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                        <tr>
                            <th className="px-4 py-3">ชื่อ-นามสกุล</th>
                            <th className="px-4 py-3">เลขบัตรประชาชน</th>
                            <th className="px-4 py-3">เบอร์โทร</th>
                            <th className="px-4 py-3">ยอดชำระ</th>
                            <th className="px-4 py-3">สถานะ</th>
                            <th className="px-4 py-3 text-right">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">กำลังโหลด...</td></tr>
                        )}
                        {!loading && enrollments.length === 0 && (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">ยังไม่มีผู้ลงทะเบียนในกลุ่มนี้</td></tr>
                        )}
                        {enrollments.map((en) => (
                            <tr key={en.id} className="hover:bg-slate-50/70">
                                <td className="px-4 py-3 font-semibold text-slate-800">{en.applicant_name}</td>
                                <td className="px-4 py-3 font-mono text-slate-500">{en.citizen_id}</td>
                                <td className="px-4 py-3 text-slate-500">{en.phone}</td>
                                <td className="px-4 py-3 font-semibold text-slate-700">{Number(en.total_amount).toLocaleString()} บ.</td>
                                <td className="px-4 py-3"><StatusBadge status={en.status} /></td>
                                <td className="px-4 py-3 text-right">
                                    {en.status !== "cancelled" && (
                                        <button onClick={() => handleCancel(en)} className="text-xs font-bold text-red-500 hover:underline">
                                            ยกเลิก
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <WalkinModal
                isOpen={walkinOpen}
                onClose={() => setWalkinOpen(false)}
                groups={groups}
                defaultGroupId={selectedGroupId}
                onSuccess={() => {
                    setWalkinOpen(false);
                    loadEnrollments(selectedGroupId);
                }}
            />
        </div>
    );
}

function WalkinModal({ isOpen, onClose, groups, defaultGroupId, onSuccess }) {
    const [formData, setFormData] = useState(EMPTY_APPLICANT);
    const [groupId, setGroupId] = useState(defaultGroupId);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData(EMPTY_APPLICANT);
            setGroupId(defaultGroupId);
        }
    }, [isOpen, defaultGroupId]);

    if (!isOpen) return null;

    const handleReadSmartCard = () => {
        // Mock: อ่านบัตร Smart Card ของนักเรียน (จำลองข้อมูลตัวอย่าง)
        Swal.fire({
            title: "กำลังอ่านข้อมูลจากบัตรประชาชน...",
            timer: 1200,
            didOpen: () => Swal.showLoading(),
        }).then(() => {
            setFormData((prev) => ({
                ...prev,
                citizen_id: "1234567890123",
                title_name: "นาย",
                full_name: "สมชาย ใจดี",
                birth_date: "1998-05-12",
                registered_address: "123 หมู่ 4 ต.ตัวอย่าง",
                postal_code: "10110",
                subdistrict: "คลองตัน",
                district: "วัฒนา",
                province: "กรุงเทพมหานคร",
            }));
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.citizen_id.length !== 13) {
            Swal.fire("ข้อมูลไม่ถูกต้อง", "กรุณากรอกเลขประจำตัวประชาชนให้ครบ 13 หลัก", "warning");
            return;
        }
        if (!groupId) {
            Swal.fire("แจ้งเตือน", "กรุณาเลือกกลุ่มเรียน", "warning");
            return;
        }
        try {
            setSubmitting(true);
            await createWalkinEnrollment({ applicant: formData, study_group_id: Number(groupId) });
            Swal.fire("สำเร็จ", "ลงทะเบียน Walk-in เรียบร้อย สถานะ 'รอชำระเงิน' ส่งต่อแผนกการเงิน", "success");
            onSuccess?.();
        } catch (error) {
            Swal.fire("เกิดข้อผิดพลาด", error.response?.data?.message || "ไม่สามารถลงทะเบียนได้", "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-lg font-black text-slate-800">
                        <UserPlus size={20} className="text-indigo-600" /> ลงทะเบียนนักเรียน Walk-in
                    </h2>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-bold text-slate-600">เลือกกลุ่มเรียน *</label>
                        <select
                            value={groupId}
                            onChange={(e) => setGroupId(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                            required
                        >
                            <option value="">-- เลือกกลุ่มเรียน --</option>
                            {groups.map((g) => (
                                <option key={g.id} value={g.id}>{g.group_code} — {g.group_name}</option>
                            ))}
                        </select>
                    </div>

                    <ApplicantFormFields
                        formData={formData}
                        setFormData={setFormData}
                        showCitizenIdReader
                        onReadSmartCard={handleReadSmartCard}
                    />

                    <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <IdCard size={16} /> {submitting ? "กำลังบันทึก..." : "บันทึกและส่งต่อแผนกการเงิน"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
