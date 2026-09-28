import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import OtpInput from '../components/ui/OtpInput';
import Countdown from '../components/ui/Countdown';
import { requestPasswordResetOtp, resetPassword } from '../services/authService';
import { useToast } from '../contexts/ToastContext';

const emailSchema = yup.object().shape({
  email: yup.string().trim().email('Must be a valid email').required('Email is required'),
});

const resetSchema = yup.object().shape({
  newPassword: yup.string().trim().min(8, 'Password must be at least 8 characters').required('New Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('newPassword'), null], 'Passwords must match')
    .required('Confirm password is required'),
});

const ForgotPassword = () => {
  const [step, setStep] = useState('EMAIL'); // 'EMAIL' | 'OTP'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [otp, setOtp] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);

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
    setError('');
    setSuccessMsg('');
    try {
      const response = await requestPasswordResetOtp({ email: data.email });
      const msg = response.data?.message;
      if (msg && (msg.toLowerCase().includes('could not') || msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error'))) {
        setError(msg);
      } else {
        setSuccessMsg(msg || 'If an account exists for this email, a verification code has been sent.');
        setCooldown(60);
      }
      setResetEmail(data.email);
      setStep('OTP');
    } catch (err) {
      if (err.response?.status === 404) {
        setSuccessMsg('If an account exists for this email, a verification code has been sent.');
        setResetEmail(data.email);
        setStep('OTP');
        setCooldown(60);
      } else {
        setError(err.response?.data?.message || 'Failed to send verification code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (data) => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const response = await resetPassword({
        email: resetEmail,
        otp,
        newPassword: data.newPassword
      });

      showToast('success', 'Success', response.data?.message || 'Password reset successfully. Please log in with your new password.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isLoading) return;
    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const response = await requestPasswordResetOtp({ email: resetEmail });
      const msg = response.data?.message;
      if (msg && (msg.toLowerCase().includes('could not') || msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error'))) {
        setError(msg);
      } else {
        setSuccessMsg(msg || 'If an account exists for this email, a verification code has been sent.');
        setCooldown(60);
        setOtp('');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setSuccessMsg('If an account exists for this email, a verification code has been sent.');
        setCooldown(60);
        setOtp('');
      } else {
        setError(err.response?.data?.message || 'Failed to resend verification code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      {step === 'EMAIL' ? (
        <>
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-extrabold text-secondary-900 mb-2 tracking-tight">Forgot Password</h2>
            <p className="text-secondary-500 text-sm">Enter the email address associated with your AssessMate account.</p>
          </div>

          <form onSubmit={handleEmailSubmit(onEmailSubmit)} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md">{error}</div>}

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              {...registerEmail('email')}
              error={emailErrors.email}
            />

            <Button type="submit" disabled={isLoading} className="mt-6 w-full">
              {isLoading ? 'Sending...' : 'Send Verification Code'}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <Link to="/login" className="text-secondary-500 hover:text-secondary-800 text-sm font-medium flex items-center justify-center gap-1 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Login
            </Link>
          </div>
        </>
      ) : (
        <div className="flex flex-col animate-in fade-in duration-300">
          <div className="mb-8 text-center lg:text-left">
            <button
              onClick={() => {
                setStep('EMAIL');
                setError('');
                setSuccessMsg('');
              }}
              className="text-secondary-400 hover:text-secondary-700 text-sm font-medium mb-6 flex items-center gap-1 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            <h2 className="text-2xl font-extrabold text-secondary-900 mb-2 tracking-tight">Reset Password</h2>
            <p className="text-secondary-600 text-sm leading-relaxed">
              We've sent a verification code to<br />
              <span className="font-bold text-secondary-900">{maskEmail(resetEmail)}</span>
            </p>
          </div>

          <form onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-6">
            {successMsg && <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-md border border-emerald-100">{successMsg}</div>}
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">{error}</div>}

            <div className="space-y-3">
              <label className="block text-sm font-bold text-secondary-700">Verification Code</label>
              <OtpInput value={otp} onChange={setOtp} length={6} disabled={isLoading} />
            </div>

            <div className="space-y-4 pt-2">
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

            <Button type="submit" disabled={isLoading || otp.length !== 6} className="w-full shadow-md">
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm">
            {cooldown > 0 ? (
              <span className="text-secondary-400 font-medium flex items-center justify-center gap-2">
                Resend code in <Countdown seconds={cooldown} onComplete={() => setCooldown(0)} />
              </span>
            ) : (
              <button
                onClick={handleResend}
                disabled={isLoading}
                className="text-brand-600 hover:text-brand-700 font-bold disabled:opacity-50 transition-colors"
              >
                Resend Code
              </button>
            )}
          </div>
        </div>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
