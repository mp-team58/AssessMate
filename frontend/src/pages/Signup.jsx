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
import { signupHost, signupCandidate } from '../services/authService';

const signupSchema = yup.object().shape({
  fullName: yup.string().required('Full name is required'),
  email: yup.string().email('Must be a valid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required'),
});

const Signup = () => {
  const [role, setRole] = useState('host');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(signupSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    try {
      const payload = {
        fullName: data.fullName,
        email: data.email,
        password: data.password
      };
      
      let response;
      if (role === 'host') {
        response = await signupHost(payload);
      } else {
        response = await signupCandidate(payload);
      }
      
      login(response.data.user, response.data.token);
      // Navigate to respective dashboard based on role
      navigate(role === 'host' ? '/host/dashboard' : '/candidate/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to sign up. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign up</h2>
        <p className="text-slate-500 text-sm">Join AssessAI to get started</p>
      </div>

      <Toggle activeRole={role} onChange={setRole} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md">{error}</div>}
        
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

        <Button type="submit" disabled={isLoading} className="mt-6">
          {isLoading ? 'Creating account...' : `Sign up as ${role === 'host' ? 'Host' : 'Candidate'}`}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-600 hover:text-brand-500 font-medium">
          Login instead
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Signup;
