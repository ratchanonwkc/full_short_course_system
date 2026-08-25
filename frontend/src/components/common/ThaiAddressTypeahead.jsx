import { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, Loader2, Check } from "lucide-react";
import useThaiAddress, { parseSearchTokens } from "../../hooks/useThaiAddress";

const labelCls = "mb-1.5 block text-sm font-bold text-slate-600";
const inputCls =
    "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition";

/**
 * Highlight matched search tokens within Thai address text
 */
function HighlightMatch({ text = "", tokens = [] }) {
    if (!text) return null;
    if (!tokens || tokens.length === 0) return <>{text}</>;

    const keywords = tokens
        .flatMap((t) => [t.clean, t.raw])
        .filter((k) => k && k.length >= 2)
        .sort((a, b) => b.length - a.length);

    if (keywords.length === 0) return <>{text}</>;

    const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`(${escaped.join("|")})`, "gi");
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, index) => {
                if (!part) return null;
                const isMatch = keywords.some((k) => k.toLowerCase() === part.toLowerCase());
                if (isMatch) {
                    return (
                        <strong
                            key={index}
                            className="font-black text-[#00204E] bg-blue-100/90 text-blue-900 px-0.5 rounded shadow-xs"
                        >
                            {part}
                        </strong>
                    );
                }
                return <span key={index}>{part}</span>;
            })}
        </>
    );
}

/**
 * ThaiAddressTypeahead
 * -----------------------------------------------------------------------------
 * Subdistrict-first Thai Address Typeahead with Breadcrumb Floating Dropdown
 *
 * Breadcrumb format:
 *   ต. [Subdistrict] › อ. [District] › จ. [Province] › [PostalCode]
 *
 * Features:
 * - Primary search entry via Subdistrict (ตำบล) input
 * - Live suggestions triggered at >= 2 characters
 * - Multi-keyword support (Subdistrict, District, Province, Postal Code)
 * - Auto-fills all 4 fields simultaneously on selection
 * - Smooth institutional navy/blue styling with keyboard navigation
 */
export default function ThaiAddressTypeahead({
    subdistrict = "",
    district = "",
    province = "",
    postalCode = "",
    onChangeField, // (field, value) => void
    onSelectAddress, // ({ subdistrict, district, province, postal_code }) => void
    disabled = false,
    required = true,
    scopePrefix = "", // e.g. "current_" or ""
    nextFocusSelector = null, // CSS selector or id to focus after selection
}) {
    const { ready, loading: addressLoading, searchAddress, lookupByPostalCode } = useThaiAddress();

    const [query, setQuery] = useState(subdistrict || "");
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [searchTokens, setSearchTokens] = useState([]);

    const containerRef = useRef(null);
    const subdistrictInputRef = useRef(null);
    const listRef = useRef(null);

    // Keep internal query string in sync with controlled subdistrict prop
    useEffect(() => {
        setQuery(subdistrict || "");
    }, [subdistrict]);

    // Handle search input changes on the Subdistrict field
    const handleSubdistrictInputChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        onChangeField("subdistrict", val);

        if (val.trim().length >= 2 && ready) {
            const tokens = parseSearchTokens(val);
            setSearchTokens(tokens);
            const results = searchAddress(val, { limit: 25 });
            setSuggestions(results);
            setIsOpen(results.length > 0);
            setSelectedIndex(0);
        } else {
            setSuggestions([]);
            setIsOpen(false);
            setSearchTokens([]);
        }
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Perform address selection & auto-fill all 4 fields
    const handleSelect = useCallback(
        (item) => {
            if (!item) return;

            const selectedData = {
                subdistrict: item.subdistrict || "",
                district: item.district || "",
                province: item.province || "",
                postal_code: item.postalCode || item.postal_code || "",
            };

            setQuery(selectedData.subdistrict);
            setIsOpen(false);
            setSuggestions([]);

            if (onSelectAddress) {
                onSelectAddress(selectedData);
            } else {
                onChangeField("subdistrict", selectedData.subdistrict);
                onChangeField("district", selectedData.district);
                onChangeField("province", selectedData.province);
                onChangeField("postal_code", selectedData.postal_code);
            }

            // Move focus to next field if specified, or house number if empty
            setTimeout(() => {
                if (nextFocusSelector) {
                    const el = document.querySelector(nextFocusSelector);
                    if (el && typeof el.focus === "function") {
                        el.focus();
                        return;
                    }
                }
            }, 50);
        },
        [onChangeField, onSelectAddress, nextFocusSelector]
    );

    // Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
    const handleKeyDown = (e) => {
        if (!isOpen || suggestions.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => {
                const next = prev < suggestions.length - 1 ? prev + 1 : prev;
                scrollItemIntoView(next);
                return next;
            });
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => {
                const next = prev > 0 ? prev - 1 : 0;
                scrollItemIntoView(next);
                return next;
            });
        } else if (e.key === "Enter") {
            if (isOpen && suggestions[selectedIndex]) {
                e.preventDefault();
                handleSelect(suggestions[selectedIndex]);
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    const scrollItemIntoView = (index) => {
        if (!listRef.current) return;
        const item = listRef.current.children[index];
        if (item) {
            item.scrollIntoView({ block: "nearest" });
        }
    };

    // Handling postal code field changes with auto-lookup
    const handlePostalCodeChange = (e) => {
        const code = e.target.value.replace(/\D/g, "").slice(0, 5);
        onChangeField("postal_code", code);

        if (code.length === 5 && ready) {
            const results = lookupByPostalCode(code);
            if (results.length > 0) {
                // If subdistrict is not set yet, automatically fill from first match
                if (!subdistrict) {
                    const first = results[0];
                    handleSelect(first);
                } else {
                    // Filter matching subdistricts for the postal code
                    const matched = results.find(
                        (r) => r.subdistrict === subdistrict || r.subdistrict.includes(subdistrict)
                    );
                    if (matched) {
                        handleSelect(matched);
                    }
                }
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* 1. Primary Search Field: Subdistrict (ตำบล/แขวง) */}
                <div ref={containerRef} className="relative">
                    <label className={labelCls}>
                        ตำบล / แขวง {required && "*"}
                        <span className="ml-1.5 font-normal text-xs text-blue-600">
                            (พิมพ์ค้นหาเพื่อเติมอัตโนมัติ)
                        </span>
                    </label>

                    <div className="relative">
                        <input
                            ref={subdistrictInputRef}
                            type="text"
                            required={required}
                            disabled={disabled}
                            value={query}
                            onChange={handleSubdistrictInputChange}
                            onFocus={() => {
                                if (query.trim().length >= 2 && suggestions.length > 0) {
                                    setIsOpen(true);
                                }
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="พิมพ์ชื่อตำบล/แขวง หรือรหัสไปรษณีย์"
                            className={`${inputCls} pr-10`}
                            autoComplete="off"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            {addressLoading ? (
                                <Loader2 size={16} className="animate-spin text-blue-500" />
                            ) : (
                                <Search size={16} className="text-slate-400" />
                            )}
                        </div>
                    </div>

                    {/* Floating Breadcrumb Dropdown */}
                    {isOpen && suggestions.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden divide-y divide-slate-100 max-h-64 flex flex-col animate-in fade-in-50 duration-150">
                            {/* Dropdown Header */}
                            <div className="bg-slate-50/90 px-3.5 py-1.5 text-[11px] font-semibold text-slate-500 flex items-center justify-between border-b border-slate-100 shrink-0 select-none">
                                <span className="flex items-center gap-1.5 text-[#00204E] font-bold">
                                    <MapPin size={12} className="text-blue-600" />
                                    ผลลัพธ์ที่อยู่ ({suggestions.length} รายการ)
                                </span>
                                <span className="text-slate-400 text-[10px]">
                                    ↑ ↓ เลือก | Enter ตกลง
                                </span>
                            </div>

                            {/* Dropdown Results List */}
                            <div ref={listRef} className="overflow-y-auto flex-1 p-1 space-y-0.5">
                                {suggestions.map((item, idx) => {
                                    const isSelected = idx === selectedIndex;
                                    return (
                                        <div
                                            key={`${item.subdistrict}-${item.district}-${item.province}-${item.postalCode}-${idx}`}
                                            onMouseDown={(e) => {
                                                e.preventDefault(); // prevent blur
                                                handleSelect(item);
                                            }}
                                            onMouseEnter={() => setSelectedIndex(idx)}
                                            className={`cursor-pointer rounded-lg px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                                                isSelected
                                                    ? "bg-blue-50 text-[#00204E] font-medium border-l-3 border-blue-600"
                                                    : "text-slate-700 hover:bg-slate-50"
                                            }`}
                                        >
                                            {/* Breadcrumb text: ต. [Subdistrict] › อ. [District] › จ. [Province] › [PostalCode] */}
                                            <div className="flex items-center flex-wrap gap-1 leading-relaxed">
                                                <span className="font-semibold text-slate-900">
                                                    <span className="text-slate-400 font-normal mr-0.5">ต.</span>
                                                    <HighlightMatch text={item.subdistrict} tokens={searchTokens} />
                                                </span>
                                                <span className="text-blue-400 font-bold select-none px-0.5">›</span>
                                                <span className="text-slate-700">
                                                    <span className="text-slate-400 font-normal mr-0.5">อ.</span>
                                                    <HighlightMatch text={item.district} tokens={searchTokens} />
                                                </span>
                                                <span className="text-blue-400 font-bold select-none px-0.5">›</span>
                                                <span className="text-slate-700">
                                                    <span className="text-slate-400 font-normal mr-0.5">จ.</span>
                                                    <HighlightMatch text={item.province} tokens={searchTokens} />
                                                </span>
                                                <span className="text-blue-400 font-bold select-none px-0.5">›</span>
                                                <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200/70 px-1.5 py-0.2 rounded text-[11px]">
                                                    <HighlightMatch
                                                        text={item.postalCode || item.postal_code}
                                                        tokens={searchTokens}
                                                    />
                                                </span>
                                            </div>

                                            {isSelected && (
                                                <Check size={14} className="text-blue-600 shrink-0 ml-2" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. District (อำเภอ/เขต) */}
                <div>
                    <label className={labelCls}>อำเภอ / เขต {required && "*"}</label>
                    <input
                        type="text"
                        required={required}
                        disabled={disabled}
                        value={district}
                        onChange={(e) => onChangeField("district", e.target.value)}
                        placeholder="เช่น เมืองอุดรธานี"
                        className={inputCls}
                    />
                </div>

                {/* 3. Province (จังหวัด) */}
                <div>
                    <label className={labelCls}>จังหวัด {required && "*"}</label>
                    <input
                        type="text"
                        required={required}
                        disabled={disabled}
                        value={province}
                        onChange={(e) => onChangeField("province", e.target.value)}
                        placeholder="เช่น อุดรธานี"
                        className={inputCls}
                    />
                </div>

                {/* 4. Postal Code (รหัสไปรษณีย์) */}
                <div>
                    <label className={labelCls}>รหัสไปรษณีย์ {required && "*"}</label>
                    <input
                        type="text"
                        required={required}
                        disabled={disabled}
                        maxLength={5}
                        inputMode="numeric"
                        value={postalCode}
                        onChange={handlePostalCodeChange}
                        placeholder="เช่น 41000"
                        className={`${inputCls} font-mono tracking-wider`}
                    />
                </div>
            </div>
        </div>
    );
}
