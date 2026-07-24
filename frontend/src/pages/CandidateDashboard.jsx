import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, BookOpenCheck, Search } from 'lucide-react';
import { logout } from '../services/authService';

const CandidateDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F3EDE0] font-sans">
      
      {/* Header */}
      <header className="bg-[#362E20] text-[#F3EDE0] p-4 md:px-8 shadow-md flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500/20 p-2 rounded-lg">
            <BookOpenCheck className="w-6 h-6 text-brand-400" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">AssessMate</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium hidden md:block">
            Candidate Portal
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-secondary-300 hover:text-white bg-secondary-800 hover:bg-secondary-700 rounded-xl transition-all font-medium text-sm border border-secondary-700"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6 md:p-12 relative overflow-hidden">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#DEC430] rounded-full blur-[140px] opacity-10 pointer-events-none"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-brand-500 rounded-full blur-[140px] opacity-10 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="mb-10 text-center md:text-left">
            <h1 className="text-4xl font-extrabold text-secondary-900 tracking-tight mb-3">Welcome, Candidate!</h1>
          </div>
        </div>
      </main>

    </div>
  );
};

export default CandidateDashboard;
