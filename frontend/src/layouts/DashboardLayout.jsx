import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, LogOut, Menu, X, BookOpenCheck } from 'lucide-react';
import { logout } from '../services/authService';

const DashboardLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/host/dashboard', icon: LayoutDashboard },
    { name: 'My Exams', path: '/host/my-exams', icon: FileText },
    { name: 'Create Exam', path: '/host/create-exam', icon: FileText },
    // Settings can be added later
  ];

  return (
    <div className="min-h-screen bg-[#F3EDE0] flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-[#362E20] text-[#F3EDE0] flex items-center justify-between p-4 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <BookOpenCheck className="w-6 h-6 text-brand-400" />
          AssessMate
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-secondary-200">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#362E20] text-[#F3EDE0] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        {/* Sidebar Header */}
        <div className="p-6 hidden md:flex items-center gap-3 border-b border-secondary-700/50">
          <div className="bg-brand-500/20 p-2 rounded-lg">
            <BookOpenCheck className="w-7 h-7 text-brand-400" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight">AssessMate</span>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-900/20' 
                  : 'text-secondary-200 hover:bg-secondary-800/50 hover:text-[#F3EDE0]'}
              `}
            >
              <item.icon className={`w-5 h-5`} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-secondary-700/50">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-secondary-300 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-colors duration-200"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-[#362E20]/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-[#DEC430] rounded-full blur-[140px] opacity-10 pointer-events-none"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-brand-500 rounded-full blur-[140px] opacity-10 pointer-events-none"></div>
        
        <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12 z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
