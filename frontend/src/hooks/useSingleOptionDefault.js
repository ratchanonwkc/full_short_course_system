import { useEffect, useRef } from "react";

/**
 * useSingleOptionDefault
 * -------------------------------------------------------------------------
 * หากรายการตัวเลือก (options) มีอยู่ "เพียงรายการเดียว" ในระบบ ให้ตั้งค่านั้นเป็น
 * ค่าเริ่มต้นให้ฟอร์มโดยอัตโนมัติ (เฉพาะตอนที่ field ยังว่างอยู่ - ไม่ไปทับค่าที่ผู้ใช้
 * เลือกเอง หรือค่าที่กำลังแก้ไขอยู่)
 *
 * ใช้กับ dropdown ที่ปกติมีข้อมูลอ้างอิงตายตัวไม่กี่รายการ เช่น ระดับชั้น, หลักสูตร
 *
 * Params:
 * - options: Array<{ value, label }>
 * - currentValue: ค่าปัจจุบันของฟอร์ม (string|number|"")
 * - onDefault: (value) => void   -> เรียกเมื่อจะตั้งค่า default ให้
 * - enabled: boolean             -> เปิด/ปิดการทำงาน (เช่น ปิดตอนกำลังแก้ไขรายการเดิม)
 */
export default function useSingleOptionDefault(options, currentValue, onDefault, enabled = true) {
    const appliedRef = useRef(false);

    useEffect(() => {
        if (!enabled) return;
        if (currentValue) return; // มีค่าอยู่แล้ว (ผู้ใช้เลือกเอง หรือกำลังแก้ไขรายการ) -> ไม่ยุ่ง
        if (appliedRef.current) return; // กันไม่ให้ตั้งค่าซ้ำวนไปมาในเรนเดอร์เดียวกัน
        if (options.length === 1) {
            appliedRef.current = true;
            onDefault(options[0].value);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options, currentValue, enabled]);

    // รีเซ็ต flag เมื่อฟอร์มถูกล้างค่ากลับเป็นว่าง (เช่น หลังบันทึกสำเร็จ) เพื่อให้ default ทำงานใหม่ได้
    useEffect(() => {
        if (!currentValue) appliedRef.current = false;
    }, [currentValue]);
}