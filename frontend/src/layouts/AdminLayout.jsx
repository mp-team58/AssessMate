import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  GraduationCap,
  FileText,
  History,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  BookOpenCheck
} from 'lucide-react';
import { logout } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import ContentSkeleton from '../components/ui/ContentSkeleton';
import ErrorBoundary from '../components/ErrorBoundary';

const AdminLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { pathname } = useLocation();

  useEffect(() => { setIsMobileMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setIsMobileMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    const isConfirmed = await confirm({
      title: 'Confirm Logout',
      message: 'Are you sure you want to sign out from the Admin Portal?',
      confirmText: 'Logout',
      cancelText: 'Cancel',
      isDanger: true,
    });
    if (isConfirmed) {
      logout();
      navigate('/admin');
    }
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
    <div className="h-screen supports-[height:100dvh]:h-dvh overflow-hidden bg-surface flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-[#16241F] text-[#F1F4F2] flex items-center justify-between p-4 sticky top-0 z-50 shadow-md">
        <Link to="/admin/dashboard" className="flex items-center gap-2 font-bold text-xl tracking-tight" aria-label="AssessMate home">
          <BookOpenCheck className="w-6 h-6 text-brand-400" />
          AssessMate
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-secondary-200 hover:text-white rounded-lg transition-colors"
          aria-label="Toggle Navigation Menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="admin-sidebar-nav"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside id="admin-sidebar-nav" aria-label="Admin Navigation"
        className={`
          fixed inset-y-0 left-0 z-40 w-64 flex-shrink-0 bg-[#16241F] text-[#F1F4F2] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col pt-16 md:pt-0 border-r border-secondary-800/70
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0
        `}
      >
        {/* Sidebar Header */}
        <Link to="/admin/dashboard" className="p-6 hidden md:flex items-center gap-3 border-b border-secondary-700/50 hover:bg-white/5 transition-colors" aria-label="AssessMate home">
          <div className="bg-brand-500/20 p-2.5 rounded-xl border border-brand-400/30 shadow-inner flex items-center justify-center flex-shrink-0">
            <BookOpenCheck className="w-7 h-7 text-brand-400" />
          </div>
          <div>
            <span className="text-2xl font-extrabold tracking-tight block leading-tight text-white">AssessMate</span>
            <span className="text-xs text-brand-300 font-semibold tracking-wider uppercase">ADMIN</span>
          </div>
        </Link>

        {/* Sidebar Links */}
        <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-200
                ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-900/20 font-semibold'
                    : 'text-secondary-200 hover:bg-secondary-800/60 hover:text-[#F1F4F2]'
                }
              `}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer with Admin Profile & Sign Out */}
        <div className="p-4 border-t border-secondary-700/50 space-y-2">
          <NavLink
            to="/admin/profile"
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) => `
              px-4 py-3 rounded-xl border flex items-center gap-3 w-full text-left cursor-pointer transition-all duration-200
              ${
                isActive
                  ? 'bg-secondary-900 border-brand-500 text-[#F1F4F2]'
                  : 'bg-secondary-900/50 border-secondary-700/50 hover:bg-secondary-800 text-secondary-200'
              }
            `}
          >
            <div className="w-9 h-9 rounded-lg bg-brand-500/25 border border-brand-400/40 text-brand-300 font-bold flex items-center justify-center text-sm flex-shrink-0">
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-bold text-[#F1F4F2] truncate">{user?.name || 'Administrator'}</p>
              <p className="text-xs text-secondary-400 font-medium flex items-center gap-1">
                <User className="w-3 h-3 text-brand-400" />
                Profile
              </p>
            </div>
          </NavLink>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-secondary-300 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-colors duration-200 cursor-pointer text-[15px]"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-[#16241F]/60 backdrop-blur-sm z-30 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main id="app-scroll-container" className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative h-full">
        <div className="flex-1 p-3 xs:p-4 sm:p-6 lg:p-8 xl:p-10 z-10 w-full max-w-[1600px] mx-auto">
          <React.Suspense fallback={<ContentSkeleton />}>
            <ErrorBoundary routeLevel>
              <Outlet />
            </ErrorBoundary>
          </React.Suspense>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
