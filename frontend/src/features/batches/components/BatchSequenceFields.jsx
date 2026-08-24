import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { getNextBatchDefaults } from "../services/batchApi";
import { buildBatchDisplayName } from "../../../utils/batchName";

const inputClass =
    "w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40";

/**
 * BatchSequenceFields
 * -------------------------------------------------------------------------
 * Explicit fields for the legacy naming convention:
 *   batch_sequence (รุ่นที่, editable number), iteration (ครั้งที่ 1/2),
 *   academic_year (ปีการศึกษา), semester (ภาคเรียน)
 * + a live preview of the standardized batch name as any field changes.
 *
 * On CREATE mode (isEditMode=false), auto-fetches next defaults from
 * GET /batches/next-defaults on mount and pre-fills the form — but every
 * field stays fully editable by the user afterward (no re-fetch on change).
 *
 * `iteration` is not a stored DB column; it maps 1:1 to batch_no parity
 * (iteration 1 -> odd batch_no continuation, iteration 2 -> even) via the
 * `onIterationResolved` callback so the parent form can set batch_no
 * consistently with utils/batchName.js#getIteration.
 *
 * Props:
 * - value: { batch_sequence, iteration, academic_year, term } -- `term` doubles as "semester"
 * - onChange: (nextValue) => void   -- called with the full updated object
 * - isEditMode: boolean             -- skips auto-fetch when true (editing an existing batch)
 */
export default function BatchSequenceFields({ value, onChange, isEditMode = false }) {
    const [isFetchingDefaults, setIsFetchingDefaults] = useState(false);

    useEffect(() => {
        if (isEditMode) return;
        let cancelled = false;
        setIsFetchingDefaults(true);
        getNextBatchDefaults()
            .then((defaults) => {
                if (cancelled) return;
                onChange({
                    batch_sequence: defaults.batch_sequence,
                    iteration: defaults.iteration,
                    academic_year: String(defaults.academic_year),
                    term: defaults.semester,
                });
            })
            .catch(() => {
                // Fallback silently to hardcoded defaults if the endpoint fails
                if (cancelled) return;
                onChange({ batch_sequence: 139, iteration: 1, academic_year: "2569", term: 1 });
            })
            .finally(() => {
                if (!cancelled) setIsFetchingDefaults(false);
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditMode]);

    const handleField = (field) => (e) => {
        const raw = e.target.value;
        onChange({ ...value, [field]: field === "batch_sequence" || field === "term" || field === "iteration" ? raw : raw });
    };

    // Preview uses buildBatchDisplayName's shape: { batch_sequence, batch_no, term, academic_year }
    // batch_no is reconstructed from iteration for preview purposes only (odd=1, even=2 within a pair)
    const previewRow = {
        batch_sequence: value.batch_sequence,
        batch_no: Number(value.iteration) === 2 ? 2 : 1,
        term: value.term,
        academic_year: value.academic_year,
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        รุ่นที่ (batch_sequence)
                        {isFetchingDefaults && <span className="ml-1.5 text-xs font-normal text-indigo-500">(กำลังคำนวณ...)</span>}
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={value.batch_sequence ?? ""}
                        onChange={handleField("batch_sequence")}
                        placeholder="เช่น 139"
                        className={inputClass}
                        required
                    />
                </div>

                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">ครั้งที่ (iteration)</label>
                    <select value={value.iteration ?? 1} onChange={handleField("iteration")} className={inputClass}>
                        <option value={1}>ครั้งที่ 1</option>
                        <option value={2}>ครั้งที่ 2</option>
                    </select>
                </div>

                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">ปีการศึกษา</label>
                    <input
                        type="number"
                        value={value.academic_year ?? ""}
                        onChange={handleField("academic_year")}
                        placeholder="เช่น 2569"
                        maxLength={4}
                        className={inputClass}
                        required
                    />
                </div>

                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">ภาคเรียนที่ (semester)</label>
                    <select value={value.term ?? 1} onChange={handleField("term")} className={inputClass}>
                        <option value={1}>ภาคเรียนที่ 1</option>
                        <option value={2}>ภาคเรียนที่ 2</option>
                    </select>
                </div>
            </div>

            {/* Live standardized name preview */}
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
                    <Sparkles size={12} />
                    ตัวอย่างชื่อรุ่น (Preview)
                </p>
                <p className="text-base font-bold text-indigo-700">{buildBatchDisplayName(previewRow)}</p>
            </div>
        </div>
    );
}
