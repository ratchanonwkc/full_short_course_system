import { useMemo, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { thaiDateValueFormatter } from "../../../utils/dateUtils";

ModuleRegistry.registerModules([AllCommunityModule]);

function ActiveBadgeRenderer({ value }) {
    return value ? (
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            ใช้งานอยู่
        </span>
    ) : (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
            ระงับการใช้งาน
        </span>
    );
}

function FullNameRenderer({ data }) {
    const name = [data.prefix_name, data.first_name_th, data.last_name_th].filter(Boolean).join(" ");
    return <span className="font-semibold text-slate-900">{name || "-"}</span>;
}

/**
 * TeacherTable
 * -------------------------------------------------------------------------
 * Columns follow the `public.teachers` schema. Note: the schema has no
 * `teacher_code` or `major_id` column, so `citizen_id` is used as the
 * pinned identifier instead, and no "แผนก/สาขาวิชา" column is shown
 * (a teacher's major isn't a direct FK on this table).
 *
 * `prefix_name`, `position_name`, `sub_position_name` are expected to come
 * already joined from the API/view; if not, resolve them from the
 * prefixes/positions/subPositions lists before passing rowData in.
 *
 * คอลัมน์ "วันที่เพิ่มข้อมูล" (created_at) ใช้ valueFormatter เรียก formatThaiDate
 * เพื่อแสดงเป็นวันที่ไทย + พ.ศ.
 *
 * Props:
 * - rowData: Array<Teacher>
 * - loading: boolean
 * - onEdit: (teacher) => void
 * - onDelete: (teacher) => void   -> called only after confirm
 */
export default function TeacherTable({ rowData = [], loading = false, onEdit, onDelete }) {
    const gridRef = useRef(null);

    const handleDeleteClick = async (teacher) => {
        const fullName = [teacher.prefix_name, teacher.first_name_th, teacher.last_name_th]
            .filter(Boolean)
            .join(" ");

        const result = await Swal.fire({
            title: "ยืนยันการลบอาจารย์?",
            html: `ต้องการลบ <b>${fullName || teacher.citizen_id}</b> ใช่หรือไม่<br/><span style="color:#94a3b8;font-size:13px">การกระทำนี้ไม่สามารถย้อนกลับได้</span>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ลบข้อมูล",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#6b7280",
            reverseButtons: true,
        });

        if (result.isConfirmed) {
            onDelete?.(teacher);
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
                field: "citizen_id",
                headerName: "เลขบัตรประชาชน",
                pinned: "left",
                minWidth: 150,
                flex: 1
            },
            {
                headerName: "ชื่อ-นามสกุล",
                field: "first_name_th",
                minWidth: 200,
                flex: 1,
                cellRenderer: FullNameRenderer,
            },
            { field: "position_name", headerName: "ตำแหน่งหลัก", minWidth: 150, flex: 1, },
            { field: "sub_position_name", headerName: "หน้าที่พิเศษ", minWidth: 160, flex: 1, },
            { field: "email", headerName: "อีเมล", minWidth: 200, flex: 1, },
            { field: "phone", headerName: "เบอร์โทร", width: 130, flex: 1, },
            {
                field: "is_active",
                headerName: "สถานะ",
                width: 150,
                flex: 1,
                cellRenderer: ActiveBadgeRenderer,
            },
            {
                field: "created_at",
                headerName: "วันที่เพิ่มข้อมูล",
                minWidth: 150,
                flex: 1,
                valueFormatter: thaiDateValueFormatter,
            },
            {
                headerName: "จัดการ",
                pinned: "right",
                width: 110,
                sortable: false,
                filter: false,
                flex: 1,
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
            />
        </div>
    );
}