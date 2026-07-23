import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, ListFilter } from "lucide-react";
import Swal from "sweetalert2";
import axiosInstance from "../../../config/axiosInstance";
import TeacherTable from "../components/TeacherTable";
import TeacherFormModal from "../components/TeacherFormModal";

const STATUS_OPTIONS = [
    { value: "all", label: "ทุกสถานะ" },
    { value: "active", label: "ใช้งานอยู่" },
    { value: "inactive", label: "ระงับการใช้งาน" },
];

export default function TeachersPage() {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState(null);

    // Master data: คำนำหน้าชื่อ / ตำแหน่งหลัก / หน้าที่พิเศษ
    const [prefixes, setPrefixes] = useState([]);
    const [positions, setPositions] = useState([]);
    const [subPositions, setSubPositions] = useState([]);

    const fetchTeachers = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axiosInstance.get("/teachers");
            setTeachers(data);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "โหลดข้อมูลไม่สำเร็จ",
                text: "ไม่สามารถดึงข้อมูลอาจารย์ได้ กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMasters = useCallback(async () => {
        try {
            const [{ data: prefixData }, { data: positionData }, { data: subPositionData }] =
                await Promise.all([
                    axiosInstance.get("/prefixes"),
                    axiosInstance.get("/positions"),
                    axiosInstance.get("/sub-positions"),
                ]);
            setPrefixes(prefixData);
            setPositions(positionData);
            setSubPositions(subPositionData);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "โหลดข้อมูลตั้งต้นไม่สำเร็จ",
                text: "ไม่สามารถดึงข้อมูลคำนำหน้าชื่อ/ตำแหน่ง/หน้าที่พิเศษได้",
                confirmButtonColor: "#4f46e5",
            });
        }
    }, []);

    useEffect(() => {
        fetchTeachers();
        fetchMasters();
    }, [fetchTeachers, fetchMasters]);

    const filteredTeachers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return teachers.filter((t) => {
            const fullName = [t.prefix_name, t.first_name_th, t.last_name_th].filter(Boolean).join(" ").toLowerCase();
            const matchesSearch =
                !term ||
                fullName.includes(term) ||
                t.citizen_id?.includes(term) ||
                t.email?.toLowerCase().includes(term) ||
                t.phone?.includes(term);
            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && t.is_active) ||
                (statusFilter === "inactive" && !t.is_active);
            return matchesSearch && matchesStatus;
        });
    }, [teachers, searchTerm, statusFilter]);

    const handleCreate = () => {
        setEditingTeacher(null);
        setIsFormOpen(true);
    };

    const handleEdit = (teacher) => {
        setEditingTeacher(teacher);
        setIsFormOpen(true);
    };

    const handleDelete = async (teacher) => {
        try {
            await axiosInstance.delete(`/teachers/${teacher.id}`);
            setTeachers((prev) => prev.filter((t) => t.id !== teacher.id));
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "ลบข้อมูลไม่สำเร็จ",
                text: "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        }
    };

    const handleSaved = (savedTeacher) => {
        // เติมชื่อ join ไว้ให้ตารางแสดงผลได้ทันทีโดยไม่ต้อง fetch ใหม่
        const enriched = {
            ...savedTeacher,
            prefix_name: prefixes.find((p) => String(p.id) === String(savedTeacher.prefix_id))?.short_name,
            position_name: positions.find((p) => String(p.id) === String(savedTeacher.position_id))?.position_name,
            sub_position_name: subPositions.find((p) => String(p.id) === String(savedTeacher.sub_position_id))?.sub_position_name,
        };

        setTeachers((prev) => {
            const exists = prev.some((t) => t.id === enriched.id);
            return exists ? prev.map((t) => (t.id === enriched.id ? enriched : t)) : [enriched, ...prev];
        });
        setIsFormOpen(false);
    };

    // เพิ่มรายการ master data แบบ optimistic หลัง Quick Add สำเร็จ
    const handleMasterCreated = (type, newItem) => {
        if (type === "prefix") setPrefixes((prev) => [...prev, newItem]);
        if (type === "position") setPositions((prev) => [...prev, newItem]);
        if (type === "sub_position") setSubPositions((prev) => [...prev, newItem]);
    };

    return (
        <div className="w-full p-4">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">จัดการข้อมูลอาจารย์</h1>
                    <p className="text-sm text-slate-500">ข้อมูลอาจารย์ผู้บรรยายและผู้รับผิดชอบหลักสูตรระยะสั้น</p>
                </div>
                <button
                    type="button"
                    onClick={handleCreate}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]"
                >
                    <Plus size={16} />
                    เพิ่มอาจารย์ใหม่
                </button>
            </div>

            {/* Toolbar */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Quick Search ค้นหาชื่อ, เลขบัตรประชาชน, อีเมล, เบอร์โทร..."
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 sm:w-80"
                    />
                </div>

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

            <TeacherTable rowData={filteredTeachers} loading={loading} onEdit={handleEdit} onDelete={handleDelete} />

            <TeacherFormModal
                isOpen={isFormOpen}
                initialData={editingTeacher}
                onClose={() => setIsFormOpen(false)}
                onSaved={handleSaved}
                prefixes={prefixes}
                positions={positions}
                subPositions={subPositions}
                onMasterCreated={handleMasterCreated}
                onMastersRefresh={fetchMasters}
            />
        </div>
    );
}