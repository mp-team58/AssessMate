import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import Toggle from '../components/ui/Toggle';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import OtpInput from '../components/ui/OtpInput';
import Countdown from '../components/ui/Countdown';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { requestRegisterOtp, verifyRegisterOtp } from '../services/authService';

const signupSchema = yup.object().shape({
  fullName: yup.string().trim().required('Full name is required'),
  email: yup.string().trim().email('Must be a valid email').required('Email is required'),
  password: yup.string().trim().min(8, 'Password must be at least 8 characters').required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required'),
});

const Signup = () => {
  const [role, setRole] = useState('host');
  const [step, setStep] = useState('FORM'); // 'FORM' | 'OTP'
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [registrationData, setRegistrationData] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(signupSchema),
  });

  const maskEmail = (email) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    if (!domain) return email;
    return `${name[0]}${'*'.repeat(name.length - 1)}@${domain}`;
  };

  const onFormSubmit = async (data) => {
    setIsLoading(true);
    try {
      const payload = {
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        role: role === 'host' ? 'HOST' : 'CANDIDATE'
      };
      
      const response = await requestRegisterOtp(payload);
      const msg = response.data?.message;
      if (msg && (msg.toLowerCase().includes('could not') || msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error'))) {
        showToast(msg, 'error');
      } else {
        showToast(msg || 'A verification code has been sent to your email.', 'success');
        setCooldown(60); // 60s cooldown for resend
      }
      setRegistrationData(payload);
      setStep('OTP');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to request verification code. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    
    setIsLoading(true);
    try {
      const response = await verifyRegisterOtp({
        email: registrationData.email,
        otp
      });
      
      const { token, role: userRole, name, id } = response.data;
      login(token, userRole, name, id);
      
      showToast('Registration successful!', 'success');
      // Navigate to respective dashboard based on role returned from backend
      if (userRole === 'HOST') {
        navigate('/host/dashboard');
      } else if (userRole === 'CANDIDATE') {
        navigate('/candidate/dashboard');
      } else {
        navigate(role === 'host' ? '/host/dashboard' : '/candidate/dashboard');
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Verification failed. Please check the code and try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isLoading) return;
    setIsLoading(true);
    try {
      const response = await requestRegisterOtp(registrationData);
      const msg = response.data?.message;
      if (msg && (msg.toLowerCase().includes('could not') || msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error'))) {
        showToast(msg, 'error');
      } else {
        showToast(msg || 'A new verification code has been sent.', 'success');
        setCooldown(60);
        setOtp(''); // Clear old OTP
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to resend code.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      {step === 'FORM' ? (
        <>
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-extrabold text-secondary-900 mb-2 tracking-tight">Create an account</h2>
            <p className="text-secondary-500 text-sm">Join AssessMate to get started</p>
          </div>

          <Toggle activeRole={role} onChange={setRole} />

          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            
            <Input
              label="Full Name"
              type="text"
              placeholder="Jane Doe"
              {...register('fullName')}
              error={errors.fullName}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              {...register('email')}
              error={errors.email}
            />
            
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              error={errors.password}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              {...register('confirmPassword')}
              error={errors.confirmPassword}
            />

            <Button type="submit" disabled={isLoading} className="mt-6 w-full">
              {isLoading ? 'Sending verification code...' : `Sign up as ${role === 'host' ? 'Host' : 'Candidate'}`}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm font-medium text-secondary-500">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-500 hover:text-brand-600 font-bold ml-1">
              Log in instead
            </Link>
          </p>
        </>
      ) : (
        <div className="flex flex-col animate-in fade-in duration-300">
          <div className="mb-8 text-center lg:text-left">
            <button 
              onClick={() => {
                setStep('FORM');
              }} 
              className="text-secondary-400 hover:text-secondary-700 text-sm font-medium mb-6 flex items-center gap-1 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to registration
            </button>
            <h2 className="text-2xl font-extrabold text-secondary-900 mb-2 tracking-tight">Verify Your Email</h2>
            <p className="text-secondary-600 text-sm leading-relaxed">
              We've sent a 6-digit verification code to<br/>
              <span className="font-bold text-secondary-900">{maskEmail(registrationData?.email)}</span>
            </p>
          </div>

          <form onSubmit={onVerifyOtp} className="space-y-6">
            
            <div className="space-y-3">
              <label className="block text-sm font-bold text-secondary-700">Verification Code</label>
              <OtpInput value={otp} onChange={setOtp} length={6} disabled={isLoading} />
            </div>

            <Button type="submit" disabled={isLoading || otp.length !== 6} className="w-full shadow-md">
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm">
            <p className="text-secondary-500 mb-2">Didn't receive the code?</p>
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

export default Signup;
