import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOverviewReport, getCampaigns } from '../services/api';
import './Reports.css';

function Reports() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [topRiskyUsers, setTopRiskyUsers] = useState([]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const [reportRes, campaignsRes] = await Promise.all([
        getOverviewReport(),
        getCampaigns()
      ]);

      const data = reportRes.data.data;
      setOverview(data.overview);
      setTopRiskyUsers(data.topRiskyUsers);
      setCampaigns(campaignsRes.data.data.filter(c => c.status === 'sent' || c.status === 'completed'));
      setLoading(false);
    } catch (error) {
      console.error('Rapor yükleme hatası:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h1>Raporlar ve Analitik</h1>
          <p>Detaylı phishing simülasyon raporları</p>
        </div>
      </div>

      <div className="report-summary">
        <div className="summary-card">
          <h3>Genel Özet</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Toplam Kampanya</span>
              <span className="summary-value">{overview?.totalCampaigns || 0}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Gönderilen Mail</span>
              <span className="summary-value">{overview?.totalSent || 0}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Açılan Mail</span>
              <span className="summary-value">{overview?.totalOpened || 0}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Tıklanan Link</span>
              <span className="summary-value">{overview?.totalClicked || 0}</span>
            </div>
          </div>
        </div>

        <div className="summary-card">
          <h3>Ortalama Başarı Oranları</h3>
          <div className="rate-chart">
            <div className="rate-row">
              <div className="rate-info">
                <span className="rate-label">Açılma Oranı</span>
                <span className="rate-percent">{overview?.averageOpenRate || 0}%</span>
              </div>
              <div className="rate-bar-container">
                <div 
                  className="rate-bar-fill"
                  style={{ width: `${overview?.averageOpenRate || 0}%`, background: '#667eea' }}
                />
              </div>
            </div>
            <div className="rate-row">
              <div className="rate-info">
                <span className="rate-label">Tıklama Oranı</span>
                <span className="rate-percent">{overview?.averageClickRate || 0}%</span>
              </div>
              <div className="rate-bar-container">
                <div 
                  className="rate-bar-fill"
                  style={{ width: `${overview?.averageClickRate || 0}%`, background: '#e74c3c' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Kampanya Performans Tablosu</h2>
        {campaigns.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Kampanya</th>
                <th>Hedef</th>
                <th>Gönderildi</th>
                <th>Açıldı</th>
                <th>Tıklandı</th>
                <th>Açılma %</th>
                <th>Tıklama %</th>
                <th>Detay</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(campaign => {
                const openRate = campaign.stats.sent > 0 
                  ? ((campaign.stats.opened / campaign.stats.sent) * 100).toFixed(1)
                  : 0;
                const clickRate = campaign.stats.sent > 0
                  ? ((campaign.stats.clicked / campaign.stats.sent) * 100).toFixed(1)
                  : 0;

                return (
                  <tr key={campaign._id}>
                    <td><strong>{campaign.name}</strong></td>
                    <td>{campaign.targetUsers.length}</td>
                    <td>{campaign.stats.sent}</td>
                    <td>{campaign.stats.opened}</td>
                    <td>{campaign.stats.clicked}</td>
                    <td>
                      <span className={`badge badge-${getPercentColor(openRate)}`}>
                        {openRate}%
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${getPercentColor(clickRate)}`}>
                        {clickRate}%
                      </span>
                    </td>
                    <td>
                      <Link to={`/campaigns/${campaign._id}`} className="btn btn-secondary btn-sm">
                        Görüntüle
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <p>Henüz gönderilmiş kampanya bulunmuyor</p>
          </div>
        )}
      </div>

      <div className="card">
        <h2>En Riskli Kullanıcılar (Top 10)</h2>
        {topRiskyUsers.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Kullanıcı</th>
                <th>E-posta</th>
                <th>Grup</th>
                <th>Toplam Tıklama</th>
                <th>Kampanya Sayısı</th>
                <th>Risk Seviyesi</th>
              </tr>
            </thead>
            <tbody>
              {topRiskyUsers.map((item, index) => (
                <tr key={item.user._id}>
                  <td>
                    <span className="rank">{index + 1}</span>
                  </td>
                  <td><strong>{item.user.name}</strong></td>
                  <td>{item.user.email}</td>
                  <td>{item.user.group}</td>
                  <td>{item.clickCount}</td>
                  <td>{item.campaignCount}</td>
                  <td>
                    <span className={`badge badge-${getRiskColor(item.clickCount)}`}>
                      {getRiskLevel(item.clickCount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <p>Henüz veri bulunmuyor</p>
          </div>
        )}
      </div>

      <div className="insights-section">
        <h2>📊 Öneriler ve İçgörüler</h2>
        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-icon">💡</div>
            <h3>Eğitim Önerisi</h3>
            <p>
              {topRiskyUsers.length > 0 
                ? `${topRiskyUsers.length} kullanıcı yüksek risk gösteriyor. Bu kullanıcılara özel güvenlik eğitimi verilmesi önerilir.`
                : 'Tüm kullanıcılar düşük risk seviyesinde. Eğitim programları başarılı!'
              }
            </p>
          </div>
          <div className="insight-card">
            <div className="insight-icon">📈</div>
            <h3>Trend Analizi</h3>
            <p>
              Ortalama tıklama oranı: {overview?.averageClickRate || 0}%. 
              {parseFloat(overview?.averageClickRate || 0) > 30 
                ? ' Yüksek! Daha fazla farkındalık eğitimi gerekli.'
                : ' Kabul edilebilir seviyede. Düzenli testlere devam edin.'
              }
            </p>
          </div>
          <div className="insight-card">
            <div className="insight-icon">🎯</div>
            <h3>Kampanya Etkinliği</h3>
            <p>
              {campaigns.length} kampanya tamamlandı. 
              {campaigns.length > 5 
                ? ' Düzenli test yapılıyor, harika!'
                : ' Daha sık kampanya düzenlenmesi önerilir.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getPercentColor(percent) {
  const p = parseFloat(percent);
  if (p >= 50) return 'danger';
  if (p >= 25) return 'warning';
  return 'success';
}

function getRiskColor(clickCount) {
  if (clickCount >= 5) return 'danger';
  if (clickCount >= 3) return 'warning';
  return 'info';
}

function getRiskLevel(clickCount) {
  if (clickCount >= 5) return 'Yüksek Risk';
  if (clickCount >= 3) return 'Orta Risk';
  return 'Düşük Risk';
}

export default Reports;

