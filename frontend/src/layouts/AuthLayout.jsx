import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpenCheck } from 'lucide-react';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
      {/* Floating App Window */}
      <div className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] flex flex-col lg:flex-row overflow-hidden min-h-[550px] z-10 border border-secondary-200/80 animate-in fade-in zoom-in-[0.98] duration-700">
        
        {/* Left Marketing Panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-surface p-10 lg:p-12 flex-col justify-between relative overflow-hidden border-r border-secondary-200/70">
          {/* Logo */}
          <Link to="/" aria-label="AssessMate home" className="relative flex items-center gap-3 text-2xl font-extrabold tracking-tight text-secondary-900 z-10 hover:scale-105 transition-transform origin-left w-fit">
            <div className="p-2 bg-brand-100 rounded-xl">
              <BookOpenCheck className="w-8 h-8 text-brand-600" />
            </div>
            <span>AssessMate<span className="text-brand-500">.</span></span>
          </Link>

          <div className="relative mt-12 mb-auto pr-4 z-10">
            <h1 className="text-4xl lg:text-5xl font-black mb-6 leading-[1.15] text-secondary-900 tracking-tighter">
              Intelligent assessment, <br className="hidden xl:block" />
              <span className="text-brand-500">uncompromised</span> integrity.
            </h1>
            <p className="text-secondary-500 text-base leading-relaxed font-medium">
              Enterprise assessment and evaluation platform with uncompromised integrity and security.
            </p>
          </div>
          
          <div className="text-sm font-medium text-secondary-400 mt-12">
            © {new Date().getFullYear()} AssessMate. All rights reserved.
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-10 bg-white relative">
          <div className="w-full max-w-md">
            <Link to="/" aria-label="AssessMate home" className="lg:hidden flex items-center justify-center gap-2 mb-8 text-xl font-extrabold tracking-tight text-secondary-900">
              <span className="p-1.5 bg-brand-100 rounded-lg">
                <BookOpenCheck className="w-6 h-6 text-brand-600" />
              </span>
              <span>AssessMate<span className="text-brand-500">.</span></span>
            </Link>
            {children}
            <p className="lg:hidden mt-8 text-center text-xs font-medium text-secondary-400">
              © {new Date().getFullYear()} AssessMate. All rights reserved.
            </p>
          </div>
        </div>

      </div>
    </div >
  );
};

export default AuthLayout;
