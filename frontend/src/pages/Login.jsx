import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import Toggle from '../components/ui/Toggle';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import FormAlert from '../components/ui/FormAlert';
import { useAuth } from '../context/AuthContext';
import { loginHost, loginCandidate } from '../services/authService';
import { AUTH_COPY, loginSchema } from '../utils/authForm';

const SUBTITLE = {
  host: 'Sign in to manage your exams and review results.',
  candidate: 'Sign in to take your assessments and see your results.',
};

const Login = () => {
  const [role, setRole] = useState('host');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(loginSchema) });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setFormError('');
    try {
      const response = role === 'host' ? await loginHost(data) : await loginCandidate(data);
      const { token, role: userRole, name, id } = response.data;
      login(token, userRole, name, id);
      if (userRole === 'ADMIN') navigate('/admin/dashboard');
      else if (userRole === 'HOST') navigate('/host/dashboard');
      else if (userRole === 'CANDIDATE') navigate('/candidate/dashboard');
      else navigate(role === 'host' ? '/host/dashboard' : '/candidate/dashboard');
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Sign in failed. Check your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-4 sm:mb-6 text-center lg:text-left">
        <h2 className="text-xl sm:text-2xl font-extrabold text-secondary-900 mb-1.5 sm:mb-2 tracking-tight">Welcome back</h2>
        <p className="text-secondary-500 text-xs sm:text-sm">{SUBTITLE[role]}</p>
      </div>

      <Toggle activeRole={role} onChange={(r) => { setRole(r); setFormError(''); }} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 sm:space-y-4" noValidate>
        <Input
          label={AUTH_COPY.emailLabel}
          type="email"
          autoComplete="email"
          placeholder={AUTH_COPY.emailPlaceholder}
          {...register('email', { onChange: () => setFormError('') })}
          error={errors.email}
        />

        <div>
          <Input
            label={AUTH_COPY.passwordLabel}
            type="password"
            autoComplete="current-password"
            placeholder={AUTH_COPY.passwordPlaceholder}
            {...register('password', { onChange: () => setFormError('') })}
            error={errors.password}
          />
          <div className="flex justify-end -mt-2">
            <Link to="/forgot-password" className="text-xs sm:text-sm text-brand-600 hover:text-brand-500 font-medium">
              {AUTH_COPY.forgotLink}
            </Link>
          </div>
        </div>

        <FormAlert>{formError}</FormAlert>

        <Button type="submit" disabled={isLoading} className="mt-2 w-full py-2.5 sm:py-3 min-h-[44px]">
          {isLoading ? AUTH_COPY.signingIn : `Sign in as ${role === 'host' ? 'host' : 'candidate'}`}
        </Button>
      </form>

      <p className="mt-5 sm:mt-8 text-center text-xs sm:text-sm font-medium text-secondary-500">
        Don’t have an account?{' '}
        <Link to="/signup" className="text-brand-600 hover:text-brand-700 font-bold ml-1">
          Create one now
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
