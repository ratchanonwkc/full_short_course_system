/**
 * activeBatch.js
 * ─────────────────────────────────────────────────────────────────────────
 * Utility to find the "Active Batch" (รุ่นปัจจุบัน) — the batch whose
 * [batch_start_date, batch_end_date] range contains today's date.
 *
 * Used by RegistrarEnrollmentsPage and FinanceVerificationPage to
 * auto-select the relevant batch on page load, while still letting the
 * officer switch to any other batch manually via the searchable combobox.
 */

/**
 * Finds the batch that is "active" today based on batch_start_date / batch_end_date.
 * Falls back to the most recent batch by academic_year/term/batch_no if none match
 * (keeps the UI from showing an empty state on first load).
 *
 * @param {Array<Batch>} batches
 * @returns {Batch | null}
 */
export function findActiveBatch(batches = []) {
    if (!batches.length) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const active = batches.find((b) => {
        if (!b.batch_start_date || !b.batch_end_date) return false;
        const start = new Date(b.batch_start_date);
        const end = new Date(b.batch_end_date);
        return start <= today && today <= end;
    });

    if (active) return active;

    // Fallback: most recent batch (batches are already sorted desc by year/term/no from backend)
    return batches[0] ?? null;
}

/** true if the given batch's date range contains today */
export function isBatchActive(batch) {
    if (!batch?.batch_start_date || !batch?.batch_end_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(batch.batch_start_date);
    const end = new Date(batch.batch_end_date);
    return start <= today && today <= end;
}