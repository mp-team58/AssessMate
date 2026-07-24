import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(
    localStorage.getItem('role') 
      ? { role: localStorage.getItem('role'), name: localStorage.getItem('name'), id: localStorage.getItem('id') } 
      : null
  );

  const login = (accessToken, role, name, id) => {
    setUser({ role, name, id });
    setToken(accessToken);
    localStorage.setItem('token', accessToken);
    localStorage.setItem('role', role);
    localStorage.setItem('name', name);
    if (id) localStorage.setItem('id', id);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    localStorage.removeItem('id');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
