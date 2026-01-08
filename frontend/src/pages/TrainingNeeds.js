import React, { useState, useEffect } from 'react';
import { 
  getTrainingNeedsSummary,
  getTrainingNeeds,
  getUsers,
  analyzeTrainingNeeds
} from '../services/api';
import './TrainingNeeds.css';

function TrainingNeeds() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userNeeds, setUserNeeds] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryRes, usersRes] = await Promise.all([
        getTrainingNeedsSummary(),
        getUsers()
      ]);

      setSummary(summaryRes.data.data);
      setUsers(usersRes.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Eğitim gereklilikleri yükleme hatası:', error);
      setLoading(false);
    }
  };

  const handleUserClick = async (userId) => {
    try {
      const res = await getTrainingNeeds(userId);
      setUserNeeds(res.data.data);
      setSelectedUser(userId);
    } catch (error) {
      console.error('Kullanıcı eğitim gereklilikleri hatası:', error);
    }
  };

  const handleAnalyzeAll = async () => {
    try {
      setAnalyzing(true);
      await analyzeTrainingNeeds();
      await loadData();
      setAnalyzing(false);
      alert('Tüm kullanıcılar için eğitim gerekliliği analizi tamamlandı!');
    } catch (error) {
      console.error('Analiz hatası:', error);
      setAnalyzing(false);
      alert('Analiz sırasında bir hata oluştu.');
    }
  };

  const getCategoryName = (category) => {
    const names = {
      'phishing-basics': 'Phishing Temelleri',
      'urgent-emails': 'Acil E-posta Tanıma',
      'link-security': 'Link Güvenliği',
      'social-engineering': 'Sosyal Mühendislik',
      'company-policies': 'Şirket Politikaları',
      'advanced-threats': 'Gelişmiş Tehditler',
      'time-based-threats': 'Zaman Bazlı Tehditler'
    };
    return names[category] || category;
  };

  const getPriorityColor = (priority) => {
    if (priority >= 0.8) return '#e74c3c';
    if (priority >= 0.6) return '#f39c12';
    if (priority >= 0.4) return '#f1c40f';
    return '#27ae60';
  };

  const getPriorityLabel = (priority) => {
    if (priority >= 0.8) return 'Kritik';
    if (priority >= 0.6) return 'Yüksek';
    if (priority >= 0.4) return 'Orta';
    return 'Düşük';
  };

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  return (
    <div className="training-needs-page">
      <div className="page-header">
        <div>
          <h1>Eğitim Gerekliliği Analizi</h1>
          <p>Kampanya ve risk bazlı eğitim gereklilikleri</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleAnalyzeAll}
          disabled={analyzing}
        >
          {analyzing ? 'Analiz Yapılıyor...' : 'Tüm Kullanıcıları Analiz Et'}
        </button>
      </div>

      {/* Özet Kartlar */}
      {summary && (
        <div className="summary-cards">
          <div className="summary-card">
            <h3>Toplam Kullanıcı</h3>
            <div className="summary-value">{summary.totalUsers || 0}</div>
          </div>
          <div className="summary-card">
            <h3>Yüksek Öncelikli</h3>
            <div className="summary-value">{summary.highPriorityUsers || 0}</div>
          </div>
          <div className="summary-card">
            <h3>Orta Öncelikli</h3>
            <div className="summary-value">{summary.mediumPriorityUsers || 0}</div>
          </div>
          <div className="summary-card">
            <h3>Ortalama Öncelik</h3>
            <div className="summary-value">{(summary.avgPriority * 100).toFixed(1)}%</div>
          </div>
        </div>
      )}

      {/* Kategori Dağılımı */}
      {summary && summary.categoryDistribution && (
        <div className="category-distribution">
          <h2>Eğitim Kategorisi Dağılımı</h2>
          <div className="category-grid">
            {Object.entries(summary.categoryDistribution).map(([category, count]) => (
              <div key={category} className="category-item">
                <div className="category-name">{getCategoryName(category)}</div>
                <div className="category-count">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kullanıcı Listesi ve Detaylar */}
      <div className="training-content">
        <div className="users-section">
          <h2>Kullanıcılar</h2>
          <div className="users-list">
            {users.map((user) => (
              <div
                key={user._id}
                className={`user-card ${selectedUser === user._id ? 'selected' : ''}`}
                onClick={() => handleUserClick(user._id)}
              >
                <div className="user-info">
                  <strong>{user.name}</strong>
                  <span className="user-email">{user.email}</span>
                </div>
                <div className="user-meta">
                  <span>{user.group || '-'}</span>
                  <span>{user.department || '-'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kullanıcı Eğitim Gereklilikleri */}
        {userNeeds && (
          <div className="needs-section">
            <h2>Eğitim Gereklilikleri</h2>
            <div className="user-header">
              <div>
                <strong>{userNeeds.user?.name}</strong>
                <span className="user-email">{userNeeds.user?.email}</span>
              </div>
              <div className="overall-priority">
                <span>Genel Öncelik:</span>
                <span 
                  className="priority-badge"
                  style={{ color: getPriorityColor(userNeeds.overallPriority) }}
                >
                  {(userNeeds.overallPriority * 100).toFixed(0)}% - {getPriorityLabel(userNeeds.overallPriority)}
                </span>
              </div>
            </div>

            <div className="needs-list">
              {userNeeds.trainingNeeds
                .sort((a, b) => b.priority - a.priority)
                .map((need, index) => (
                  <div key={index} className="need-card">
                    <div className="need-header">
                      <h3>{getCategoryName(need.category)}</h3>
                      <span 
                        className="priority-badge"
                        style={{ 
                          backgroundColor: getPriorityColor(need.priority) + '20',
                          color: getPriorityColor(need.priority)
                        }}
                      >
                        {(need.priority * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="need-reason">{need.reason}</p>
                    
                    {need.campaignBased && (
                      <span className="need-tag campaign-tag">Kampanya Bazlı</span>
                    )}
                    {need.riskBased && (
                      <span className="need-tag risk-tag">Risk Bazlı</span>
                    )}

                    {need.modules && need.modules.length > 0 && (
                      <div className="recommended-modules">
                        <h4>Önerilen Eğitimler:</h4>
                        <ul>
                          {need.modules.map((module, idx) => (
                            <li key={idx}>
                              <strong>{module.title}</strong>
                              <span className="module-duration">{module.duration} dk</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="estimated-duration">
                      Tahmini Süre: {need.estimatedDuration || 30} dakika
                    </div>
                  </div>
                ))}
            </div>

            {userNeeds.recommendedOrder && userNeeds.recommendedOrder.length > 0 && (
              <div className="recommended-order">
                <h3>Önerilen Eğitim Sırası</h3>
                <ol>
                  {userNeeds.recommendedOrder.map((category, idx) => (
                    <li key={idx}>{getCategoryName(category)}</li>
                  ))}
                </ol>
              </div>
            )}

            <div className="model-info">
              <small>
                Model Versiyonu: {userNeeds.modelVersion} | 
                Güven: {(userNeeds.confidence * 100).toFixed(0)}% | 
                Son Analiz: {new Date(userNeeds.lastAnalyzed).toLocaleString('tr-TR')}
              </small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TrainingNeeds;

