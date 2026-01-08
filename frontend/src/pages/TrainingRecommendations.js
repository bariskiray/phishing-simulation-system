import React, { useState, useEffect } from 'react';
import { 
  getTrainingRecommendations,
  getUsers,
  updateTrainingRecommendations,
  completeTraining
} from '../services/api';
import './TrainingRecommendations.css';

function TrainingRecommendations() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Kullanıcılar yükleme hatası:', error);
      setLoading(false);
    }
  };

  const handleUserClick = async (userId) => {
    try {
      const res = await getTrainingRecommendations(userId);
      setRecommendations(res.data.data);
      setSelectedUser(userId);
    } catch (error) {
      console.error('Eğitim önerileri hatası:', error);
    }
  };

  const handleUpdateRecommendations = async () => {
    if (!selectedUser) return;
    
    try {
      setUpdating(true);
      await updateTrainingRecommendations(selectedUser);
      await handleUserClick(selectedUser);
      setUpdating(false);
      alert('Öneriler güncellendi!');
    } catch (error) {
      console.error('Öneri güncelleme hatası:', error);
      setUpdating(false);
      alert('Öneriler güncellenirken bir hata oluştu.');
    }
  };

  const handleCompleteTraining = async (moduleId, quizScore) => {
    if (!selectedUser) return;
    
    try {
      await completeTraining({
        userId: selectedUser,
        trainingContentId: moduleId,
        quizScore: quizScore,
        timeSpent: 30 // Varsayılan süre
      });
      
      // Önerileri yenile
      await handleUserClick(selectedUser);
      alert('Eğitim tamamlandı!');
    } catch (error) {
      console.error('Eğitim tamamlama hatası:', error);
      alert('Eğitim tamamlanırken bir hata oluştu.');
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

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  return (
    <div className="training-recommendations-page">
      <div className="page-header">
        <div>
          <h1>Eğitim Önerileri</h1>
          <p>Kişiselleştirilmiş eğitim önerileri ve ilerleme takibi</p>
        </div>
        {selectedUser && (
          <button 
            className="btn btn-primary" 
            onClick={handleUpdateRecommendations}
            disabled={updating}
          >
            {updating ? 'Güncelleniyor...' : 'Önerileri Yenile'}
          </button>
        )}
      </div>

      <div className="recommendations-content">
        <div className="users-sidebar">
          <h2>Kullanıcılar</h2>
          <div className="users-list">
            {users.map((user) => (
              <div
                key={user._id}
                className={`user-item ${selectedUser === user._id ? 'selected' : ''}`}
                onClick={() => handleUserClick(user._id)}
              >
                <div className="user-name">{user.name}</div>
                <div className="user-email">{user.email}</div>
              </div>
            ))}
          </div>
        </div>

        {recommendations && (
          <div className="recommendations-main">
            <div className="user-header">
              <div>
                <h2>{recommendations.user?.name}</h2>
                <p>{recommendations.user?.email}</p>
              </div>
              {recommendations.progress && (
                <div className="progress-summary">
                  <div className="progress-item">
                    <span>Tamamlanan:</span>
                    <strong>{recommendations.progress.completedModules} / {recommendations.progress.totalModules}</strong>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${recommendations.progress.completionRate}%` }}
                    />
                  </div>
                  <div className="progress-percent">
                    {recommendations.progress.completionRate.toFixed(1)}%
                  </div>
                </div>
              )}
            </div>

            <div className="recommendations-list">
              {recommendations.trainingNeeds
                .sort((a, b) => b.priority - a.priority)
                .map((need, index) => (
                  <div key={index} className="recommendation-card">
                    <div className="card-header">
                      <h3>{getCategoryName(need.category)}</h3>
                      <span 
                        className="priority-badge"
                        style={{ 
                          backgroundColor: getPriorityColor(need.priority) + '20',
                          color: getPriorityColor(need.priority)
                        }}
                      >
                        Öncelik: {(need.priority * 100).toFixed(0)}%
                      </span>
                    </div>
                    
                    <p className="recommendation-reason">{need.reason}</p>

                    {need.recommendedModules && need.recommendedModules.length > 0 && (
                      <div className="modules-section">
                        <h4>Önerilen Eğitim Modülleri</h4>
                        <div className="modules-grid">
                          {need.recommendedModules.map((module, idx) => (
                            <div key={idx} className="module-card">
                              <div className="module-header">
                                <h5>{module.title || module.id}</h5>
                                <span className="module-duration">{module.duration || 30} dk</span>
                              </div>
                              {module.description && (
                                <p className="module-description">{module.description}</p>
                              )}
                              {module.difficulty && (
                                <span className={`difficulty-badge difficulty-${module.difficulty}`}>
                                  {module.difficulty === 'beginner' ? 'Başlangıç' :
                                   module.difficulty === 'intermediate' ? 'Orta' : 'İleri'}
                                </span>
                              )}
                              <button
                                className="btn btn-small btn-primary"
                                onClick={() => handleCompleteTraining(module.id || module._id)}
                              >
                                Tamamla
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {need.completedModules && need.completedModules.length > 0 && (
                      <div className="completed-modules">
                        <h4>Tamamlanan Modüller</h4>
                        <ul>
                          {need.completedModules.map((module, idx) => (
                            <li key={idx}>
                              <span className="completed-icon">✓</span>
                              {module.title || module.id}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {recommendations.recommendedOrder && recommendations.recommendedOrder.length > 0 && (
              <div className="recommended-order">
                <h3>Önerilen Eğitim Sırası</h3>
                <div className="order-steps">
                  {recommendations.recommendedOrder.map((category, idx) => (
                    <div key={idx} className="order-step">
                      <div className="step-number">{idx + 1}</div>
                      <div className="step-content">
                        <strong>{getCategoryName(category)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!recommendations && selectedUser && (
          <div className="no-recommendations">
            <p>Bu kullanıcı için henüz eğitim önerisi yok.</p>
            <button 
              className="btn btn-primary"
              onClick={handleUpdateRecommendations}
            >
              Analiz Yap
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TrainingRecommendations;

