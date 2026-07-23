import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, Plus, ListFilter, CalendarRange } from "lucide-react";
import Swal from "sweetalert2";
import BatchTable from "../components/BatchTable";
import BatchFormModal from "../components/BatchFormModal";
import { getBatches, deleteBatch } from "../services/batchApi";
import { getTeachers } from "../../teachers/services/teacherApi";

const STATUS_OPTIONS = [
    { value: "all", label: "ทุกสถานะ" },
    { value: "planning", label: "วางแผน" },
    { value: "admitting", label: "เปิดรับสมัคร" },
    { value: "studying", label: "กำลังเรียน" },
    { value: "ended", label: "จบหลักสูตรแล้ว" },
];

const CURRENT_BE_YEAR = new Date().getFullYear() + 543;

/**
 * BatchesPage
 * -------------------------------------------------------------------------
 * Dashboard page for managing "batches" (รุ่นการเรียน).
 * Wires together search, academic-year filter, status filter, BatchTable
 * (AG Grid) and BatchFormModal (create single / create bulk-year / edit).
 */
export default function BatchesPage() {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [academicYearFilter, setAcademicYearFilter] = useState(String(CURRENT_BE_YEAR));
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBatch, setEditingBatch] = useState(null);

    // รายชื่ออาจารย์จริง (ใช้เติม Combobox ผู้รับผิดชอบ 9 ตำแหน่งใน BatchFormModal)
    const [teachers, setTeachers] = useState([]);
    const [teachersLoading, setTeachersLoading] = useState(true);

    // ยิง GET /batches พร้อม query params { year, term }
    // - ตอน Quick Search อยู่ (isQuickSearching) เราอยากค้นข้ามทุกปี จึงไม่ส่ง year ไปกรองที่ backend
    // - term ยังไม่มี dropdown filter ในหน้านี้ จึงเว้นว่างไว้ (backend รองรับแล้วถ้าจะเพิ่มในอนาคต)
    const fetchBatches = useCallback(async (params = {}) => {
        setLoading(true);
        try {
            const data = await getBatches(params);
            setBatches(data);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "โหลดข้อมูลไม่สำเร็จ",
                text:
                    err?.response?.data?.message ||
                    "ไม่สามารถดึงข้อมูลรุ่นการเรียนได้ กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        } finally {
            setLoading(false);
        }
    }, []);

    // ดึงรายชื่ออาจารย์ที่ "ใช้งานอยู่" มาให้เลือกเป็นผู้รับผิดชอบในรุ่นการเรียน
    // (คนที่ระงับการใช้งานแล้วไม่ควรถูกเลือกมาเป็น ผอ./รองฯ/หัวหน้างานรุ่นใหม่)
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
                confirmButtonColor: "#4f46e5",
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
        // ถ้ากำลัง Quick Search อยู่ -> ดึงข้อมูลทุกปีการศึกษามาก่อน แล้วค่อยกรองฝั่ง client
        // ถ้าไม่ได้ค้นหา -> ส่ง year ไปกรองที่ backend เลย (ยกเว้นเลือก "ทุกปีการศึกษา")
        const params = {};
        if (!isQuickSearching && academicYearFilter !== "all") {
            params.year = academicYearFilter;
        }
        fetchBatches(params);
    }, [fetchBatches, academicYearFilter, isQuickSearching]);

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
            // ยิง DELETE /batches/:id จริง แล้วค่อยตัดออกจาก state เมื่อ backend ตอบ OK
            await deleteBatch(batch.id);
            setBatches((prev) => prev.filter((b) => b.id !== batch.id));
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "ลบข้อมูลไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        }
    };

    // ใช้กับทั้งโหมดสร้างทีละรุ่น (เรียก 1 ครั้ง) และโหมดสร้างยกปี (เรียก 4 ครั้ง)
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
        <div className="w-full p-4">
            <div className="mb-6 flex flex-col gap-1">
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">จัดการรุ่นการเรียน</h1>
                <p className="text-sm text-slate-500">
                    สร้าง แก้ไข และติดตามสถานะรุ่นการเรียนทั้งหมดในระบบ
                </p>
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
                            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 sm:w-72"
                        />
                    </div>

                    {/* Academic year filter */}
                    <div className="relative">
                        <CalendarRange size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={academicYearFilter}
                            onChange={(e) => setAcademicYearFilter(e.target.value)}
                            disabled={isQuickSearching}
                            className="w-full appearance-none rounded-lg border border-slate-300 py-2 pl-9 pr-8 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 sm:w-44"
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
                            className="w-full appearance-none rounded-lg border border-slate-300 py-2 pl-9 pr-8 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 sm:w-48"
                        >
                            {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleCreate}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]"
                >
                    <Plus size={16} />
                    สร้างรุ่นการเรียนใหม่
                </button>
            </div>

            {isQuickSearching && (
                <p className="mb-3 text-xs text-slate-500">
                    กำลังค้นหา "{searchTerm}" ในรุ่นการเรียนทุกปีการศึกษา — ล้างช่องค้นหาเพื่อกลับไปกรองตามปี
                </p>
            )}

            <BatchTable rowData={filteredBatches} loading={loading} onEdit={handleEdit} onDelete={handleDelete} />

            <BatchFormModal
                isOpen={isFormOpen}
                initialData={editingBatch}
                onClose={handleFormClose}
                onSaved={handleSaved}
                teachers={teachers}
                teachersLoading={teachersLoading}
            />
        </div>
    );
}