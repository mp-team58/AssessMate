import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import { useToast } from '../../contexts/ToastContext';
import { Shield, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, ArrowRight, Check } from 'lucide-react';

export default function AdminSetupPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [validating, setValidating] = useState(true);
  const [invitationData, setInvitationData] = useState(null);
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenError('Invitation token is missing from the link. Please check your invitation email.');
      setValidating(false);
      return;
    }

    const validate = async () => {
      try {
        setValidating(true);
        const res = await adminService.validateInvitation(token);
        if (res.data?.valid) {
          setInvitationData(res.data);
        } else {
          setTokenError(res.data?.message || 'This invitation token is invalid or has expired.');
        }
      } catch (err) {
        const msg = err?.response?.data?.message || 'This invitation token has expired or is no longer valid.';
        setTokenError(msg);
      } finally {
        setValidating(false);
      }
    };

    validate();
  }, [token]);

  const hasLength = password.length >= 12;
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const isMatch = password.length > 0 && password === confirmPassword;
  const isValid = hasMinLength && isMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) {
      showToast('Please ensure your password meets all requirements and matches.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminService.setupPassword({
        token,
        newPassword: password,
      });

      showToast(res.data?.message || 'Password set successfully! Please log in with your master credentials.', 'success');
      navigate('/admin', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to setup password.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#111915] flex items-center justify-center p-3 xs:p-4 sm:p-6 font-sans">
      <div className="max-w-md w-full">
        {/* Branding */}
        <div className="text-center mb-5 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#2F6F4E] text-white shadow-lg mb-3 sm:mb-4">
            <Shield size={26} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">AssessMate Admin</h1>
          <p className="text-[11px] sm:text-xs text-brand-400/80 font-medium tracking-wide uppercase mt-1">
            Administrator Account Setup
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#16241F] border border-secondary-700/40 rounded-2xl p-4 xs:p-5 sm:p-8 shadow-2xl">
          {validating ? (
            <div className="py-12 text-center space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto" />
              <p className="text-sm text-gray-300 font-medium">Validating invitation credentials...</p>
            </div>
          ) : tokenError ? (
            <div className="text-center space-y-4 sm:space-y-5 py-3 sm:py-4">
              <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-800 text-red-400 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <h2 className="text-base font-bold text-white">Invalid or Expired Invitation</h2>
                <p className="text-xs text-gray-400 leading-relaxed px-1 sm:px-2">
                  {tokenError}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/admin"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 min-h-[44px] bg-[#2F6F4E] hover:bg-[#25583E] text-white text-xs font-bold rounded-xl transition"
                >
                  <span>Return to Admin Login</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
              <div className="pb-3 border-b border-emerald-950">
                <p className="text-xs text-gray-400">Welcome,</p>
                <p className="text-sm font-bold text-white">{invitationData?.name || 'Administrator'}</p>
                <p className="text-xs text-brand-400 font-mono mt-0.5 break-all">{invitationData?.email}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Set Master Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter strong password"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#111915] border border-secondary-700/50 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2F6F4E] transition min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer p-1.5 rounded-lg"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#111915] border border-secondary-700/50 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2F6F4E] transition min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer p-1.5 rounded-lg"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="bg-[#111915] p-3 rounded-xl border border-emerald-950 text-[11px] space-y-1.5">
                <p className="text-gray-400 font-semibold mb-1">Security Standards:</p>
                <div className="grid grid-cols-2 gap-1 text-gray-400">
                  <span className={`flex items-center gap-1.5 ${hasLength ? 'text-brand-400' : hasMinLength ? 'text-emerald-500' : 'text-gray-500'}`}>
                    <Check size={12} className={hasMinLength ? 'text-brand-400' : 'text-gray-600'} />
                    <span>8+ chars (12+ rec.)</span>
                  </span>
                  <span className={`flex items-center gap-1.5 ${hasUpper ? 'text-brand-400' : 'text-gray-500'}`}>
                    <Check size={12} className={hasUpper ? 'text-brand-400' : 'text-gray-600'} />
                    <span>Uppercase letter</span>
                  </span>
                  <span className={`flex items-center gap-1.5 ${hasLower ? 'text-brand-400' : 'text-gray-500'}`}>
                    <Check size={12} className={hasLower ? 'text-brand-400' : 'text-gray-600'} />
                    <span>Lowercase letter</span>
                  </span>
                  <span className={`flex items-center gap-1.5 ${hasNumber ? 'text-brand-400' : 'text-gray-500'}`}>
                    <Check size={12} className={hasNumber ? 'text-brand-400' : 'text-gray-600'} />
                    <span>Number (0-9)</span>
                  </span>
                  <span className={`flex items-center gap-1.5 ${hasSymbol ? 'text-brand-400' : 'text-gray-500'}`}>
                    <Check size={12} className={hasSymbol ? 'text-brand-400' : 'text-gray-600'} />
                    <span>Special symbol</span>
                  </span>
                  <span className={`flex items-center gap-1.5 ${isMatch ? 'text-brand-400' : 'text-gray-500'}`}>
                    <Check size={12} className={isMatch ? 'text-brand-400' : 'text-gray-600'} />
                    <span>Passwords match</span>
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !isValid}
                className="w-full mt-3 sm:mt-4 py-3 min-h-[44px] bg-[#2F6F4E] hover:bg-[#25583E] text-white font-medium text-sm rounded-xl transition shadow-lg shadow-brand-950/50 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{submitting ? 'Setting Password...' : 'Activate Admin Account'}</span>
                {!submitting && <ArrowRight size={16} />}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-4 sm:mt-6">
          System Administration • Single-use setup token expires after 30 minutes.
        </p>
      </div>
    </div>
  );
}

