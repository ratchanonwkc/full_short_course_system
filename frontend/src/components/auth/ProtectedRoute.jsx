import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';

/**
 * Normalizes role string to canonical role identifier:
 * 'admin' | 'planning' | 'registrar' | 'finance'
 */
export const normalizeRole = (role) => {
    if (!role) return '';
    const r = String(role).trim().toLowerCase();
    if (r === 'admin' || r === 'administrator' || r.includes('ผู้ดูแลระบบ')) return 'admin';
    if (r === 'planning' || r.includes('แผน') || r.includes('วิชาการ')) return 'planning';
    if (r === 'registrar' || r.includes('ทะเบียน')) return 'registrar';
    if (r === 'finance' || r.includes('การเงิน')) return 'finance';
    return r;
};

/**
 * Designated landing / home paths mapped to each system role
 */
export const ROLE_HOME_PATHS = {
    admin: '/batches',
    planning: '/batches',
    registrar: '/registrar/enrollments',
    finance: '/finance/verification',
};

/**
 * Helper to get user's default landing path based on role
 */
export const getRoleHomePath = (role) => {
    const normalized = normalizeRole(role);
    return ROLE_HOME_PATHS[normalized] || '/batches';
};

/**
 * ProtectedRoute Component
 * -------------------------------------------------------------
 * @param {Array<string>} [allowedRoles] - Optional list of allowed roles (e.g. ['admin', 'finance'])
 * @param {React.ReactNode} [children]   - Optional child components if not using <Outlet />
 */
export default function ProtectedRoute({ allowedRoles, children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    // 1. Show dynamic loading state while session / auth is being verified
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent shadow-sm"></div>
                    <p className="mt-4 text-sm font-medium text-slate-500">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
                </div>
            </div>
        );
    }

    // 2. If unauthenticated, redirect to login page with return state
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 3. If role restriction is specified, verify permission
    if (allowedRoles && allowedRoles.length > 0) {
        const userRole = normalizeRole(user.role);
        const normalizedAllowed = allowedRoles.map(normalizeRole);

        const isAllowed = normalizedAllowed.includes(userRole) || userRole === 'admin';

        if (!isAllowed) {
            const redirectPath = getRoleHomePath(user.role);
            
            // Prevent recursive loop if user is already on their designated home page
            if (location.pathname === redirectPath) {
                return <Navigate to="/" replace />;
            }

            return <Navigate to={redirectPath} replace />;
        }
    }

    // 4. Render children if passed directly, or render nested Outlet
    return children ? children : <Outlet />;
}
