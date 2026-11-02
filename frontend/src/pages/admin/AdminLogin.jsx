import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { Shield, Lock, Mail, ArrowRight } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiClient.post('/auth/login', {
        email: email.trim(),
        password,
        portal: 'ADMIN'
      });

      const data = res.data;
      if (data.role !== 'ADMIN') {
        setError('Unauthorized: Admin access required.');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('name', data.name);
      localStorage.setItem('email', email.trim());
      localStorage.setItem('mustChangePassword', data.mustChangePassword ? 'true' : 'false');

      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Invalid administrator credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111915] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#2F6F4E] text-white shadow-lg mb-4">
            <Shield size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white font-serif tracking-tight">AssessMate Admin</h1>
          <p className="text-xs text-emerald-400/80 font-medium tracking-wide uppercase mt-1">
            Restricted System Administration Portal
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#18231E] border border-emerald-900/40 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {error && (
            <div className="p-3 mb-5 rounded-xl bg-red-950/60 border border-red-800/50 text-red-300 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Administrator Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@assessmate.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#121B16] border border-emerald-900/50 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2F6F4E] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#121B16] border border-emerald-900/50 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2F6F4E] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 bg-[#2F6F4E] hover:bg-[#25583E] text-white font-medium text-sm rounded-xl transition shadow-lg shadow-emerald-950/50 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Access logged & audited. Unauthorized access attempts are monitored.
        </p>
      </div>
    </div>
  );
}

