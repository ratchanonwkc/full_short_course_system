import { useEffect, useRef, useState } from "react";
import { Landmark, Upload, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { getActivePaymentMethods } from "../services/publicApi";

/**
 * PaymentStep — แสดงรายละเอียดบัญชีธนาคาร/QR + ช่องอัปโหลดสลิปการโอนเงิน
 * props:
 * - amount: number ยอดที่ต้องชำระ
 * - slipFile, setSlipFile: File | null (controlled จากภายนอก)
 */
export default function PaymentStep({ amount, slipFile, setSlipFile }) {
    const [methods, setMethods] = useState([]);
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        getActivePaymentMethods().then(setMethods).catch(() => setMethods([]));
    }, []);

    useEffect(() => {
        if (!slipFile) {
            setPreview(null);
            return;
        }
        const url = URL.createObjectURL(slipFile);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [slipFile]);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) setSlipFile(file);
    };

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                <Landmark size={18} className="text-indigo-600" /> ชำระเงินค่าลงทะเบียน
            </h3>

            <div className="mb-5 flex items-center justify-between rounded-xl bg-indigo-50 px-4 py-3">
                <span className="text-sm font-semibold text-indigo-700">ยอดที่ต้องชำระ</span>
                <span className="text-xl font-black text-indigo-700">
                    {amount === 0 ? "ไม่มีค่าใช้จ่าย" : `${amount.toLocaleString()} บาท`}
                </span>
            </div>

            {amount > 0 && (
                <>
                    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {methods.map((m) => (
                            <div key={m.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                                {m.qr_code_url ? (
                                    <img
                                        src={`${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:5000"}${m.qr_code_url}`}
                                        alt="QR Code"
                                        className="h-20 w-20 rounded-lg border border-slate-100 object-cover"
                                    />
                                ) : (
                                    <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                                        <ImageIcon size={24} />
                                    </div>
                                )}
                                <div className="text-sm">
                                    <p className="font-bold text-slate-800">{m.bank_name}</p>
                                    <p className="text-slate-500">{m.account_name}</p>
                                    <p className="font-mono font-semibold text-slate-700">{m.account_number}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <label className={labelCls()}>อัปโหลดสลิป/หลักฐานการโอนเงิน *</label>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40"
                    >
                        {preview ? (
                            <>
                                <img src={preview} alt="สลิปที่แนบ" className="max-h-48 rounded-lg object-contain" />
                                <p className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
                                    <CheckCircle2 size={14} /> แนบไฟล์แล้ว: {slipFile?.name}
                                </p>
                            </>
                        ) : (
                            <>
                                <Upload size={28} className="text-slate-400" />
                                <p className="text-sm font-semibold text-slate-500">คลิกเพื่ือเลือกไฟล์สลิป (JPG, PNG, PDF)</p>
                            </>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </>
            )}
        </section>
    );
}

function labelCls() {
    return "mb-1.5 mt-2 block text-sm font-bold text-slate-600";
}
