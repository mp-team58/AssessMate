import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  FileText, 
  ShieldAlert, 
  History, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  ShieldCheck
} from 'lucide-react';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const adminName = localStorage.getItem('name') || 'Administrator';
  const adminEmail = localStorage.getItem('email') || 'admin@assessmate.com';

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/admin', { replace: true });
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'All Users', path: '/admin/users', icon: Users },
    { name: 'Hosts', path: '/admin/hosts', icon: ShieldCheck },
    { name: 'Candidates', path: '/admin/candidates', icon: GraduationCap },
    { name: 'Exams', path: '/admin/exams', icon: FileText },
    { name: 'Activity Log', path: '/admin/activity', icon: History },
    { name: 'Admins & Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F4] flex flex-col md:flex-row text-[#16241F] font-sans antialiased">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#16241F] text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#2F6F4E] flex items-center justify-center font-bold text-white text-base">
            A
          </div>
          <span className="font-serif font-bold text-lg tracking-tight">AssessMate</span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-700/50">
            Admin
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10"
          aria-label="Toggle navigation"
        >
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Sidebar Overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-[#16241F] text-gray-300 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo / Brand Header */}
          <div className="px-6 py-6 border-b border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2F6F4E] flex items-center justify-center font-bold text-white text-lg shadow-sm">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-xl text-white tracking-tight">AssessMate</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/40 inline-block mt-0.5">
                Admin Portal
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                      isActive
                        ? 'bg-[#2F6F4E] text-white shadow-sm'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="p-4 border-t border-white/10">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-semibold text-white truncate">{adminName}</p>
            <p className="text-[11px] text-gray-400 truncate">{adminEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200 transition font-medium"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

