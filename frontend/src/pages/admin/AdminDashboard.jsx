import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import { 
  Users, 
  ShieldCheck, 
  GraduationCap, 
  FileText, 
  Radio, 
  Layers, 
  ArrowUpRight, 
  ShieldAlert,
  Activity,
  UserPlus
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await adminService.getDashboard();
      setStats(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-[#2F6F4E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-800">
        <h3 className="font-semibold text-base mb-1">Failed to load metrics</h3>
        <p className="text-sm">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      sub: `${stats?.totalHosts || 0} hosts, ${stats?.totalCandidates || 0} candidates`,
      icon: Users,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      link: '/admin/users'
    },
    {
      title: 'Active Hosts',
      value: stats?.totalHosts || 0,
      sub: 'Exam creators & reviewers',
      icon: ShieldCheck,
      color: 'bg-blue-50 text-blue-700 border-blue-100',
      link: '/admin/hosts'
    },
    {
      title: 'Candidates',
      value: stats?.totalCandidates || 0,
      sub: 'Registered assessment takers',
      icon: GraduationCap,
      color: 'bg-purple-50 text-purple-700 border-purple-100',
      link: '/admin/candidates'
    },
    {
      title: 'Live Assessments',
      value: stats?.liveExams || 0,
      sub: `${stats?.totalExams || 0} total scheduled / ended`,
      icon: Radio,
      color: 'bg-amber-50 text-amber-700 border-amber-100',
      link: '/admin/exams'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 tracking-tight">
            System Administration
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Real-time infrastructure health, security oversight, and user management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/settings"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2F6F4E] hover:bg-[#25583E] text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <UserPlus size={15} />
            <span>New Administrator</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Link
              key={i}
              to={c.link}
              className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {c.title}
                </span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${c.color}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold font-serif text-gray-900">
                  {c.value.toLocaleString()}
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-gray-500">{c.sub}</span>
                  <ArrowUpRight size={14} className="text-gray-400 group-hover:text-gray-700 transition" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Exam Breakdown & Quick Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exam Status Snapshot */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-serif font-bold text-gray-900">Assessment Lifecycle</h2>
            <FileText size={18} className="text-gray-400" />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-gray-700">Currently Live</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{stats?.liveExams || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-gray-700">Ended / Completed</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{stats?.endedExams || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-xs font-medium text-gray-700">Drafts / Preparing</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{stats?.draftExams || 0}</span>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Total Candidate Enrollments</span>
              <span className="font-semibold text-gray-900">{stats?.totalEnrollments || 0}</span>
            </div>
          </div>
        </div>

        {/* Quick Management Shortcuts */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-serif font-bold text-gray-900">Quick Actions & Audits</h2>
            <Activity size={18} className="text-gray-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/admin/users"
              className="p-4 rounded-xl border border-gray-100 hover:border-[#2F6F4E]/30 bg-gray-50/50 hover:bg-emerald-50/20 transition flex flex-col justify-between"
            >
              <div>
                <h3 className="text-sm font-semibold text-gray-900">User Directory</h3>
                <p className="text-xs text-gray-500 mt-1">
                  View, deactivate, or safely delete accounts with data integrity safeguards.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#2F6F4E] mt-4 flex items-center gap-1">
                Manage Users &rarr;
              </span>
            </Link>

            <Link
              to="/admin/exams"
              className="p-4 rounded-xl border border-gray-100 hover:border-[#2F6F4E]/30 bg-gray-50/50 hover:bg-emerald-50/20 transition flex flex-col justify-between"
            >
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Live Exam Controls</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Monitor running exams and suspend rogue or compromised assessments immediately.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#2F6F4E] mt-4 flex items-center gap-1">
                View Exams &rarr;
              </span>
            </Link>

            <Link
              to="/admin/activity"
              className="p-4 rounded-xl border border-gray-100 hover:border-[#2F6F4E]/30 bg-gray-50/50 hover:bg-emerald-50/20 transition flex flex-col justify-between"
            >
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Immutable Audit Trail</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Inspect actor IDs, actions, IP addresses, and metadata for compliance.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#2F6F4E] mt-4 flex items-center gap-1">
                View Activity &rarr;
              </span>
            </Link>

            <Link
              to="/admin/settings"
              className="p-4 rounded-xl border border-gray-100 hover:border-[#2F6F4E]/30 bg-gray-50/50 hover:bg-emerald-50/20 transition flex flex-col justify-between"
            >
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Security & Bootstrap</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Issue secure temporary passwords for administrative delegates.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#2F6F4E] mt-4 flex items-center gap-1">
                Manage Admins &rarr;
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

