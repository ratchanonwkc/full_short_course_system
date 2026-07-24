import dayjs from "dayjs";
import buddhistEra from "dayjs/plugin/buddhistEra";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/th";

// ตั้งค่า dayjs ให้รองรับปี พ.ศ. (BBBB) และภาษาไทย (ชื่อเดือน/วัน)
dayjs.extend(buddhistEra);
dayjs.extend(customParseFormat);
dayjs.locale("th");

/**
 * dateUtils.js
 * ─────────────────────────────────────────────────────────────────────────
 * รวม utility สำหรับแปลงวันที่ระหว่าง:
 * - รูปแบบที่ backend / Supabase ใช้จริง  -> ISO ค.ศ. "YYYY-MM-DD"
 * - รูปแบบที่แสดงผลให้เจ้าหน้าที่เห็น      -> ไทย พ.ศ. เช่น "23 ก.ค. 2569"
 *
 * หลักการ: state ของฟอร์ม/ตารางทั้งหมดยังคงเก็บเป็น ISO ค.ศ. เสมอ
 * (เพื่อยิงเข้า API/DB ได้ตรง ๆ) ส่วนการแสดงผลเท่านั้นที่แปลงเป็นไทย/พ.ศ.
 */

// ISO ("2026-07-23") -> "23 ก.ค. 2569"
export function formatThaiDate(dateStr) {
    if (!dateStr) return "-";
    const d = dayjs(dateStr);
    return d.isValid() ? d.format("D MMM BBBB") : "-";
}

// ISO ("2026-07-23") -> "23 กรกฎาคม 2569"
export function formatThaiFullDate(dateStr) {
    if (!dateStr) return "-";
    const d = dayjs(dateStr);
    return d.isValid() ? d.format("D MMMM BBBB") : "-";
}

// ISO -> "23/07/2569" (ไว้แสดงในช่อง input แบบพิมพ์เอง/DD-MM-BBBB)
export function isoToThaiInput(dateStr) {
    if (!dateStr) return "";
    const d = dayjs(dateStr);
    return d.isValid() ? d.format("DD/MM/BBBB") : "";
}

// "15/05/2569" (DD/MM/BBBB พ.ศ.) -> "2026-05-15" (ISO ค.ศ. สำหรับยิงเข้า API/DB)
// คืนค่า "" ถ้ารูปแบบไม่ถูกต้อง หรือเป็นวันที่ที่ไม่มีจริง
export function toIsoDate(buddhistDateStr) {
    if (!buddhistDateStr || typeof buddhistDateStr !== "string") return "";
    const trimmed = buddhistDateStr.trim();

    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
    if (!match) return "";

    const [, dd, mm, bbbb] = match;
    const day = Number(dd);
    const month = Number(mm);
    const buddhistYear = Number(bbbb);
    if (!day || !month || !buddhistYear) return "";
    if (month < 1 || month > 12) return "";

    // ปี พ.ศ. -> ค.ศ. (พ.ศ. = ค.ศ. + 543)
    const gregorianYear = buddhistYear - 543;
    const isoCandidate = `${String(gregorianYear).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(
        day
    ).padStart(2, "0")}`;

    // parse แบบ strict (true ตัวสุดท้าย) เพื่อกันวันที่ที่ไม่มีจริง เช่น 31/02/2569
    const d = dayjs(isoCandidate, "YYYY-MM-DD", true);
    return d.isValid() ? d.format("YYYY-MM-DD") : "";
}

// พร้อมใช้กับ AG Grid: columnDefs.push({ field, valueFormatter: thaiDateValueFormatter })
export function thaiDateValueFormatter(params) {
    return formatThaiDate(params.value);
}

export default dayjs;