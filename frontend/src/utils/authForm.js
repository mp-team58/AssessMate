import * as yup from 'yup';

export const AUTH_COPY = {
  emailLabel: 'Email address',
  emailPlaceholder: 'name@organization.com',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Enter your password', // not "••••••", which looks like a saved password
  forgotLink: 'Forgot password?',
  signingIn: 'Signing in…',
};

export const loginSchema = yup.object().shape({
  email: yup.string().trim().email('Enter a valid email address').required('Email is required'),
  password: yup
    .string()
    .required('Password is required')
    .test('not-blank', 'Password cannot be empty', (val) => Boolean(val && val.trim().length > 0)),
});

