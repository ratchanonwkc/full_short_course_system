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
    getMajors, getSubjectTypes, getMinors,
} from "../services/academicStructureApi";
import { getTeachers } from "../../teachers/services/teacherApi";

const TABS = [
    { key: "curriculums", label: "หลักสูตร", icon: BookOpen },
    { key: "levels", label: "ระดับชั้น", icon: Layers },
    { key: "subjectTypes", label: "ประเภทวิชา", icon: GraduationCap },
    { key: "majors", label: "สาขาวิชา/แผนก", icon: Building2 },
    { key: "minors", label: "สาขางาน/กลุ่มวิชา", icon: Puzzle },
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
    const [curriculumsCount, setCurriculumsCount] = useState(0);
    const [levels, setLevels] = useState([]);
    const [subjectTypes, setSubjectTypes] = useState([]);
    const [majors, setMajors] = useState([]);
    const [minorsCount, setMinorsCount] = useState(0);
    const [teachers, setTeachers] = useState([]);
    const [loadingShared, setLoadingShared] = useState(true);

    const fetchShared = useCallback(async () => {
        setLoadingShared(true);
        try {
            const [curriculumsData, levelsData, subjectTypesData, majorsData, minorsData, teachersData] = await Promise.all([
                getCurriculums(),
                getAcademicLevels(),
                getSubjectTypes(),
                getMajors(),
                getMinors(),
                getTeachers({ status: "active" }),
            ]);
            setCurriculumsCount(Array.isArray(curriculumsData) ? curriculumsData.length : 0);
            setLevels(Array.isArray(levelsData) ? levelsData : []);
            setSubjectTypes(Array.isArray(subjectTypesData) ? subjectTypesData : []);
            setMajors(Array.isArray(majorsData) ? majorsData : []);
            setMinorsCount(Array.isArray(minorsData) ? minorsData.length : 0);
            setTeachers(Array.isArray(teachersData) ? teachersData : []);
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

    const getTabCount = (key) => {
        switch (key) {
            case "curriculums": return curriculumsCount;
            case "levels": return levels.length;
            case "subjectTypes": return subjectTypes.length;
            case "majors": return majors.length;
            case "minors": return minorsCount;
            default: return 0;
        }
    };

    return (
        <div className="w-full flex-1 flex flex-col min-h-0 p-4 sm:p-6">
            <div className="mb-5 flex flex-col gap-1 shrink-0">
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">โครงสร้างหลักสูตรและวิชาการ</h1>
                <p className="text-sm text-slate-500">
                    จัดการหลักสูตร ระดับชั้น ประเภทวิชา สาขาวิชา/แผนก และสาขางาน/กลุ่มวิชา
                </p>
            </div>

            <Tab.Group as="div" className="flex-1 flex flex-col min-h-0">
                <Tab.List className="flex flex-wrap gap-1 border-b border-slate-200 shrink-0">
                    {TABS.map(({ key, label, icon: Icon }) => {
                        const count = getTabCount(key);
                        return (
                            <Tab key={key} as={Fragment}>
                                {({ selected }) => (
                                    <button
                                        type="button"
                                        className={`relative inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold outline-none transition ${
                                            selected ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
                                        }`}
                                    >
                                        <Icon size={16} />
                                        <span>{label}</span>
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold transition ${
                                                selected
                                                    ? "bg-blue-100 text-blue-700 ring-1 ring-blue-500/20 font-bold"
                                                    : "bg-slate-100 text-slate-600"
                                            }`}
                                        >
                                            {loadingShared ? "-" : count}
                                        </span>
                                        {selected && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-blue-600" />}
                                    </button>
                                )}
                            </Tab>
                        );
                    })}
                </Tab.List>

                <Tab.Panels className="pt-4 flex-1 flex flex-col min-h-0">
                    <Tab.Panel className="flex-1 flex flex-col min-h-0">
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

                    <Tab.Panel className="flex-1 flex flex-col min-h-0">
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

                    <Tab.Panel className="flex-1 flex flex-col min-h-0">
                        <SubjectTypeTab />
                    </Tab.Panel>

                    <Tab.Panel className="flex-1 flex flex-col min-h-0">
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