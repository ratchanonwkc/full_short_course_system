import { useLocation } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../../features/auth/context/AuthContext';

function generateTitle(pathname) {
  if (pathname === '/' || pathname === '/dashboard') return 'Dashboard';
  const parts = pathname.split('/').filter(Boolean);
  return parts
    .map((p) => p.replace(/_/g, ' '))
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' / ');
}

export default function Header() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'ออกจากระบบ?',
      text: 'คุณต้องการออกจากระบบใช่หรือไม่',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ออกจากระบบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#0270c7',
      cancelButtonColor: '#6b7280',
    });
    if (result.isConfirmed) {
      await logout();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'ออกจากระบบเรียบร้อยแล้ว',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
    }
  };

  const title = generateTitle(location.pathname);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 py-2">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      {user && (
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 text-sm text-slate-600">
            <User size={16} className="text-slate-500" />
            {user.name}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <LogOut size={14} />
            ออกจากระบบ
          </button>
        </div>
      )}
    </header>
  );
}
