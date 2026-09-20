import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Library, Users, TrendingUp, Calendar } from 'lucide-react';

const HostDashboard = () => {
  return (
    <div className="w-full h-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 p-10 text-white shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Welcome back to AssessMate
          </h1>
          <p className="text-brand-100 text-lg md:text-xl mb-8 leading-relaxed opacity-90">
            Manage your assessments, monitor candidate progress, and discover insights all from your central command center.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link 
              to="/host/create-exam"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-brand-900 rounded-xl font-bold hover:bg-brand-50 hover:scale-105 transition-all shadow-lg"
            >
              <PlusCircle className="w-5 h-5" />
              Create New Exam
            </Link>
            <Link 
              to="/host/question-bank"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-800/50 backdrop-blur-sm border border-brand-400/30 text-white rounded-xl font-bold hover:bg-brand-700/50 transition-all"
            >
              <Library className="w-5 h-5" />
              Question Bank
            </Link>
          </div>
        </div>
        
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-brand-500 blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-0 right-40 -mb-20 w-72 h-72 rounded-full bg-brand-400 blur-3xl opacity-20"></div>
      </div>

      {/* Stats Overview */}
      <div>
        <h2 className="text-2xl font-bold text-secondary-800 mb-6 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-brand-600" />
          Quick Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 flex items-start gap-4 group hover:shadow-md hover:border-brand-300 transition-all">
            <div className="p-4 bg-[#F8F5F0] text-brand-700 border border-[#EBE3D5] rounded-xl group-hover:scale-110 transition-transform shadow-sm">
              <Library className="w-8 h-8" />
            </div>
            <div>
              <p className="text-secondary-600 font-semibold mb-1">Total Exams</p>
              <h3 className="text-3xl font-extrabold text-[#362E20]">12</h3>
              <p className="text-sm text-emerald-600 mt-2 font-medium flex items-center gap-1">
                +2 this week
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 flex items-start gap-4 group hover:shadow-md hover:border-brand-300 transition-all">
            <div className="p-4 bg-[#F8F5F0] text-brand-700 border border-[#EBE3D5] rounded-xl group-hover:scale-110 transition-transform shadow-sm">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <p className="text-secondary-600 font-semibold mb-1">Active Candidates</p>
              <h3 className="text-3xl font-extrabold text-[#362E20]">348</h3>
              <p className="text-sm text-emerald-600 mt-2 font-medium flex items-center gap-1">
                +15% from last month
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 flex items-start gap-4 group hover:shadow-md hover:border-brand-300 transition-all">
            <div className="p-4 bg-[#F8F5F0] text-brand-700 border border-[#EBE3D5] rounded-xl group-hover:scale-110 transition-transform shadow-sm">
              <Calendar className="w-8 h-8" />
            </div>
            <div>
              <p className="text-secondary-600 font-semibold mb-1">Upcoming Events</p>
              <h3 className="text-3xl font-extrabold text-[#362E20]">3</h3>
              <p className="text-sm text-secondary-500 mt-2 font-medium">
                Scheduled for this week
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostDashboard;
