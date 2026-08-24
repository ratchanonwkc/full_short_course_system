import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';

export default function ProtectedRoute() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="text-center">
                    {/* Modern dynamic spinner */}
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    <p className="mt-4 text-sm font-medium text-slate-500">กำลังตรวจสอบสิทธิ์...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        // หากไม่ได้เข้าสู่ระบบ ให้กลับไปหน้าแรกทันที
        return <Navigate to="/" replace />;
    }

    // หากเข้าสู่ระบบแล้ว เรนเดอร์หน้าเว็บย่อยตามปกติ
    return <Outlet />;
}
