import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Search, Plus, ListFilter, Layers } from "lucide-react";
import Swal from "sweetalert2";
import StudyGroupTable from "../components/StudyGroupTable";
import GroupFormPanel from "../components/GroupFormPanel";
import SplitPanelLayout from "../../curriculums/components/SplitPanelLayout";
import SearchableCombobox from "../../../components/common/SearchableCombobox";
import { getStudyGroups, deleteStudyGroup, getLocations, getTimeSlots } from "../services/studyGroupApi";
import { getBatches } from "../../batches/services/batchApi";
import { getMajors } from "../../curriculums/services/academicStructureApi";
import { getSubjects } from "../../subjects/services/subjectApi";
import { getTeachers } from "../../teachers/services/teacherApi";

/**
 * StudyGroupsPage
 * -------------------------------------------------------------------------
 * หน้าจัดการ "กลุ่มเรียน" (study_groups) ของรุ่นการเรียนหนึ่งๆ — route: /batches/:batchId/groups
 *
 * โครงสร้าง:
 * - Header/Breadcrumb ระบุชัดเจนว่ากำลังจัดการกลุ่มเรียนของรุ่นใด + ปุ่มย้อนกลับไปหน้า Batches
 * - Split View: ฝั่งซ้าย (60%) AG-Grid รายการกลุ่มเรียน + Filter, ฝั่งขวา (40%) Form Panel
 */
export default function StudyGroupsPage() {
    const { batchId } = useParams();
    const navigate = useNavigate();

    const [batch, setBatch] = useState(null);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterMajorId, setFilterMajorId] = useState("");
    const [editingGroup, setEditingGroup] = useState(null);
    const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);

    // Shared reference data
    const [majors, setMajors] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [timeSlots, setTimeSlots] = useState([]);
    const [refLoading, setRefLoading] = useState(true);

    // ── โหลดข้อมูลรุ่นการเรียน (สำหรับ Header/Breadcrumb) ─────────────────────
    const fetchBatch = useCallback(async () => {
        try {
            const allBatches = await getBatches();
            const found = allBatches.find((b) => String(b.id) === String(batchId));
            setBatch(found || null);
            if (!found) {
                Swal.fire({
                    icon: "warning",
                    title: "ไม่พบข้อมูลรุ่นการเรียน",
                    text: "รุ่นการเรียนนี้อาจถูกลบไปแล้ว",
                    confirmButtonColor: "#4f46e5",
                }).then(() => navigate("/batches"));
            }
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "โหลดข้อมูลรุ่นการเรียนไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        }
    }, [batchId, navigate]);

    // ── โหลดกลุ่มเรียนของรุ่นนี้ ─────────────────────────────────────────────
    const fetchGroups = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getStudyGroups({ batch_id: batchId, major_id: filterMajorId || undefined });
            setGroups(data);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "โหลดข้อมูลกลุ่มเรียนไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        } finally {
            setLoading(false);
        }
    }, [batchId, filterMajorId]);

    // ── โหลดข้อมูลอ้างอิงที่ใช้ในฟอร์ม (แผนก/วิชา/ครู/สถานที่/รอบเรียน) ────────
    const fetchLocations = useCallback(async () => {
        try {
            const data = await getLocations();
            setLocations(data);
        } catch {
            /* non-blocking */
        }
    }, []);

    const fetchReferenceData = useCallback(async () => {
        setRefLoading(true);
        try {
            const [majorsData, subjectsRes, teachersData, locationsData, timeSlotsData] = await Promise.all([
                getMajors(),
                getSubjects({ pageSize: 1000 }), // โหลดวิชาทั้งหมดมาให้เลือกในฟอร์ม (ไม่ paginate ในบริบทนี้)
                getTeachers({ status: "active" }),
                getLocations(),
                getTimeSlots(),
            ]);
            setMajors(majorsData);
            setSubjects(subjectsRes.data || subjectsRes);
            setTeachers(teachersData);
            setLocations(locationsData);
            setTimeSlots(timeSlotsData);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "โหลดข้อมูลตั้งต้นไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        } finally {
            setRefLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBatch();
        fetchReferenceData();
    }, [fetchBatch, fetchReferenceData]);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    const majorOptions = useMemo(() => majors.map((m) => ({ value: m.id, label: m.name_th })), [majors]);

    const filteredGroups = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return groups;
        return groups.filter(
            (g) =>
                (g.group_code || "").toLowerCase().includes(term) ||
                (g.group_name || "").toLowerCase().includes(term) ||
                (g.teacher_name || "").toLowerCase().includes(term)
        );
    }, [groups, searchTerm]);

    const handleCreate = () => {
        setEditingGroup(null);
        setIsMobileFormOpen(true);
    };
    const handleEdit = (group) => {
        setEditingGroup(group);
        setIsMobileFormOpen(true);
    };
    const handleCancelEdit = () => {
        setEditingGroup(null);
        setIsMobileFormOpen(false);
    };

    const handleDelete = async (group) => {
        try {
            await deleteStudyGroup(group.id);
            setGroups((prev) => prev.filter((g) => g.id !== group.id));
            if (editingGroup?.id === group.id) setEditingGroup(null);
        } catch (err) {
            const isConflict = err?.response?.status === 409;
            Swal.fire({
                icon: "error",
                title: isConflict ? "ไม่สามารถลบได้" : "เกิดข้อผิดพลาด",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        }
    };

    const handleSaved = () => {
        setEditingGroup(null);
        setIsMobileFormOpen(false);
        fetchGroups();
    };

    const grid = (
        <>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:max-w-[220px]">
                        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="ค้นหากลุ่มเรียน..."
                            className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                        />
                    </div>
                    <div className="w-full sm:max-w-[220px]">
                        <SearchableCombobox
                            value={filterMajorId}
                            onChange={setFilterMajorId}
                            options={majorOptions}
                            placeholder="กรองตามแผนกวิชา..."
                        />
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleCreate}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                    <Plus size={14} />
                    เพิ่มกลุ่มเรียนใหม่
                </button>
            </div>

            <div className="min-h-[420px] flex-1 overflow-hidden rounded-lg border border-slate-200 lg:min-h-0">
                <StudyGroupTable rowData={filteredGroups} loading={loading} onEdit={handleEdit} onDelete={handleDelete} />
            </div>
        </>
    );

    const form = (
        <GroupFormPanel
            batchId={batchId}
            initialData={editingGroup}
            onSaved={handleSaved}
            onCancelEdit={handleCancelEdit}
            majors={majors}
            subjects={subjects}
            teachers={teachers}
            locations={locations}
            timeSlots={timeSlots}
            onLocationsRefresh={fetchLocations}
        />
    );

    return (
        <div className="w-full p-4">
            {/* Breadcrumb / Header */}
            <div className="mb-6 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Link to="/batches" className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline">
                        <ChevronLeft size={15} />
                        รุ่นการเรียนทั้งหมด
                    </Link>
                    <span>/</span>
                    <span className="font-medium text-slate-700">จัดการกลุ่มเรียน</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                        <Layers size={18} />
                    </span>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                            {batch ? batch.batch_name : "กำลังโหลด..."}
                        </h1>
                        <p className="text-sm text-slate-500">
                            {batch
                                ? `ปีการศึกษา ${batch.academic_year} · ภาคเรียนที่ ${batch.term} · จัดการกลุ่มเรียน/ชุดวิชาในรุ่นนี้`
                                : "กำลังโหลดข้อมูลรุ่นการเรียน..."}
                        </p>
                    </div>
                </div>
            </div>

            {refLoading ? (
                <p className="py-10 text-center text-sm text-slate-400">กำลังโหลดข้อมูลตั้งต้น...</p>
            ) : (
                <SplitPanelLayout
                    grid={grid}
                    form={form}
                    isFormOpen={isMobileFormOpen}
                    onCloseForm={() => setIsMobileFormOpen(false)}
                />
            )}
        </div>
    );
}