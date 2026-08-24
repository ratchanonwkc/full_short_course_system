import { AlertTriangle } from "lucide-react";
import DateSelector from "../../../components/common/DateSelector";
import { calculateAge, checkAgeSanity } from "../../../utils/ageUtils";

/**
 * BirthDateField
 * -------------------------------------------------------------------------
 * Drop-in replacement for the raw <MaskedDateInput> used for birth_date in
 * ApplicantFormFields. Adds:
 *   - Modern popover DateSelector (ReUI/Shadcn-style)
 *   - Live "อายุ: {years} ปี" readout
 *   - Inline warning when the computed age is implausible (<5 or >100),
 *     which usually means the person typed a ค.ศ. year instead of พ.ศ.
 *     (or vice versa).
 *
 * Props:
 * - value: ISO "YYYY-MM-DD" | ""
 * - onChange: (iso) => void
 * - label: string (default "วัน/เดือน/ปีเกิด *")
 * - className: passed through for layout parity with surrounding grid
 */
export default function BirthDateField({ value, onChange, label = "วัน/เดือน/ปีเกิด *", className = "" }) {
    const age = calculateAge(value);
    const warning = checkAgeSanity(value);

    return (
        <div className={className}>
            <DateSelector id="birth_date" label={label} value={value} onChange={onChange} placeholder="เลือกวันเกิด" />
            {age !== null && (
                <p className={`mt-1.5 text-xs font-semibold ${warning ? "text-amber-600" : "text-slate-500"}`}>
                    อายุ: {age} ปี
                </p>
            )}
            {warning && (
                <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-600">
                    <AlertTriangle size={12} /> {warning}
                </p>
            )}
        </div>
    );
}
