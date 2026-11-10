import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import OtpInput from '../components/ui/OtpInput';
import Countdown from '../components/ui/Countdown';
import { requestPasswordResetOtp, resetPassword } from '../services/authService';
import { useToast } from '../contexts/ToastContext';
import { Shield, Lock, Mail, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { AUTH_COPY } from '../utils/authForm';

const emailSchema = yup.object().shape({
  email: yup.string().trim().email('Must be a valid email').required('Email is required'),
});

const resetSchema = yup.object().shape({
  newPassword: yup.string().required('New Password is required').min(8, 'Password must be at least 8 characters').test(
    'not-blank',
    'Password cannot be empty',
    (val) => Boolean(val && val.trim().length > 0)
  ),
  confirmPassword: yup.string()
    .oneOf([yup.ref('newPassword'), null], 'Passwords must match')
    .required('Confirm password is required'),
});

const ForgotPassword = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const [step, setStep] = useState('EMAIL'); // 'EMAIL' | 'OTP'
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  const getStorageKey = (targetEmail) => {
    const clean = (targetEmail || resetEmail || '').trim().toLowerCase();
    const prefix = isAdmin ? 'assessmate_fp_cooldown_admin' : 'assessmate_fp_cooldown_user';
    return clean ? `${prefix}_${encodeURIComponent(clean)}` : prefix;
  };

  const getRemainingCooldown = (targetEmail) => {
    try {
      const key = getStorageKey(targetEmail);
      const stored = sessionStorage.getItem(key);
      if (stored) {
        const remaining = Math.ceil((parseInt(stored, 10) - Date.now()) / 1000);
        return remaining > 0 ? remaining : 0;
      }
    } catch (_) {}
    return 0;
  };

  const [cooldown, setCooldown] = useState(() => getRemainingCooldown());

  const startCooldown = (seconds = 60, targetEmail) => {
    const expiry = Date.now() + seconds * 1000;
    try {
      const key = getStorageKey(targetEmail);
      sessionStorage.setItem(key, String(expiry));
    } catch (_) {}
    setCooldown(seconds);
  };

  const clearCooldown = (targetEmail) => {
    try {
      const key = getStorageKey(targetEmail);
      sessionStorage.removeItem(key);
    } catch (_) {}
    setCooldown(0);
  };

  React.useEffect(() => {
    const rem = getRemainingCooldown(resetEmail);
    setCooldown(rem);
  }, [step, resetEmail]);

  const navigate = useNavigate();
  const { showToast } = useToast();

  const { register: registerEmail, handleSubmit: handleEmailSubmit, formState: { errors: emailErrors } } = useForm({
    resolver: yupResolver(emailSchema),
  });

  const { register: registerReset, handleSubmit: handleResetSubmit, formState: { errors: resetErrors } } = useForm({
    resolver: yupResolver(resetSchema),
  });

  const maskEmail = (email) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    if (!domain) return email;
    return `${name[0]}${'*'.repeat(name.length - 1)}@${domain}`;
  };

  const onEmailSubmit = async (data) => {
    setIsLoading(true);
    try {
      const payload = { email: data.email };
      if (isAdmin) payload.portal = 'ADMIN';

      const response = await requestPasswordResetOtp(payload);
      const msg = response.data?.message;
      if (msg && (msg.toLowerCase().includes('could not') || msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error'))) {
        showToast(msg, 'error');
      } else {
        showToast(msg || 'If an account exists for this email, a verification code has been sent.', 'success');
        startCooldown(60, data.email);
      }
      setResetEmail(data.email);
      setStep('OTP');
    } catch (err) {
      if (err.response?.status === 404) {
        showToast('If an account exists for this email, a verification code has been sent.', 'success');
        setResetEmail(data.email);
        setStep('OTP');
        startCooldown(60, data.email);
      } else {
        showToast(err.response?.data?.message || 'Failed to send verification code. Please try again.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (data) => {
    if (otp.length !== 6) {
      showToast('Please enter the 6-digit verification code.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        email: resetEmail,
        otp,
        newPassword: data.newPassword,
      };
      if (isAdmin) payload.portal = 'ADMIN';

      const response = await resetPassword(payload);

      clearCooldown(resetEmail);
      showToast(response.data?.message || 'Password reset successfully. Please log in with your new password.', 'success');
      navigate(isAdmin ? '/admin' : '/login');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to reset password. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isLoading) return;
    setIsLoading(true);
    try {
      const payload = { email: resetEmail };
      if (isAdmin) payload.portal = 'ADMIN';

      const response = await requestPasswordResetOtp(payload);
      const msg = response.data?.message;
      if (msg && (msg.toLowerCase().includes('could not') || msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error'))) {
        showToast(msg, 'error');
      } else {
        showToast(msg || 'If an account exists for this email, a verification code has been sent.', 'success');
        startCooldown(60, resetEmail);
        setOtp('');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        showToast('If an account exists for this email, a verification code has been sent.', 'success');
        startCooldown(60, resetEmail);
        setOtp('');
      } else if (err.response?.status === 429 || err.response?.data?.message?.toLowerCase()?.includes('wait')) {
        const retryHeader = err.response?.headers?.['retry-after'];
        const retrySec = retryHeader ? parseInt(retryHeader, 10) : 60;
        startCooldown(!isNaN(retrySec) && retrySec > 0 ? retrySec : 60, resetEmail);
        showToast(err.response?.data?.message || 'Please wait before requesting another verification code.', 'error');
      } else {
        showToast(err.response?.data?.message || 'Failed to resend verification code. Please try again.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isAdmin) {
    return (
      <div className="min-h-dvh bg-[#111915] flex items-center justify-center p-3 xs:p-4 sm:p-6 font-sans">
        <div className="max-w-md w-full">
          <div className="text-center mb-5 sm:mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#2F6F4E] text-white shadow-lg mb-3 sm:mb-4">
              <Shield size={26} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">AssessMate Admin</h1>
            <p className="text-[11px] sm:text-xs text-brand-400/80 font-medium tracking-wide uppercase mt-1">
              Master Password Recovery
            </p>
          </div>

          <div className="bg-[#16241F] border border-secondary-700/40 rounded-2xl p-4 xs:p-5 sm:p-8 shadow-2xl">
            {step === 'EMAIL' ? (
              <form onSubmit={handleEmailSubmit(onEmailSubmit)} className="space-y-3.5 sm:space-y-4">
                <div>
                  <h2 className="text-base font-bold text-white">Reset Administrator Password</h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Enter your registered administrator email to receive a secure recovery code.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Administrator Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      placeholder={AUTH_COPY.emailPlaceholder}
                      {...registerEmail('email')}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#111915] border border-secondary-700/50 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2F6F4E] transition min-h-[44px]"
                    />
                  </div>
                  {emailErrors.email && (
                    <p className="text-red-400 text-xs mt-1">{emailErrors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 min-h-[44px] bg-[#2F6F4E] hover:bg-[#25583E] text-white font-medium text-sm rounded-xl transition shadow-lg shadow-brand-950/50 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isLoading ? 'Sending Code...' : 'Send Recovery Code'}</span>
                  {!isLoading && <ArrowRight size={16} />}
                </button>

                <div className="pt-2 text-center">
                  <Link
                    to="/admin"
                    className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition py-1.5"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Admin Login</span>
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-3.5 sm:space-y-4">
                <div>
                  <button
                    type="button"
                    onClick={() => setStep('EMAIL')}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white mb-2 sm:mb-3 transition cursor-pointer py-1"
                  >
                    <ArrowLeft size={14} />
                    <span>Back</span>
                  </button>
                  <h2 className="text-base font-bold text-white">Enter Verification Code</h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Code sent to <span className="font-semibold text-white break-all">{maskEmail(resetEmail)}</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-300">6-Digit Code</label>
                  <OtpInput value={otp} onChange={setOtp} length={6} disabled={isLoading} isDark={true} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      {...registerReset('newPassword')}
                      className="w-full pl-10 pr-11 py-2.5 bg-[#111915] border border-secondary-700/50 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2F6F4E] transition min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer p-1.5 rounded-lg"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {resetErrors.newPassword && (
                    <p className="text-red-400 text-xs mt-1">{resetErrors.newPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      {...registerReset('confirmPassword')}
                      className="w-full pl-10 pr-11 py-2.5 bg-[#111915] border border-secondary-700/50 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2F6F4E] transition min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer p-1.5 rounded-lg"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {resetErrors.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1">{resetErrors.confirmPassword.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className="w-full mt-2 py-3 min-h-[44px] bg-[#2F6F4E] hover:bg-[#25583E] text-white font-medium text-sm rounded-xl transition shadow-lg shadow-brand-950/50 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isLoading ? 'Resetting...' : 'Reset Master Password'}</span>
                  {!isLoading && <ArrowRight size={16} />}
                </button>

                <div className="pt-2 text-center text-xs">
                  {cooldown > 0 ? (
                    <span className="text-gray-400">
                      Resend code in <Countdown seconds={cooldown} onComplete={() => clearCooldown()} />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isLoading}
                      className="text-brand-400 hover:text-brand-300 font-semibold cursor-pointer disabled:opacity-50 py-1"
                    >
                      Resend Code
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-gray-500 mt-4 sm:mt-6">
            Admin recovery requests are audited and rate-limited.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full min-h-0 lg:min-h-[440px] flex flex-col justify-between">
        {step === 'EMAIL' ? (
        <>
          <div className="mb-4 sm:mb-6 lg:mb-8 text-center lg:text-left">
            <h2 className="text-xl sm:text-2xl font-extrabold text-secondary-900 mb-1.5 sm:mb-2 tracking-tight">Forgot Password</h2>
            <p className="text-secondary-500 text-xs sm:text-sm">Enter the email address associated with your AssessMate account.</p>
          </div>

          <form onSubmit={handleEmailSubmit(onEmailSubmit)} className="space-y-3.5 sm:space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder={AUTH_COPY.emailPlaceholder}
              {...registerEmail('email')}
              error={emailErrors.email}
            />

            <Button type="submit" disabled={isLoading} className="mt-4 sm:mt-6 w-full min-h-[44px]">
              {isLoading ? 'Sending...' : 'Send Verification Code'}
            </Button>
          </form>

          <div className="mt-5 sm:mt-8 text-center">
            <Link to="/login" className="text-secondary-500 hover:text-secondary-800 text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-1 transition-colors py-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Login
            </Link>
          </div>
        </>
      ) : (
        <div className="flex flex-col animate-in fade-in duration-300">
          <div className="mb-4 sm:mb-6 lg:mb-8 text-center lg:text-left">
            <button
              onClick={() => {
                setStep('EMAIL');
              }}
              className="text-secondary-400 hover:text-secondary-700 text-xs sm:text-sm font-medium mb-3 sm:mb-6 inline-flex items-center gap-1 transition-colors py-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            <h2 className="text-xl sm:text-2xl font-extrabold text-secondary-900 mb-1.5 sm:mb-2 tracking-tight">Reset Password</h2>
            <p className="text-secondary-600 text-xs sm:text-sm leading-relaxed">
              We've sent a verification code to<br />
              <span className="font-bold text-secondary-900 break-all">{maskEmail(resetEmail)}</span>
            </p>
          </div>

          <form onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-4 sm:space-y-6">
            <div className="space-y-2 sm:space-y-3">
              <label className="block text-xs sm:text-sm font-bold text-secondary-700">Verification Code</label>
              <OtpInput value={otp} onChange={setOtp} length={6} disabled={isLoading} />
            </div>

            <div className="space-y-3 sm:space-y-4 pt-1">
              <Input
                label="New Password"
                type="password"
                placeholder="••••••••"
                {...registerReset('newPassword')}
                error={resetErrors.newPassword}
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="••••••••"
                {...registerReset('confirmPassword')}
                error={resetErrors.confirmPassword}
              />
            </div>

            <Button type="submit" disabled={isLoading || otp.length !== 6} className="w-full shadow-md min-h-[44px]">
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>

          <div className="mt-5 sm:mt-8 text-center text-xs sm:text-sm">
            {cooldown > 0 ? (
              <span className="text-secondary-400 font-medium flex items-center justify-center gap-2">
                Resend code in <Countdown seconds={cooldown} onComplete={() => clearCooldown()} />
              </span>
            ) : (
              <button
                onClick={handleResend}
                disabled={isLoading}
                className="text-brand-600 hover:text-brand-700 font-bold disabled:opacity-50 transition-colors py-1"
              >
                Resend Code
              </button>
            )}
          </div>
        </div>
      )}
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
