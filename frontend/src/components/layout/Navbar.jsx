import { useState } from "react";
import { GraduationCap, LogIn, LogOut, ChevronDown, User, LayoutDashboard } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import LoginFormModal from "../../features/auth/components/LoginFormModal";
import { useAuth } from "../../features/auth/context/AuthContext";

export default function Navbar() {
    const { user, logout } = useAuth();
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();

    const handleLoginSuccess = () => {
        setIsLoginOpen(false);
        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "เข้าสู่ระบบสำเร็จ",
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true,
        });
        // เมื่อเข้าสู่ระบบสำเร็จ ส่งไปยังหน้าจัดการรุ่นการเรียน
        navigate("/dashboard");
    };

    const handleLogoutClick = async () => {
        const result = await Swal.fire({
            title: "ออกจากระบบ?",
            text: "คุณต้องการออกจากระบบใช่หรือไม่",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ออกจากระบบ",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#0270c7",
            cancelButtonColor: "#6b7280",
            reverseButtons: true,
        });

        if (result.isConfirmed) {
            try {
                setIsMenuOpen(false);
                await logout();
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "success",
                    title: "ออกจากระบบเรียบร้อยแล้ว",
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true,
                });
                navigate("/");
            } catch (err) {
                Swal.fire({
                    icon: "error",
                    title: "เกิดข้อผิดพลาดในการออกจากระบบ",
                    text: err.message || "กรุณาลองใหม่อีกครั้ง",
                    confirmButtonColor: "#0270c7",
                });
            }
        }
    };

    return (
        <>
            <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
                <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    {/* Logo / System name */}
                    <Link to="/" className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                            <GraduationCap size={20} strokeWidth={2.2} />
                        </span>
                        <div className="leading-tight">
                            <p className="text-sm font-bold text-slate-900 sm:text-base">
                                ระบบบริหารจัดการงานทะเบียน
                            </p>
                            <p className="text-[11px] font-medium text-slate-500 sm:text-xs">
                                และหลักสูตรวิชาชีพระยะสั้น
                            </p>
                        </div>
                    </Link>

                    {/* Right side */}
                    <div className="flex items-center gap-3">
                        {user && (
                            <Link
                                to="/batches"
                                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition"
                            >
                                <LayoutDashboard size={15} />
                                รุ่นการเรียน
                            </Link>
                        )}

                        {!user ? (
                            <button
                                type="button"
                                onClick={() => setIsLoginOpen(true)}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
                            >
                                <LogIn size={16} />
                                เข้าสู่ระบบ
                            </button>
                        ) : (
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsMenuOpen((v) => !v)}
                                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                                >
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                        <User size={15} />
                                    </span>
                                    <span className="hidden sm:inline">{user.name}</span>
                                    <ChevronDown size={14} className="text-slate-400" />
                                </button>

                                {isMenuOpen && (
                                    <>
                                        {/* click-away overlay */}
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setIsMenuOpen(false)}
                                        />
                                        <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                                            <div className="border-b border-slate-100 px-4 py-2.5">
                                                <p className="truncate text-sm font-semibold text-slate-900">
                                                    {user.name}
                                                </p>
                                                {user.role && (
                                                    <p className="truncate text-xs text-slate-500">{user.role}</p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleLogoutClick}
                                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                                            >
                                                <LogOut size={15} />
                                                ออกจากระบบ
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </nav>
            </header>

            <LoginFormModal
                isOpen={isLoginOpen}
                onClose={() => setIsLoginOpen(false)}
                onLoginSuccess={handleLoginSuccess}
            />
        </>
    );
}
