import { Check } from "lucide-react";

/**
 * Stepper Component
 * ---------------------------------------------------------------------------
 * Responsive multi-step progress bar with institutional Navy/Blue theme (#0270c7).
 * Connecting lines are precisely centered relative to the checkpoint circles,
 * eliminating vertical misalignment across all screen sizes.
 */
export default function Stepper({ steps, currentStep }) {
    return (
        <div className="mb-8 w-full">
            <div className="relative flex w-full items-start justify-between">
                {steps.map((label, i) => {
                    const stepNo = i + 1;
                    const isDone = stepNo < currentStep;
                    const isActive = stepNo === currentStep;
                    const isLast = i === steps.length - 1;

                    return (
                        <div key={label} className="relative flex flex-1 flex-col items-center">
                            {/* Connecting track line to the next checkpoint */}
                            {!isLast && (
                                <div
                                    className="absolute left-1/2 top-4 sm:top-[18px] h-[2.5px] w-full -translate-y-1/2 transition-colors duration-300"
                                    style={{
                                        backgroundColor: stepNo < currentStep ? "#0270c7" : "#e2e8f0",
                                    }}
                                />
                            )}

                            {/* Circle Checkpoint */}
                            <div
                                className={`relative z-10 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-xs sm:text-sm font-bold transition-all duration-200 shadow-xs ${
                                    isDone
                                        ? "bg-[#0270c7] text-white"
                                        : isActive
                                        ? "bg-[#0270c7] text-white ring-4 ring-blue-100 scale-105"
                                        : "border border-slate-200 bg-slate-100 text-slate-400"
                                }`}
                            >
                                {isDone ? <Check size={16} className="stroke-[2.5]" /> : stepNo}
                            </div>

                            {/* Label */}
                            <span
                                className={`mt-2 text-center text-[11px] font-semibold leading-tight sm:text-xs transition-colors duration-200 ${
                                    isActive
                                        ? "text-[#0270c7] font-bold"
                                        : isDone
                                        ? "text-slate-700 font-medium"
                                        : "text-slate-400 font-medium"
                                }`}
                            >
                                {label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
