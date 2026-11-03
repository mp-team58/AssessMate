import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, PlusCircle, User, LogOut, Menu, X, BookOpenCheck } from 'lucide-react';
import { logout } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { prefetchRoute, prefetchCommonRoutes } from '../utils/prefetch';
import ContentSkeleton from '../components/ui/ContentSkeleton';

const DashboardLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { confirm } = useConfirm();

  const { pathname } = useLocation();

  // Close the mobile menu after navigating, and when Escape is pressed
  useEffect(() => { setIsMobileMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setIsMobileMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobileMenuOpen]);

  // Preload common host pages during browser idle time for near-instant navigation
  useEffect(() => {
    prefetchCommonRoutes('HOST');
  }, []);

  const handleLogout = async () => {
    const isConfirmed = await confirm({
      title: 'Confirm Logout',
      message: 'Are you sure you want to sign out?',
      confirmText: 'Logout',
      cancelText: 'Cancel',
      isDanger: true,
    });
    if (isConfirmed) {
      logout();
      navigate('/login');
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/host/dashboard', icon: LayoutDashboard },
    { name: 'My Exams', path: '/host/my-exams', icon: FileText },
    { name: 'Create Exam', path: '/host/create-exam', icon: PlusCircle },
    { name: 'Question Bank', path: '/host/question-bank', icon: BookOpenCheck },
  ];

  return (
    <div className="h-screen supports-[height:100dvh]:h-dvh overflow-hidden bg-[#F1F4F2] flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-[#16241F] text-[#F1F4F2] flex items-center justify-between p-4 sticky top-0 z-50 shadow-md">
        <Link to="/host/dashboard" className="flex items-center gap-2 font-bold text-xl tracking-tight" aria-label="AssessMate home">
          <BookOpenCheck className="w-6 h-6 text-brand-400" />
          AssessMate
        </Link>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-secondary-200" aria-label="Toggle navigation menu" aria-expanded={isMobileMenuOpen}>
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#16241F] text-[#F1F4F2] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col pt-16 md:pt-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        {/* Sidebar Header */}
        <Link to="/host/dashboard" className="p-6 hidden md:flex items-center gap-3 border-b border-secondary-700/50 hover:bg-white/5 transition-colors" aria-label="AssessMate home">
          <div className="bg-brand-500/20 p-2.5 rounded-xl border border-brand-400/30 shadow-inner flex items-center justify-center flex-shrink-0">
            <BookOpenCheck className="w-7 h-7 text-brand-400" />
          </div>
          <div>
            <span className="text-2xl font-extrabold tracking-tight block leading-tight">AssessMate</span>
            <span className="text-xs text-brand-300 font-semibold tracking-wider uppercase">HOST</span>
          </div>
        </Link>

        {/* Sidebar Links */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onMouseEnter={() => prefetchRoute(item.path)}
              onFocus={() => prefetchRoute(item.path)}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-900/20' 
                  : 'text-secondary-200 hover:bg-secondary-800/50 hover:text-[#F1F4F2]'}
              `}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer with Host Profile & Sign Out */}
        <div className="p-4 border-t border-secondary-700/50 space-y-2">
          <NavLink 
            to="/host/profile"
            onMouseEnter={() => prefetchRoute('/host/profile')}
            onFocus={() => prefetchRoute('/host/profile')}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) => `
              px-4 py-3 rounded-xl border flex items-center gap-3 w-full text-left cursor-pointer transition-all duration-200
              ${isActive
                ? 'bg-secondary-900 border-brand-500 text-[#F1F4F2]'
                : 'bg-secondary-900/50 border-secondary-700/50 hover:bg-secondary-800 text-secondary-200'}
            `}
          >
            <div className="w-9 h-9 rounded-lg bg-brand-500/25 border border-brand-400/40 text-brand-300 font-bold flex items-center justify-center text-sm flex-shrink-0">
              {user?.name ? user.name[0].toUpperCase() : 'H'}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-bold text-[#F1F4F2] truncate">{user?.name || 'Host'}</p>
              <p className="text-xs text-secondary-400 font-medium flex items-center gap-1">
                <User className="w-3 h-3 text-brand-400" />
                Profile
              </p>
            </div>
          </NavLink>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-secondary-300 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-colors duration-200"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-[#16241F]/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main id="app-scroll-container" className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative h-full">
        {/* Decorative glows - clipped so they can never cause sideways scrolling */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-[#C0562C] rounded-full blur-[140px] opacity-10 pointer-events-none"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-brand-500 rounded-full blur-[140px] opacity-10 pointer-events-none"></div>
        </div>
        
        <div className="flex-1 p-4 md:p-6 lg:p-8 z-10 w-full">
          <React.Suspense fallback={<ContentSkeleton />}>
            <Outlet />
          </React.Suspense>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
