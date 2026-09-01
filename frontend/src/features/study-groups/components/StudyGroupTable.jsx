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
        <div className="flex h-full w-full items-center justify-center">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>
                {meta.emoji} {meta.label}
            </span>
        </div>
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
        <div className="flex h-full w-full items-center justify-center">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
                {GROUP_TYPE_LABELS[value] || value}
            </span>
        </div>
    );
}

function getShiftInfo(data) {
    if (!data) return null;
    const text = `${data.time_slot_code || ""} ${data.time_slot_name || ""} ${data.group_code || ""} ${data.schedule_description || ""}`;
    if (text.includes("ค่ำ") || text.includes("ค1") || text.includes("ค2") || text.includes("17:") || text.includes("18:")) {
        return { label: "รอบค่ำ", cls: "bg-purple-50 text-purple-700 border-purple-200" };
    }
    if (text.includes("บ่าย") || text.includes("บ1") || text.includes("บ2") || text.includes("13:")) {
        return { label: "รอบบ่าย", cls: "bg-amber-50 text-amber-700 border-amber-200" };
    }
    if (text.includes("เสาร์") || text.includes("อาทิตย์") || text.includes("ส-อา") || text.includes("ส.") || text.includes("อ.")) {
        return { label: "ส-อา", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
    if (text.includes("เช้า") || text.includes("ช1") || text.includes("ช2") || text.includes("08:") || text.includes("09:")) {
        return { label: "รอบเช้า", cls: "bg-blue-50 text-blue-700 border-blue-200" };
    }
    if (text.includes("พ1") || text.includes("พ2") || text.includes("พิเศษ")) {
        return { label: "รอบพิเศษ", cls: "bg-rose-50 text-rose-700 border-rose-200" };
    }
    return null;
}

function SeatsRenderer({ data }) {
    const max = data.max_seats || 0;
    const current = data.current_seats || 0;
    const isFull = max > 0 && current >= max;
    return (
        <div className="flex h-full w-full items-center justify-center gap-1.5" title="จำนวนผู้สมัครที่ได้รับการยืนยันการชำระเงินแล้ว (Confirmed Paid)">
            <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                    isFull ? "bg-red-50 text-red-600 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
            >
                <Users size={12} />
                {current} / {max}
            </span>
        </div>
    );
}

function GroupCodeRenderer({ value }) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <span className="font-mono font-semibold text-blue-700">{value}</span>
        </div>
    );
}

function GroupNameRenderer({ data }) {
    if (!data) return null;
    const shift = getShiftInfo(data);
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

    const tooltipParts = [
        data.teacher_name && `ผู้สอน: ${data.teacher_name}`,
        (data.room_code || data.location_name) && `ห้องเรียน: ${data.room_code || data.location_name}`,
        data.schedule_description && `เวลา: ${data.schedule_description}`,
    ].filter(Boolean);

    return (
        <div className="flex flex-col justify-center h-full py-1 leading-tight min-w-0" title={tooltipParts.join(" • ") || undefined}>
            <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-slate-800 text-sm truncate" title={data.group_name}>
                    {data.group_name}
                </span>
                {hasFootnote && (
                    <span className="shrink-0 inline-flex items-center rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800" title={`หมายเหตุ: ${noteLabel || "มีหมายเหตุดอกจันทร์ (*)"}`}>
                        * {noteLabel ? (noteLabel.length > 20 ? noteLabel.slice(0, 20) + '...' : noteLabel) : 'มีหมายเหตุ'}
                    </span>
                )}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
                {data.group_code && (
                    <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        {data.group_code}
                    </span>
                )}
                {shift && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${shift.cls}`}>
                        {shift.label}
                    </span>
                )}
            </div>
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
        <div className="flex h-full w-full items-center justify-center gap-1">
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
                headerName: "กลุ่มเรียน / รายวิชา",
                minWidth: 220,
                flex: 2,
                cellRenderer: GroupNameRenderer,
            },
            {
                field: "teacher_name",
                headerName: "ผู้สอน",
                minWidth: 150,
                flex: 1,
                cellClass: "flex items-center text-slate-700",
            },
            {
                headerName: "ที่นั่ง (ชำระเงินแล้ว)",
                minWidth: 130,
                flex: 0.8,
                headerClass: "ag-header-cell-center",
                cellClass: "flex items-center justify-center",
                cellRenderer: SeatsRenderer,
            },
            {
                field: "status",
                headerName: "สถานะ",
                minWidth: 120,
                flex: 0.8,
                headerClass: "ag-header-cell-center",
                cellClass: "flex items-center justify-center",
                cellRenderer: GroupStatusRenderer,
            },
            {
                headerName: "จัดการ",
                pinned: "right",
                width: 175,
                sortable: false,
                filter: false,
                headerClass: "ag-header-cell-center",
                cellClass: "flex items-center justify-center",
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
            cellClass: "flex items-center text-sm text-slate-700",
            headerClass: "font-semibold text-slate-700",
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
                headerHeight={44}
                rowHeight={56}
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