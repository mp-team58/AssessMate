import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import FormAlert from '../../components/ui/FormAlert';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { AUTH_COPY, loginSchema } from '../../utils/authForm';

export default function AdminLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(loginSchema) });

  const onSubmit = async ({ email, password }) => {
    setIsLoading(true);
    setFormError('');
    try {
      const res = await apiClient.post('/auth/login', { email: email.trim(), password, portal: 'ADMIN' });
      const data = res.data;
      if (data.role !== 'ADMIN') {
        setFormError('This portal is for administrators only.');
        return;
      }
      // Go through AuthContext so the app's user state is set (writing localStorage alone leaves useAuth().user empty until a reload).
      login(data.token, data.role, data.name, data.id);
      localStorage.setItem('email', email.trim());
      localStorage.setItem('mustChangePassword', data.mustChangePassword ? 'true' : 'false');
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setFormError(err?.response?.data?.message || err?.message || 'Sign in failed. Check your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* Same structure as the host/candidate page; the pill is the only thing that marks this as the restricted portal. */}
      <div className="mb-8 text-center lg:text-left">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-bold">
          <Shield className="w-3.5 h-3.5" aria-hidden="true" /> Admin portal
        </span>
        <h2 className="text-2xl font-extrabold text-secondary-900 mb-2 tracking-tight">Administrator sign in</h2>
        <p className="text-secondary-500 text-sm">Restricted area. Sign in with your administrator account.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label={AUTH_COPY.emailLabel}
          type="email"
          autoComplete="username"
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
            <Link to="/admin/forgot-password" className="text-sm text-brand-600 hover:text-brand-500 font-medium">
              {AUTH_COPY.forgotLink}
            </Link>
          </div>
        </div>

        <FormAlert>{formError}</FormAlert>

        <Button type="submit" disabled={isLoading} className="mt-2 w-full">
          {isLoading ? AUTH_COPY.signingIn : 'Sign in'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm font-medium text-secondary-500">
        Access is logged and audited. Unauthorized attempts are monitored.
      </p>
    </AuthLayout>
  );
}
