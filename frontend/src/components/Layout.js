import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>🎣 Phishing Sim</h2>
          <p>Güvenlik Eğitim Sistemi</p>
        </div>
        <ul className="nav-menu">
          <li>
            <Link to="/" className={isActive('/')}>
              <span className="icon">📊</span>
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/users" className={isActive('/users')}>
              <span className="icon">👥</span>
              Kullanıcılar
            </Link>
          </li>
          <li>
            <Link to="/campaigns" className={isActive('/campaigns')}>
              <span className="icon">📧</span>
              Kampanyalar
            </Link>
          </li>
          <li>
            <Link to="/scheduled-campaigns" className={isActive('/scheduled-campaigns')}>
              <span className="icon">⏰</span>
              Zamanlanmış Kampanyalar
            </Link>
          </li>
          <li>
            <Link to="/reports" className={isActive('/reports')}>
              <span className="icon">📈</span>
              Raporlar
            </Link>
          </li>
        </ul>
        
        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-icon">👤</span>
            <span className="user-name">{user?.username || 'Admin'}</span>
          </div>
          <button onClick={handleLogout} className="logout-button">
            <span className="icon">🚪</span>
            Çıkış Yap
          </button>
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default Layout;
