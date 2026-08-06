import { useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { Pencil, Trash2, Layers } from "lucide-react";
import Swal from "sweetalert2";
import { thaiDateValueFormatter } from "../../../utils/dateUtils";

ModuleRegistry.registerModules([AllCommunityModule]);

const STATUS_CONFIG = {
    planning: { label: "วางแผน", className: "bg-slate-100 text-slate-600" },
    admitting: { label: "เปิดรับสมัคร", className: "bg-amber-100 text-amber-700" },
    studying: { label: "กำลังเรียน", className: "bg-emerald-100 text-emerald-700" },
    ended: { label: "จบหลักสูตรแล้ว", className: "bg-indigo-100 text-indigo-700" },
};

function StatusBadgeRenderer({ value }) {
    const cfg = STATUS_CONFIG[value] || { label: value, className: "bg-slate-100 text-slate-600" };
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.className}`}>
            {cfg.label}
        </span>
    );
}

/**
 * BatchTable
 * -------------------------------------------------------------------------
 * Props:
 * - rowData: Array<Batch>            -> batches to display
 * - loading: boolean
 * - onEdit: (batch) => void
 * - onDelete: (batch) => void         -> called only after confirm
 *
 * Navigation to Study Groups:
 * - ปุ่ม "จัดการกลุ่มเรียน" ในคอลัมน์ "จัดการ" -> ไป /batches/:batchId/groups
 * - ดับเบิ้ลคลิกที่ Row ใดก็ได้ (นอกเหนือจากคอลัมน์ปุ่ม) -> ไปหน้าเดียวกัน
 */
export default function BatchTable({ rowData = [], loading = false, onEdit, onDelete }) {
    const gridRef = useRef(null);
    const navigate = useNavigate();

    const goToGroups = (batch) => navigate(`/batches/${batch.id}/groups`);

    const handleDeleteClick = async (batch) => {
        const result = await Swal.fire({
            title: "ยืนยันการลบรุ่นการเรียน?",
            html: `ต้องการลบ <b>${batch.batch_name}</b> ใช่หรือไม่<br/><span style="color:#94a3b8;font-size:13px">การกระทำนี้ไม่สามารถย้อนกลับได้</span>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ลบข้อมูล",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#6b7280",
            reverseButtons: true,
        });

        if (result.isConfirmed) {
            onDelete?.(batch);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: "ลบข้อมูลเรียบร้อยแล้ว",
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true,
            });
        }
    };

    const ActionsRenderer = (params) => (
        <div className="flex h-full items-center gap-1.5">
            <button
                type="button"
                title="จัดการกลุ่มเรียน"
                onClick={(e) => {
                    e.stopPropagation();
                    goToGroups(params.data);
                }}
                className="rounded-md p-1.5 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-600"
            >
                <Layers size={15} />
            </button>
            <button
                type="button"
                title="แก้ไข"
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(params.data);
                }}
                className="rounded-md p-1.5 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600"
            >
                <Pencil size={15} />
            </button>
            <button
                type="button"
                title="ลบ"
                onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(params.data);
                }}
                className="rounded-md p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
            >
                <Trash2 size={15} />
            </button>
        </div>
    );

    const columnDefs = useMemo(
        () => [
            {
                field: "batch_name",
                headerName: "ชื่อรุ่น",
                pinned: "left",
                flex: 2,
                cellClass: "font-semibold text-slate-900",
            },
            { field: "academic_year", headerName: "ปีการศึกษา", flex: 1 },
            { field: "term", headerName: "ภาคเรียน", flex: 1 },
            { field: "batch_no", headerName: "รุ่นที่", flex: 1 },
            {
                field: "status",
                headerName: "สถานะ",
                flex: 1.5,
                cellRenderer: StatusBadgeRenderer,
            },
            // คอลัมน์วันที่ -> ใช้ valueFormatter เรียก formatThaiDate เพื่อแสดงเป็นวันที่ไทย + พ.ศ.
            {
                field: "study_open_date",
                headerName: "วันเริ่มเรียน",
                flex: 1.4,
                valueFormatter: thaiDateValueFormatter,
            },
            {
                field: "study_close_date",
                headerName: "วันสิ้นสุด",
                flex: 1.4,
                valueFormatter: thaiDateValueFormatter,
            },
            { field: "total_hours", headerName: "จำนวนชั่วโมง", flex: 1, type: "numericColumn" },
            { field: "director_name", headerName: "ผอ.", flex: 2 },
            {
                headerName: "จัดการ",
                pinned: "right",
                width: 140,
                sortable: false,
                filter: false,
                cellRenderer: ActionsRenderer,
            },
        ],
        [onEdit]
    );

    const defaultColDef = useMemo(
        () => ({
            resizable: true,
            sortable: true,
            filter: true,
            floatingFilter: false,
        }),
        []
    );

    return (
        <div className="w-full h-[calc(100vh-15rem)] overflow-hidden">
            <AgGridReact
                theme={themeQuartz}
                ref={gridRef}
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                loading={loading}
                pagination
                paginationPageSize={20}
                headerHeight={44}
                animateRows
                overlayNoRowsTemplate="<span class='text-sm text-slate-400'>ไม่พบข้อมูลรุ่นการเรียน</span>"
                getRowId={(params) => String(params.data.id)}
                onRowDoubleClicked={(params) => goToGroups(params.data)}
                rowStyle={{ cursor: "pointer" }}
            />
        </div>
    );
}