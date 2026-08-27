import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext";

/**
 * LoginFormModal
 * -------------------------------------------------------------------------
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onLoginSuccess: (userData) => void   -> called with { name, role, token } on success
 */
export default function LoginFormModal({ isOpen, onClose, onLoginSuccess }) {
    const { loginWithEmail } = useAuth();
    const [form, setForm] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const validate = () => {
        const next = {};
        if (!form.email.trim()) next.email = "กรุณากรอกอีเมล";
        else if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "รูปแบบอีเมลไม่ถูกต้อง";
        if (!form.password) next.password = "กรุณากรอกรหัสผ่าน";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            // เรียกเข้าสู่ระบบด้วย Supabase Auth
            const authData = await loginWithEmail(form.email, form.password);

            onLoginSuccess?.(authData?.user);
            setForm({ email: "", password: "" });
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "เข้าสู่ระบบไม่สำเร็จ",
                text: err.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
                confirmButtonColor: "#0270c7",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setForm({ email: "", password: "" });
        setErrors({});
        onClose?.();
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={handleClose}>
                {/* Overlay */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-950/60" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                {/* Close button */}
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                >
                                    <X size={18} />
                                </button>

                                <div className="mb-6 text-center">
                                    <Dialog.Title className="text-lg font-bold text-slate-900">
                                        เข้าสู่ระบบ
                                    </Dialog.Title>
                                    <p className="mt-1 text-sm text-slate-500">
                                        ระบบบริหารจัดการงานทะเบียนและหลักสูตร
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                                    {/* Email */}
                                    <div>
                                        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                                            อีเมล
                                        </label>
                                        <div className="relative">
                                            <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                id="email"
                                                type="email"
                                                autoComplete="username"
                                                value={form.email}
                                                onChange={handleChange("email")}
                                                placeholder="name@example.com"
                                                className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500/40 ${errors.email ? "border-red-400 focus:border-red-400" : "border-slate-300 focus:border-blue-500"
                                                    }`}
                                            />
                                        </div>
                                        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                                            รหัสผ่าน
                                        </label>
                                        <div className="relative">
                                            <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                autoComplete="current-password"
                                                value={form.password}
                                                onChange={handleChange("password")}
                                                placeholder="••••••••"
                                                className={`w-full rounded-lg border py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500/40 ${errors.password ? "border-red-400 focus:border-red-400" : "border-slate-300 focus:border-blue-500"
                                                    }`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                tabIndex={-1}
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isSubmitting ? (
                                            "กำลังเข้าสู่ระบบ..."
                                        ) : (
                                            <>
                                                <LogIn size={16} />
                                                เข้าสู่ระบบ
                                            </>
                                        )}
                                    </button>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}