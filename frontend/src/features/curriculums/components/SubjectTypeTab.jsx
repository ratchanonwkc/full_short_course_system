import { useEffect, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { Info } from "lucide-react";
import Swal from "sweetalert2";
import { getSubjectTypes } from "../services/academicStructureApi";

ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * SubjectTypeTab
 * -------------------------------------------------------------------------
 * ประเภทวิชา (subject_types) เป็นชุดข้อมูลอ้างอิงตายตัวตามระเบียบ สพฐ.
 * (อุตสาหกรรม, พาณิชยกรรม, ศิลปกรรม ฯลฯ) จึงแสดงเป็น Read-only Table เท่านั้น
 * ไม่มีปุ่มเพิ่ม/แก้ไข/ลบ และไม่ต้องใช้ Split View เพราะไม่มีฟอร์ม
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
                    confirmButtonColor: "#0270c7",
                });
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const columnDefs = [
        { field: "id", headerName: "รหัส", width: 90, cellClass: "font-mono text-slate-500" },
        { field: "name_th", headerName: "ชื่อประเภทวิชา (ไทย)", flex: 1.5, cellClass: "font-medium text-slate-800" },
        { field: "name_en", headerName: "ชื่อประเภทวิชา (English)", flex: 1.5, valueFormatter: (p) => p.value || "-" },
    ];

    return (
        <div className="space-y-3 flex-1 flex flex-col min-h-0">
            <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500 shrink-0">
                <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
                <p>ประเภทวิชาเป็นชุดข้อมูลอ้างอิงตามระเบียบ ไม่สามารถเพิ่ม/แก้ไข/ลบได้จากหน้านี้</p>
            </div>

            <div className="flex-1 min-h-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                <AgGridReact
                    theme={themeQuartz}
                    rowData={items}
                    columnDefs={columnDefs}
                    defaultColDef={{ resizable: true, sortable: true, filter: true }}
                    loading={loading}
                    domLayout="normal"
                    headerHeight={40}
                    rowHeight={42}
                    animateRows
                    overlayNoRowsTemplate="<span class='text-sm text-slate-400'>ไม่พบรายการ</span>"
                    getRowId={(params) => String(params.data.id)}
                    className="h-full w-full"
                />
            </div>
        </div>
    );
}