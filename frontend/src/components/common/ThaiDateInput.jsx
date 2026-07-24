import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import dayjs, { toIsoDate, isoToThaiInput } from "../../utils/dateUtils";

const WEEKDAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

/**
 * ThaiDateInput
 * -------------------------------------------------------------------------
 * Date picker แบบไทย/พ.ศ. ใช้แทน <input type="date"> ของ browser
 * - แสดงผล/พิมพ์ในรูปแบบ "DD/MM/BBBB" (เช่น 15/05/2569)
 * - ค่าที่รับเข้า/ส่งออกทาง onChange เป็น ISO ค.ศ. "YYYY-MM-DD" เสมอ
 *   (เพื่อให้ตรงกับ state ของฟอร์มที่ยิงเข้า API/DB ได้ทันที)
 * - เลือกได้ทั้งพิมพ์เอง (พิมพ์แล้ว Enter/ออกจากช่อง) หรือคลิกเลือกจากปฏิทิน
 *
 * Props:
 * - id: string
 * - value: string (ISO "YYYY-MM-DD") | ""
 * - onChange: (isoDateStr: string) => void   -> "" เมื่อผู้ใช้ล้างค่า
 * - placeholder, required, disabled, className
 * - yearRangeBefore / yearRangeAfter: ช่วงปี พ.ศ. ให้เลือกใน dropdown (ค่าเริ่มต้น -5 / +10 ปีจากปีปัจจุบัน)
 */
export default function ThaiDateInput({
    id,
    value = "",
    onChange,
    placeholder = "วว/ดด/ปปปป",
    required = false,
    disabled = false,
    className = "",
    yearRangeBefore = 5,
    yearRangeAfter = 10,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(() => (value && dayjs(value).isValid() ? dayjs(value) : dayjs()));
    const [typedValue, setTypedValue] = useState(isoToThaiInput(value));
    const wrapperRef = useRef(null);

    // sync เมื่อ value จากภายนอกเปลี่ยน (เช่น โหลดข้อมูลแก้ไข / กด Auto-fill)
    useEffect(() => {
        setTypedValue(isoToThaiInput(value));
        if (value && dayjs(value).isValid()) setViewDate(dayjs(value));
    }, [value]);

    // ปิด popover เมื่อคลิกนอกกล่อง
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
                setTypedValue(isoToThaiInput(value));
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [value]);

    const commitTypedValue = () => {
        if (typedValue.trim() === "") {
            onChange?.("");
            return;
        }
        const iso = toIsoDate(typedValue);
        if (iso) {
            onChange?.(iso);
            setViewDate(dayjs(iso));
        } else {
            // พิมพ์รูปแบบผิด -> ย้อนกลับไปค่าล่าสุดที่ถูกต้อง
            setTypedValue(isoToThaiInput(value));
        }
    };

    const handleSelectDay = (day) => {
        const iso = day.format("YYYY-MM-DD");
        onChange?.(iso);
        setTypedValue(isoToThaiInput(iso));
        setIsOpen(false);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange?.("");
        setTypedValue("");
    };

    const startOfMonth = viewDate.startOf("month");
    const daysInMonth = viewDate.daysInMonth();
    const startWeekday = startOfMonth.day(); // 0 = อาทิตย์
    const today = dayjs();
    const selected = value && dayjs(value).isValid() ? dayjs(value) : null;

    const calendarDays = [];
    for (let i = 0; i < startWeekday; i++) calendarDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarDays.push(startOfMonth.date(d));

    const currentBeYear = today.year() + 543;
    const yearOptions = [];
    for (let y = currentBeYear - yearRangeBefore; y <= currentBeYear + yearRangeAfter; y++) {
        yearOptions.push(y);
    }

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <input
                    id={id}
                    type="text"
                    inputMode="numeric"
                    value={typedValue}
                    disabled={disabled}
                    placeholder={placeholder}
                    onFocus={() => setIsOpen(true)}
                    onClick={() => setIsOpen(true)}
                    onChange={(e) => setTypedValue(e.target.value)}
                    onBlur={commitTypedValue}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            commitTypedValue();
                            setIsOpen(false);
                        }
                        if (e.key === "Escape") setIsOpen(false);
                    }}
                    required={required}
                    className={
                        className ||
                        "w-full rounded-lg border border-slate-300 py-2 pl-3 pr-16 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                    }
                />
                <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
                    {typedValue && !disabled && (
                        <button
                            type="button"
                            tabIndex={-1}
                            onClick={handleClear}
                            className="rounded p-1 text-slate-400 hover:text-slate-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <button
                        type="button"
                        tabIndex={-1}
                        disabled={disabled}
                        onClick={() => setIsOpen((v) => !v)}
                        className="rounded p-1 text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed"
                    >
                        <CalendarIcon size={14} />
                    </button>
                </div>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-[100] mt-1.5 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                    {/* Header: เดือน/ปี พ.ศ. + ปุ่มเลื่อน */}
                    <div className="mb-2 flex items-center justify-between gap-1">
                        <button
                            type="button"
                            onClick={() => setViewDate((d) => d.subtract(1, "month"))}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className="flex items-center gap-1">
                            <select
                                value={viewDate.month()}
                                onChange={(e) => setViewDate((d) => d.month(Number(e.target.value)))}
                                className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400"
                            >
                                {Array.from({ length: 12 }).map((_, m) => (
                                    <option key={m} value={m}>
                                        {dayjs().month(m).format("MMMM")}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={viewDate.year()}
                                onChange={(e) => setViewDate((d) => d.year(Number(e.target.value)))}
                                className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400"
                            >
                                {yearOptions.map((beYear) => (
                                    <option key={beYear} value={beYear - 543}>
                                        {beYear}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={() => setViewDate((d) => d.add(1, "month"))}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* หัวคอลัมน์วัน */}
                    <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
                        {WEEKDAYS_TH.map((w) => (
                            <span key={w}>{w}</span>
                        ))}
                    </div>

                    {/* ตารางวัน */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, idx) =>
                            day ? (
                                <button
                                    key={day.format("YYYY-MM-DD")}
                                    type="button"
                                    onClick={() => handleSelectDay(day)}
                                    className={`aspect-square rounded-md text-xs font-medium transition ${selected && day.isSame(selected, "day")
                                            ? "bg-indigo-600 text-white"
                                            : day.isSame(today, "day")
                                                ? "border border-indigo-400 text-indigo-600"
                                                : "text-slate-700 hover:bg-indigo-50"
                                        }`}
                                >
                                    {day.date()}
                                </button>
                            ) : (
                                <span key={`empty-${idx}`} />
                            )
                        )}
                    </div>

                    {/* Footer: วันนี้ / ล้างค่า */}
                    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                const iso = today.format("YYYY-MM-DD");
                                onChange?.(iso);
                                setTypedValue(isoToThaiInput(iso));
                                setViewDate(today);
                                setIsOpen(false);
                            }}
                            className="text-xs font-semibold text-indigo-600 hover:underline"
                        >
                            วันนี้
                        </button>
                        {typedValue && (
                            <button
                                type="button"
                                onClick={() => {
                                    onChange?.("");
                                    setTypedValue("");
                                    setIsOpen(false);
                                }}
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