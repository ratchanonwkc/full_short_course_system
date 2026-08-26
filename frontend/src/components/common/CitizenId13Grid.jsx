import { useState, useRef } from "react";

/**
 * CitizenId13Grid — ช่องกรอกเลขบัตรประชาชน 13 หลักแบบ 13 กล่องแยก (1 - 4 - 5 - 2 - 1)
 *
 * Props:
 * - value: string (13 digits or less)
 * - onChange: (cleanDigits: string) => void
 * - disabled?: boolean
 * - autoFocus?: boolean
 * - className?: string
 */
export default function CitizenId13Grid({
    value = "",
    onChange,
    disabled = false,
    autoFocus = false,
    className = "",
}) {
    const inputRef = useRef(null);
    const digits = (value || "").replace(/\D/g, "").slice(0, 13).split("");
    const [isFocused, setIsFocused] = useState(false);

    // Grouping pattern: [1, 4, 5, 2, 1]
    // Indices: 0 | 1,2,3,4 | 5,6,7,8,9 | 10,11 | 12
    const cellGroups = [
        [0],
        [1, 2, 3, 4],
        [5, 6, 7, 8, 9],
        [10, 11],
        [12],
    ];

    const handleContainerClick = () => {
        if (!disabled && inputRef.current) {
            inputRef.current.focus();
        }
    };

    return (
        <div className={`w-full ${className}`}>
            <div
                onClick={handleContainerClick}
                className={`relative flex flex-wrap items-center justify-center gap-1 sm:gap-2 rounded-2xl border p-3 sm:p-4 cursor-text transition-all select-none ${
                    isFocused
                        ? "border-blue-500 bg-blue-50/20 ring-4 ring-blue-500/10"
                        : "border-slate-200 bg-slate-50/60 hover:border-slate-300"
                } ${disabled ? "opacity-60 cursor-not-allowed bg-slate-100" : ""}`}
            >
                <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={13}
                    value={value}
                    onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, "").slice(0, 13);
                        onChange?.(cleaned);
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    disabled={disabled}
                    autoFocus={autoFocus}
                    className="absolute inset-0 h-full w-full opacity-0 cursor-text z-10"
                    aria-label="เลขประจำตัวประชาชน 13 หลัก"
                />

                {cellGroups.map((group, groupIdx) => (
                    <div key={groupIdx} className="flex items-center gap-1 sm:gap-1.5">
                        {group.map((cellIdx) => {
                            const char = digits[cellIdx] || "";
                            const isCurrent = isFocused && cellIdx === digits.length;
                            const isFilled = Boolean(char);

                            return (
                                <div
                                    key={cellIdx}
                                    className={`flex h-10 w-7 sm:h-12 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl border text-base sm:text-lg font-black font-mono transition-all ${
                                        isCurrent
                                            ? "border-[#0270c7] bg-white ring-2 ring-blue-400 text-[#0270c7] scale-105 shadow-sm"
                                            : isFilled
                                            ? "border-slate-400 bg-white text-slate-800 shadow-2xs"
                                            : "border-slate-200 bg-white/80 text-slate-300"
                                    }`}
                                >
                                    {char || (isCurrent ? <span className="animate-pulse text-[#0270c7]">|</span> : "")}
                                </div>
                            );
                        })}
                        {groupIdx < cellGroups.length - 1 && (
                            <span className="text-slate-300 font-bold px-0.5 sm:px-1">-</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
