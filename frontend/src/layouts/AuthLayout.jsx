import React from 'react';
import { BookOpenCheck } from 'lucide-react';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex">
      {/* Left Marketing Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-600 text-white p-12 flex-col relative overflow-hidden">
        {/* Logo positioned at the top left */}
        <div className="relative z-10 flex items-center gap-2 text-xl font-bold mb-16">
          <BookOpenCheck className="w-8 h-8" />
          AssessAI
        </div>

        <h1 className="text-5xl font-extrabold mb-6 leading-tight">
          Intelligent assessment,<br />
          uncompromised integrity.
        </h1>
        <p className="text-brand-100 text-xl max-w-lg leading-relaxed">
          AI powered quiz generation and real-time proctoring. Create assessments in seconds and ensure fair play with advanced vision algorithms.
        </p>

        {/* Decorative background shapes */}
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-brand-500 rounded-full blur-3xl opacity-50 mix-blend-multiply"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-brand-700 rounded-full blur-3xl opacity-50 mix-blend-multiply"></div>
      </div>
      {/* Right Form Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-white lg:rounded-l-3xl shadow-[-10px_0_30px_rgba(0,0,0,0.05)] lg:-ml-6 z-20">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div >
  );
};

export default AuthLayout;
