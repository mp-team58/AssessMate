import React from 'react';
import { BookOpenCheck } from 'lucide-react';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F3EDE0] flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
      
      {/* Decorative large circles on the orange background to make it less flat */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#DEC430] rounded-full blur-[120px] opacity-20"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-brand-500 rounded-full blur-[120px] opacity-20"></div>

      {/* Floating App Window */}
      <div className="relative w-full max-w-5xl bg-[#ffffff] rounded-[2rem] shadow-2xl flex flex-col lg:flex-row overflow-hidden min-h-[700px] z-10 border border-secondary-200">
        
        {/* Left Marketing Panel (Light Theme) */}
        <div className="hidden lg:flex lg:w-1/2 bg-[#ffffff] p-12 xl:p-16 flex-col justify-between border-r border-secondary-100">
          
          {/* Logo */}
          <div className="flex items-center gap-3 text-2xl font-bold tracking-tight text-secondary-900">
            <BookOpenCheck className="w-10 h-10 text-brand-500" />
            <span>AssessMate<span className="text-brand-500">.</span></span>
          </div>

          <div className="mt-12 mb-auto pr-4">
            <h1 className="text-4xl lg:text-5xl font-extrabold mb-6 leading-[1.2] text-secondary-900 tracking-tight">
              Intelligent assessment, <br className="hidden xl:block" />
              <span className="text-brand-500">uncompromised</span> integrity.
            </h1>
            <p className="text-secondary-500 text-lg leading-relaxed font-medium">
              Create assessments in seconds and ensure fair play with our advanced vision algorithms.
            </p>
          </div>
          
          <div className="text-sm font-medium text-secondary-400 mt-12">
            © {new Date().getFullYear()} AssessMate. All rights reserved.
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-16 bg-[#ffffff] relative">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>

      </div>
    </div >
  );
};

export default AuthLayout;
