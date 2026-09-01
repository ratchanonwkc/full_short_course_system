import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  CalendarRange,
  Users,
  GraduationCap,
  BookMarked,
  UserCheck,
  UserPlus,
  Receipt,
  Landmark,
  ShieldAlert,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { normalizeRole } from '../auth/ProtectedRoute';

const menuSections = [
  {
    title: 'ภาพรวมระบบ',
    roles: ['admin', 'planning', 'registrar', 'finance'],
    items: [
      { name: 'Dashboard ภาพรวม', to: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'planning', 'registrar', 'finance'] },
    ],
  },
  {
    title: 'งานแผนงานและวิชาการ (Planning & Academic)',
    roles: ['admin', 'planning', 'registrar'],
    items: [
      { name: 'หลักสูตรและสาขาวิชา', to: '/academic-structure', icon: BookOpen, roles: ['admin', 'planning', 'registrar'] },
      { name: 'จัดการรายวิชา', to: '/subjects', icon: BookMarked, roles: ['admin', 'planning', 'registrar'] },
      { name: 'ข้อมูลอาจารย์ผู้สอน', to: '/teachers', icon: GraduationCap, roles: ['admin', 'planning', 'registrar'] },
      { name: 'จัดการรุ่นการเรียน', to: '/batches', icon: CalendarRange, roles: ['admin', 'planning', 'registrar'] },
      { name: 'จัดการกลุ่มเรียน', to: '/planning/study-groups', icon: Users, roles: ['admin', 'planning', 'registrar'] },
    ],
  },
  {
    title: 'งานทะเบียน (Registrar)',
    roles: ['admin', 'registrar', 'planning'],
    items: [
      { name: 'รายชื่อผู้สมัครและจัดกลุ่ม', to: '/registrar/enrollments', icon: UserCheck, roles: ['admin', 'registrar', 'planning'] },
      // { name: 'รับสมัครหน้าเคาน์เตอร์ (Walk-in)', to: '/registrar/enrollments', icon: UserPlus, roles: ['admin', 'registrar', 'planning'] },
    ],
  },
  {
    title: 'งานการเงิน (Finance)',
    roles: ['admin', 'finance'],
    items: [
      { name: 'ตรวจสอบการชำระเงิน', to: '/finance/verification', icon: Receipt, roles: ['admin', 'finance'] },
      { name: 'ตั้งค่าบัญชีรับเงิน', to: '/finance/payment-methods', icon: Landmark, roles: ['admin', 'finance'] },
    ],
  },
  {
    title: 'ผู้ดูแลระบบ (Admin)',
    roles: ['admin'],
    items: [
      { name: 'จัดการผู้ใช้งาน', to: '/admin/users', icon: ShieldAlert, roles: ['admin'] },
      { name: 'ประวัติการใช้งาน (Audit Logs)', to: '/admin/audit-logs', icon: ScrollText, roles: ['admin'] },
    ],
  },
];

const ROLE_LABELS = {
  admin: 'ผู้ดูแลระบบ (Admin)',
  planning: 'ฝ่ายแผนงาน (Planning)',
  registrar: 'ฝ่ายทะเบียน (Registrar)',
  finance: 'ฝ่ายการเงิน (Finance)',
};

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const toggle = () => setCollapsed((c) => !c);

  const currentRole = normalizeRole(user?.role);

  // Filter sections and items based on role
  const visibleSections = menuSections
    .map((section) => {
      const isSectionAllowed = !section.roles || currentRole === 'admin' || section.roles.includes(currentRole);
      if (!isSectionAllowed) return null;

      const visibleItems = section.items.filter((item) => {
        if (!item.roles) return true;
        if (currentRole === 'admin') return true;
        return item.roles.includes(currentRole);
      });

      if (visibleItems.length === 0) return null;
      return { ...section, items: visibleItems };
    })
    .filter(Boolean);

  return (
    <aside
      className={`bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out shrink-0 select-none shadow-xl ${collapsed ? 'w-20' : 'w-64'
        }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 ring-1 ring-white/20">
            <GraduationCap size={22} strokeWidth={2.2} />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white tracking-tight truncate">
                Short Course ERP
              </span>
              <span className="text-[11px] font-medium text-blue-400 truncate flex items-center gap-1">
                <Sparkles size={10} /> ระบบทะเบียน &amp; หลักสูตร
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={toggle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
          title={collapsed ? 'ขยายแถบเมนู' : 'ย่อแถบเมนู'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Role Badge Indicator */}
      {!collapsed && user && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-between">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider truncate">
              {ROLE_LABELS[currentRole] || currentRole}
            </span>
            <span className="text-xs font-semibold text-slate-200 truncate">
              {user.name || 'ผู้ใช้งาน'}
            </span>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
        </div>
      )}

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5 scrollbar-thin scrollbar-thumb-slate-700">
        {visibleSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed ? (
              <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {section.title}
              </h3>
            ) : (
              <div className="h-px bg-slate-800 my-2 mx-1" />
            )}

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.to}
                    end={item.to === '/batches' || item.to === '/dashboard'}
                    title={collapsed ? item.name : undefined}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-all duration-150 ${isActive
                        ? 'bg-blue-600/20 text-white font-semibold shadow-sm border-l-4 border-blue-500 pl-2.5'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                      }`
                    }
                  >
                    <Icon
                      size={18}
                      className="flex-shrink-0 transition-transform duration-150 group-hover:scale-105"
                    />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

