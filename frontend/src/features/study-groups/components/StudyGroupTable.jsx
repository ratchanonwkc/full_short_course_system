import { useMemo, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { Pencil, Trash2, Users, FileText, Printer } from "lucide-react";
import Swal from "sweetalert2";
import { GROUP_TYPE_LABELS, GROUP_STATUS_META } from "../../../utils/groupCode";

ModuleRegistry.registerModules([AllCommunityModule]);

function GroupStatusRenderer({ value }) {
    const meta = GROUP_STATUS_META[value] || GROUP_STATUS_META.open;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>
            {meta.emoji} {meta.label}
        </span>
    );
}

const TYPE_BADGE_CLASS = {
    normal: "bg-slate-100 text-slate-600",
    special: "bg-amber-100 text-amber-700",
    project: "bg-blue-100 text-blue-700",
    vocational: "bg-emerald-100 text-emerald-700",
    extra: "bg-fuchsia-100 text-fuchsia-700",
};

function GroupTypeRenderer({ value }) {
    const cls = TYPE_BADGE_CLASS[value] || "bg-slate-100 text-slate-600";
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
            {GROUP_TYPE_LABELS[value] || value}
        </span>
    );
}

function SeatsRenderer({ data }) {
    const max = data.max_seats || 0;
    const current = data.current_seats || 0;
    const isFull = max > 0 && current >= max;
    return (
        <span className={`text-sm font-medium ${isFull ? "text-red-500" : "text-slate-700"}`}>
            {current} / {max}
        </span>
    );
}

function GroupCodeRenderer({ value }) {
    return <span className="font-mono font-semibold text-blue-700">{value}</span>;
}

function GroupNameRenderer({ data }) {
    if (!data) return null;
    const hasFootnote = Boolean(data.has_footnote || data.footnote_text || (data.fee_exception_type && data.fee_exception_type !== 'none'));
    let noteLabel = data.footnote_text || '';
    if (!noteLabel && data.fee_exception_type && data.fee_exception_type !== 'none') {
        const legacyMap = {
            note_1: '(*) เรือนจำกลาง',
            note_2: '(**) รร.ประสาทฯ',
            note_3: '(***) โคกก่อง',
        };
        noteLabel = legacyMap[data.fee_exception_type] || data.fee_exception_type;
    }
    return (
        <div className="flex items-center gap-2 py-0.5 min-w-0">
            <span className="font-semibold text-slate-800 truncate" title={data.group_name}>{data.group_name}</span>
            {hasFootnote && (
                <span className="shrink-0 inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800" title={`หมายเหตุ: ${noteLabel || "มีหมายเหตุดอกจันทร์ (*)"}`}>
                    * {noteLabel ? (noteLabel.length > 20 ? noteLabel.slice(0, 20) + '...' : noteLabel) : 'มีหมายเหตุ'}
                </span>
            )}
        </div>
    );
}

/**
 * StudyGroupTable
 * -------------------------------------------------------------------------
 * Props:
 * - rowData: Array<StudyGroup>
 * - loading: boolean
 * - onEdit: (group) => void
 * - onDelete: (group) => void
 * - onViewRoster: (group) => void
 * - onPrintGroupBlank: (group) => void
 */
export default function StudyGroupTable({
    rowData = [],
    loading = false,
    onEdit,
    onDelete,
    onViewRoster,
    onPrintGroupBlank,
    onPrintAnnouncement,
}) {
    const gridRef = useRef(null);

    const handleDeleteClick = async (group) => {
        const result = await Swal.fire({
            title: "ยืนยันการลบกลุ่มเรียน?",
            html: `ต้องการลบ <b>${group.group_code}</b> ใช่หรือไม่<br/><span style="color:#94a3b8;font-size:13px">การกระทำนี้ไม่สามารถย้อนกลับได้</span>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ลบข้อมูล",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#6b7280",
            reverseButtons: true,
        });

        if (result.isConfirmed) {
            onDelete?.(group);
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
        <div className="flex h-full items-center gap-1">
            <button
                type="button"
                title="ดูรายชื่อนักศึกษา (ศธ.02)"
                onClick={() => onViewRoster?.(params.data)}
                className="rounded-md p-1.5 text-blue-600 transition hover:bg-blue-100 hover:text-blue-800"
            >
                <Users size={15} />
            </button>
            <button
                type="button"
                title="พิมพ์ใบสมัครเปล่าประจำกลุ่ม"
                onClick={() => onPrintGroupBlank?.(params.data)}
                className="rounded-md p-1.5 text-emerald-600 transition hover:bg-emerald-100 hover:text-emerald-800"
            >
                <Printer size={15} />
            </button>
            <button
                type="button"
                title={`พิมพ์บันทึกข้อความขอเปิดวิชา (${GROUP_TYPE_LABELS[params.data.group_type] || 'แบบพิเศษ'})`}
                onClick={() => onPrintAnnouncement?.(params.data)}
                className="rounded-md p-1.5 text-amber-600 transition hover:bg-amber-100 hover:text-amber-800"
            >
                <FileText size={15} />
            </button>
            <button
                type="button"
                title="แก้ไข"
                onClick={() => onEdit?.(params.data)}
                className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-blue-600"
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
                field: "group_name",
                headerName: "ชื่อกลุ่มเรียน",
                minWidth: 220,
                flex: 2,
                cellRenderer: GroupNameRenderer,
            },
            { field: "teacher_name", headerName: "ผู้สอน", minWidth: 150, flex: 1 },
            {
                headerName: "ที่นั่ง",
                minWidth: 100,
                flex: 0.7,
                cellRenderer: SeatsRenderer,
            },
            {
                field: "status",
                headerName: "สถานะ",
                minWidth: 120,
                flex: 0.8,
                cellRenderer: GroupStatusRenderer,
            },
            {
                headerName: "จัดการ",
                pinned: "right",
                width: 175,
                sortable: false,
                filter: false,
                cellRenderer: ActionsRenderer,
            },
        ],
        [onEdit, onViewRoster, onPrintGroupBlank, onPrintAnnouncement]
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
        <div className="w-full h-full min-h-[360px] overflow-hidden">
            <AgGridReact
                theme={themeQuartz}
                ref={gridRef}
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                loading={loading}
                domLayout="normal"
                headerHeight={42}
                rowHeight={44}
                animateRows
                overlayNoRowsTemplate="<span class='text-sm text-slate-400'>ยังไม่มีกลุ่มเรียนในรุ่นนี้</span>"
                getRowId={(params) => String(params.data.id)}
                onRowDoubleClicked={(params) => onEdit?.(params.data)}
                rowStyle={{ cursor: "pointer" }}
                className="h-full w-full"
            />
        </div>
    );
}