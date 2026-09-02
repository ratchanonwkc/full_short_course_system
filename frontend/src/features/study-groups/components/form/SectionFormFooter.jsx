import { CheckCircle2 } from "lucide-react";
import { GROUP_STATUS_META } from "../../../../utils/groupCode";

const GROUP_STATUS_OPTIONS = Object.entries(GROUP_STATUS_META).map(([value, meta]) => ({ value, ...meta }));

/**
 * SectionFormFooter
 * -------------------------------------------------------------------------
 * 7. สถานะกลุ่มเรียน (Group Status)
 * ใช้ Pure State-driven Buttons (ไม่มี native hidden inputs) เพื่อป้องกัน Scroll-Jumping
 */
export default function SectionFormFooter({
    status = "open",
    onChange,
}) {
    return (
        <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>7. สถานะกลุ่มเรียน (Group Status)</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {GROUP_STATUS_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            onChange("status")({ target: { value: opt.value } });
                        }}
                        className={`flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
                            status === opt.value
                                ? `${opt.className} border-current ring-1 ring-current shadow-2xs`
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                    >
                        <span>{opt.emoji}</span>
                        <span>{opt.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
