import { useMemo, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

ModuleRegistry.registerModules([AllCommunityModule]);

function SubjectCodeRenderer({ value }) {
    return <span className="font-mono font-semibold text-indigo-700">{value}</span>;
}

/**
 * SubjectTable
 * -------------------------------------------------------------------------
 * Props:
 * - rowData: Array<Subject>
 * - loading: boolean
 * - onEdit: (subject) => void
 * - onDelete: (subject) => void   -> called only after confirm
 */
export default function SubjectTable({ rowData = [], loading = false, onEdit, onDelete }) {
    const gridRef = useRef(null);

    const handleDeleteClick = async (subject) => {
        const result = await Swal.fire({
            title: "ยืนยันการลบรายวิชา?",
            html: `ต้องการลบ <b>${subject.subject_code} - ${subject.name_th}</b> ใช่หรือไม่<br/><span style="color:#94a3b8;font-size:13px">การกระทำนี้ไม่สามารถย้อนกลับได้</span>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ลบข้อมูล",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#6b7280",
            reverseButtons: true,
        });

        if (result.isConfirmed) {
            onDelete?.(subject);
        }
    };

    const ActionsRenderer = (params) => (
        <div className="flex h-full items-center gap-1.5">
            <button
                type="button"
                title="แก้ไข"
                onClick={() => onEdit?.(params.data)}
                className="rounded-md p-1.5 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600"
            >
                <Pencil size={15} />
            </button>
            <button
                type="button"
                title="ลบ"
                onClick={() => handleDeleteClick(params.data)}
                className="rounded-md p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
            >
                <Trash2 size={15} />
            </button>
        </div>
    );

    const columnDefs = useMemo(
        () => [
            {
                field: "subject_code",
                headerName: "รหัสวิชา",
                pinned: "left",
                minWidth: 130,
                cellRenderer: SubjectCodeRenderer,
            },
            { field: "name_th", headerName: "ชื่อวิชา (ไทย)", minWidth: 220, flex: 2 },
            { field: "level_name", headerName: "ระดับชั้น", minWidth: 140, flex: 1 },
            { field: "subject_type_name", headerName: "ประเภทวิชา", minWidth: 140, flex: 1 },
            { field: "major_name", headerName: "สาขาวิชา", minWidth: 160, flex: 1 },
            { field: "minor_name", headerName: "สาขางาน", minWidth: 160, flex: 1 },
            { field: "theory_hours", headerName: "ทฤษฎี", width: 90, type: "numericColumn" },
            { field: "practice_hours", headerName: "ปฏิบัติ", width: 90, type: "numericColumn" },
            { field: "total_hours", headerName: "รวม (ชม.)", width: 100, type: "numericColumn" },
            { field: "credits", headerName: "หน่วยกิต", width: 100, type: "numericColumn" },
            {
                headerName: "จัดการ",
                pinned: "right",
                width: 110,
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
        }),
        []
    );

    return (
        <div className="w-full h-[calc(100vh-19rem)] overflow-hidden">
            <AgGridReact
                theme={themeQuartz}
                ref={gridRef}
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                loading={loading}
                headerHeight={44}
                animateRows
                overlayNoRowsTemplate="<span class='text-sm text-slate-400'>ไม่พบข้อมูลรายวิชา</span>"
                getRowId={(params) => String(params.data.id)}
            />
        </div>
    );
}
