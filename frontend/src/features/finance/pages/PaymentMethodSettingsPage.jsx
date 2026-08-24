import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { Landmark, Plus, Pencil, Trash2, X, Upload, ToggleLeft, ToggleRight } from "lucide-react";
import {
    getPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    uploadQrCode,
} from "../../payment-methods/services/paymentMethodApi";

// qr_code_url is a full Supabase Storage public URL — used directly, no origin prefix needed.
const EMPTY_FORM = { bank_name: "", account_name: "", account_number: "", qr_code_url: "", is_active: true };

/**
 * PaymentMethodSettingsPage — CRUD บัญชีธนาคาร/QR Code รับเงิน (Finance Settings)
 */
export default function PaymentMethodSettingsPage() {
    const [methods, setMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            setMethods(await getPaymentMethods());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const openCreate = () => {
        setEditing(null);
        setModalOpen(true);
    };
    const openEdit = (m) => {
        setEditing(m);
        setModalOpen(true);
    };

    const handleToggleActive = async (m) => {
        await updatePaymentMethod(m.id, { is_active: !m.is_active });
        load();
    };

    const handleDelete = async (m) => {
        const result = await Swal.fire({
            title: "ยืนยันลบบัญชีธนาคารนี้?",
            html: `<b>${m.bank_name}</b> - ${m.account_number}`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ลบข้อมูล",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#dc2626",
        });
        if (!result.isConfirmed) return;
        try {
            await deletePaymentMethod(m.id);
            load();
        } catch (error) {
            Swal.fire("ไม่สามารถลบได้", error.response?.data?.message || "เกิดข้อผิดพลาด", "error");
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-xl font-black text-slate-800">
                        <Landmark size={22} className="text-blue-600" /> ตั้งค่าบัญชีธนาคาร / QR Code รับเงิน
                    </h1>
                    <p className="text-sm text-slate-500">จัดการบัญชีธนาคารที่แสดงในหน้าชำระเงินของผู้สมัครออนไลน์</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
                >
                    <Plus size={16} /> เพิ่มบัญชีธนาคาร
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {loading && <p className="text-slate-400">กำลังโหลด...</p>}
                {!loading && methods.length === 0 && <p className="text-slate-400">ยังไม่มีบัญชีธนาคาร</p>}
                {methods.map((m) => (
                    <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-3 flex items-center gap-3">
                            {m.qr_code_url ? (
                                <img src={m.qr_code_url} alt="QR" className="h-16 w-16 rounded-lg border object-cover" />
                            ) : (
                                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                                    <Landmark size={22} />
                                </div>
                            )}
                            <div>
                                <p className="font-bold text-slate-800">{m.bank_name}</p>
                                <p className="text-sm text-slate-500">{m.account_name}</p>
                                <p className="font-mono text-sm font-semibold text-slate-700">{m.account_number}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                            <button onClick={() => handleToggleActive(m)} className="flex items-center gap-1.5 text-xs font-bold">
                                {m.is_active ? (
                                    <><ToggleRight size={20} className="text-emerald-500" /> <span className="text-emerald-600">ใช้งานอยู่</span></>
                                ) : (
                                    <><ToggleLeft size={20} className="text-slate-400" /> <span className="text-slate-400">ปิดใช้งาน</span></>
                                )}
                            </button>
                            <div className="flex items-center gap-2">
                                <button onClick={() => openEdit(m)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"><Pencil size={16} /></button>
                                <button onClick={() => handleDelete(m)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <FormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                editing={editing}
                onSaved={() => {
                    setModalOpen(false);
                    load();
                }}
            />
        </div>
    );
}

function FormModal({ isOpen, onClose, editing, onSaved }) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) setForm(editing ? { ...EMPTY_FORM, ...editing } : EMPTY_FORM);
    }, [isOpen, editing]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const res = await uploadQrCode(file);
            setForm((prev) => ({ ...prev, qr_code_url: res.qr_code_url }));
        } catch {
            Swal.fire("อัปโหลดไม่สำเร็จ", "ไม่สามารถอัปโหลดไฟล์ QR Code ได้", "error");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.bank_name.trim() || !form.account_name.trim() || !form.account_number.trim()) {
            Swal.fire("ข้อมูลไม่ครบ", "กรุณากรอกชื่อธนาคาร ชื่อบัญชี และเลขที่บัญชีให้ครบถ้วน", "warning");
            return;
        }
        try {
            setSaving(true);
            if (editing) {
                await updatePaymentMethod(editing.id, form);
            } else {
                await createPaymentMethod(form);
            }
            Swal.fire("บันทึกสำเร็จ", "", "success");
            onSaved?.();
        } catch (error) {
            Swal.fire("เกิดข้อผิดพลาด", error.response?.data?.message || "ไม่สามารถบันทึกข้อมูลได้", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-black text-slate-800">{editing ? "แก้ไขบัญชีธนาคาร" : "เพิ่มบัญชีธนาคาร"}</h2>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-bold text-slate-600">ชื่อธนาคาร *</label>
                        <input name="bank_name" value={form.bank_name} onChange={handleChange} placeholder="เช่น ธนาคารกรุงไทย" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-bold text-slate-600">ชื่อบัญชี *</label>
                        <input name="account_name" value={form.account_name} onChange={handleChange} placeholder="เช่น วิทยาลัยสารพัดช่าง..." className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-bold text-slate-600">เลขที่บัญชี *</label>
                        <input name="account_number" value={form.account_number} onChange={handleChange} placeholder="xxx-x-xxxxx-x" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-mono focus:border-blue-500 focus:outline-none" />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-bold text-slate-600">QR Code รับเงิน</label>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 p-3 hover:border-blue-400"
                        >
                            {form.qr_code_url ? (
                                <img src={form.qr_code_url} alt="QR" className="h-14 w-14 rounded-lg object-cover" />
                            ) : (
                                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-slate-300"><Upload size={18} /></div>
                            )}
                            <span className="text-sm font-semibold text-slate-500">{uploading ? "กำลังอัปโหลด..." : "คลิกเพื่อเลือกไฟล์ QR Code"}</span>
                        </div>
                        <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileChange} className="hidden" />
                    </div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                        เปิดใช้งานบัญชีนี้
                    </label>

                    <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">ยกเลิก</button>
                        <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                            {saving ? "กำลังบันทึก..." : "บันทึก"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
