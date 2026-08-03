import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { getSubjectTypes } from "../services/academicStructureApi";

/**
 * SubjectTypeTab
 * -------------------------------------------------------------------------
 * ประเภทวิชา (subject_types) เป็นชุดข้อมูลอ้างอิงตายตัวตามระเบียบ สพฐ.
 * (อุตสาหกรรม, พาณิชยกรรม, ศิลปกรรม ฯลฯ) จึงแสดงเป็น Read-only Table เท่านั้น
 * ไม่มีปุ่มเพิ่ม/แก้ไข/ลบ ตามที่ระบุในสโคปงาน
 */
export default function SubjectTypeTab() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const data = await getSubjectTypes();
                setItems(data);
            } catch (err) {
                Swal.fire({
                    icon: "error",
                    title: "โหลดข้อมูลประเภทวิชาไม่สำเร็จ",
                    text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                    confirmButtonColor: "#4f46e5",
                });
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <div className="space-y-3">
            <p className="text-xs text-slate-400">
                ประเภทวิชาเป็นชุดข้อมูลอ้างอิงตามระเบียบ ไม่สามารถเพิ่ม/แก้ไข/ลบได้จากหน้านี้
            </p>

            {loading ? (
                <p className="py-10 text-center text-sm text-slate-400">กำลังโหลดข้อมูล...</p>
            ) : items.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">ไม่พบรายการ</p>
            ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                            <tr>
                                <th className="px-4 py-2.5">รหัส</th>
                                <th className="px-4 py-2.5">ชื่อประเภทวิชา (ไทย)</th>
                                <th className="px-4 py-2.5">ชื่อประเภทวิชา (English)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/60">
                                    <td className="px-4 py-2.5 font-mono text-slate-500">{item.id}</td>
                                    <td className="px-4 py-2.5 font-medium text-slate-800">{item.name_th}</td>
                                    <td className="px-4 py-2.5 text-slate-500">{item.name_en || "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
