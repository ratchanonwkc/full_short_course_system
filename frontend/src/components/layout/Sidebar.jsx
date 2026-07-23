import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Calendar,
  BookOpen,
  Book,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'Teachers', to: '/teachers', icon: GraduationCap },
  { name: 'Batches', to: '/batches', icon: Calendar },
  { name: 'Majors', to: '/majors', icon: BookOpen },
  { name: 'Subjects', to: '/subjects', icon: Book },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const toggle = () => setCollapsed((c) => !c);

  return (
    <aside
      className={`bg-white border-r border-slate-200 flex flex-col transition-width duration-300 ease-in-out ${collapsed ? 'w-20' : 'w-64'
        }`}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <LayoutDashboard size={20} strokeWidth={2.2} />
          </div>
          {!collapsed && <span className="text-sm font-bold text-slate-900">ทะเบียน &amp; หลักสูตร</span>}
        </div>
        <button
          type="button"
          onClick={toggle}
          className="p-1 rounded hover:bg-slate-100 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="h-4 w-4 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
            {collapsed ? <path d="M6 8l4 4 4-4" /> : <path d="M14 12l-4-4-4 4" />}
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-md transition-colors hover:bg-slate-100 ${isActive ? 'bg-indigo-100 text-indigo-600' : 'text-slate-600'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
