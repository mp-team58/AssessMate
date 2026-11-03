import { createContext, useContext, useState } from 'react';
import apiClient, { clearApiCache } from '../services/apiClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(
    localStorage.getItem('role') 
      ? { role: localStorage.getItem('role'), name: localStorage.getItem('name'), id: localStorage.getItem('id') } 
      : null
  );

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
    clearApiCache();
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
      clearApiCache();
      setUser(null);
      setToken(null);
      localStorage.clear();
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
