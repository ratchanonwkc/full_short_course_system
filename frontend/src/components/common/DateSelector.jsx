import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import dayjs, { isoToThaiInput } from "../../utils/dateUtils";

const WEEKDAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

/**
 * DateSelector
 * -------------------------------------------------------------------------
 * ReUI / Shadcn-inspired Popover Calendar date selector, built without an
 * external calendar dependency (keeps bundle + install footprint minimal,
 * matches project's existing dayjs + Thai/BE conventions).
 *
 * Unlike <ThaiDateInput> (which supports free-typing), this is a pure
 * click-to-select popover — a cleaner "modern date selector" UX per spec.
 *
 * Props:
 * - id, value (ISO "YYYY-MM-DD" | ""), onChange(iso)
 * - label: optional field label rendered above the trigger
 * - placeholder
 * - disabled
 * - minYear / maxYear: BE years bound for the year dropdown (defaults: now-100 / now+2)
 */
export default function DateSelector({
    id,
    value = "",
    onChange,
    label,
    placeholder = "เลือกวันที่",
    disabled = false,
    minYear,
    maxYear,
}) {
    const [open, setOpen] = useState(false);
    const [viewDate, setViewDate] = useState(() => (value && dayjs(value).isValid() ? dayjs(value) : dayjs()));
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (value && dayjs(value).isValid()) setViewDate(dayjs(value));
    }, [value]);

    useEffect(() => {
        const onClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    const today = dayjs();
    const selected = value && dayjs(value).isValid() ? dayjs(value) : null;

    const startOfMonth = viewDate.startOf("month");
    const daysInMonth = viewDate.daysInMonth();
    const startWeekday = startOfMonth.day();

    const calendarDays = [];
    for (let i = 0; i < startWeekday; i++) calendarDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarDays.push(startOfMonth.date(d));

    const currentBeYear = today.year() + 543;
    const yBefore = minYear ?? currentBeYear - 100;
    const yAfter = maxYear ?? currentBeYear + 2;
    const yearOptions = [];
    for (let y = yAfter; y >= yBefore; y--) yearOptions.push(y);

    const handleSelectDay = (day) => {
        onChange?.(day.format("YYYY-MM-DD"));
        setOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            {label && <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>}
            <button
                type="button"
                id={id}
                disabled={disabled}
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            >
                <span className={selected ? "text-slate-900" : "text-slate-400"}>
                    {selected ? isoToThaiInput(value) : placeholder}
                </span>
                <CalendarIcon size={15} className="text-slate-400" />
            </button>

            {open && !disabled && (
                <div className="absolute z-[100] mt-1.5 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                    <div className="mb-2 flex items-center justify-between gap-1">
                        <button type="button" onClick={() => setViewDate((d) => d.subtract(1, "month"))} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
                            <ChevronLeft size={16} />
                        </button>
                        <div className="flex items-center gap-1">
                            <select
                                value={viewDate.month()}
                                onChange={(e) => setViewDate((d) => d.month(Number(e.target.value)))}
                                className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400"
                            >
                                {Array.from({ length: 12 }).map((_, m) => (
                                    <option key={m} value={m}>{dayjs().month(m).format("MMMM")}</option>
                                ))}
                            </select>
                            <select
                                value={viewDate.year()}
                                onChange={(e) => setViewDate((d) => d.year(Number(e.target.value)))}
                                className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400"
                            >
                                {yearOptions.map((beYear) => (
                                    <option key={beYear} value={beYear - 543}>{beYear}</option>
                                ))}
                            </select>
                        </div>
                        <button type="button" onClick={() => setViewDate((d) => d.add(1, "month"))} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
                        {WEEKDAYS_TH.map((w) => <span key={w}>{w}</span>)}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, idx) =>
                            day ? (
                                <button
                                    key={day.format("YYYY-MM-DD")}
                                    type="button"
                                    onClick={() => handleSelectDay(day)}
                                    className={`aspect-square rounded-md text-xs font-medium transition ${
                                        selected && day.isSame(selected, "day")
                                            ? "bg-blue-600 text-white"
                                            : day.isSame(today, "day")
                                            ? "border border-blue-400 text-blue-600"
                                            : "text-slate-700 hover:bg-blue-50"
                                    }`}
                                >
                                    {day.date()}
                                </button>
                            ) : (
                                <span key={`empty-${idx}`} />
                            )
                        )}
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                        <button
                            type="button"
                            onClick={() => handleSelectDay(today)}
                            className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                            วันนี้
                        </button>
                        {selected && (
                            <button
                                type="button"
                                onClick={() => { onChange?.(""); setOpen(false); }}
                                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                            >
                                ล้างค่า
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
