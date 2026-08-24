import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";

const BE_OFFSET = 543;

// digits (สูงสุด 8 หลัก) -> mask แบบ progressive "DD/MM/YYYY"
function formatDigits(digits) {
    let out = digits.slice(0, 2);
    if (digits.length > 2) out += "/" + digits.slice(2, 4);
    if (digits.length > 4) out += "/" + digits.slice(4, 8);
    return out;
}

// digits ครบ 8 หลัก (DDMMYYYY ตามปฏิทินที่กำหนด) -> ISO "YYYY-MM-DD" แบบ ค.ศ. เสมอ
// คืนค่า null ถ้าวันที่ไม่ถูกต้องจริง (เช่น 30 ก.พ., เดือน/วันเกินขอบเขต)
function digitsToIso(digits, calendar) {
    if (digits.length !== 8) return null;

    const day = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    let year = Number(digits.slice(4, 8));
    if (calendar === "BE") year -= BE_OFFSET;

    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2200) {
        return null;
    }

    const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    // ตรวจสอบว่าเป็นวันที่จริง (JS Date จะ "ปัดข้ามเดือน" ให้เองถ้าวันที่ไม่มีจริง เช่น 30 ก.พ.)
    const check = new Date(`${iso}T00:00:00`);
    if (check.getFullYear() !== year || check.getMonth() + 1 !== month || check.getDate() !== day) {
        return null;
    }
    return iso;
}

// ISO "YYYY-MM-DD" (ค.ศ.) -> string แสดงผล "DD/MM/YYYY" ตามปฏิทินที่เลือก
function isoToDisplay(iso, calendar) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return "";
    const year = calendar === "BE" ? y + BE_OFFSET : y;
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${year}`;
}

/**
 * MaskedDateInput
 * -----------------------------------------------------------------------
 * ช่องกรอกวันที่แบบพิมพ์ตัวเลขล้วน ๆ ต่อเนื่อง (เช่น "04082569") แล้วระบบใส่ "/"
 * ให้อัตโนมัติเป็น DD/MM/YYYY เมื่อพิมพ์ครบ 8 หลัก จะ validate + ยิง onChange ทันที
 * โดยไม่ต้องกด Enter หรือย้ายโฟกัสเอง (ต่างจาก <input type="date"> เดิมที่ต้องพิมพ์
 * เครื่องหมาย "/" เองและ UX ช้ากว่า)
 *
 * - รองรับ Backspace ลบตามธรรมชาติ (mask คำนวณใหม่จากตัวเลขที่เหลือทุกครั้ง)
 * - ยังคงมีปุ่มปฏิทิน ใช้เปิด native date picker ของเบราว์เซอร์ให้เลือกด้วยเมาส์ได้
 * - รองรับทั้ง พ.ศ. (`calendar="BE"`, default) และ ค.ศ. (`calendar="CE"`) สำหรับ "การแสดงผล"
 *   เท่านั้น — ค่าที่ส่งเข้า/ออกทาง `value`/`onChange` เป็น ISO "YYYY-MM-DD" แบบ ค.ศ. เสมอ
 *   (ตรงกับ column type `date` ใน Postgres/Supabase พอดี ไม่ต้องแปลงเพิ่มฝั่ง service)
 *
 * Props:
 * - id, value (ISO string หรือ ""), onChange(isoStringOrEmpty)
 * - calendar: "BE" | "CE"
 * - required, placeholder, className
 */
export default function MaskedDateInput({
    id,
    value = "",
    onChange,
    calendar = "BE",
    required = false,
    placeholder,
    className = "",
}) {
    const [text, setText] = useState(() => isoToDisplay(value, calendar));
    const [isInvalid, setIsInvalid] = useState(false);
    const hiddenDateRef = useRef(null);

    // Sync จากภายนอก เช่น เลือกผ่าน native picker, โหลดข้อมูล edit mode, หรือ reset ฟอร์ม
    useEffect(() => {
        setText(isoToDisplay(value, calendar));
        setIsInvalid(false);
    }, [value, calendar]);

    const handleTextChange = (e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
        setText(formatDigits(digits));

        if (digits.length === 0) {
            setIsInvalid(false);
            onChange?.("");
            return;
        }

        if (digits.length < 8) {
            // ยังพิมพ์ไม่ครบ -> ยังไม่ validate/ยิง onChange รอให้ครบ 8 หลักก่อน
            setIsInvalid(false);
            return;
        }

        // ครบ 8 หลักพอดี -> validate + auto-commit ทันที ไม่ต้องกด Enter/blur
        const iso = digitsToIso(digits, calendar);
        if (iso) {
            setIsInvalid(false);
            onChange?.(iso);
        } else {
            setIsInvalid(true);
        }
    };

    const openPicker = () => {
        if (hiddenDateRef.current?.showPicker) {
            hiddenDateRef.current.showPicker();
        } else {
            hiddenDateRef.current?.focus();
            hiddenDateRef.current?.click();
        }
    };

    const handleNativePick = (e) => {
        setIsInvalid(false);
        onChange?.(e.target.value); // <input type="date"> คืนค่าเป็น ISO ค.ศ. อยู่แล้วตาม spec
    };

    return (
        <div>
            <div className="relative">
                <input
                    id={id}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={text}
                    onChange={handleTextChange}
                    placeholder={placeholder || (calendar === "BE" ? "DD/MM/YYYY (พ.ศ.)" : "DD/MM/YYYY")}
                    maxLength={10}
                    required={required}
                    className={`${className} pr-9 ${isInvalid ? "border-red-400 focus:border-red-400" : ""}`}
                />
                <button
                    type="button"
                    onClick={openPicker}
                    tabIndex={-1}
                    title="เลือกจากปฏิทิน"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-blue-600"
                >
                    <Calendar size={15} />
                </button>
                {/* native date input ซ่อนไว้ ใช้เป็น picker เฉย ๆ (ค.ศ. เสมอตาม HTML spec) */}
                <input
                    ref={hiddenDateRef}
                    type="date"
                    value={value || ""}
                    onChange={handleNativePick}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="pointer-events-none absolute h-0 w-0 opacity-0"
                />
            </div>
            {isInvalid && <p className="mt-1 text-xs text-red-500">วันที่ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง</p>}
        </div>
    );
}