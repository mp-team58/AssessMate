import React from 'react';
import { BookOpenCheck } from 'lucide-react';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
      
      {/* Dynamic decorative gradients */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-brand-400 rounded-full blur-[120px] opacity-30 animate-pulse mix-blend-multiply"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-amber-300 rounded-full blur-[120px] opacity-30 mix-blend-multiply animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Floating App Window */}
      <div className="relative w-full max-w-4xl bg-white/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col lg:flex-row overflow-hidden min-h-[550px] z-10 border border-white/50 animate-in fade-in zoom-in-[0.98] duration-700">
        
        {/* Left Marketing Panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-secondary-50/80 to-white/50 p-10 lg:p-12 flex-col justify-between relative overflow-hidden">
          
          {/* Subtle overlay grid pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMCwwLDAsMC4wNSkiLz48L3N2Zz4=')] opacity-50"></div>

          {/* Logo */}
          <div className="relative flex items-center gap-3 text-2xl font-extrabold tracking-tight text-secondary-900 z-10 hover:scale-105 transition-transform origin-left">
            <div className="p-2 bg-brand-100 rounded-xl">
              <BookOpenCheck className="w-8 h-8 text-brand-600" />
            </div>
            <span>AssessMate<span className="text-brand-500">.</span></span>
          </div>

          <div className="relative mt-12 mb-auto pr-4 z-10">
            <h1 className="text-4xl lg:text-5xl font-black mb-6 leading-[1.15] text-secondary-900 tracking-tighter">
              Intelligent assessment, <br className="hidden xl:block" />
              <span className="text-brand-500">uncompromised</span> integrity.
            </h1>
            <p className="text-secondary-500 text-base leading-relaxed font-medium">
              Create assessments in seconds and ensure fair play with our advanced vision algorithms.
            </p>
          </div>
          
          <div className="text-sm font-medium text-secondary-400 mt-12">
            © {new Date().getFullYear()} AssessMate. All rights reserved.
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-10 bg-[#ffffff] relative">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>

      </div>
    </div >
  );
};

export default AuthLayout;
