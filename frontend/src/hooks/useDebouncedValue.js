import { useEffect, useState } from "react";

/**
 * useDebouncedValue
 * -----------------------------------------------------------------------
 * ส่งค่ากลับให้ "ช้ากว่า" ค่าจริงไป `delay` ms — ใช้กันการ filter/re-render
 * ทั้งฟอร์มทุกครั้งที่ผู้ใช้กดคีย์บอร์ด (เช่นตอนพิมพ์ค้นหาใน Combobox)
 *
 * @param {*} value ค่าที่เปลี่ยนบ่อย เช่น query string จาก input
 * @param {number} delay ms ที่จะรอก่อนอัปเดตค่า debounced (default 150ms)
 */
export default function useDebouncedValue(value, delay = 150) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}