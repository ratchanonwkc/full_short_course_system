import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto flex flex-col min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
