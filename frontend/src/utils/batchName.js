/**
 * batchName.js
 * ─────────────────────────────────────────────────────────────────────────
 * Educational batch naming convention and derivation logic.
 *
 * Database constraints:
 * - The `batches` table DOES NOT have an `iteration` (ครั้งที่) column.
 * - It relies on `batch_no` (1, 2, 3, or 4) to determine both iteration and term.
 * - `batch_sequence` (รุ่นที่, e.g., 139) is a separate integer column.
 *
 * Core Relationship Matrix:
 * - batch_no = 1 ➔ term = 1, iteration = 1, batch_sequence = Base
 * - batch_no = 2 ➔ term = 1, iteration = 2, batch_sequence = Base
 * - batch_no = 3 ➔ term = 2, iteration = 1, batch_sequence = Base + 1
 * - batch_no = 4 ➔ term = 2, iteration = 2, batch_sequence = Base + 1
 *
 * Standard Display Name Format:
 *   "รุ่นที่ {batch_sequence} ครั้งที่ {iteration} ปีการศึกษา {academic_year} ภาคเรียนที่ {term}"
 */

// Derive iteration (1 or 2) from batch_no
export const getIteration = (batch_no) => (Number(batch_no) % 2 === 0 ? 2 : 1);

// Derive term (1 or 2) from batch_no
export const getTerm = (batch_no) => (Number(batch_no) <= 2 ? 1 : 2);

// Reverse derivation: calculate batch_no (1-4) from term (1 or 2) and iteration (1 or 2)
export const getBatchNo = (term, iteration) => {
    const t = Number(term) || 1;
    const it = Number(iteration) || 1;
    return (t - 1) * 2 + it;
};

/**
 * Builds the standardized display name for a batch row.
 * Format: "รุ่นที่ {batch_sequence} ครั้งที่ {iteration} ปีการศึกษา {academic_year} ภาคเรียนที่ {term}"
 * @param {object} batch - { batch_sequence, batch_no, academic_year }
 */
export const buildBatchDisplayName = (batch) => {
    if (!batch) return '';
    const { batch_sequence, batch_no, academic_year } = batch;
    const sequence = batch_sequence ?? batch_no;
    if (!sequence || !batch_no || !academic_year) return '';
    const iteration = getIteration(batch_no);
    const term = getTerm(batch_no);
    return `รุ่นที่ ${sequence} ครั้งที่ ${iteration} ปีการศึกษา ${academic_year} ภาคเรียนที่ ${term}`;
};

/** Short variant for compact UI (combobox rows, badges) */
export const buildBatchShortName = (batch) => {
    if (!batch) return '';
    const { batch_sequence, batch_no } = batch;
    const sequence = batch_sequence ?? batch_no;
    if (!sequence || !batch_no) return '';
    const iteration = getIteration(batch_no);
    const term = getTerm(batch_no);
    return `รุ่น ${sequence}/${iteration} (เทอม ${term})`;
};

