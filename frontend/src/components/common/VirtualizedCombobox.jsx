import { Fragment, useEffect, useMemo, useState } from "react";
import { Combobox } from "@headlessui/react";
import { Check, ChevronsUpDown, XCircle } from "lucide-react";
import useDebouncedValue from "../../hooks/useDebouncedValue";

export default function VirtualizedCombobox({
    id,
    value,
    onChange,
    options = [],
    placeholder = "พิมพ์เพื่อค้นหา...",
    disabled = false,
    clearable = true,
    maxResults = 50,
    itemHeight = 36,
    maxHeight = 240,
    emptyText = "ไม่พบรายการ",
    loadingText = "กำลังโหลดข้อมูล...",
    className = "",
}) {
    const [rawQuery, setRawQuery] = useState("");
    const [scrollTop, setScrollTop] = useState(0);
    const debouncedQuery = useDebouncedValue(rawQuery, 150);

    const selected = useMemo(
        () => options.find((o) => String(o.value) === String(value)) || null,
        [options, value]
    );

    const filtered = useMemo(() => {
        const q = debouncedQuery.trim().toLowerCase();
        if (!q) return options;
        const result = [];
        for (let i = 0; i < options.length; i++) {
            if (options[i].label.toLowerCase().includes(q)) {
                result.push(options[i]);
                if (result.length >= maxResults) break;
            }
        }
        return result;
    }, [options, debouncedQuery, maxResults]);

    useEffect(() => {
        setScrollTop(0);
    }, [debouncedQuery]);

    const overscan = 4;
    const visibleCount = Math.ceil(maxHeight / itemHeight) + overscan * 2;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(filtered.length, startIndex + visibleCount);
    const topPadding = startIndex * itemHeight;
    const bottomPadding = (filtered.length - endIndex) * itemHeight;
    const visibleItems = filtered.slice(startIndex, endIndex);

    const isTruncated = Boolean(debouncedQuery) && filtered.length >= maxResults;

    return (
        <Combobox
            value={selected}
            onChange={(opt) => onChange(opt ? opt.value : "")}
            disabled={disabled}
            onClose={() => {
                setRawQuery("");
                setScrollTop(0);
            }}
        >
            <div className="relative">
                <div className="relative">
                    <Combobox.Input
                        id={id}
                        className={`${className} pr-16 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
                        displayValue={(opt) => opt?.label || ""}
                        onChange={(e) => setRawQuery(e.target.value)}
                        placeholder={disabled ? loadingText : placeholder}
                        autoComplete="off"
                    />
                    <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
                        {clearable && selected && (
                            <button
                                type="button"
                                onClick={() => onChange("")}
                                className="rounded p-1 text-slate-400 hover:text-slate-600"
                                tabIndex={-1}
                            >
                                <XCircle size={14} />
                            </button>
                        )}
                        <Combobox.Button className="rounded p-1 text-slate-400 hover:text-slate-600">
                            <ChevronsUpDown size={14} />
                        </Combobox.Button>
                    </div>
                </div>

                {/* transition prop handles enter/leave internally — no Transition/Fragment wrapper needed */}
                <Combobox.Options
                    transition
                    anchor={{ to: "bottom start", gap: 4 }}
                    onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                    style={{ maxHeight }}
                    className="z-[100] w-[var(--input-width)] overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg transition duration-100 ease-in data-[closed]:opacity-0"
                >
                    {filtered.length === 0 ? (
                        <div className="px-3 py-2 text-slate-400">
                            {disabled ? loadingText : emptyText}
                        </div>
                    ) : (
                        <>
                            {topPadding > 0 && <div style={{ height: topPadding }} aria-hidden="true" />}
                            {visibleItems.map((opt) => (
                                <Combobox.Option
                                    key={opt.value}
                                    value={opt}
                                    style={{ height: itemHeight }}
                                    className={({ active }) =>
                                        `flex cursor-pointer items-center justify-between px-3 ${active ? "bg-blue-50 text-blue-600" : "text-slate-700"
                                        }`
                                    }
                                >
                                    {({ selected: isSelected }) => (
                                        <>
                                            <span className={`truncate ${isSelected ? "font-semibold" : ""}`}>
                                                {opt.label}
                                            </span>
                                            {isSelected && <Check size={14} className="shrink-0" />}
                                        </>
                                    )}
                                </Combobox.Option>
                            ))}
                            {bottomPadding > 0 && <div style={{ height: bottomPadding }} aria-hidden="true" />}
                            {isTruncated && (
                                <div className="px-3 py-1.5 text-center text-[11px] text-slate-400">
                                    แสดง {maxResults} รายการแรก พิมพ์เพิ่มเพื่อจำกัดผลลัพธ์ให้แคบลง
                                </div>
                            )}
                        </>
                    )}
                </Combobox.Options>
            </div>
        </Combobox>
    );
}