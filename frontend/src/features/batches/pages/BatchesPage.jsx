import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Search, Plus, ListFilter, CalendarRange, Sparkles, Layers, Armchair, Users, Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import Swal from "sweetalert2";
import BatchTable from "../components/BatchTable";
import BatchFormModal from "../components/BatchFormModal";
import SummaryCard from "../../../components/common/SummaryCard";
import { getBatches, deleteBatch } from "../services/batchApi";
import { getTeachers } from "../../teachers/services/teacherApi";
import { getStudyGroups, getBlankPrintTemplate } from "../../study-groups/services/studyGroupApi";
import ApplicationFormPrint from "../../../components/print/ApplicationFormPrint";

const STATUS_OPTIONS = [
    { value: "all", label: "ทุกสถานะ" },
    { value: "planning", label: "วางแผน" },
    { value: "admitting", label: "เปิดรับสมัคร" },
    { value: "studying", label: "กำลังเรียน" },
    { value: "ended", label: "จบหลักสูตรแล้ว" },
    { value: "cancelled", label: "ยกเลิก" },
];

const CURRENT_BE_YEAR = new Date().getFullYear() + 543;

/**
 * BatchesPage
 * -------------------------------------------------------------------------
 * Dashboard page for managing "batches" (รุ่นการเรียน).
 * - Lightweight Metric Summary Cards (Admitting Batches, Total Groups, Available Seats).
 * - Wires together search, academic-year filter, status filter, BatchTable
 *   (AG Grid) and BatchFormModal (create single / create bulk-year / edit).
 */
export default function BatchesPage() {
    const [batches, setBatches] = useState([]);
    const [studyGroups, setStudyGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [academicYearFilter, setAcademicYearFilter] = useState(String(CURRENT_BE_YEAR));
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBatch, setEditingBatch] = useState(null);

    // Blank Application Printing state
    const [blankPrintData, setBlankPrintData] = useState(null);
    const blankPrintRef = useRef(null);

    const handlePrintBlankDoc = useReactToPrint({
        contentRef: blankPrintRef,
        documentTitle: `ใบสมัครเปล่า_${blankPrintData?.group_name || "blank_application"}`,
    });

    const handlePrintPureBlank = async () => {
        try {
            const data = await getBlankPrintTemplate("");
            setBlankPrintData(data);
            setTimeout(() => {
                handlePrintBlankDoc();
            }, 150);
        } catch (err) {
            Swal.fire("ไม่สามารถพิมพ์ได้", "เกิดข้อผิดพลาดในการโหลดแบบฟอร์มเปล่า", "error");
        }
    };

    // รายชื่ออาจารย์จริง (ใช้เติม Combobox ผู้รับผิดชอบ 9 ตำแหน่งใน BatchFormModal)
    const [teachers, setTeachers] = useState([]);
    const [teachersLoading, setTeachersLoading] = useState(true);

    const fetchBatches = useCallback(async (params = {}) => {
        setLoading(true);
        try {
            const [batchData, groupData] = await Promise.allSettled([
                getBatches(params),
                getStudyGroups(),
            ]);
            setBatches(batchData.status === "fulfilled" ? batchData.value : []);
            if (groupData.status === "fulfilled") {
                setStudyGroups(Array.isArray(groupData.value) ? groupData.value : []);
            }
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "โหลดข้อมูลไม่สำเร็จ",
                text:
                    err?.response?.data?.message ||
                    "ไม่สามารถดึงข้อมูลรุ่นการเรียนได้ กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#0270c7",
            });
        } finally {
            setLoading(false);
        }
    }, []);

    // ดึงรายชื่ออาจารย์ที่ "ใช้งานอยู่" มาให้เลือกเป็นผู้รับผิดชอบในรุ่นการเรียน
    const fetchTeachers = useCallback(async () => {
        setTeachersLoading(true);
        try {
            const data = await getTeachers({ status: "active" });
            setTeachers(data);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "โหลดรายชื่ออาจารย์ไม่สำเร็จ",
                text:
                    err?.response?.data?.message ||
                    "ไม่สามารถดึงรายชื่ออาจารย์มาให้เลือกเป็นผู้รับผิดชอบได้ กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#0270c7",
            });
        } finally {
            setTeachersLoading(false);
        }
    }, []);

    // ดึงครั้งเดียวตอนเข้าหน้า ไม่ต้องผูกกับ filter ของ batches
    useEffect(() => {
        fetchTeachers();
    }, [fetchTeachers]);

    // มีคำค้นหา -> ค้นหาข้ามทุกปีการศึกษา (ไม่ยึด filter ปี)
    const isQuickSearching = searchTerm.trim().length > 0;

    useEffect(() => {
        const params = {};
        if (!isQuickSearching && academicYearFilter !== "all") {
            params.year = academicYearFilter;
        }
        fetchBatches(params);
    }, [fetchBatches, academicYearFilter, isQuickSearching]);

    // ── Computed Statistics for Summary Cards ───────────────────────────────
    const stats = useMemo(() => {
        const admittingBatches = batches.filter((b) => b.status === "admitting").length;
        const totalGroups = studyGroups.length;
        const availableSeats = studyGroups.reduce((sum, g) => {
            const max = Number(g.max_seats) || 0;
            const current = Number(g.current_seats) || 0;
            return sum + Math.max(0, max - current);
        }, 0);
        const totalEnrolled = studyGroups.reduce((sum, g) => sum + (Number(g.current_seats) || 0), 0);

        return { admittingBatches, totalGroups, availableSeats, totalEnrolled };
    }, [batches, studyGroups]);

    // รายการปีการศึกษาทั้งหมดที่มีข้อมูลอยู่ (สำหรับ dropdown filter)
    const academicYearOptions = useMemo(() => {
        const years = Array.from(new Set(batches.map((b) => String(b.academic_year)))).sort(
            (a, b) => Number(b) - Number(a)
        );
        if (!years.includes(String(CURRENT_BE_YEAR))) years.unshift(String(CURRENT_BE_YEAR));
        return years;
    }, [batches]);

    const filteredBatches = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return batches.filter((b) => {
            const matchesSearch = !term || b.batch_name.toLowerCase().includes(term);
            const matchesStatus = statusFilter === "all" || b.status === statusFilter;
            const matchesYear =
                isQuickSearching ||
                academicYearFilter === "all" ||
                String(b.academic_year) === academicYearFilter;
            return matchesSearch && matchesStatus && matchesYear;
        });
    }, [batches, searchTerm, statusFilter, academicYearFilter, isQuickSearching]);

    const handleCreate = () => {
        setEditingBatch(null);
        setIsFormOpen(true);
    };

    const handleEdit = (batch) => {
        setEditingBatch(batch);
        setIsFormOpen(true);
    };

    const handleDelete = async (batch) => {
        try {
            await deleteBatch(batch.id);
            setBatches((prev) => prev.filter((b) => b.id !== batch.id));
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "ลบข้อมูลไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#0270c7",
            });
        }
    };

    const handleSaved = (savedBatch) => {
        setBatches((prev) => {
            const exists = prev.some((b) => b.id === savedBatch.id);
            return exists
                ? prev.map((b) => (b.id === savedBatch.id ? savedBatch : b))
                : [{ ...savedBatch, id: savedBatch.id ?? Date.now() }, ...prev];
        });
    };

    const handleFormClose = () => {
        setIsFormOpen(false);
    };

    return (
        <div className="w-full flex-1 flex flex-col min-h-0 p-4 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="flex items-center gap-2 text-xl font-black text-slate-800 sm:text-2xl">
                        <CalendarRange size={24} className="text-blue-600" /> จัดการรุ่นการเรียน
                    </h1>
                    <p className="text-sm text-slate-500">จัดการรุ่นการเรียนและกำหนดการรับสมัคร/ตารางสอน</p>
                </div>
            </div>

            {/* 📊 1. Lightweight Metric Summary Cards */}
            <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3 shrink-0">
                <SummaryCard
                    title="รุ่นที่เปิดรับสมัคร (Admitting Batches)"
                    value={loading ? "-" : stats.admittingBatches.toLocaleString()}
                    subtitle="รุ่นที่เปิดรับลงทะเบียนขณะนี้"
                    icon={Sparkles}
                    variant="blue"
                    loading={loading}
                />
                <SummaryCard
                    title="กลุ่มเรียนทั้งหมด (Total Groups)"
                    value={loading ? "-" : stats.totalGroups.toLocaleString()}
                    subtitle="กลุ่มเรียน/ห้องเรียนทุกแผนก"
                    icon={Layers}
                    variant="indigo"
                    loading={loading}
                />
                <SummaryCard
                    title="จำนวนที่นั่งคงเหลือ (Available Seats)"
                    value={loading ? "-" : stats.availableSeats.toLocaleString()}
                    subtitle={`จากผู้ลงทะเบียนแล้ว ${stats.totalEnrolled.toLocaleString()} คน`}
                    icon={Armchair}
                    variant="emerald"
                    loading={loading}
                />
            </div>

            {/* Toolbar */}
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    {/* Quick Search - ค้นหาได้ทุกรุ่นข้ามปีการศึกษา */}
                    <div className="relative">
                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Quick Search ค้นหารุ่นการเรียน (ทุกปี)..."
                            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 sm:w-72"
                        />
                    </div>

                    {/* Academic year filter */}
                    <div className="relative">
                        <CalendarRange size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={academicYearFilter}
                            onChange={(e) => setAcademicYearFilter(e.target.value)}
                            disabled={isQuickSearching}
                            className="w-full appearance-none rounded-lg border border-slate-300 py-2 pl-9 pr-8 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 sm:w-44"
                        >
                            <option value="all">ทุกปีการศึกษา</option>
                            {academicYearOptions.map((year) => (
                                <option key={year} value={year}>
                                    ปีการศึกษา {year}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status filter */}
                    <div className="relative">
                        <ListFilter size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full appearance-none rounded-lg border border-slate-300 py-2 pl-9 pr-8 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 sm:w-48"
                        >
                            {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handlePrintPureBlank}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-blue-600 active:scale-[0.98]"
                    >
                        <Printer size={16} />
                        พิมพ์ใบสมัครเปล่า
                    </button>
                    <button
                        type="button"
                        onClick={handleCreate}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
                    >
                        <Plus size={16} />
                        สร้างรุ่นการเรียนใหม่
                    </button>
                </div>
            </div>

            {isQuickSearching && (
                <p className="mb-3 text-xs text-slate-500">
                    กำลังค้นหา "{searchTerm}" ในรุ่นการเรียนทุกปีการศึกษา — ล้างช่องค้นหาเพื่อกลับไปกรองตามปี
                </p>
            )}

            <BatchTable
                rowData={filteredBatches}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <BatchFormModal
                isOpen={isFormOpen}
                initialData={editingBatch}
                onClose={handleFormClose}
                onSaved={handleSaved}
                teachers={teachers}
                teachersLoading={teachersLoading}
            />

            {/* ── Hidden Print Component for Blank Application ──────── */}
            <div className="hidden">
                <ApplicationFormPrint
                    ref={blankPrintRef}
                    isBlank={true}
                    enrollment={blankPrintData}
                    studentNo=""
                />
            </div>
        </div>
    );
}