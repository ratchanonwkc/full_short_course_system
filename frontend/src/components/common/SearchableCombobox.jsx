import { Fragment, useState } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { Check, ChevronsUpDown, XCircle } from "lucide-react";

const inputClass =
    "w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40";

/**
 * SearchableCombobox
 * -------------------------------------------------------------------------
 * Generic searchable dropdown ทั่วไปของโมดูล curriculums/subjects
 * (เดิม pattern นี้ซ้ำกันอยู่ใน TeacherCombobox / MasterCombobox หลายที่
 * จึงแยกออกมาเป็น component กลางใช้ร่วมกันได้)
 *
 * Props:
 * - id: string
 * - value: string | number | ""
 * - onChange: (value) => void
 * - options: Array<{ value, label }>
 * - placeholder: string
 * - disabled: boolean
 */
export default function SearchableCombobox({
    id,
    value,
    onChange,
    options = [],
    placeholder = "พิมพ์เพื่อค้นหา...",
    disabled = false,
}) {
    const [query, setQuery] = useState("");
    const selected = options.find((o) => String(o.value) === String(value)) || null;

    const filtered =
        query === "" ? options : options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

    return (
        <Combobox value={selected} onChange={(opt) => onChange(opt ? opt.value : "")} disabled={disabled}>
            <div className="relative">
                <div className="relative">
                    <Combobox.Input
                        id={id}
                        className={`${inputClass} pr-16 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
                        displayValue={(opt) => opt?.label || ""}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={disabled ? "กำลังโหลด..." : placeholder}
                        autoComplete="off"
                    />
                    <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
                        {selected && (
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
                <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                    afterLeave={() => setQuery("")}
                >
                    <Combobox.Options
                        anchor={{ to: "bottom start", gap: 4 }}
                        className="z-[100] w-[var(--input-width)] max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
                    >
                        {filtered.length === 0 ? (
                            <div className="px-3 py-2 text-slate-400">
                                {disabled ? "กำลังโหลด..." : "ไม่พบรายการ"}
                            </div>
                        ) : (
                            filtered.map((opt) => (
                                <Combobox.Option
                                    key={opt.value}
                                    value={opt}
                                    className={({ active }) =>
                                        `flex cursor-pointer items-center justify-between px-3 py-2 ${active ? "bg-indigo-50 text-indigo-600" : "text-slate-700"
                                        }`
                                    }
                                >
                                    {({ selected: isSelected }) => (
                                        <>
                                            <span className={isSelected ? "font-semibold" : ""}>{opt.label}</span>
                                            {isSelected && <Check size={14} />}
                                        </>
                                    )}
                                </Combobox.Option>
                            ))
                        )}
                    </Combobox.Options>
                </Transition>
            </div>
        </Combobox>
    );
}
