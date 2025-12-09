import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Sayfa yüklendiğinde token'ı kontrol et
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.data);
        setIsAuthenticated(true);
        return { success: true };
      }
      
      return { success: false, message: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Giriş başarısız';
      return { success: false, message };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await api.post('/auth/register', { username, email, password });
      
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.data);
        setIsAuthenticated(true);
        return { success: true };
      }
      
      return { success: false, message: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Kayıt başarısız';
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const checkAdminExists = async () => {
    try {
      const response = await api.get('/auth/check');
      return response.data.adminExists;
    } catch (error) {
      console.error('Admin check failed:', error);
      return false;
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    checkAdminExists
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
