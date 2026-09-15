import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-slate-50 print:h-auto print:block print:overflow-visible print:bg-white">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden print:h-auto print:block print:overflow-visible">
        {/* Top header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto flex flex-col min-h-0 print:h-auto print:block print:overflow-visible">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
