import { useState } from "react";
import { DollarSign, Settings, RefreshCw, X, Asterisk } from "lucide-react";

const inputClass =
    "w-full rounded-lg border border-slate-300 py-1.5 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30";

/**
 * SectionFeeSettings
 * -------------------------------------------------------------------------
 * 6. ค่าธรรมเนียมและข้อยกเว้น (Fees & Footnotes)
 * - คำนวณค่าสมัคร 10 บาท ต่อรายวิชา (Number of Subjects × Rate)
 * - คำนวณค่าบำรุงการศึกษาตามสูตร (Total Hours × Rate)
 * - รองรับการแก้ไขยอดรวมอิสระ (Manual Override)
 * Flat & Compact UI
 */
export default function SectionFeeSettings({
    form,
    locations = [],
    subjectsCount = 1,
    onChange,
    onToggleFreeTuition,
    onRecalculateTuition,
    onTotalFeeChange,
    onResetFeeRates,
}) {
    const [isFeeSettingsOpen, setIsFeeSettingsOpen] = useState(false);

    const activeSubjectsCount = subjectsCount > 0 ? subjectsCount : 1;
    const appRate = Number(form.application_rate_per_subject ?? 10) || 10;
    const appFeeNum = Number(form.application_fee) || 0;
    const tuitionFeeNum = Number(form.tuition_fee) || 0;
    const hoursNum = Number(form.total_hours) || 0;
    const acRate = Number(form.air_con_rate_per_hour) || 5;
    const tuitionRate = Number(form.tuition_rate_per_hour) || 1;
    const acFeeTotal = form.is_ac_maintenance_fee ? hoursNum * acRate : 0;

    const autoCalculatedTotal = form.is_waived_fee ? 0 : appFeeNum + tuitionFeeNum + acFeeTotal;

    const handleAppRateChange = (e) => {
        const val = e.target.value;
        onChange("application_rate_per_subject")({ target: { value: val } });
        const numRate = Number(val) || 0;
        onChange("application_fee")({ target: { value: String(activeSubjectsCount * numRate) } });
    };

    return (
        <div className="space-y-3 pb-3 border-b border-slate-200">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <DollarSign size={14} className="text-teal-600" />
                    <span>6. ค่าธรรมเนียมและหมายเหตุ (Fees & Footnotes)</span>
                </div>

                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        setIsFeeSettingsOpen(true);
                    }}
                    title="คลิกเพื่อปรับอัตราค่าสมัครต่อวิชา, ค่าเรียน/ชม., ค่าแอร์/ชม."
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                >
                    <Settings size={12} className="text-slate-500" />
                    <span>⚙️ ปรับอัตรา</span>
                </button>
            </div>

            {/* ค่าสมัคร & ค่าบำรุงการศึกษา */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                    <div className="mb-1 flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-700">
                            ค่าสมัคร (บาท)
                        </label>
                        <span className="text-[10.5px] font-medium text-slate-500">
                            {appRate} บ. × {activeSubjectsCount} วิชา
                        </span>
                    </div>
                    <input
                        type="number"
                        min="0"
                        value={form.application_fee}
                        onChange={onChange("application_fee")}
                        disabled={form.is_waived_fee}
                        placeholder="10"
                        className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                    />
                    <p className="mt-0.5 text-[11px] text-slate-400">
                        สูตร: {activeSubjectsCount} วิชา × {appRate} บ./วิชา = {(activeSubjectsCount * appRate).toLocaleString()} บาท
                    </p>
                </div>
                <div>
                    <div className="mb-1 flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-700">
                            ค่าบำรุงการศึกษา (บาท)
                        </label>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                onRecalculateTuition();
                            }}
                            disabled={form.is_waived_fee}
                            title="คำนวณใหม่ตามสูตร (ชั่วโมงรวม x อัตราต่อชม. และค่าสมัครต่อวิชา)"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-40 transition"
                        >
                            <RefreshCw size={10} />
                            คำนวณตามสูตร
                        </button>
                    </div>
                    <input
                        type="number"
                        min="0"
                        value={form.tuition_fee}
                        onChange={onChange("tuition_fee")}
                        disabled={form.is_waived_fee}
                        placeholder="ระบุยอด หรือกดคำนวณตามสูตร"
                        className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                    />
                    <p className="mt-0.5 text-[11px] text-slate-400">
                        สูตร: {hoursNum} ชม. × {tuitionRate} บ./ชม. = {(hoursNum * tuitionRate).toLocaleString()} บาท
                    </p>
                </div>
            </div>

            {/* Checkboxes: ฟรีค่าเรียน & ค่าแอร์ */}
            <div className="space-y-1.5 rounded-lg bg-slate-50 p-2.5 border border-slate-200/80">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={form.is_waived_fee}
                        onChange={onToggleFreeTuition}
                        className="h-3.5 w-3.5 accent-blue-600 rounded"
                    />
                    <span className="font-medium text-slate-800">
                        ยกเว้นค่าเล่าเรียน (เรียนฟรี) — ค่าเรียนเป็น 0 บาท และแสดงสถานะฟรีในตารางประกาศ
                    </span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={form.is_ac_maintenance_fee}
                        onChange={onChange("is_ac_maintenance_fee")}
                        className="h-3.5 w-3.5 accent-blue-600 rounded"
                    />
                    <span>
                        ค่าบำรุงห้องแอร์ (+{acRate} บาท/ชม. = {(hoursNum * acRate).toLocaleString()} บาท)
                    </span>
                </label>
            </div>

            {/* ยอดรวมค่าใช้จ่าย / ค่าเรียนรวม (Editable with override & recalculate button) */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-2.5 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div>
                        <label className="block text-xs font-bold text-blue-900">
                            ยอดรวมค่าใช้จ่าย / ค่าเรียนรวม (บาท)
                        </label>
                        <p className="text-[11px] text-blue-700/80">
                            แก้ไขยอดรวมได้โดยตรง ระบบจะปรับค่าบำรุงการศึกษาให้อัตโนมัติ หรือกดคำนวณตามสูตร
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            onRecalculateTuition();
                        }}
                        disabled={form.is_waived_fee}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-white px-2 py-0.5 text-xs font-bold text-blue-700 shadow-2xs hover:bg-blue-50 disabled:opacity-40 transition"
                    >
                        <RefreshCw size={11} />
                        🔄 คำนวณอัตโนมัติ
                    </button>
                </div>

                <div className="relative">
                    <input
                        type="number"
                        min="0"
                        value={form.is_waived_fee ? "0" : autoCalculatedTotal}
                        onChange={onTotalFeeChange}
                        disabled={form.is_waived_fee}
                        placeholder="ระบุยอดรวมที่ต้องการ"
                        className="w-full rounded-lg border border-blue-300 bg-white py-1.5 px-3 text-sm font-bold text-blue-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-blue-800/80">
                    <span>
                        แจกแจง: ค่าสมัคร {appFeeNum.toLocaleString()} ({activeSubjectsCount} วิชา) + ค่าบำรุงฯ {tuitionFeeNum.toLocaleString()} {form.is_ac_maintenance_fee ? `+ ค่าแอร์ ${acFeeTotal.toLocaleString()}` : ""} บาท
                    </span>
                    <span className="font-semibold">
                        {form.is_waived_fee ? "(ยกเว้นค่าเล่าเรียน)" : `รวม ${autoCalculatedTotal.toLocaleString()} บาท`}
                    </span>
                </div>
            </div>

            {/* ── หมายเหตุดอกจันทร์ในตารางประกาศ (*) ── */}
            <div className="space-y-1.5 pt-0.5">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={Boolean(form.has_footnote)}
                        onChange={(e) => {
                            const checked = e.target.checked;
                            const selectedLoc = locations.find((l) => String(l.id) === String(form.joint_location_id));
                            const defaultText = selectedLoc?.name && selectedLoc?.name !== "วิทยาลัยสารพัดช่างอุดรธานี"
                                ? `การจัดการเรียนการสอนร่วมกับ${selectedLoc.name}`
                                : "";
                            onChange("has_footnote")({ target: { type: "checkbox", checked } });
                            if (checked && !form.footnote_text) {
                                onChange("footnote_text")({ target: { type: "text", value: defaultText } });
                            }
                        }}
                        className="h-3.5 w-3.5 accent-blue-600 rounded"
                    />
                    <span className="flex items-center gap-1">
                        <Asterisk size={12} className="text-amber-500" />
                        แสดงหมายเหตุดอกจันทร์ในตารางประกาศ (*)
                    </span>
                </label>

                {form.has_footnote && (
                    <div className="space-y-1.5 pl-5">
                        <input
                            type="text"
                            value={form.footnote_text || ""}
                            onChange={onChange("footnote_text")}
                            placeholder="เช่น การจัดการเรียนการสอนร่วมกับเรือนจำกลางอุดรธานี"
                            className="w-full rounded-lg border border-slate-300 py-1 px-2.5 text-xs focus:border-blue-500 outline-none bg-white"
                        />
                        <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] text-slate-400">ตัวอย่าง:</span>
                            {[
                                "การจัดการเรียนการสอนร่วมกับเรือนจำกลางอุดรธานี",
                                "การจัดการเรียนการสอนร่วมกับโรงเรียนประสาทคณานุกิจ วัดพุทธนิมิต",
                                "การจัดการเรียนการสอนร่วมกับเรือนจำชั่วคราวโคกก่อง",
                            ].map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onChange("footnote_text")({ target: { type: "text", value: preset } });
                                    }}
                                    className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100 transition truncate max-w-[180px]"
                                    title={preset}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Fee Settings Mini-Modal ── */}
            {isFeeSettingsOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl space-y-3.5">
                        <div className="flex items-center justify-between border-b pb-2.5">
                            <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                                    <Settings size={15} />
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">ปรับอัตราค่าธรรมเนียม</h3>
                                    <p className="text-[11px] text-slate-500">กำหนดอัตราคำนวณสำหรับกลุ่มเรียนนี้</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setIsFeeSettingsOpen(false);
                                }}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-2.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    อัตราค่าสมัครต่อวิชา (บาท/วิชา)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.application_rate_per_subject ?? "10"}
                                    onChange={handleAppRateChange}
                                    className={inputClass}
                                    placeholder="10"
                                />
                                <p className="mt-0.5 text-[10px] text-slate-400">
                                    * ค่าเริ่มต้น 10 บาท/วิชา (ปัจจุบันมี {activeSubjectsCount} วิชา = {(activeSubjectsCount * appRate).toLocaleString()} บาท)
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    ค่าบำรุงการศึกษาต่อชั่วโมง (บาท/ชม.)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={form.tuition_rate_per_hour}
                                    onChange={onChange("tuition_rate_per_hour")}
                                    className={inputClass}
                                    placeholder="1"
                                />
                                <p className="mt-0.5 text-[10px] text-slate-400">* ค่าเริ่มต้น 1 บาท/ชั่วโมง</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    ค่าบำรุงห้องแอร์ต่อชั่วโมง (บาท/ชม.)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={form.air_con_rate_per_hour}
                                    onChange={onChange("air_con_rate_per_hour")}
                                    className={inputClass}
                                    placeholder="5"
                                />
                                <p className="mt-0.5 text-[10px] text-slate-400">* ค่าเริ่มต้น 5 บาท/ชั่วโมง</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t pt-2.5">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onResetFeeRates();
                                }}
                                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                            >
                                รีเซ็ตค่าเริ่มต้น
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onRecalculateTuition();
                                    setIsFeeSettingsOpen(false);
                                }}
                                className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition"
                            >
                                บันทึกและคำนวณใหม่
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
