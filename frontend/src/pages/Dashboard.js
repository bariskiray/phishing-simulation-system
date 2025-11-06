import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOverviewReport, getCampaigns } from '../services/api';
import './Dashboard.css';

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [reportRes, campaignsRes] = await Promise.all([
        getOverviewReport(),
        getCampaigns()
      ]);

      setStats(reportRes.data.data);
      setCampaigns(campaignsRes.data.data.slice(0, 5));
      setLoading(false);
    } catch (error) {
      console.error('Dashboard yükleme hatası:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  const overview = stats?.overview || {};
  const topRiskyUsers = stats?.topRiskyUsers || [];

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Phishing simülasyon sistemi genel bakış</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#667eea' }}>📧</div>
          <div className="stat-content">
            <h3>{overview.totalSent || 0}</h3>
            <p>Gönderilen Mail</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f093fb' }}>👁️</div>
          <div className="stat-content">
            <h3>{overview.totalOpened || 0}</h3>
            <p>Açılan Mail</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#4facfe' }}>🖱️</div>
          <div className="stat-content">
            <h3>{overview.totalClicked || 0}</h3>
            <p>Tıklanan Link</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#43e97b' }}>📊</div>
          <div className="stat-content">
            <h3>{overview.totalCampaigns || 0}</h3>
            <p>Toplam Kampanya</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h2>Ortalama Oranlar</h2>
          </div>
          <div className="rates">
            <div className="rate-item">
              <div className="rate-label">Açılma Oranı</div>
              <div className="rate-bar">
                <div 
                  className="rate-fill" 
                  style={{ width: `${overview.averageOpenRate || 0}%`, background: '#667eea' }}
                ></div>
              </div>
              <div className="rate-value">{overview.averageOpenRate || 0}%</div>
            </div>
            <div className="rate-item">
              <div className="rate-label">Tıklama Oranı</div>
              <div className="rate-bar">
                <div 
                  className="rate-fill" 
                  style={{ width: `${overview.averageClickRate || 0}%`, background: '#e74c3c' }}
                ></div>
              </div>
              <div className="rate-value">{overview.averageClickRate || 0}%</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Son Kampanyalar</h2>
            <Link to="/campaigns" className="btn btn-primary btn-sm">Tümü</Link>
          </div>
          {campaigns.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Kampanya</th>
                  <th>Durum</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(campaign => (
                  <tr key={campaign._id}>
                    <td>
                      <Link to={`/campaigns/${campaign._id}`}>
                        {campaign.name}
                      </Link>
                    </td>
                    <td>
                      <span className={`badge badge-${getStatusColor(campaign.status)}`}>
                        {getStatusText(campaign.status)}
                      </span>
                    </td>
                    <td>{new Date(campaign.createdAt).toLocaleDateString('tr-TR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">Henüz kampanya bulunmuyor</p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>En Riskli Kullanıcılar</h2>
        </div>
        {topRiskyUsers.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th>E-posta</th>
                <th>Tıklama Sayısı</th>
                <th>Kampanya Sayısı</th>
                <th>Risk Seviyesi</th>
              </tr>
            </thead>
            <tbody>
              {topRiskyUsers.map((item, index) => (
                <tr key={item.user._id}>
                  <td>{item.user.name}</td>
                  <td>{item.user.email}</td>
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
          <p className="empty-state">Henüz veri bulunmuyor</p>
        )}
      </div>
    </div>
  );
}

function getStatusColor(status) {
  const colors = {
    'draft': 'secondary',
    'scheduled': 'info',
    'sent': 'success',
    'completed': 'success'
  };
  return colors[status] || 'secondary';
}

function getStatusText(status) {
  const texts = {
    'draft': 'Taslak',
    'scheduled': 'Zamanlandı',
    'sent': 'Gönderildi',
    'completed': 'Tamamlandı'
  };
  return texts[status] || status;
}

function getRiskColor(clickCount) {
  if (clickCount >= 5) return 'danger';
  if (clickCount >= 3) return 'warning';
  return 'info';
}

function getRiskLevel(clickCount) {
  if (clickCount >= 5) return 'Yüksek';
  if (clickCount >= 3) return 'Orta';
  return 'Düşük';
}

export default Dashboard;

