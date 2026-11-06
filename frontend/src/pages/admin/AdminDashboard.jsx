import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  ShieldCheck,
  GraduationCap,
  FileText,
  Radio,
  ArrowRight,
  Shield,
  Activity,
  UserPlus,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color = 'brand', trend, link }) => {
  const navigate = useNavigate();
  const colorMap = {
    brand: 'bg-brand-50 text-brand-600 border-brand-200/80',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
    amber: 'bg-amber-50 text-amber-600 border-amber-200/80',
    blue: 'bg-blue-50 text-blue-600 border-blue-200/80',
    purple: 'bg-purple-50 text-purple-600 border-purple-200/80',
  };

  const handleKeyDown = (e) => {
    if (link && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      navigate(link);
    }
  };

  return (
    <div
      role={link ? 'link' : undefined}
      tabIndex={link ? 0 : undefined}
      onClick={() => link && navigate(link)}
      onKeyDown={handleKeyDown}
      className={`bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm border border-secondary-200/70 flex flex-col justify-between h-full transition-all duration-200 group ${
        link
          ? 'cursor-pointer hover:border-brand-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2'
          : ''
      }`}
    >
      <div>
        <div className="flex items-start justify-between mb-4">
          <div
            className={`p-3 sm:p-3.5 rounded-2xl border ${
              colorMap[color] || colorMap.brand
            } group-hover:scale-105 transition-transform duration-200 shadow-sm flex items-center justify-center flex-shrink-0`}
          >
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          {link && (
            <div className="w-8 h-8 rounded-full bg-secondary-100/70 flex items-center justify-center group-hover:bg-brand-50 group-hover:scale-105 transition-all duration-200 flex-shrink-0">
              <ArrowRight className="w-4 h-4 text-secondary-400 group-hover:text-brand-600 transition-colors" />
            </div>
          )}
        </div>
        <div>
          <h3 className="text-3xl sm:text-4xl font-black text-secondary-900 mb-1 tracking-tight leading-tight">
            {value}
          </h3>
          <p className="text-xs font-bold text-secondary-500 uppercase tracking-wider">
            {title}
          </p>
        </div>
      </div>

      {trend && (
        <div className="mt-4 pt-3 border-t border-secondary-100/80">
          <p className="text-[11px] font-semibold text-secondary-600 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary-50 border border-secondary-200/60">
            {trend}
          </p>
        </div>
      )}
    </div>
  );
};

const ActionCard = ({ title, desc, icon: Icon, color = 'emerald', link }) => {
  const navigate = useNavigate();
  const colorMap = {
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100 group-hover:border-purple-200',
    emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 group-hover:border-emerald-200',
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100 group-hover:border-blue-200',
    amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100 group-hover:border-amber-200',
  };

  const handleKeyDown = (e) => {
    if (link && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      navigate(link);
    }
  };

  return (
    <div
      role={link ? 'link' : undefined}
      tabIndex={link ? 0 : undefined}
      onClick={() => link && navigate(link)}
      onKeyDown={handleKeyDown}
      className={`bg-white/80 backdrop-blur-md border border-secondary-200 p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex items-center gap-3.5 sm:gap-4 transition-all duration-200 group ${
        link
          ? 'cursor-pointer hover:border-brand-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2'
          : ''
      }`}
    >
      <div
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-200 border border-transparent flex-shrink-0 ${
          colorMap[color] || colorMap.emerald
        }`}
      >
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-extrabold text-secondary-900 text-sm sm:text-[15px] group-hover:text-brand-600 transition-colors truncate">
          {title}
        </h4>
        <p className="text-xs font-medium text-secondary-500 mt-0.5 sm:mt-1 leading-relaxed line-clamp-2">
          {desc}
        </p>
      </div>
      <div className="w-8 h-8 rounded-full bg-secondary-100/70 flex items-center justify-center group-hover:bg-brand-50 group-hover:scale-105 transition-all duration-200 flex-shrink-0">
        <ArrowRight className="w-4 h-4 text-secondary-400 group-hover:text-brand-600 transition-colors" />
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getDashboard();
      setStats(res.data);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load dashboard metrics.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-pulse font-sans">
        <div className="h-44 sm:h-48 bg-secondary-200/70 rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 sm:h-40 bg-secondary-200/60 rounded-2xl sm:rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="p-6 bg-red-50 border border-red-200 rounded-2xl sm:rounded-3xl text-red-800 font-sans">
        <div className="flex items-center gap-2 mb-2 text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <h3 className="font-bold text-base">Failed to load metrics</h3>
        </div>
        <p className="text-sm text-red-700">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const adminName = user?.name || localStorage.getItem('name') || 'Administrator';

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-300 font-sans">
      {/* Welcome Hero Banner matching Host & Candidate Dashboards */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] bg-gradient-to-br from-brand-900 via-secondary-900 to-brand-950 p-6 sm:p-8 md:p-10 lg:p-12 text-white shadow-2xl border border-secondary-800">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-xs font-bold mb-4 uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            <span>System Administration Portal</span>
          </div>
          <h1 className="!text-white text-3xl md:text-5xl font-black tracking-tight leading-tight">
            <span className="!text-white">Welcome back,</span>{" "}
            <span className="!text-white">{adminName}</span>
          </h1>
          <p className="mt-3 text-secondary-300 text-base md:text-lg leading-relaxed">
            Real-time platform overview, user management, and security oversight.
          </p>
        </div>

        <div className="relative z-10 mt-8 flex flex-wrap gap-4">
          <Link
            to="/admin/settings"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-brand-900 rounded-xl font-bold hover:bg-brand-50 hover:scale-[1.02] transition-all shadow-lg text-sm"
          >
            <UserPlus className="w-4 h-4 text-brand-700" />
            <span>New Administrator</span>
          </Link>
          <Link
            to="/admin/activity"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-800/60 backdrop-blur-sm border border-brand-400/30 text-white rounded-xl font-bold hover:bg-brand-700/60 transition-all text-sm"
          >
            <Activity className="w-4 h-4 text-brand-300" />
            <span>Audit Trail</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers?.toLocaleString() || '0'}
          trend={`${stats?.totalHosts || 0} hosts, ${stats?.totalCandidates || 0} candidates`}
          icon={Users}
          color="emerald"
          link="/admin/users"
        />
        <StatCard
          title="Active Hosts"
          value={stats?.totalHosts?.toLocaleString() || '0'}
          trend="Exam creators &amp; proctors"
          icon={ShieldCheck}
          color="blue"
          link="/admin/hosts"
        />
        <StatCard
          title="Candidates"
          value={stats?.totalCandidates?.toLocaleString() || '0'}
          trend="Registered student takers"
          icon={GraduationCap}
          color="purple"
          link="/admin/candidates"
        />
        <StatCard
          title="Live Exams"
          value={stats?.liveExams?.toLocaleString() || '0'}
          trend={`${stats?.totalExams || 0} total scheduled/ended`}
          icon={Radio}
          color="amber"
          link="/admin/exams"
        />
      </div>

      {/* Assessment Lifecycle & Quick Management Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assessment Lifecycle Snapshot Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 shadow-sm border border-secondary-200/60 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-secondary-100">
            <h3 className="text-xl font-bold text-secondary-900">Assessment Lifecycle</h3>
            <FileText className="w-5 h-5 text-brand-600" />
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary-50 border border-secondary-200">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-secondary-700">Currently Live</span>
              </div>
              <span className="text-sm font-black text-secondary-900">{stats?.liveExams || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary-50 border border-secondary-200">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs font-bold text-secondary-700">Ended / Completed</span>
              </div>
              <span className="text-sm font-black text-secondary-900">{stats?.endedExams || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary-50 border border-secondary-200">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-xs font-bold text-secondary-700">Drafts / Preparing</span>
              </div>
              <span className="text-sm font-black text-secondary-900">{stats?.draftExams || 0}</span>
            </div>

            <div className="pt-2 border-t border-secondary-100 flex items-center justify-between text-xs text-secondary-500 font-medium">
              <span>Total Candidate Enrollments</span>
              <span className="font-bold text-secondary-900">{stats?.totalEnrollments?.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>

        {/* Quick Management Shortcuts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-black text-secondary-900 tracking-tight">Administrative Controls</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <ActionCard
              title="User Directory"
              desc="View, deactivate, or safely delete accounts with data integrity safeguards."
              icon={Users}
              color="emerald"
              link="/admin/users"
            />
            <ActionCard
              title="Assessments Oversight"
              desc="Monitor active exams and suspend rogue or compromised assessments."
              icon={Radio}
              color="amber"
              link="/admin/exams"
            />
            <ActionCard
              title="Immutable Audit Trail"
              desc="Inspect actor emails, action types, JSON payloads, and client IPs."
              icon={Activity}
              color="blue"
              link="/admin/activity"
            />
            <ActionCard
              title="Admin Security &amp; Delegation"
              desc="Provision new system administrators with secure temporary passwords."
              icon={ShieldCheck}
              color="purple"
              link="/admin/settings"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
