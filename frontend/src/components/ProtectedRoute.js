import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Auth durumu kontrol edilirken loading göster
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Yükleniyor...</p>
        </div>
        <style>{`
          .loading-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .loading-spinner {
            text-align: center;
            color: white;
          }
          .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .loading-spinner p {
            font-size: 16px;
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  // Giriş yapılmamışsa login sayfasına yönlendir
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Giriş yapılmışsa children'ı render et
  return children;
}

export default ProtectedRoute;
