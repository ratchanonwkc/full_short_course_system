/**
 * batchName.js
 * ─────────────────────────────────────────────────────────────────────────
 * Legacy-aligned batch naming convention.
 *
 * 1 Academic Semester (ปีการศึกษา + ภาคเรียน) contains 2 "Iterations" (ครั้งที่)
 * sharing the same batch_no:
 *   batch_no 1-2 -> term 1, batch_no 3-4 -> term 2 (existing pairing from
 *   BatchFormModal's bulk-year rows: 1,2 = term 1 / 3,4 = term 2)
 *
 * Iteration (ครั้งที่) is derived from batch_no's position within its term pair:
 *   batch_no 1 -> ครั้งที่ 1 (term 1)   batch_no 2 -> ครั้งที่ 2 (term 1)
 *   batch_no 3 -> ครั้งที่ 1 (term 2)   batch_no 4 -> ครั้งที่ 2 (term 2)
 *
 * The displayed "รุ่นที่" number is a running batch sequence, separate from
 * batch_no/term/iteration — falls back to batch_no if no explicit sequence
 * field is present on the row (batches.batch_sequence, optional column).
 *
 * Format:
 *   "รุ่นที่ {sequence} ครั้งที่ {iteration} ปีการศึกษา {academic_year} ภาคเรียนที่ {term}"
 */

// Maps batch_no (1-4) -> iteration within its term (1 or 2)
export function getIteration(batchNo) {
    const n = Number(batchNo);
    if (!n) return 1;
    // 1,3 -> ครั้งที่ 1 | 2,4 -> ครั้งที่ 2
    return n % 2 === 0 ? 2 : 1;
}

/**
 * Builds the standardized legacy display name for a batch row.
 * @param {object} batch - { batch_no, term, academic_year, batch_sequence? }
 */
export function buildBatchDisplayName(batch) {
    if (!batch) return "";
    const { batch_no, term, academic_year, batch_sequence } = batch;
    const sequence = batch_sequence ?? batch_no ?? "?";
    const iteration = getIteration(batch_no);
    return `รุ่นที่ ${sequence} ครั้งที่ ${iteration} ปีการศึกษา ${academic_year ?? "?"} ภาคเรียนที่ ${term ?? "?"}`;
}

/** Short variant for compact UI (combobox rows, badges) */
export function buildBatchShortName(batch) {
    if (!batch) return "";
    const { batch_no, term, batch_sequence } = batch;
    const sequence = batch_sequence ?? batch_no ?? "?";
    const iteration = getIteration(batch_no);
    return `รุ่น ${sequence}/${iteration} (เทอม ${term ?? "?"})`;
}
