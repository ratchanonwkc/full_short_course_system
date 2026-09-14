import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
    Printer,
    ArrowLeft,
    RefreshCw,
    Search,
    BookOpen,
    Clock,
    Layers,
    Filter,
    CheckSquare,
    Square,
} from "lucide-react";
import { getBatches } from "../../batches/services/batchApi";
import { getStudyGroups } from "../../study-groups/services/studyGroupApi";
import { findActiveBatch } from "../../../utils/activeBatch";
import { getIteration, getTerm } from "../../../utils/batchName";
import { flattenStudyGroupsToSubjects } from "../../../utils/reportFormatters";

const GROUP_TYPE_FILTERS = [
    { key: "all", label: "ทั้งหมด (All)", shortLabel: "ทั้งหมด" },
    { key: "special", label: "พิเศษ (Special)", shortLabel: "พิเศษ" },
    { key: "project", label: "โครงการ (Project)", shortLabel: "โครงการ" },
    { key: "extra", label: "เพิ่มเติม (Additional)", shortLabel: "เพิ่มเติม" },
    { key: "vocational", label: "ห้องเรียนอาชีพ (Vocational Classroom)", shortLabel: "ห้องเรียนอาชีพ" },
];

export default function OfferedCoursesReportPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // Data state
    const [batches, setBatches] = useState([]);
    const [selectedBatchId, setSelectedBatchId] = useState(searchParams.get("batchId") || "");
    const [groups, setGroups] = useState([]);
    const [loadingBatches, setLoadingBatches] = useState(true);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState("");

    // Filter toolbar state: types selected (keys: 'all', 'special', 'project', 'extra', 'vocational')
    const [selectedTypes, setSelectedTypes] = useState(["all"]);

    // ── 1. Fetch Batches & Initial Batch Selection ───────────────────────────
    useEffect(() => {
        let isMounted = true;
        const fetchInitialBatches = async () => {
            try {
                setLoadingBatches(true);
                const batchList = await getBatches();
                if (!isMounted) return;
                setBatches(batchList || []);

                const queryBatchId = searchParams.get("batchId");
                if (queryBatchId && (batchList || []).some((b) => String(b.id) === String(queryBatchId))) {
                    setSelectedBatchId(String(queryBatchId));
                } else if (batchList && batchList.length > 0) {
                    const active = findActiveBatch(batchList);
                    const defaultId = active ? String(active.id) : String(batchList[0].id);
                    setSelectedBatchId(defaultId);
                    setSearchParams({ batchId: defaultId }, { replace: true });
                }
            } catch (err) {
                console.error("Error fetching batches:", err);
            } finally {
                if (isMounted) setLoadingBatches(false);
            }
        };

        fetchInitialBatches();
        return () => {
            isMounted = false;
        };
    }, []);

    // ── 2. Fetch Study Groups for Selected Batch ─────────────────────────────
    const fetchGroupsForBatch = async (batchId) => {
        if (!batchId) {
            setGroups([]);
            return;
        }
        try {
            setLoadingGroups(true);
            const data = await getStudyGroups({ batch_id: batchId });
            setGroups(data || []);
        } catch (err) {
            console.error("Error fetching study groups for report:", err);
            setGroups([]);
        } finally {
            setLoadingGroups(false);
        }
    };

    useEffect(() => {
        if (selectedBatchId) {
            fetchGroupsForBatch(selectedBatchId);
        }
    }, [selectedBatchId]);

    // Handle batch dropdown change
    const handleBatchChange = (newBatchId) => {
        setSelectedBatchId(newBatchId);
        setSearchParams({ batchId: newBatchId });
    };

    // ── 3. Group Type Checkbox Filter Handling ────────────────────────────────
    const handleTypeToggle = (typeKey) => {
        if (typeKey === "all") {
            // Clicking "all" turns everything else off and sets only "all"
            setSelectedTypes(["all"]);
            return;
        }

        setSelectedTypes((prev) => {
            let next;
            if (prev.includes(typeKey)) {
                // Remove clicked type
                next = prev.filter((t) => t !== typeKey && t !== "all");
            } else {
                // Add clicked type and ensure "all" is removed
                next = [...prev.filter((t) => t !== "all"), typeKey];
            }

            // If no specific types remain selected, revert to "all"
            if (next.length === 0) {
                return ["all"];
            }

            return next;
        });
    };

    // ── 4. Compute Selected Batch Metadata & Dynamic Header ───────────────────
    const selectedBatch = useMemo(() => {
        return batches.find((b) => String(b.id) === String(selectedBatchId)) || null;
    }, [batches, selectedBatchId]);

    const dynamicTitle = useMemo(() => {
        // Compute selected types label
        let typesLabel = "ทั้งหมด";
        if (!selectedTypes.includes("all")) {
            const labels = selectedTypes
                .map((key) => {
                    const match = GROUP_TYPE_FILTERS.find((f) => f.key === key);
                    return match ? match.shortLabel : key;
                })
                .filter(Boolean);
            typesLabel = labels.join(", ") || "ทั้งหมด";
        }

        // Compute batch sequence, iteration, academic year, term
        const sequence = selectedBatch?.batch_sequence ?? selectedBatch?.batch_no ?? "-";
        const iteration = selectedBatch ? getIteration(selectedBatch.batch_no) : "1";
        const term = selectedBatch ? getTerm(selectedBatch.batch_no) : (selectedBatch?.term || "1");
        const academicYear = selectedBatch?.academic_year || "2569";

        // Format: รายวิชาที่เปิดสอน ({selected_types_label}) รุ่นที่ {batch_no} ปีการศึกษา {academic_year}/{term}
        // Example: รายวิชาที่เปิดสอน (พิเศษ, โครงการ) รุ่นที่ 139/1 ปีการศึกษา 2569/1
        return `รายวิชาที่เปิดสอน (${typesLabel}) รุ่นที่ ${sequence}/${iteration} ปีการศึกษา ${academicYear}/${term}`;
    }, [selectedBatch, selectedTypes]);

    // ── 5. Flatten Groups into Atomic Subject Rows with Filter ────────────────
    const flattenedRows = useMemo(() => {
        return flattenStudyGroupsToSubjects(groups, selectedTypes);
    }, [groups, selectedTypes]);

    // Optional client-side search across subject name, moe code, teacher name
    const displayRows = useMemo(() => {
        if (!searchKeyword.trim()) return flattenedRows;
        const q = searchKeyword.trim().toLowerCase();
        return flattenedRows.filter((r) => {
            return (
                (r.subjectName || "").toLowerCase().includes(q) ||
                (r.courseString || "").toLowerCase().includes(q) ||
                (r.moeCode || "").toLowerCase().includes(q) ||
                (r.teacherFirstName || "").toLowerCase().includes(q) ||
                (r.groupCode || "").toLowerCase().includes(q)
            );
        });
    }, [flattenedRows, searchKeyword]);

    // ── 6. Metrics Summary ────────────────────────────────────────────────────
    const metrics = useMemo(() => {
        const totalSubjects = flattenedRows.length;
        const totalHours = flattenedRows.reduce((sum, r) => sum + (Number(r.totalHours) || 0), 0);
        const uniqueGroupIds = new Set(flattenedRows.map((r) => r.groupId));
        return {
            totalSubjects,
            totalHours,
            totalGroups: uniqueGroupIds.size,
        };
    }, [flattenedRows]);

    // ── 7. Trigger Print Dialog ───────────────────────────────────────────────
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-text">
            {/* ── Print Specific Styles ──────────────────────────────────────── */}
            <style>{`
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 10mm 15mm 10mm 15mm;
                    }
                    body, html, #root {
                        background: #ffffff !important;
                        color: #000000 !important;
                        font-family: 'TH Sarabun New', 'TH Sarabun PSK', 'THSarabunPSK', 'Sarabun', sans-serif !important;
                        font-size: 14pt !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        overflow: visible !important;
                    }
                    /* Hide everything with .no-print, sidebar, and layout header */
                    .no-print,
                    aside,
                    header,
                    nav {
                        display: none !important;
                    }
                    /* Main container for print */
                    .print-container {
                        box-shadow: none !important;
                        border: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        width: 100% !important;
                        background: #ffffff !important;
                    }
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin-top: 6px !important;
                    }
                    th, td {
                        border: 1px solid #333333 !important;
                        padding: 4px 6px !important;
                        color: #000000 !important;
                        font-size: 13pt !important;
                    }
                    thead {
                        display: table-header-group;
                    }
                    tr {
                        page-break-inside: avoid;
                    }
                    .print-header-title {
                        font-size: 18pt !important;
                        font-weight: bold !important;
                        margin-bottom: 8px !important;
                        text-align: center !important;
                        color: #000000 !important;
                    }
                    .print-meta-sub {
                        font-size: 13pt !important;
                        margin-bottom: 12px !important;
                        text-align: center !important;
                        color: #222222 !important;
                    }
                }
            `}</style>

            {/* ── Top Bar / Action Controls (Hidden on Print) ───────────────── */}
            <div className="no-print bg-white border-b border-slate-200 px-4 py-3 shadow-xs sticky top-0 z-20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left: Back Link & Breadcrumb */}
                    <div className="flex items-center gap-3">
                        <Link
                            to={selectedBatchId ? `/batches/${selectedBatchId}/groups` : "/planning/study-groups"}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                            title="กลับไปยังหน้าจัดการกลุ่มเรียน"
                        >
                            <ArrowLeft size={18} />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base font-bold text-slate-900 leading-tight">
                                    แบบรายงานรายวิชาที่เปิดสอน
                                </h1>
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                                    A4 แนวนอน
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                งานทะเบียนและหลักสูตรวิชาชีพระยะสั้น • รูปแบบเอกสารราชการ
                            </p>
                        </div>
                    </div>

                    {/* Right: Quick Search, Refresh, Print Action */}
                    <div className="flex items-center gap-2">
                        {/* Search on screen */}
                        <div className="relative w-48 sm:w-60">
                            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                placeholder="ค้นหาในตาราง..."
                                className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        {/* Reload Data */}
                        <button
                            type="button"
                            onClick={() => fetchGroupsForBatch(selectedBatchId)}
                            disabled={loadingGroups}
                            className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-50"
                            title="โหลดข้อมูลใหม่"
                        >
                            <RefreshCw size={16} className={loadingGroups ? "animate-spin text-blue-600" : ""} />
                        </button>

                        {/* Primary Print Button */}
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                            title="สั่งพิมพ์รายงาน (Ctrl+P)"
                        >
                            <Printer size={15} />
                            <span>🖨️ พิมพ์รายงาน</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Filter Toolbar (Hidden on Print) ──────────────────────────── */}
            <div className="no-print bg-white/90 backdrop-blur-xs border-b border-slate-200/80 px-4 py-3">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* 1. Batch Selector */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-700 shrink-0 flex items-center gap-1">
                            <Filter size={14} className="text-slate-400" />
                            เลือกรุ่นการเรียน:
                        </label>
                        <select
                            value={selectedBatchId}
                            onChange={(e) => handleBatchChange(e.target.value)}
                            disabled={loadingBatches}
                            className="rounded-lg border border-slate-300 bg-white py-1.5 px-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 max-w-sm sm:max-w-md truncate"
                        >
                            {batches.map((b) => {
                                const seq = b.batch_sequence ?? b.batch_no ?? "-";
                                const it = getIteration(b.batch_no);
                                const t = getTerm(b.batch_no);
                                const label = `รุ่นที่ ${seq}/${it} ปีการศึกษา ${b.academic_year}/${t}`;
                                return (
                                    <option key={b.id} value={b.id}>
                                        {label}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* 2. Group Type Checkboxes */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                        <span className="font-semibold text-slate-600 shrink-0">ประเภทกลุ่มเรียน:</span>
                        {GROUP_TYPE_FILTERS.map((filter) => {
                            const isChecked = selectedTypes.includes(filter.key);
                            return (
                                <button
                                    key={filter.key}
                                    type="button"
                                    onClick={() => handleTypeToggle(filter.key)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition text-xs font-medium border ${
                                        isChecked
                                            ? "bg-blue-50 border-blue-300 text-blue-800 font-semibold shadow-2xs"
                                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                    }`}
                                >
                                    {isChecked ? (
                                        <CheckSquare size={14} className="text-blue-600" />
                                    ) : (
                                        <Square size={14} className="text-slate-400" />
                                    )}
                                    <span>{filter.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Metrics Summary Badges (Hidden on Print) ─────────────────── */}
            <div className="no-print max-w-7xl mx-auto w-full px-4 pt-3">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
                    <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 shadow-2xs">
                        <BookOpen size={14} className="text-blue-600" />
                        <span>จำนวนรายวิชาเปิดสอน:</span>
                        <strong className="font-bold text-slate-900">{metrics.totalSubjects}</strong>
                        <span>วิชา</span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 shadow-2xs">
                        <Clock size={14} className="text-amber-600" />
                        <span>ชั่วโมงรวม:</span>
                        <strong className="font-bold text-slate-900">{metrics.totalHours}</strong>
                        <span>ชม.</span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 shadow-2xs">
                        <Layers size={14} className="text-emerald-600" />
                        <span>จากกลุ่มเรียน:</span>
                        <strong className="font-bold text-slate-900">{metrics.totalGroups}</strong>
                        <span>กลุ่ม</span>
                    </div>
                </div>
            </div>

            {/* ── Printable Report Document Container ──────────────────────── */}
            <div className="flex-1 p-3 sm:p-6 overflow-x-auto">
                <div className="print-container max-w-[297mm] mx-auto bg-white border border-slate-300 shadow-md p-6 sm:p-10 rounded-sm">
                    {/* Dynamic Document Header */}
                    <div className="text-center mb-4">
                        <h2 className="print-header-title text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                            {dynamicTitle}
                        </h2>
                    </div>

                    {/* Loading State */}
                    {loadingGroups && (
                        <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                            <RefreshCw size={24} className="animate-spin text-blue-600" />
                            <span className="text-sm font-medium">กำลังรวบรวมและจัดกลุ่มรายวิชาที่เปิดสอน...</span>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loadingGroups && displayRows.length === 0 && (
                        <div className="py-16 text-center text-slate-400 border border-dashed border-slate-300 rounded-lg my-4">
                            <p className="text-sm font-semibold text-slate-600">
                                ไม่พบรายวิชาที่เปิดสอนตามเงื่อนไขที่เลือก
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                กรุณาตรวจสอบการเลือกรุ่นการเรียน หรือปรับเปลี่ยนตัวกรองประเภทกลุ่มเรียน
                            </p>
                        </div>
                    )}

                    {/* Table Layout for A4 Landscape (Exact 6 Columns) */}
                    {!loadingGroups && displayRows.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-slate-700 text-slate-900 text-xs sm:text-sm">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-900 font-bold text-center">
                                        <th className="border border-slate-700 px-2 py-2 w-12 text-center">
                                            ที่
                                        </th>
                                        <th className="border border-slate-700 px-3 py-2 w-32 text-center">
                                            รหัสกลุ่มวิชา
                                        </th>
                                        <th className="border border-slate-700 px-3 py-2 text-left">
                                            ชื่อรายวิชา
                                        </th>
                                        <th className="border border-slate-700 px-2.5 py-2 w-28 text-center">
                                            เรียนวันที่
                                        </th>
                                        <th className="border border-slate-700 px-2.5 py-2 w-28 text-center">
                                            จบวันที่
                                        </th>
                                        <th className="border border-slate-700 px-3 py-2 w-32 text-center">
                                            ผู้สอน
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayRows.map((row) => (
                                        <tr
                                            key={`${row.groupId}-${row.subjectId || row.rowNo}`}
                                            className="hover:bg-blue-50/40 transition-colors"
                                        >
                                            {/* 1. ที่ (No.) */}
                                            <td className="border border-slate-700 px-2 py-1.5 text-center font-medium">
                                                {row.rowNo}
                                            </td>

                                            {/* 2. รหัสกลุ่มวิชา (MOE Code) */}
                                            <td className="border border-slate-700 px-3 py-1.5 text-center font-mono text-xs sm:text-sm font-semibold tracking-wider text-slate-800">
                                                {row.moeCode || "-"}
                                            </td>

                                            {/* 3. ชื่อรายวิชา (Subject & Group String) */}
                                            <td className="border border-slate-700 px-3 py-1.5 text-left font-normal text-slate-900 leading-relaxed">
                                                {row.courseString}
                                            </td>

                                            {/* 4. เรียนวันที่ (Start Date) */}
                                            <td className="border border-slate-700 px-2.5 py-1.5 text-center whitespace-nowrap">
                                                {row.formattedStartDate || "-"}
                                            </td>

                                            {/* 5. จบวันที่ (End Date) */}
                                            <td className="border border-slate-700 px-2.5 py-1.5 text-center whitespace-nowrap">
                                                {row.formattedEndDate || "-"}
                                            </td>

                                            {/* 6. ผู้สอน (Teacher's First Name Only) */}
                                            <td className="border border-slate-700 px-3 py-1.5 text-center font-medium text-slate-800">
                                                {row.teacherFirstName || "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
