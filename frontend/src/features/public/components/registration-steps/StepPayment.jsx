import { useEffect, useState } from "react";
import { Landmark, Wallet, Building2, Upload, CheckCircle2, Image as ImageIcon, Copy, Check } from "lucide-react";
import { getActivePaymentMethods } from "../../services/publicApi";

export default function StepPayment({ amount, paymentMethod, setPaymentMethod, slipFile, setSlipFile }) {
    const [methods, setMethods] = useState([]);
    const [preview, setPreview] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

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

    const handleCopy = async (method) => {
        await navigator.clipboard.writeText(method.account_number.replace(/-/g, ""));
        setCopiedId(method.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (amount === 0) {
        return (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-700">
                <p className="font-bold">วิชานี้ไม่มีค่าใช้จ่าย</p>
                <p className="mt-1 text-sm">ท่านสามารถข้ามขั้นตอนการชำระเงินและไปยังขั้นตอนถัดไปได้ทันที</p>
            </div>
        );
    }

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-[#00204E]">
                <Landmark size={18} className="text-blue-600" /> ชำระเงินค่าลงทะเบียน
            </h3>

            <div className="mb-5 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3">
                <span className="text-sm font-semibold text-blue-700">ยอดที่ต้องชำระสำหรับวิชานี้</span>
                <span className="text-xl font-black text-blue-700">{amount.toLocaleString()} บาท</span>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm transition ${paymentMethod === "online_transfer" ? "border-blue-400 bg-blue-50 font-semibold text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                >
                    <input type="radio" name="reg_payment_method" checked={paymentMethod === "online_transfer"} onChange={() => setPaymentMethod("online_transfer")} className="accent-blue-600" />
                    <Wallet size={15} /> โอนเงินออนไลน์ / แนบสลิป
                </label>
                <label
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm transition ${paymentMethod === "counter_cash" ? "border-blue-400 bg-blue-50 font-semibold text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                >
                    <input type="radio" name="reg_payment_method" checked={paymentMethod === "counter_cash"} onChange={() => setPaymentMethod("counter_cash")} className="accent-blue-600" />
                    <Building2 size={15} /> ชำระเงินที่ห้องการเงิน
                </label>
            </div>

            {paymentMethod === "online_transfer" && (
                <>
                    <div className="mb-5 flex flex-wrap justify-center gap-4">
                        {methods.map((m) => (
                            <div key={m.id} className="flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl border border-slate-200 p-5 text-center shadow-sm">
                                {m.qr_code_url ? (
                                    <img src={m.qr_code_url} alt="QR Code พร้อมเพย์" className="mx-auto h-48 w-48 rounded-xl border border-slate-100 object-contain shadow-sm" />
                                ) : (
                                    <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                                        <ImageIcon size={32} />
                                    </div>
                                )}
                                <div className="text-sm">
                                    <p className="font-bold text-slate-800">{m.bank_name}</p>
                                    <p className="text-slate-500">{m.account_name}</p>
                                    <p className="mt-0.5 font-mono text-base font-semibold text-slate-700">{m.account_number}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleCopy(m)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-600 transition hover:bg-blue-100"
                                >
                                    {copiedId === m.id ? <Check size={14} /> : <Copy size={14} />}
                                    {copiedId === m.id ? "คัดลอกแล้ว" : "คัดลอกเลขบัญชี"}
                                </button>
                            </div>
                        ))}
                    </div>

                    <label htmlFor="reg-slip-upload" className="mb-1.5 mt-2 block text-sm font-bold text-slate-600">
                        อัปโหลดสลิป/หลักฐานการโอนเงิน *
                    </label>
                    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-blue-400 hover:bg-blue-50/40">
                        <input
                            type="file"
                            id="reg-slip-upload"
                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                            onChange={(e) => e.target.files?.[0] && setSlipFile(e.target.files[0])}
                            className="hidden"
                        />
                        <label htmlFor="reg-slip-upload" className="flex cursor-pointer flex-col items-center gap-2">
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
                                    <p className="text-sm font-semibold text-slate-500">คลิกเพื่อเลือกไฟล์สลิป (JPG, PNG, PDF)</p>
                                </>
                            )}
                        </label>
                    </div>
                </>
            )}

            {paymentMethod === "counter_cash" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    กรุณานำหลักฐานการสมัครไปชำระเงินที่ห้องการเงินของวิทยาลัยภายในระยะเวลาที่กำหนด
                </div>
            )}
        </section>
    );
}