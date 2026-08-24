import { Fragment, useCallback, useEffect, useState } from "react";
import { Tab } from "@headlessui/react";
import { BookOpen, GraduationCap, Layers, Building2, Puzzle } from "lucide-react";
import Swal from "sweetalert2";
import SimpleLookupSplitTab from "../components/SimpleLookupTab";
import SubjectTypeTab from "../components/SubjectTypeTab";
import MajorTab from "../components/MajorTab";
import MinorTab from "../components/MinorTab";
import {
    getCurriculums, createCurriculum, updateCurriculum, deleteCurriculum,
    getAcademicLevels, createAcademicLevel, updateAcademicLevel, deleteAcademicLevel,
    getMajors, getSubjectTypes,
} from "../services/academicStructureApi";
import { getTeachers } from "../../teachers/services/teacherApi";

const TABS = [
    { label: "หลักสูตร", icon: BookOpen },
    { label: "ระดับชั้น", icon: Layers },
    { label: "ประเภทวิชา", icon: GraduationCap },
    { label: "สาขาวิชา/แผนก", icon: Building2 },
    { label: "สาขางาน/กลุ่มวิชา", icon: Puzzle },
];

/**
 * AcademicStructurePage
 * -------------------------------------------------------------------------
 * หน้าจัดการ "โครงสร้างหลักสูตร/วิชาการ" แบบ Tabbed View 5 แถบ:
 *   1. หลักสูตร (curriculums)              -> Split View (SimpleLookupSplitTab)
 *   2. ระดับชั้น (academic_levels)          -> Split View (SimpleLookupSplitTab)
 *   3. ประเภทวิชา (subject_types)           -> Read only table
 *   4. สาขาวิชา/แผนก (academic_majors)      -> Split View (MajorTab)
 *   5. สาขางาน/กลุ่มวิชา (academic_minors)  -> Split View (MinorTab)
 *
 * แต่ละแท็บที่มีฟอร์มใช้ Layout Master-Detail (Grid ฝั่งซ้าย + Form Panel ฝั่งขวา)
 * ผ่าน SplitPanelLayout ร่วมกัน เพื่อความสอดคล้องของ UX ทั้งหน้า
 */
export default function AcademicStructurePage() {
    const [levels, setLevels] = useState([]);
    const [subjectTypes, setSubjectTypes] = useState([]);
    const [majors, setMajors] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loadingShared, setLoadingShared] = useState(true);

    const fetchShared = useCallback(async () => {
        setLoadingShared(true);
        try {
            const [levelsData, subjectTypesData, majorsData, teachersData] = await Promise.all([
                getAcademicLevels(),
                getSubjectTypes(),
                getMajors(),
                getTeachers({ status: "active" }),
            ]);
            setLevels(levelsData);
            setSubjectTypes(subjectTypesData);
            setMajors(majorsData);
            setTeachers(teachersData);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "โหลดข้อมูลตั้งต้นไม่สำเร็จ",
                text: err?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                confirmButtonColor: "#0270c7",
            });
        } finally {
            setLoadingShared(false);
        }
    }, []);

    useEffect(() => {
        fetchShared();
    }, [fetchShared]);

    return (
        <div className="w-full p-4">
            <div className="mb-6 flex flex-col gap-1">
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">โครงสร้างหลักสูตรและวิชาการ</h1>
                <p className="text-sm text-slate-500">
                    จัดการหลักสูตร ระดับชั้น ประเภทวิชา สาขาวิชา/แผนก และสาขางาน/กลุ่มวิชา
                </p>
            </div>

            <Tab.Group>
                <Tab.List className="flex flex-wrap gap-1 border-b border-slate-200">
                    {TABS.map(({ label, icon: Icon }) => (
                        <Tab key={label} as={Fragment}>
                            {({ selected }) => (
                                <button
                                    type="button"
                                    className={`relative inline-flex items-center gap-1.5 px-4 py-3 text-sm font-semibold outline-none transition ${selected ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
                                        }`}
                                >
                                    <Icon size={15} />
                                    {label}
                                    {selected && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-blue-600" />}
                                </button>
                            )}
                        </Tab>
                    ))}
                </Tab.List>

                <Tab.Panels className="pt-5">
                    <Tab.Panel>
                        <SimpleLookupSplitTab
                            title="หลักสูตร"
                            primaryKey="curriculum_name"
                            placeholder='เช่น "หลักสูตรวิชาชีพระยะสั้นฐานสมรรถนะอาชีพ"'
                            fetchFn={getCurriculums}
                            createFn={createCurriculum}
                            updateFn={updateCurriculum}
                            deleteFn={deleteCurriculum}
                        />
                    </Tab.Panel>

                    <Tab.Panel>
                        <SimpleLookupSplitTab
                            title="ระดับชั้น"
                            primaryKey="level_name"
                            placeholder="เช่น หลักสูตรวิชาชีพระยะสั้นฯ / ปวช. / ปวส."
                            fetchFn={getAcademicLevels}
                            createFn={async (payload) => {
                                const res = await createAcademicLevel(payload);
                                fetchShared();
                                return res;
                            }}
                            updateFn={async (id, payload) => {
                                const res = await updateAcademicLevel(id, payload);
                                fetchShared();
                                return res;
                            }}
                            deleteFn={async (id) => {
                                const res = await deleteAcademicLevel(id);
                                fetchShared();
                                return res;
                            }}
                        />
                    </Tab.Panel>

                    <Tab.Panel>
                        <SubjectTypeTab />
                    </Tab.Panel>

                    <Tab.Panel>
                        {loadingShared ? (
                            <p className="py-10 text-center text-sm text-slate-400">กำลังโหลดข้อมูล...</p>
                        ) : (
                            <MajorTab levels={levels} subjectTypes={subjectTypes} teachers={teachers} onSaved={fetchShared} />
                        )}
                    </Tab.Panel>

                    <Tab.Panel>
                        {loadingShared ? (
                            <p className="py-10 text-center text-sm text-slate-400">กำลังโหลดข้อมูล...</p>
                        ) : (
                            <MinorTab majors={majors} />
                        )}
                    </Tab.Panel>
                </Tab.Panels>
            </Tab.Group>
        </div>
    );
}