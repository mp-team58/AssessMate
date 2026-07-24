import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import Toggle from '../components/ui/Toggle';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { loginHost, loginCandidate } from '../services/authService';

const loginSchema = yup.object().shape({
  email: yup.string().email('Must be a valid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

const Login = () => {
  const [role, setRole] = useState('host');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    try {
      let response;
      if (role === 'host') {
        response = await loginHost(data);
      } else {
        response = await loginCandidate(data);
      }
      
      const { token, role: userRole, name, id } = response.data;
      login(token, userRole, name, id);
      // Navigate to respective dashboard based on role returned from backend
      if (userRole === 'HOST') {
        navigate('/host/dashboard');
      } else if (userRole === 'CANDIDATE') {
        navigate('/candidate/dashboard');
      } else {
        // Fallback just in case
        navigate(role === 'host' ? '/host/dashboard' : '/candidate/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-10 text-center lg:text-left">
        <h2 className="text-3xl font-extrabold text-secondary-900 mb-3 tracking-tight">Welcome back</h2>
        <p className="text-secondary-500 text-base">Sign in to your account to continue</p>
      </div>

      <Toggle activeRole={role} onChange={setRole} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md">{error}</div>}
        
        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          {...register('email')}
          error={errors.email}
        />
        
        <div>
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            {...register('password')}
            error={errors.password}
          />
          <div className="flex justify-end mt-1">
            <a href="#" className="text-sm text-brand-600 hover:text-brand-500 font-medium">
              Forgot your password?
            </a>
          </div>
        </div>

        <Button type="submit" disabled={isLoading} className="mt-6">
          {isLoading ? 'Signing in...' : `Login as ${role === 'host' ? 'Host' : 'Candidate'}`}
        </Button>
      </form>

      <p className="mt-10 text-center text-sm font-medium text-secondary-500">
        Don't have an account?{' '}
        <Link to="/signup" className="text-brand-500 hover:text-brand-600 font-bold ml-1">
          Create one now
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
