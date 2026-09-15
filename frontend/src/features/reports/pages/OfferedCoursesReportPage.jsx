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
    { id: "all", key: "all", label: "ทั้งหมด (All)", shortLabel: "ทั้งหมด" },
    { id: "ปกติ", key: "ปกติ", label: "ปกติ (Regular)", shortLabel: "ปกติ" },
    { id: "special", key: "special", label: "พิเศษ (Special)", shortLabel: "พิเศษ" },
    { id: "project", key: "project", label: "โครงการ (Project)", shortLabel: "โครงการ" },
    { id: "extra", key: "extra", label: "เพิ่มเติม (Additional)", shortLabel: "เพิ่มเติม" },
    { id: "vocational", key: "vocational", label: "ห้องเรียนอาชีพ (Vocational Classroom)", shortLabel: "ห้องเรียนอาชีพ" },
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
                    const match = GROUP_TYPE_FILTERS.find((f) => f.id === key || f.key === key);
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
                    /* 1. Force strict A4 Portrait page setup with compact margins */
                    @page {
                        size: A4 portrait;
                        margin: 8mm 10mm 8mm 10mm;
                    }

                    /* 2. Reset html/body to 100% of printable area (190mm) so right margins & borders are preserved */
                    html, body {
                        width: 100% !important;
                        max-width: 100% !important;
                        height: auto !important;
                        min-height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                        color: #000 !important;
                        font-family: 'TH Sarabun PSK', 'THSarabunPSK', sans-serif !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        overflow: visible !important;
                    }

                    /* 3. Neutralize all application shell containers for multi-page pagination */
                    #root,
                    #root > div,
                    main,
                    .min-h-screen,
                    div:has(> .printable-report-container) {
                        height: auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                        overflow: visible !important;
                        display: block !important;
                        position: static !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: transparent !important;
                    }

                    /* 4. Hide all non-printable application shells */
                    nav, aside, header, footer,
                    .no-print,
                    button,
                    .filter-toolbar {
                        display: none !important;
                    }

                    /* 5. Ensure print container occupies full printable width without clipping */
                    .printable-report-container,
                    .printable-report-container * {
                        font-family: 'TH Sarabun PSK', 'THSarabunPSK', sans-serif !important;
                    }

                    .printable-report-container {
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        display: block !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: #ffffff !important;
                        overflow: visible !important;
                        box-sizing: border-box !important;
                    }

                    /* 6. Table Layout Geometry - Fixed Budget */
                    table {
                        width: 100% !important;
                        max-width: 100% !important;
                        table-layout: fixed !important;
                        border-collapse: collapse !important;
                        border: 1px solid #000000 !important;
                        border-right: 1px solid #000000 !important;
                        box-sizing: border-box !important;
                        page-break-inside: auto !important;
                        break-inside: auto !important;
                        font-family: 'TH Sarabun PSK', 'THSarabunPSK', sans-serif !important;
                    }

                    thead {
                        display: table-header-group !important; /* Repeat header row on every page overflow */
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }

                    tbody {
                        display: table-row-group !important;
                    }

                    tr {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }

                    /* 7. Official Announcement Typography & Tight Cell Padding */
                    th, td {
                        border: 1px solid #000000 !important;
                        box-sizing: border-box !important;
                        padding: 2px 4px !important;
                        font-size: 15pt !important;
                        line-height: 1.25 !important;
                        vertical-align: middle !important;
                        color: #000000 !important;
                        font-family: 'TH Sarabun PSK', 'THSarabunPSK', sans-serif !important;
                    }

                    /* Explicitly enforce outer borders on rightmost and bottom cells */
                    th:last-child,
                    td:last-child {
                        border-right: 1px solid #000000 !important;
                    }

                    th {
                        font-weight: bold !important;
                        font-size: 15pt !important;
                        background-color: #f8fafc !important;
                    }

                    /* 8. Prevent wrapping on short metadata columns and adjust font size */
                    td:nth-child(1),
                    th:nth-child(1) {
                        white-space: nowrap !important;
                        font-size: 15pt !important;
                    }

                    td:nth-child(2),
                    th:nth-child(2) {
                        white-space: nowrap !important;
                        font-size: 14pt !important;
                    }

                    td:nth-child(4),
                    td:nth-child(5),
                    th:nth-child(4),
                    th:nth-child(5) {
                        white-space: nowrap !important;
                        font-size: 13.5pt !important;
                    }

                    td:nth-child(6),
                    th:nth-child(6) {
                        white-space: nowrap !important;
                        font-size: 15pt !important;
                    }

                    /* 9. Allow course name to utilize tight single-line spacing */
                    td:nth-child(3) {
                        word-break: break-word;
                        overflow: hidden;
                        font-size: 15pt !important;
                    }

                    .print-header-title {
                        font-size: 18pt !important;
                        font-weight: bold !important;
                        margin-bottom: 8px !important;
                        text-align: center !important;
                        color: #000000 !important;
                        line-height: 1.3 !important;
                        font-family: 'TH Sarabun PSK', 'THSarabunPSK', sans-serif !important;
                    }

                    .print-meta-sub {
                        font-size: 14pt !important;
                        margin-bottom: 6px !important;
                        text-align: center !important;
                        color: #000000 !important;
                        font-family: 'TH Sarabun PSK', 'THSarabunPSK', sans-serif !important;
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
                                    A4 แนวตั้ง
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
            <div className="no-print filter-toolbar bg-white/90 backdrop-blur-xs border-b border-slate-200/80 px-4 py-3">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* 1. Batch Selector */}
                    <div className="flex flex-col gap-1.5 min-w-[240px] sm:min-w-[280px]">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Filter size={14} className="text-blue-600" />
                            <span>เลือกรุ่นการเรียน:</span>
                        </label>
                        <select
                            value={selectedBatchId}
                            onChange={(e) => handleBatchChange(e.target.value)}
                            disabled={loadingBatches}
                            className="w-full rounded-lg border border-slate-300 bg-white py-1.5 px-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 truncate shadow-2xs"
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
                    <div className="flex flex-col gap-1.5 flex-1 md:pl-4">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <span>ประเภทกลุ่มเรียน:</span>
                        </label>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            {GROUP_TYPE_FILTERS.map((filter) => {
                                const filterId = filter.id || filter.key;
                                const isChecked = selectedTypes.includes(filterId);
                                return (
                                    <button
                                        key={filterId}
                                        type="button"
                                        onClick={() => handleTypeToggle(filterId)}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition text-xs font-medium border ${isChecked
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
            <div className="flex-1 p-3 sm:p-6 overflow-x-auto print:p-0 print:m-0 print:overflow-visible print:block">
                <div
                    className="printable-report-container print-container max-w-[210mm] mx-auto bg-white border border-slate-300 shadow-md p-4 sm:p-6 rounded-sm print:border-none print:shadow-none print:p-0 print:m-0 print:w-full font-['TH_Sarabun_PSK','THSarabunPSK',sans-serif] text-black"
                    style={{ fontFamily: "'TH Sarabun PSK', 'THSarabunPSK', sans-serif" }}
                >
                    {/* Dynamic Document Header */}
                    <div className="text-center mb-3">
                        <h2 className="print-header-title text-[18pt] font-bold text-black tracking-tight leading-snug">
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

                    {/* Table Layout for A4 Portrait (Fixed Column Budget & Ultra Compact Rows) */}
                    {!loadingGroups && displayRows.length > 0 && (
                        <div className="overflow-x-auto print:overflow-visible pr-0.5">
                            <table className="w-full border-collapse border border-black text-black text-[15pt] table-fixed box-border">
                                <colgroup>
                                    <col style={{ width: "5%" }} />
                                    <col style={{ width: "13%" }} />
                                    <col style={{ width: "52%" }} />
                                    <col style={{ width: "10%" }} />
                                    <col style={{ width: "10%" }} />
                                    <col style={{ width: "10%" }} />
                                </colgroup>
                                <thead>
                                    <tr className="bg-slate-100 text-black font-bold text-center text-[15pt]">
                                        <th className="border border-black px-1 py-1 w-[5%] text-center whitespace-nowrap font-bold text-[15pt]">
                                            ที่
                                        </th>
                                        <th className="border border-black px-1 py-1 w-[10%] text-center whitespace-nowrap font-bold text-[15pt]">
                                            รหัสกลุ่มวิชา
                                        </th>
                                        <th className="border border-black px-1.5 py-1 w-[55%] text-left font-bold text-[15pt]">
                                            ชื่อรายวิชา
                                        </th>
                                        <th className="border border-black px-1 py-1 w-[10%] text-center whitespace-nowrap font-bold text-[15pt]">
                                            เรียนวันที่
                                        </th>
                                        <th className="border border-black px-1 py-1 w-[10%] text-center whitespace-nowrap font-bold text-[15pt]">
                                            จบวันที่
                                        </th>
                                        <th className="border border-black px-1 py-1 w-[10%] text-center whitespace-nowrap font-bold text-[15pt]">
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
                                            <td className="border border-black px-1 py-0.5 text-center font-normal whitespace-nowrap text-[15pt]">
                                                {row.rowNo}
                                            </td>

                                            {/* 2. รหัสกลุ่มวิชา (MOE Code) */}
                                            <td className="border border-black px-1 py-0.5 text-center font-mono text-[14pt] font-semibold tracking-tight text-black whitespace-nowrap">
                                                {row.moeCode || "-"}
                                            </td>

                                            {/* 3. ชื่อรายวิชา (Subject & Group String) */}
                                            <td className="border border-black px-1.5 py-0.5 text-left font-normal text-black leading-snug break-words text-[15pt]">
                                                {row.courseString}
                                            </td>

                                            {/* 4. เรียนวันที่ (Start Date) */}
                                            <td className="border border-black px-1 py-0.5 text-center whitespace-nowrap text-[13.5pt]">
                                                {row.formattedStartDate || "-"}
                                            </td>

                                            {/* 5. จบวันที่ (End Date) */}
                                            <td className="border border-black px-1 py-0.5 text-center whitespace-nowrap text-[13.5pt]">
                                                {row.formattedEndDate || "-"}
                                            </td>

                                            {/* 6. ผู้สอน (Teacher's First Name Only) */}
                                            <td className="border border-black px-1 py-0.5 text-center font-normal text-black whitespace-nowrap text-[15pt]">
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
