import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { ConfirmProvider } from '../contexts/ConfirmContext';

export function createMockToken(role = 'CANDIDATE') {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: `${role.toLowerCase()}@assessmate.com`,
    role,
    name: `Test ${role}`,
    exp: Math.floor(Date.now() / 1000) + 3600
  }));
  return `${header}.${payload}.signature`;
}

export function setMockAuth(role = 'CANDIDATE', userDetails = {}) {
  const token = createMockToken(role);
  const user = {
    name: userDetails.name || `Test ${role}`,
    email: userDetails.email || `${role.toLowerCase()}@assessmate.com`,
    role
  };
  localStorage.setItem('token', token);
  localStorage.setItem('role', role);
  localStorage.setItem('name', user.name);
  localStorage.setItem('email', user.email);
  localStorage.setItem('user', JSON.stringify(user));
  return { token, user };
}

export function renderWithProviders(ui, { route = '/', initialRole = null, initialUser = {} } = {}) {
  if (initialRole) {
    setMockAuth(initialRole, initialUser);
  } else {
    localStorage.clear();
  }

  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <ConfirmProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ConfirmProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper });
}

