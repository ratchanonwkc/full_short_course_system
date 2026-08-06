import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import Swal from "sweetalert2";
import SearchableCombobox from "../../../components/common/SearchableCombobox";
import SubjectTable from "../components/SubjectTable";
import SubjectFormDrawer from "../components/SubjectFormDrawer";
import { getSubjects, deleteSubject } from "../services/subjectApi";
import { getAcademicLevels, getSubjectTypes, getCurriculums, getMajors, getMinors } from "../../curriculums/services/academicStructureApi";
import useDebouncedValue from "../../../hooks/useDebouncedValue";

const PAGE_SIZE = 20;

/**
 * SubjectsPage
 * -------------------------------------------------------------------------
 * หน้าจัดการรายวิชาแบบ Master-Detail: Table (AG Grid) + Slide-over Drawer form
 * รองรับ Filter ตาม level_id / subject_type_id / major_id / minor_id, Quick Search,
 * และ Pagination (ยิงตรงไปที่ backend ตาม query params)
 *
 * Performance notes (ข้อมูลรายวิชามีหลักพัน record):
 * - Pagination ทำที่ backend เสมอ (Supabase .range()) -> โหลดแค่หน้าละ PAGE_SIZE รายการ
 *   ไม่เคยดึงข้อมูลทั้งหมดมาไว้ที่ client
 * - ช่องค้นหา (Quick Search) debounce ไว้ 400ms ก่อนยิง API จริง เพื่อไม่ให้ยิง request
 *   รัว ๆ ทุกครั้งที่พิมพ์ (เช่นพิมพ์คำค้นหา 10 ตัวอักษร = ยิงแค่ 1 ครั้งตอนหยุดพิมพ์
 *   แทนที่จะยิง 10 ครั้ง)
 * - ป้องกัน stale response race condition: ถ้าเปลี่ยน filter/พิมพ์ค้นหาเร็ว ๆ จนมีหลาย
 *   request ค้างอยู่พร้อมกัน request ที่ตอบกลับมาไม่ตรงกับ "คำขอล่าสุด" จะถูกทิ้งไป
 *   ไม่ให้เอามาทับผลลัพธ์ที่ถูกต้องกว่า (เกิดได้ง่ายเวลาเน็ตช้า/สลับ filter เร็ว ๆ)
 */
export default function SubjectsPage() {
    const [subjects, setSubjects] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    // rawSearchTerm = ค่าที่ผูกกับ input ตรง ๆ (อัปเดตทุก keystroke เพื่อ UI responsive)
    // searchTerm    = ค่าที่ debounce แล้ว ใช้ยิง API จริงเท่านั้น
    const [rawSearchTerm, setRawSearchTerm] = useState("");
    const searchTerm = useDebouncedValue(rawSearchTerm, 400);

    const [filterLevelId, setFilterLevelId] = useState("");
    const [filterSubjectTypeId, setFilterSubjectTypeId] = useState("");
    const [filterMajorId, setFilterMajorId] = useState("");
    const [filterMinorId, setFilterMinorId] = useState("");

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);

    // ข้อมูลโครงสร้างวิชาทั้งหมด (สำหรับ Filter toolbar และส่งลงไปให้ Drawer ใช้ cascading)
    const [levels, setLevels] = useState([]);
    const [subjectTypes, setSubjectTypes] = useState([]);
    const [curriculums, setCurriculums] = useState([]);
    const [majors, setMajors] = useState([]);
    const [minors, setMinors] = useState([]);
    const [structureLoading, setStructureLoading] = useState(true);

    const fetchStructure = useCallback(async () => {
        setStructureLoading(true);
        try {
            const [levelsData, typesData, curriculumsData, majorsData, minorsData] = await Promise.all([
                getAcademicLevels(),
                getSubjectTypes(),
                getCurriculums(),
                getMajors(),
                getMinors(),
            ]);
            setLevels(levelsData);
            setSubjectTypes(typesData);
            setCurriculums(curriculumsData);
            setMajors(majorsData);
            setMinors(minorsData);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "โหลดข้อมูลโครงสร้างวิชาไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        } finally {
            setStructureLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStructure();
    }, [fetchStructure]);

    // ── ป้องกัน stale response: เก็บเลข request ล่าสุดไว้เทียบตอน response กลับมา ──
    const requestIdRef = useRef(0);

    const fetchSubjects = useCallback(async () => {
        const currentRequestId = ++requestIdRef.current;
        setLoading(true);
        try {
            const params = {
                page,
                pageSize: PAGE_SIZE,
                ...(filterLevelId && { level_id: filterLevelId }),
                ...(filterSubjectTypeId && { subject_type_id: filterSubjectTypeId }),
                ...(filterMajorId && { major_id: filterMajorId }),
                ...(filterMinorId && { minor_id: filterMinorId }),
                ...(searchTerm.trim() && { search: searchTerm.trim() }),
            };
            const { data, pagination: pg } = await getSubjects(params);

            // ถ้ามี request ใหม่กว่ายิงออกไประหว่างที่ request นี้ยังไม่ตอบกลับ -> ทิ้งผลลัพธ์นี้
            // (กันเคสพิมพ์ค้นหา/สลับ filter เร็ว ๆ แล้ว response เก่ามาถึงทีหลัง response ใหม่)
            if (currentRequestId !== requestIdRef.current) return;

            setSubjects(data);
            setPagination(pg);
        } catch (err) {
            if (currentRequestId !== requestIdRef.current) return;
            Swal.fire({
                icon: "error",
                title: "โหลดข้อมูลรายวิชาไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        } finally {
            if (currentRequestId === requestIdRef.current) setLoading(false);
        }
    }, [page, filterLevelId, filterSubjectTypeId, filterMajorId, filterMinorId, searchTerm]);

    useEffect(() => {
        fetchSubjects();
    }, [fetchSubjects]);

    // เปลี่ยน filter ใด ๆ -> รีเซ็ตกลับหน้า 1 เสมอ
    const resetToFirstPage = () => setPage(1);

    // ค้นหาด้วยคำใหม่ (หลัง debounce) -> กลับไปหน้า 1 เสมอเช่นกัน ไม่งั้นอาจค้างอยู่หน้าที่
    // ไม่มีผลลัพธ์แล้ว (เช่นค้นหาแล้วเจอแค่ 1 หน้า แต่ page state ยังเป็นหน้า 5 จากก่อนหน้า)
    useEffect(() => {
        setPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    const majorFilterOptions = useMemo(
        () =>
            majors
                .filter(
                    (m) =>
                        (!filterLevelId || String(m.level_id) === String(filterLevelId)) &&
                        (!filterSubjectTypeId || String(m.subject_type_id) === String(filterSubjectTypeId))
                )
                .map((m) => ({ value: m.id, label: m.name_th })),
        [majors, filterLevelId, filterSubjectTypeId]
    );
    const minorFilterOptions = useMemo(
        () =>
            minors
                .filter((m) => !filterMajorId || String(m.major_id) === String(filterMajorId))
                .map((m) => ({ value: m.id, label: m.name_th })),
        [minors, filterMajorId]
    );

    const handleCreate = () => {
        setEditingSubject(null);
        setIsFormOpen(true);
    };

    const handleEdit = (subject) => {
        setEditingSubject(subject);
        setIsFormOpen(true);
    };

    const handleDelete = async (subject) => {
        try {
            await deleteSubject(subject.id);
            Swal.fire({
                toast: true, position: "top-end", icon: "success",
                title: "ลบรายวิชาเรียบร้อยแล้ว", showConfirmButton: false, timer: 2000, timerProgressBar: true,
            });
            fetchSubjects();
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "ลบข้อมูลไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#4f46e5",
            });
        }
    };

    const handleSaved = () => {
        setIsFormOpen(false);
        fetchSubjects();
    };

    return (
        <div className="w-full p-4">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">จัดการรายวิชา</h1>
                    <p className="text-sm text-slate-500">ค้นหา กรอง เพิ่ม และแก้ไขรายวิชาในระบบ</p>
                </div>
                <button
                    type="button"
                    onClick={handleCreate}
                    disabled={structureLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60"
                >
                    <Plus size={16} />
                    เพิ่มรายวิชาใหม่
                </button>
            </div>

            {/* Toolbar */}
            <div className="mb-4 flex flex-col gap-3">
                <div className="relative max-w-md">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={rawSearchTerm}
                        onChange={(e) => setRawSearchTerm(e.target.value)}
                        placeholder="ค้นหารหัสวิชา หรือ ชื่อวิชา..."
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
                    />
                    {/* บอกสถานะตอนกำลังรอ debounce/โหลดผลลัพธ์ ไม่ให้ผู้ใช้งง */}
                    {rawSearchTerm !== searchTerm ? (
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                            กำลังพิมพ์...
                        </span>
                    ) : loading && searchTerm.trim() ? (
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                            กำลังค้นหา...
                        </span>
                    ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <FilterField label="ระดับชั้น">
                        <SearchableCombobox
                            value={filterLevelId}
                            onChange={(v) => {
                                setFilterLevelId(v);
                                setFilterMajorId("");
                                setFilterMinorId("");
                                resetToFirstPage();
                            }}
                            options={levels.map((l) => ({ value: l.id, label: l.level_name }))}
                            placeholder="ทุกระดับชั้น"
                        />
                    </FilterField>
                    <FilterField label="ประเภทวิชา">
                        <SearchableCombobox
                            value={filterSubjectTypeId}
                            onChange={(v) => {
                                setFilterSubjectTypeId(v);
                                setFilterMajorId("");
                                setFilterMinorId("");
                                resetToFirstPage();
                            }}
                            options={subjectTypes.map((t) => ({ value: t.id, label: t.name_th }))}
                            placeholder="ทุกประเภทวิชา"
                        />
                    </FilterField>
                    <FilterField label="สาขาวิชา">
                        <SearchableCombobox
                            value={filterMajorId}
                            onChange={(v) => {
                                setFilterMajorId(v);
                                setFilterMinorId("");
                                resetToFirstPage();
                            }}
                            options={majorFilterOptions}
                            placeholder="ทุกสาขาวิชา"
                        />
                    </FilterField>
                    <FilterField label="สาขางาน">
                        <SearchableCombobox
                            value={filterMinorId}
                            onChange={(v) => {
                                setFilterMinorId(v);
                                resetToFirstPage();
                            }}
                            options={minorFilterOptions}
                            placeholder="ทุกสาขางาน"
                        />
                    </FilterField>
                </div>
            </div>

            <SubjectTable rowData={subjects} loading={loading || structureLoading} onEdit={handleEdit} onDelete={handleDelete} />

            {/* Pagination */}
            <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                <span>
                    พบทั้งหมด {pagination.total.toLocaleString()} รายวิชา — หน้า {pagination.page} / {pagination.totalPages}
                </span>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={pagination.page <= 1}
                        className="rounded-lg border border-slate-300 p-1.5 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                        disabled={pagination.page >= pagination.totalPages}
                        className="rounded-lg border border-slate-300 p-1.5 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            <SubjectFormDrawer
                isOpen={isFormOpen}
                initialData={editingSubject}
                onClose={() => setIsFormOpen(false)}
                onSaved={handleSaved}
                levels={levels}
                curriculums={curriculums}
                subjectTypes={subjectTypes}
                majors={majors}
                minors={minors}
            />
        </div>
    );
}

function FilterField({ label, children }) {
    return (
        <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
            {children}
        </div>
    );
}