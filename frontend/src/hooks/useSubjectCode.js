import { useEffect, useRef, useState } from "react";
import { getNextSequence } from "../features/subjects/services/subjectApi";

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
 *   - ถ้า locked=true (ค่าเริ่มต้นตอนสร้างใหม่) -> โค้ดจะถูกคำนวณอัตโนมัติทุกครั้งที่
 *     dependency เปลี่ยน
 *   - ถ้า locked=false -> หยุดคำนวณอัตโนมัติ ผู้ใช้แก้เองได้อิสระผ่าน setManualCode
 *
 *   ⚠️ สำคัญ: ตอนแก้ไขวิชาเดิม (edit mode) ต้อง initialLocked=false เสมอ! เพราะถ้าเริ่มต้น
 *   เป็น locked=true hook จะยิง getNextSequence ทันทีแล้วคำนวณ "sequence ถัดไป" ทับรหัสวิชา
 *   เดิมที่ถูกต้องอยู่แล้ว (โดยไม่รู้ว่ากำลังแก้ไขวิชาตัวไหน ไม่ได้ exclude ตัวเองออกจากการนับ)
 *   ผลคือ subject_code ที่ส่งไป backend ตอน Save กลายเป็นรหัสที่ไปชนกับวิชาอื่นที่มีอยู่แล้ว
 *   ทำให้ backend ตอบ 400 "รหัสวิชานี้มีอยู่แล้วในระบบ" ทั้งที่ผู้ใช้ไม่ได้ตั้งใจเปลี่ยนรหัสวิชาเลย
 *
 * Params:
 *   - levelId, subjectTypeId, department, subDepartment, durationGroup: string|number
 *   - minorId: id ของสาขางานที่เลือก (ใช้เป็น key คำนวณลำดับ)
 *   - initialLocked: boolean (default true) -> ค่าเริ่มต้นของ locked state
 *     ส่ง false เมื่อเป็นโหมดแก้ไขวิชาเดิม เพื่อไม่ให้ auto-calculate ทับรหัสเดิม
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
    initialLocked = true,
}) {
    const [code, setCode] = useState("");
    const [locked, setLocked] = useState(initialLocked);
    const [isCalculating, setIsCalculating] = useState(false);
    const [sequenceWarning, setSequenceWarning] = useState(null);
    const requestIdRef = useRef(0);

    // ถ้า initialLocked เปลี่ยน (เช่น ฟอร์มถูกเปิดใหม่สลับระหว่าง create <-> edit)
    // ให้ sync ค่า locked ตามไปด้วย เพื่อไม่ให้ state ค้างจากการเปิดฟอร์มครั้งก่อน
    useEffect(() => {
        setLocked(initialLocked);
    }, [initialLocked]);

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