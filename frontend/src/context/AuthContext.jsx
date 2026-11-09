import { createContext, useContext, useState, useEffect } from 'react';
import apiClient, { clearApiCache } from '../services/apiClient';
import { clearMediaCache } from '../services/mediaService';

export const clearAuthStorage = () => {
  clearMediaCache();
  const keys = ['token', 'role', 'name', 'id', 'email', 'user', 'mustChangePassword', 'currentEnrollmentId', 'currentExamId'];
  keys.forEach((k) => {
    try { localStorage.removeItem(k); } catch (_) {}
  });
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('exam_') || key.startsWith('offline_answers_'))) {
        localStorage.removeItem(key);
      }
    }
  } catch (_) {}
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(
    localStorage.getItem('role') 
      ? { role: localStorage.getItem('role'), name: localStorage.getItem('name'), id: localStorage.getItem('id') } 
      : null
  );

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token' && !e.newValue) {
        setUser(null);
        setToken(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateUser = (updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      if (updates.name) localStorage.setItem('name', updates.name);
      if (updates.role) localStorage.setItem('role', updates.role);
      if (updates.id) localStorage.setItem('id', updates.id);
      return updated;
    });
  };

  const login = (accessToken, role, name, id) => {
    if (typeof clearApiCache === 'function') {
      try { clearApiCache(); } catch (_) {}
    }
    setUser({ role, name, id });
    if (accessToken) {
      setToken(accessToken);
      localStorage.setItem('token', accessToken);
    }
    if (role) localStorage.setItem('role', role);
    if (name) localStorage.setItem('name', name);
    if (id) localStorage.setItem('id', id);
  };

  const logout = async () => {
    try {
      if (token || localStorage.getItem('token')) {
        await apiClient.post('/auth/logout');
      }
    } catch (err) {
      console.error('Logout failed on backend', err);
    } finally {
      if (typeof clearApiCache === 'function') {
        try { clearApiCache(); } catch (_) {}
      }
      setUser(null);
      setToken(null);
      clearAuthStorage();
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
