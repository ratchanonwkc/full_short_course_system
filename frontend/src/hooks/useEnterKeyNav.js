import { useRef, useCallback } from "react";

/**
 * useEnterKeyNav
 * -------------------------------------------------------------------------
 * Custom hook สำหรับดักจับปุ่ม Enter บนฟอร์ม แล้วย้าย Focus ไปยัง Input/Field
 * ถัดไปโดยอัตโนมัติ (แทนพฤติกรรม default ของ <form> ที่มักจะ submit ทันที)
 *
 * วิธีใช้:
 *   const { formRef, handleKeyDown } = useEnterKeyNav();
 *   <form ref={formRef} onKeyDown={handleKeyDown}>...</form>
 *
 * กติกา:
 * - ดักเฉพาะปุ่ม Enter ที่ไม่ได้กด Shift ร่วม (Shift+Enter ปล่อยผ่านตามปกติ เผื่อ textarea)
 * - ไม่ทำงานถ้า target เป็น <textarea> (ให้ Enter ขึ้นบรรทัดใหม่ได้ตามปกติ)
 * - ไม่ทำงานถ้า target เป็นส่วนหนึ่งของ Headless UI Combobox/Listbox ที่กำลังเปิดอยู่
 *   (ตรวจจาก aria-expanded="true" หรือ role="combobox" ที่มี option ให้เลือกอยู่)
 *   เพื่อให้ Enter ยังใช้ "เลือกตัวเลือก" ในเมนู dropdown ได้ตามปกติ ไม่ใช่ข้ามไปช่องถัดไปทันที
 * - รวบรวม element ที่ focus ได้ทั้งหมดภายใน form (input, select, textarea ที่ไม่ readOnly/disabled,
 *   button[type=submit], [tabindex] ที่ไม่ใช่ -1) เรียงตามลำดับ DOM (เท่ากับลำดับ Tab ปกติ)
 * - ถ้าเป็นตัวสุดท้ายในลำดับ -> โฟกัสปุ่ม submit (ถ้ามี) แทน
 */
export default function useEnterKeyNav() {
    const formRef = useRef(null);

    const getFocusableElements = useCallback(() => {
        if (!formRef.current) return [];
        const selector = [
            'input:not([type="hidden"]):not([disabled]):not([readonly])',
            "select:not([disabled])",
            "textarea:not([disabled]):not([readonly])",
            '[tabindex]:not([tabindex="-1"]):not([disabled])',
        ].join(",");

        return Array.from(formRef.current.querySelectorAll(selector)).filter((el) => {
            // ข้าม element ที่ซ่อนอยู่ (display:none / visibility:hidden / ไม่มีขนาด)
            const style = window.getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden") return false;
            if (el.offsetParent === null && style.position !== "fixed") return false;
            return true;
        });
    }, []);

    const handleKeyDown = useCallback(
        (e) => {
            if (e.key !== "Enter" || e.shiftKey) return;

            const target = e.target;

            // อนุญาตให้ Enter ทำงานปกติใน textarea (ขึ้นบรรทัดใหม่)
            if (target.tagName === "TEXTAREA") return;

            // ถ้ากำลังเปิด dropdown ของ Headless UI Combobox/Listbox อยู่ (aria-expanded="true")
            // ปล่อยให้ Enter ทำหน้าที่ "เลือกตัวเลือก" ตามปกติของ component นั้น ไม่สกัดกั้น
            const expandedControl = target.closest('[aria-expanded="true"]');
            if (expandedControl) return;
            if (target.getAttribute && target.getAttribute("aria-expanded") === "true") return;

            // ปุ่มที่เป็น type="submit" อยู่แล้ว -> ปล่อยให้ submit ตามปกติ ไม่ต้อง intercept
            if (target.tagName === "BUTTON" && target.type === "submit") return;

            e.preventDefault();

            const focusable = getFocusableElements();
            const currentIndex = focusable.indexOf(target);
            if (currentIndex === -1) return;

            const next = focusable[currentIndex + 1];
            if (next) {
                next.focus();
                // ถ้าเป็น text input ให้ select ข้อความเดิมไว้ (สะดวกเวลาพิมพ์ทับ)
                if (next.tagName === "INPUT" && typeof next.select === "function" && next.type === "text") {
                    next.select();
                }
            } else {
                // ถึงตัวสุดท้ายแล้ว -> โฟกัสปุ่มบันทึก (submit) ถ้ามี
                const submitBtn = formRef.current?.querySelector('button[type="submit"]');
                submitBtn?.focus();
            }
        },
        [getFocusableElements]
    );

    return { formRef, handleKeyDown };
}