import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { GraduationCap, LogIn, Menu, X } from 'lucide-react';
import LoginFormModal from '../../features/auth/components/LoginFormModal';
import Swal from 'sweetalert2';

/**
 * PublicLayout - Top-navigation layout for student / public-facing pages.
 * Renders a sticky top nav with logo, menu links, and a staff login button.
 */
export default function PublicLayout() {
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'วิชาที่เปิดรับสมัคร', end: true },
    { to: '/track', label: 'ตรวจสอบสถานะการสมัคร', end: false },
  ];

  const handleLoginSuccess = () => {
    setLoginOpen(false);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'เข้าสู่ระบบสำเร็จ',
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
    });
    navigate('/dashboard');
  };

  const activeCls = 'text-blue-600 font-bold border-b-2 border-blue-600 pb-1';
  const inactiveCls = 'text-slate-600 hover:text-blue-600 font-semibold transition pb-1';

  return (
    <>
      {/* ── Top Navigation Bar ─────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white shadow-xs">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

          {/* Logo + System name */}
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <GraduationCap size={20} strokeWidth={2.2} />
            </span>
            <p className="text-sm font-bold text-slate-900 sm:text-base leading-tight">
              สมัครเรียนวิชาชีพระยะสั้นออนไลน์
            </p>
          </Link>

          {/* Desktop nav links */}
          <ul className="hidden md:flex items-center gap-7 text-sm font-medium">
            {navLinks.map(({ to, label, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) => (isActive ? activeCls : inactiveCls)}
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Right side: staff login + hamburger */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
            >
              <LogIn size={16} />
              <span className="hidden sm:inline">เข้าสู่ระบบเจ้าหน้าที่</span>
              <span className="sm:hidden">เข้าสู่ระบบ</span>
            </button>

            <button
              type="button"
              className="md:hidden p-2 text-slate-600 hover:text-blue-600 transition"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3">
            <ul className="flex flex-col gap-3 text-sm font-medium">
              {navLinks.map(({ to, label, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => (isActive ? activeCls : inactiveCls)}
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      {/* ── Page content ────────────────────────────────────── */}
      <main className="min-h-[calc(100vh-4rem)]">
        <Outlet />
      </main>

      {/* ── Login modal ─────────────────────────────────────── */}
      <LoginFormModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
}
