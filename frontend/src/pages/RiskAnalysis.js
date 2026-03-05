import React, { useState, useEffect } from 'react';
import { 
  getRiskAnalysisUsers, 
  getUserRiskAnalysis, 
  getRiskAnalysisSummary,
  calculateRiskScores,
  exportTrainingData,
  getTrainingNeedsSummary,
  getTrainingNeeds,
  analyzeTrainingNeeds
} from '../services/api';
import './RiskAnalysis.css';

function RiskAnalysis() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [trainingNeedsSummary, setTrainingNeedsSummary] = useState(null);
  const [userTrainingNeeds, setUserTrainingNeeds] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadData();
  }, [categoryFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, summaryRes, trainingSummaryRes] = await Promise.all([
        getRiskAnalysisUsers(categoryFilter || undefined),
        getRiskAnalysisSummary(),
        getTrainingNeedsSummary()
      ]);

      setUsers(usersRes.data.data);
      setSummary(summaryRes.data.data);
      setTrainingNeedsSummary(trainingSummaryRes.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Risk analizi yükleme hatası:', error);
      setLoading(false);
    }
  };

  const handleUserClick = async (userId) => {
    try {
      const [riskRes, trainingRes] = await Promise.all([
        getUserRiskAnalysis(userId),
        getTrainingNeeds(userId).catch(() => ({ data: { data: null } }))
      ]);
      setUserDetails(riskRes.data.data);
      setUserTrainingNeeds(trainingRes.data.data);
      setSelectedUser(userId);
    } catch (error) {
      console.error('Kullanıcı detayları yükleme hatası:', error);
    }
  };

  const handleCalculateScores = async () => {
    try {
      setCalculating(true);
      await calculateRiskScores();
      await loadData();
      setCalculating(false);
      alert('Skorlar başarıyla hesaplandı ve güncellendi!');
    } catch (error) {
      console.error('Skor hesaplama hatası:', error);
      setCalculating(false);
      alert('Skor hesaplama sırasında bir hata oluştu.');
    }
  };

  const handleExportTrainingData = async (format) => {
    try {
      const res = await exportTrainingData(format);
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `training-data-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export hatası:', error);
      alert('Export sırasında bir hata oluştu.');
    }
  };

  const handleAnalyzeAll = async () => {
    try {
      setAnalyzing(true);
      // resetAll: true ile eski verileri sil ve yeniden analiz yap
      await analyzeTrainingNeeds(null, true, true);
      await loadData();
      // Seçili kullanıcı varsa, onun verilerini de yenile
      if (selectedUser) {
        await handleUserClick(selectedUser);
      }
      setAnalyzing(false);
      alert('Tüm kullanıcılar için eğitim gerekliliği analizi tamamlandı!');
    } catch (error) {
      console.error('Analiz hatası:', error);
      setAnalyzing(false);
      alert('Analiz sırasında bir hata oluştu.');
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Kritik': return '#e74c3c';
      case 'Yüksek': return '#f39c12';
      case 'Orta': return '#f1c40f';
      case 'Düşük': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const getCategoryBgColor = (category) => {
    switch (category) {
      case 'Kritik': return '#fee';
      case 'Yüksek': return '#fff4e6';
      case 'Orta': return '#fffbf0';
      case 'Düşük': return '#f0f9f4';
      default: return '#f8f9fa';
    }
  };

  const getTrainingCategoryName = (category) => {
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
    if (priority >= 0.35) return '#f1c40f';
    return '#27ae60';
  };

  const getPriorityLabel = (priority) => {
    if (priority >= 0.8) return 'Kritik';
    if (priority >= 0.6) return 'Yüksek';
    if (priority >= 0.35) return 'Orta';
    return 'Düşük';
  };

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  return (
    <div className="risk-analysis-page">
      <div className="page-header">
        <div>
          <h1>Risk Analizi ve Skorlama</h1>
          <p>Kullanıcı bazlı risk skorları ve kampanya tipine göre düşme analizi</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-primary" 
            onClick={handleCalculateScores}
            disabled={calculating}
          >
            {calculating ? 'Hesaplanıyor...' : 'Skorları Yeniden Hesapla'}
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleAnalyzeAll}
            disabled={analyzing}
          >
            {analyzing ? 'Analiz Yapılıyor...' : 'Tüm Kullanıcıları Analiz Et'}
          </button>
          <div className="export-buttons">
            <button 
              className="btn btn-secondary" 
              onClick={() => handleExportTrainingData('json')}
            >
              JSON Export
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => handleExportTrainingData('csv')}
            >
              CSV Export
            </button>
          </div>
        </div>
      </div>

      {/* Risk Özet Kartları */}
      {summary && (
        <div className="summary-cards">
          <div className="summary-card">
            <h3>Toplam Kullanıcı</h3>
            <div className="summary-value">{summary.summary?.totalUsers || 0}</div>
          </div>
          <div className="summary-card">
            <h3>Ortalama Açılma Oranı</h3>
            <div className="summary-value">{summary.summary?.avgOpenRate || 0}%</div>
          </div>
          <div className="summary-card">
            <h3>Ortalama Tıklama Oranı</h3>
            <div className="summary-value">{summary.summary?.avgClickRate || 0}%</div>
          </div>
          <div className="summary-card">
            <h3>Yüksek Riskli Kullanıcı</h3>
            <div className="summary-value">{summary.summary?.highRiskUsers || 0}</div>
          </div>
        </div>
      )}

      {/* Eğitim Gereklilikleri Özet Kartları */}
      {trainingNeedsSummary && (
        <div className="summary-cards">
          <div className="summary-card">
            <h3>Toplam Kullanıcı (Eğitim)</h3>
            <div className="summary-value">{trainingNeedsSummary.totalUsers || 0}</div>
          </div>
          <div className="summary-card">
            <h3>Yüksek Öncelikli</h3>
            <div className="summary-value">{trainingNeedsSummary.highPriorityUsers || 0}</div>
          </div>
          <div className="summary-card">
            <h3>Orta Öncelikli</h3>
            <div className="summary-value">{trainingNeedsSummary.mediumPriorityUsers || 0}</div>
          </div>
          <div className="summary-card">
            <h3>Ortalama Öncelik</h3>
            <div className="summary-value">{trainingNeedsSummary.avgPriority?.toFixed(2) || 0}</div>
          </div>
        </div>
      )}

      {/* Risk Kategori Dağılımı */}
      {summary && summary.categoryDistribution && (
        <div className="category-distribution">
          <h2>Risk Kategorisi Dağılımı</h2>
          <div className="category-grid">
            {Object.entries(summary.categoryDistribution).map(([category, count]) => (
              <div 
                key={category} 
                className="category-item"
                style={{ 
                  backgroundColor: getCategoryBgColor(category),
                  borderLeft: `4px solid ${getCategoryColor(category)}`
                }}
              >
                <div className="category-name">{category}</div>
                <div className="category-count">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Eğitim Kategori Dağılımı */}
      {trainingNeedsSummary && trainingNeedsSummary.categoryDistribution && (
        <div className="category-distribution">
          <h2>Eğitim Kategorisi Dağılımı</h2>
          <div className="category-grid">
            {Object.entries(trainingNeedsSummary.categoryDistribution).map(([category, count]) => (
              <div key={category} className="category-item">
                <div className="category-name">{getTrainingCategoryName(category)}</div>
                <div className="category-count">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtre ve Kullanıcı Listesi */}
      <div className="risk-content">
        <div className="users-section">
          <div className="section-header">
            <h2>Kullanıcı Risk Skorları</h2>
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="category-filter"
            >
              <option value="">Tüm Kategoriler</option>
              <option value="Düşük">Düşük</option>
              <option value="Orta">Orta</option>
              <option value="Yüksek">Yüksek</option>
              <option value="Kritik">Kritik</option>
            </select>
          </div>

          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Kullanıcı</th>
                  <th>Grup</th>
                  <th>Departman</th>
                  <th>Risk Skoru</th>
                  <th>Kategori</th>
                  <th>Son Hesaplama</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr 
                    key={user.userId}
                    className={selectedUser === user.userId ? 'selected' : ''}
                    onClick={() => handleUserClick(user.userId)}
                  >
                    <td>
                      <div className="user-info">
                        <strong>{user.user?.name || 'N/A'}</strong>
                        <span className="user-email">{user.user?.email || ''}</span>
                      </div>
                    </td>
                    <td>{user.user?.group || '-'}</td>
                    <td>{user.user?.department || '-'}</td>
                    <td>
                      <div className="score-display">
                        <span className="score-value">{user.score}</span>
                        <span className="score-max">/100</span>
                      </div>
                    </td>
                    <td>
                      <span 
                        className="category-badge"
                        style={{ 
                          backgroundColor: getCategoryBgColor(user.category),
                          color: getCategoryColor(user.category)
                        }}
                      >
                        {user.category}
                      </span>
                    </td>
                    <td>
                      {user.lastCalculated 
                        ? new Date(user.lastCalculated).toLocaleDateString('tr-TR')
                        : '-'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kullanıcı Detayları */}
        {userDetails && (
          <div className="user-details-section">
            <h2>Detaylı Risk Analizi</h2>
            <div className="details-content">
              {/* Skor Detayları */}
              <div className="detail-card">
                <h3>Risk Skoru: {userDetails.score} / 100</h3>
                <div className="category-badge-large" style={{ 
                  backgroundColor: getCategoryBgColor(userDetails.category),
                  color: getCategoryColor(userDetails.category)
                }}>
                  {userDetails.category}
                </div>
                
                {userDetails.breakdown && (
                  <div className="score-breakdown">
                    <h4>Skor Detayları</h4>
                    <div className="breakdown-item">
                      <span>Tıklama Oranı</span>
                      <span>{userDetails.breakdown.clickRate?.score || 0} puan</span>
                    </div>
                    <div className="breakdown-item">
                      <span>Kampanya Çeşitliliği</span>
                      <span>{userDetails.breakdown.campaignDiversity?.score || 0} puan</span>
                    </div>
                    <div className="breakdown-item">
                      <span>Son Davranış</span>
                      <span>{userDetails.breakdown.recentBehavior?.score || 0} puan</span>
                    </div>
                    <div className="breakdown-item">
                      <span>Şiddet</span>
                      <span>{userDetails.breakdown.severity?.score || 0} puan</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Susceptibility */}
              {userDetails.susceptibility && (
                <div className="detail-card">
                  <h3>Kampanya Tipine Göre Düşme Olasılığı</h3>
                  <div className="susceptibility-chart">
                    <div className="susceptibility-item">
                      <span>Basic</span>
                      <div className="susceptibility-bar">
                        <div 
                          className="susceptibility-fill"
                          style={{ 
                            width: `${userDetails.susceptibility.basic * 100}%`,
                            backgroundColor: '#667eea'
                          }}
                        />
                      </div>
                      <span>{(userDetails.susceptibility.basic * 100).toFixed(1)}%</span>
                    </div>
                    <div className="susceptibility-item">
                      <span>Urgent</span>
                      <div className="susceptibility-bar">
                        <div 
                          className="susceptibility-fill"
                          style={{ 
                            width: `${userDetails.susceptibility.urgent * 100}%`,
                            backgroundColor: '#e74c3c'
                          }}
                        />
                      </div>
                      <span>{(userDetails.susceptibility.urgent * 100).toFixed(1)}%</span>
                    </div>
                    <div className="susceptibility-item">
                      <span>Custom</span>
                      <div className="susceptibility-bar">
                        <div 
                          className="susceptibility-fill"
                          style={{ 
                            width: `${userDetails.susceptibility.custom * 100}%`,
                            backgroundColor: '#f39c12'
                          }}
                        />
                      </div>
                      <span>{(userDetails.susceptibility.custom * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Analizi Özeti */}
              {userDetails.riskAnalysis && (
                <div className="detail-card">
                  <h3>Risk Analizi Özeti</h3>
                  <div className="analysis-summary">
                    <div className="summary-row">
                      <span>Toplam Kampanya</span>
                      <strong>{userDetails.riskAnalysis.summary?.totalCampaigns || 0}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Açılan Kampanya</span>
                      <strong>{userDetails.riskAnalysis.summary?.openedCampaigns || 0}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Tıklanan Kampanya</span>
                      <strong>{userDetails.riskAnalysis.summary?.clickedCampaigns || 0}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Açılma Oranı</span>
                      <strong>{userDetails.riskAnalysis.summary?.openRate || 0}%</strong>
                    </div>
                    <div className="summary-row">
                      <span>Tıklama Oranı</span>
                      <strong>{userDetails.riskAnalysis.summary?.clickRate || 0}%</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Öneriler */}
              {userDetails.recommendations && userDetails.recommendations.length > 0 && (
                <div className="detail-card">
                  <h3>Öneriler</h3>
                  <div className="recommendations">
                    {userDetails.recommendations.map((rec, index) => (
                      <div key={index} className={`recommendation recommendation-${rec.type}`}>
                        <strong>{rec.title}</strong>
                        <p>{rec.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Eğitim Gereklilikleri */}
              {userTrainingNeeds && (
                <div className="detail-card">
                  <h3>Eğitim Gereklilikleri</h3>
                  <div className="user-header">
                    <div>
                      <strong>{userTrainingNeeds.user?.name}</strong>
                      <span className="user-email">{userTrainingNeeds.user?.email}</span>
                    </div>
                    <div className="overall-priority">
                      <span>Genel Öncelik:</span>
                      <span 
                        className="priority-badge"
                        style={{ color: getPriorityColor(userTrainingNeeds.overallPriority) }}
                      >
                        {getPriorityLabel(userTrainingNeeds.overallPriority)}
                      </span>
                    </div>
                  </div>

                  <div className="needs-list">
                    {userTrainingNeeds.trainingNeeds
                      .sort((a, b) => b.priority - a.priority)
                      .map((need, index) => (
                        <div key={index} className="need-card">
                          <div className="need-header">
                            <h4>{getTrainingCategoryName(need.category)}</h4>
                            <span 
                              className="priority-badge"
                              style={{ 
                                backgroundColor: getPriorityColor(need.priority) + '20',
                                color: getPriorityColor(need.priority)
                              }}
                            >
                              {getPriorityLabel(need.priority)}
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
                              <h5>Önerilen Eğitimler:</h5>
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

                  {userTrainingNeeds.recommendedOrder && userTrainingNeeds.recommendedOrder.length > 0 && (
                    <div className="recommended-order">
                      <h4>Önerilen Eğitim Sırası</h4>
                      <ol>
                        {userTrainingNeeds.recommendedOrder.map((category, idx) => (
                          <li key={idx}>{getTrainingCategoryName(category)}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="model-info">
                    <small>
                      Model Versiyonu: {userTrainingNeeds.modelVersion} | 
                      Son Analiz: {new Date(userTrainingNeeds.lastAnalyzed).toLocaleString('tr-TR')}
                    </small>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RiskAnalysis;

