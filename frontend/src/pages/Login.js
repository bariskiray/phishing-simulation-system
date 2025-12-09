import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  const { login, register, isAuthenticated, checkAdminExists } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const checkAdmin = async () => {
      const adminExists = await checkAdminExists();
      setIsRegister(!adminExists);
      setCheckingAdmin(false);
    };
    checkAdmin();
  }, [checkAdminExists]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isRegister) {
      // Kayıt validasyonları
      if (password !== confirmPassword) {
        setError('Şifreler eşleşmiyor');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Şifre en az 6 karakter olmalıdır');
        setLoading(false);
        return;
      }

      const result = await register(username, email, password);
      if (!result.success) {
        setError(result.message);
      }
    } else {
      const result = await login(username, password);
      if (!result.success) {
        setError(result.message);
      }
    }

    setLoading(false);
  };

  if (checkingAdmin) {
    return (
      <div className="login-container">
        <div className="login-box">
          <div className="loading-spinner">Kontrol ediliyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <div className="login-logo">🛡️</div>
          <h1>Phishing Simülasyon</h1>
          <p>{isRegister ? 'İlk admin hesabını oluşturun' : 'Yönetim Paneli'}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Kullanıcı Adı</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Kullanıcı adınızı girin"
              required
              autoComplete="username"
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label htmlFor="email">E-posta</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-posta adresinizi girin"
                required
                autoComplete="email"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Şifre</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifrenizi girin"
              required
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Şifre Tekrar</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Şifrenizi tekrar girin"
                required
                autoComplete="new-password"
              />
            </div>
          )}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'İşleniyor...' : isRegister ? 'Hesap Oluştur' : 'Giriş Yap'}
          </button>
        </form>

        <div className="login-footer">
          <p>Phishing Simülasyon Sistemi v1.0</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
