import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCampaign, getCampaignReport } from '../services/api';
import './CampaignDetail.css';

function CampaignDetail() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaignData();
  }, [id]);

  const loadCampaignData = async () => {
    try {
      const [campaignRes, reportRes] = await Promise.all([
        getCampaign(id),
        getCampaignReport(id)
      ]);

      setCampaign(campaignRes.data.data);
      setReport(reportRes.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Kampanya detay yükleme hatası:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  if (!campaign || !report) {
    return <div className="error">Kampanya bulunamadı</div>;
  }

  const { summary, riskAssessment, userStats } = report;

  return (
    <div className="campaign-detail">
      <div className="page-header">
        <div>
          <Link to="/campaigns" className="back-link">← Kampanyalara Dön</Link>
          <h1>{campaign.name}</h1>
          <p>{campaign.subject}</p>
        </div>
        <span className={`badge badge-${getStatusColor(campaign.status)}`}>
          {getStatusText(campaign.status)}
        </span>
      </div>

      <div className="stats-overview">
        <div className="stat-card-detail">
          <div className="stat-icon" style={{ background: '#667eea' }}>📧</div>
          <div>
            <div className="stat-value">{summary.sent}</div>
            <div className="stat-label">Gönderildi</div>
          </div>
        </div>
        <div className="stat-card-detail">
          <div className="stat-icon" style={{ background: '#f093fb' }}>👁️</div>
          <div>
            <div className="stat-value">{summary.opened}</div>
            <div className="stat-label">Açıldı ({summary.openRate}%)</div>
          </div>
        </div>
        <div className="stat-card-detail">
          <div className="stat-icon" style={{ background: '#4facfe' }}>🖱️</div>
          <div>
            <div className="stat-value">{summary.clicked}</div>
            <div className="stat-label">Tıklandı ({summary.clickRate}%)</div>
          </div>
        </div>
        <div className="stat-card-detail">
          <div className={`stat-icon ${getRiskBg(riskAssessment)}`}>⚠️</div>
          <div>
            <div className="stat-value">{riskAssessment}</div>
            <div className="stat-label">Risk Seviyesi</div>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="card">
          <h2>Kampanya Bilgileri</h2>
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">Oluşturulma:</span>
              <span>{new Date(campaign.createdAt).toLocaleString('tr-TR')}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Gönderim Tarihi:</span>
              <span>{new Date(campaign.sendDate).toLocaleString('tr-TR')}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Template:</span>
              <span>{getTemplateText(campaign.template)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Hedef Kullanıcı:</span>
              <span>{summary.totalTargets} kişi</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Performans Metrikleri</h2>
          <div className="metric-bars">
            <div className="metric">
              <div className="metric-header">
                <span>Açılma Oranı</span>
                <span className="metric-value">{summary.openRate}%</span>
              </div>
              <div className="metric-bar">
                <div 
                  className="metric-fill"
                  style={{ width: `${summary.openRate}%`, background: '#667eea' }}
                />
              </div>
            </div>
            <div className="metric">
              <div className="metric-header">
                <span>Tıklama Oranı</span>
                <span className="metric-value">{summary.clickRate}%</span>
              </div>
              <div className="metric-bar">
                <div 
                  className="metric-fill"
                  style={{ width: `${summary.clickRate}%`, background: '#e74c3c' }}
                />
              </div>
            </div>
            <div className="metric">
              <div className="metric-header">
                <span>Click Through Rate</span>
                <span className="metric-value">{summary.clickThroughRate}%</span>
              </div>
              <div className="metric-bar">
                <div 
                  className="metric-fill"
                  style={{ width: `${summary.clickThroughRate}%`, background: '#f39c12' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Kullanıcı Detayları</h2>
        <table>
          <thead>
            <tr>
              <th>Kullanıcı</th>
              <th>E-posta</th>
              <th>Grup</th>
              <th>Gönderildi</th>
              <th>Açıldı</th>
              <th>Tıklandı</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {userStats.map((stat, index) => (
              <tr key={index}>
                <td>{stat.user.name}</td>
                <td>{stat.user.email}</td>
                <td>{stat.user.group}</td>
                <td>
                  {stat.sent ? (
                    <span className="status-icon success">✓</span>
                  ) : (
                    <span className="status-icon fail">✗</span>
                  )}
                </td>
                <td>
                  {stat.opened ? (
                    <span className="status-icon success">✓ ({stat.openCount})</span>
                  ) : (
                    <span className="status-icon">-</span>
                  )}
                </td>
                <td>
                  {stat.clicked ? (
                    <span className="status-icon danger">✓ ({stat.clickCount})</span>
                  ) : (
                    <span className="status-icon">-</span>
                  )}
                </td>
                <td>
                  <span className={`badge badge-${getUserRiskColor(stat)}`}>
                    {getUserRiskLevel(stat)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getStatusColor(status) {
  const colors = {
    'draft': 'secondary',
    'processing': 'warning-processing',
    'scheduled': 'info',
    'sent': 'success',
    'completed': 'success'
  };
  return colors[status] || 'secondary';
}

function getStatusText(status) {
  const texts = {
    'draft': 'Taslak',
    'processing': 'İşleniyor',
    'scheduled': 'Zamanlandı',
    'sent': 'Gönderildi',
    'completed': 'Tamamlandı'
  };
  return texts[status] || status;
}

function getTemplateText(template) {
  const texts = {
    'basic': 'Temel',
    'urgent': 'Acil',
    'custom': 'Özel'
  };
  return texts[template] || template;
}

function getRiskBg(risk) {
  if (risk === 'Yüksek') return 'risk-high';
  if (risk === 'Orta') return 'risk-medium';
  return 'risk-low';
}

function getUserRiskColor(stat) {
  if (stat.clicked) return 'danger';
  if (stat.opened) return 'warning';
  return 'success';
}

function getUserRiskLevel(stat) {
  if (stat.clicked) return 'Yüksek';
  if (stat.opened) return 'Orta';
  if (stat.sent) return 'Düşük';
  return 'Yok';
}

export default CampaignDetail;

