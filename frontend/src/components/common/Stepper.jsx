import { Check } from "lucide-react";

export default function Stepper({ steps, currentStep }) {
    return (
        <div className="mb-8 flex items-center justify-between">
            {steps.map((label, i) => {
                const stepNo = i + 1;
                const isDone = stepNo < currentStep;
                const isActive = stepNo === currentStep;
                return (
                    <div key={label} className="flex flex-1 items-center last:flex-none">
                        <div className="flex flex-col items-center gap-1.5">
                            <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
                                    isDone
                                        ? "bg-emerald-500 text-white"
                                        : isActive
                                        ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                                        : "bg-slate-200 text-slate-400"
                                }`}
                            >
                                {isDone ? <Check size={16} /> : stepNo}
                            </div>
                            <span
                                className={`w-20 text-center text-[11px] font-semibold leading-tight sm:w-24 sm:text-xs ${
                                    isActive ? "text-indigo-600" : isDone ? "text-emerald-600" : "text-slate-400"
                                }`}
                            >
                                {label}
                            </span>
                        </div>
                        {stepNo < steps.length && (
                            <div className={`mx-1.5 h-0.5 flex-1 rounded transition sm:mx-2 ${isDone ? "bg-emerald-400" : "bg-slate-200"}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
