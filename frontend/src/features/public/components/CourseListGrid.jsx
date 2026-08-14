import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { Link } from "react-router-dom";

ModuleRegistry.registerModules([AllCommunityModule]);

function SeatsRenderer({ data }) {
    const isFull = data.remaining_seats <= 0;
    return (
        <span className={`text-sm font-semibold ${isFull ? "text-red-500" : "text-slate-700"}`}>
            {data.current_seats}/{data.max_seats}
        </span>
    );
}

function FeeRenderer({ data }) {
    return (
        <span className="font-bold text-indigo-700">
            {data.is_free ? "ฟรี" : `${data.fee.toLocaleString()} บ.`}
        </span>
    );
}

function ActionRenderer({ data }) {
    const isFull = data.remaining_seats <= 0;
    return (
        <Link
            to={isFull ? "#" : `/register/${data.id}`}
            aria-disabled={isFull}
            onClick={(e) => isFull && e.preventDefault()}
            className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition ${isFull ? "cursor-not-allowed bg-slate-100 text-slate-400" : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
        >
            {isFull ? "เต็ม" : "สมัครเรียน"}
        </Link>
    );
}

/**
 * CourseListGrid — AG-Grid high-density list view for public course listing.
 * Non-essential columns collapse on narrow viewports via AG-Grid's flex/minWidth,
 * with horizontal scroll as the mobile fallback (AG-Grid doesn't support true
 * column-stacking, so this pairs with the Grid-card view as the primary mobile UX).
 */
export default function CourseListGrid({ courses = [], loading = false }) {
    const columnDefs = useMemo(
        () => [
            { field: "group_name", headerName: "ชื่อวิชา", minWidth: 220, flex: 2 },
            { field: "schedule_description", headerName: "ตารางเรียน", minWidth: 160, flex: 1.4 },
            { headerName: "ที่นั่ง", width: 90, cellRenderer: SeatsRenderer },
            { headerName: "ค่าเรียน", width: 90, cellRenderer: FeeRenderer },
            {
                headerName: "",
                pinned: "right",
                width: 110,
                sortable: false,
                filter: false,
                cellRenderer: ActionRenderer,
            },
        ],
        []
    );

    const defaultColDef = useMemo(() => ({ resizable: true, sortable: true, filter: true }), []);

    return (
        <div className="h-[560px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
            <AgGridReact
                theme={themeQuartz}
                rowData={courses}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                loading={loading}
                pagination
                paginationPageSize={15}
                headerHeight={40}
                rowHeight={48}
                animateRows
                overlayNoRowsTemplate="<span class='text-sm text-slate-400'>ไม่พบวิชาที่เปิดรับสมัคร</span>"
                getRowId={(params) => String(params.data.id)}
                className="h-full w-full"
            />
        </div>
    );
}
