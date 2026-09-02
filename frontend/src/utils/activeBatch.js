/**
 * activeBatch.js
 * ─────────────────────────────────────────────────────────────────────────
 * Utility to find the "Active Batch" (รุ่นปัจจุบัน) — prioritizing batches
 * with status 'admitting' / 'studying' or whose date range contains today.
 *
 * Used by RegistrarEnrollmentsPage and FinanceVerificationPage to
 * auto-select the relevant batch on page load, while still letting the
 * officer switch to any other batch manually via the searchable combobox.
 */

/** true if the given batch is currently active (admitting / studying / in date range) */
export function isBatchActive(batch) {
    if (!batch) return false;
    if (batch.status === "admitting" || batch.status === "studying") return true;
    if (!batch.batch_start_date || !batch.batch_end_date) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(batch.batch_start_date);
    const end = new Date(batch.batch_end_date);
    return start <= today && today <= end;
}

/**
 * Finds the batch that is "active" today.
 * 1. Prioritize status === 'admitting' or 'studying'
 * 2. Matches [batch_start_date, batch_end_date] containing today
 * 3. Falls back to the latest batch with study/admit dates or the last batch in list.
 *
 * @param {Array<Batch>} batches
 * @returns {Batch | null}
 */
export function findActiveBatch(batches = []) {
    if (!batches || !batches.length) return null;

    // 1. Find admitting or studying batch
    const activeStatus = batches.find((b) => b.status === "admitting" || b.status === "studying");
    if (activeStatus) return activeStatus;

    // 2. Find date range match
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeDate = batches.find((b) => {
        if (!b.batch_start_date || !b.batch_end_date) return false;
        const start = new Date(b.batch_start_date);
        const end = new Date(b.batch_end_date);
        return start <= today && today <= end;
    });

    if (activeDate) return activeDate;

    // 3. Fallback: non-ended batch or latest batch
    const nonEnded = batches.find((b) => b.status !== "ended");
    if (nonEnded) return nonEnded;

    return batches[batches.length - 1] || batches[0] || null;
}