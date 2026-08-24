import dayjs from "dayjs";

/**
 * ageUtils.js
 * ─────────────────────────────────────────────────────────────────────────
 * Live age calculation + BE/CE (พ.ศ./ค.ศ.) sanity check for birth_date fields.
 * birth_date is always stored as ISO "YYYY-MM-DD" (ค.ศ.) per project convention.
 */

/** Returns exact age in full years, or null if date is invalid/empty */
export function calculateAge(isoDateStr) {
    if (!isoDateStr) return null;
    const birth = dayjs(isoDateStr);
    if (!birth.isValid()) return null;
    const now = dayjs();
    if (birth.isAfter(now)) return null;
    return now.diff(birth, "year");
}

/**
 * Detects likely พ.ศ./ค.ศ. entry confusion via implausible age.
 * Returns a warning message string, or null if age looks sane.
 */
export function checkAgeSanity(isoDateStr) {
    const age = calculateAge(isoDateStr);
    if (age === null) return null;
    if (age < 5 || age > 100) {
        return "กรุณาตรวจสอบปีเกิด (เช่น พ.ศ. 2548)";
    }
    return null;
}
