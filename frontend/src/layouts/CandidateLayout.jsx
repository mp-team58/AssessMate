import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Award,
  TrendingUp,
  User,
  LogOut,
  Menu,
  X,
  BookOpenCheck,
  KeyRound
} from 'lucide-react';
import { logout } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import useModalScrollLock from '../hooks/useModalScrollLock';
import { prefetchRoute, prefetchCommonRoutes } from '../utils/prefetch';
import ContentSkeleton from '../components/ui/ContentSkeleton';
import ErrorBoundary from '../components/ErrorBoundary';

const CandidateLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const menuTriggerRef = useRef(null);

  const { pathname } = useLocation();

  // Scroll locking for mobile drawer
  useModalScrollLock(isMobileMenuOpen);

  // Close the mobile menu after navigating, and when Escape is pressed
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        menuTriggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobileMenuOpen]);

  // Preload common candidate pages during browser idle time for near-instant navigation
  useEffect(() => {
    prefetchCommonRoutes('CANDIDATE');
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
    { name: 'Dashboard', path: '/candidate/dashboard', icon: LayoutDashboard },
    { name: 'Assessments', path: '/candidate/my-assessments', icon: FileText },
    { name: 'Results', path: '/candidate/results', icon: Award },
    { name: 'Performance', path: '/candidate/performance', icon: TrendingUp },
  ];

  return (
    <div className="h-screen supports-[height:100dvh]:h-dvh overflow-hidden bg-surface flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <header className="md:hidden bg-[#16241F] text-[#F1F4F2] flex items-center justify-between px-4 py-3.5 sticky top-0 z-50 shadow-md border-b border-secondary-800">
        <Link
          to="/candidate/dashboard"
          className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-white focus:outline-none focus:ring-2 focus:ring-brand-400 rounded-lg p-1"
          aria-label="AssessMate Candidate Home"
        >
          <div className="bg-brand-500/20 p-1.5 rounded-lg border border-brand-400/30">
            <BookOpenCheck className="w-5 h-5 text-brand-400" />
          </div>
          <span>AssessMate</span>
        </Link>
        <button
          ref={menuTriggerRef}
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-secondary-200 hover:text-white hover:bg-secondary-800/80 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400"
          aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileMenuOpen}
          aria-controls="candidate-mobile-drawer"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside
        id="candidate-mobile-drawer"
        role="navigation"
        aria-label="Candidate Portal Navigation"
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-[#16241F] text-[#F1F4F2] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col pt-14 md:pt-0 border-r border-secondary-800
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0
        `}
      >
        {/* Desktop Sidebar Header */}
        <Link
          to="/candidate/dashboard"
          className="p-6 hidden md:flex items-center gap-3 border-b border-secondary-700/50 hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400"
          aria-label="AssessMate Candidate Home"
        >
          <div className="bg-brand-500/20 p-2.5 rounded-xl border border-brand-400/30 shadow-inner flex items-center justify-center flex-shrink-0">
            <BookOpenCheck className="w-7 h-7 text-brand-400" />
          </div>
          <div>
            <span className="text-2xl font-extrabold tracking-tight block leading-tight text-white">AssessMate</span>
            <span className="text-xs text-brand-300 font-semibold tracking-wider uppercase">CANDIDATE</span>
          </div>
        </Link>

        {/* Sidebar Links */}
        <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onMouseEnter={() => prefetchRoute(item.path)}
              onFocus={() => prefetchRoute(item.path)}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-400
                ${
                  isActive
                    ? 'bg-[#2F6F4E] text-white shadow-md shadow-black/20 font-semibold'
                    : 'text-secondary-300 hover:bg-white/10 hover:text-[#F1F4F2]'
                }
              `}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          ))}

          {/* Quick Join Link */}
          <NavLink
            to="/candidate/join"
            onMouseEnter={() => prefetchRoute('/candidate/join')}
            onFocus={() => prefetchRoute('/candidate/join')}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-bold transition-all duration-200 mt-3 focus:outline-none focus:ring-2 focus:ring-amber-300
              ${
                isActive
                  ? 'bg-amber-400 text-[#16241F] shadow-md'
                  : 'text-amber-300 hover:bg-amber-400/15 hover:text-amber-200 border border-amber-400/30'
              }
            `}
          >
            <KeyRound className="w-5 h-5 flex-shrink-0" />
            <span>Join Assessment</span>
          </NavLink>
        </nav>

        {/* Sidebar Footer with Candidate Profile & Sign Out */}
        <div className="p-4 border-t border-secondary-700/50 space-y-2">
          <NavLink
            to="/candidate/profile"
            onMouseEnter={() => prefetchRoute('/candidate/profile')}
            onFocus={() => prefetchRoute('/candidate/profile')}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) => `
              px-4 py-3 rounded-xl border flex items-center gap-3 w-full text-left cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-400
              ${
                isActive
                  ? 'bg-secondary-900 border-brand-500 text-white'
                  : 'bg-secondary-900/60 border-secondary-800 hover:bg-secondary-800 text-secondary-200'
              }
            `}
          >
            <div className="w-9 h-9 rounded-lg bg-brand-500/25 border border-brand-400/40 text-brand-300 font-bold flex items-center justify-center text-sm flex-shrink-0">
              {user?.name ? user.name[0].toUpperCase() : 'C'}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-bold text-[#F1F4F2] truncate">{user?.name || 'Candidate'}</p>
              <p className="text-xs text-secondary-400 font-medium flex items-center gap-1">
                <User className="w-3 h-3 text-brand-400" />
                Profile
              </p>
            </div>
          </NavLink>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-secondary-300 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 cursor-pointer text-[15px]"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-[#16241F]/60 backdrop-blur-xs z-30 md:hidden animate-in fade-in duration-200"
          onClick={() => {
            setIsMobileMenuOpen(false);
            menuTriggerRef.current?.focus();
          }}
          aria-hidden="true"
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

export default CandidateLayout;
