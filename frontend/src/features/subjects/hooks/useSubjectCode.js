import { useEffect, useRef, useState } from "react";
import { getNextSequence } from "../services/subjectApi";

/**
 * useSubjectCode
 * -------------------------------------------------------------------------
 * คำนวณ subject_code แบบ Real-time ตามรูปแบบ:
 *
 *   [Level(1)][SubjectType(1)][Dept(2)]- [SubDept(1)][DurationGroup(1)][Sequence(2)]
 *   ตัวอย่าง: level=1, subjectType=1, dept="01", subDept="1", duration=3, seq="01"
 *            -> "1101-1301"
 *
 * ที่มาของแต่ละส่วน:
 *   - Level        มาจาก academic_levels.id ของวิชา (ต้องเป็นเลขโดด 1 หลักตามระเบียบ)
 *   - SubjectType  มาจาก subject_types.id
 *   - Dept         มาจาก academic_majors.department_id (2 หลัก) ของ major ที่เลือก
 *   - SubDept      มาจาก academic_minors.sub_department_id (1 หลัก) ของ minor ที่เลือก
 *   - Sequence     ดึงจาก backend GET /subjects/next-sequence (นับจากรายวิชาที่มีอยู่แล้ว
 *                  ในกลุ่ม minor_id + duration_group เดียวกัน)
 *
 * Behaviour:
 *   - ถ้า locked=true (ค่าเริ่มต้น) -> โค้ดจะถูกคำนวณอัตโนมัติทุกครั้งที่ dependency เปลี่ยน
 *   - ถ้า locked=false -> หยุดคำนวณอัตโนมัติ ผู้ใช้แก้เองได้อิสระผ่าน setManualCode
 *
 * Params:
 *   - levelId, subjectTypeId, department, subDepartment, durationGroup: string|number
 *   - skipSequenceFor: id ของวิชาที่กำลังแก้ไขอยู่ (เผื่ออนาคตอยาก exclude ตัวเองจากการนับลำดับ)
 *
 * Returns:
 *   - code: string                 -> รหัสวิชาปัจจุบัน (auto หรือ manual)
 *   - setManualCode: (val) => void -> ใช้แก้ไขตอน unlock
 *   - locked: boolean
 *   - setLocked: (val) => void
 *   - isCalculating: boolean
 *   - sequenceWarning: string|null -> เช่น กรณีลำดับเต็ม 00-99
 */
export default function useSubjectCode({
    levelId,
    subjectTypeId,
    department,
    subDepartment,
    durationGroup,
    minorId,
}) {
    const [code, setCode] = useState("");
    const [locked, setLocked] = useState(true);
    const [isCalculating, setIsCalculating] = useState(false);
    const [sequenceWarning, setSequenceWarning] = useState(null);
    const requestIdRef = useRef(0);

    const canCompute = levelId && subjectTypeId && department && subDepartment && durationGroup && minorId;

    useEffect(() => {
        if (!locked) return; // ปลดล็อกแล้ว ให้ผู้ใช้คุมเองทั้งหมด ไม่คำนวณทับ
        if (!canCompute) {
            setCode("");
            setSequenceWarning(null);
            return;
        }

        const prefix = `${levelId}${subjectTypeId}${String(department).padStart(2, "0")}`;

        let cancelled = false;
        const currentRequestId = ++requestIdRef.current;
        setIsCalculating(true);
        setSequenceWarning(null);

        getNextSequence(minorId, durationGroup)
            .then(({ sequence, message }) => {
                if (cancelled || currentRequestId !== requestIdRef.current) return;
                if (!sequence) {
                    setSequenceWarning(message || "ไม่สามารถคำนวณลำดับที่รายวิชาถัดไปได้");
                    setCode(`${prefix}-${durationGroup}??`);
                    return;
                }
                setCode(`${prefix}-${subDepartment}${durationGroup}${sequence}`);
            })
            .catch(() => {
                if (cancelled || currentRequestId !== requestIdRef.current) return;
                setSequenceWarning("ไม่สามารถคำนวณลำดับที่รายวิชาถัดไปได้ กรุณาลองใหม่");
            })
            .finally(() => {
                if (cancelled || currentRequestId !== requestIdRef.current) return;
                setIsCalculating(false);
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locked, levelId, subjectTypeId, department, subDepartment, durationGroup, minorId]);

    const setManualCode = (val) => setCode(val);

    return { code, setManualCode, locked, setLocked, isCalculating, sequenceWarning, canCompute };
}
