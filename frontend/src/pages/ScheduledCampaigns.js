import React, { useState, useEffect, useCallback } from 'react';
import {
  getScheduledCampaigns,
  deleteScheduledCampaign,
  startScheduledCampaign,
  stopScheduledCampaign,
  executeScheduledCampaign
} from '../services/api';
import ScheduledCampaignForm from '../components/ScheduledCampaignForm';
import './ScheduledCampaigns.css';

const ScheduledCampaigns = () => {
  const [scheduledCampaigns, setScheduledCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }, []);

  const fetchScheduledCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getScheduledCampaigns();
      setScheduledCampaigns(response.data.data);
    } catch (error) {
      console.error('Zamanlanmış kampanyalar yüklenemedi:', error);
      showMessage('error', 'Zamanlanmış kampanyalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    fetchScheduledCampaigns();
  }, [fetchScheduledCampaigns]);

  const handleCreate = () => {
    setEditingCampaign(null);
    setShowForm(true);
  };

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu zamanlanmış kampanyayı silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await deleteScheduledCampaign(id);
      showMessage('success', 'Zamanlanmış kampanya silindi');
      fetchScheduledCampaigns();
    } catch (error) {
      console.error('Silme hatası:', error);
      showMessage('error', 'Zamanlanmış kampanya silinemedi');
    }
  };

  const handleStart = async (id) => {
    try {
      await startScheduledCampaign(id);
      showMessage('success', 'Zamanlanmış kampanya başlatıldı');
      fetchScheduledCampaigns();
    } catch (error) {
      console.error('Başlatma hatası:', error);
      showMessage('error', error.response?.data?.message || 'Zamanlanmış kampanya başlatılamadı');
    }
  };

  const handleStop = async (id) => {
    try {
      await stopScheduledCampaign(id);
      showMessage('success', 'Zamanlanmış kampanya durduruldu');
      fetchScheduledCampaigns();
    } catch (error) {
      console.error('Durdurma hatası:', error);
      showMessage('error', 'Zamanlanmış kampanya durdurulamadı');
    }
  };

  const handleExecuteNow = async (id) => {
    if (!window.confirm('Bu kampanyayı şimdi çalıştırmak istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await executeScheduledCampaign(id);
      showMessage('success', 'Kampanya manuel olarak çalıştırıldı');
      fetchScheduledCampaigns();
    } catch (error) {
      console.error('Çalıştırma hatası:', error);
      showMessage('error', 'Kampanya çalıştırılamadı');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCampaign(null);
    fetchScheduledCampaigns();
    showMessage('success', editingCampaign ? 'Zamanlanmış kampanya güncellendi' : 'Zamanlanmış kampanya oluşturuldu');
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingCampaign(null);
  };

  const getIntervalText = (interval) => {
    const intervals = {
      daily: 'Günlük',
      weekly: 'Haftalık',
      monthly: 'Aylık'
    };
    return intervals[interval] || interval;
  };

  const getScheduleText = (interval, schedule) => {
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const time = `${String(schedule.hour).padStart(2, '0')}:${String(schedule.minute).padStart(2, '0')}`;

    if (interval === 'daily') {
      return `Her gün saat ${time}`;
    } else if (interval === 'weekly') {
      const dayName = days[schedule.dayOfWeek] || 'Pazartesi';
      return `Her ${dayName} saat ${time}`;
    } else if (interval === 'monthly') {
      return `Her ayın ${schedule.dayOfMonth}. günü saat ${time}`;
    }
    return time;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR');
  };

  if (showForm) {
    return (
      <div className="scheduled-campaigns-container">
        <ScheduledCampaignForm
          campaign={editingCampaign}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </div>
    );
  }

  return (
    <div className="scheduled-campaigns-container">
      <div className="page-header">
        <div>
          <h1>Zamanlanmış Kampanyalar</h1>
          <p className="page-description">
            Otomatik olarak belirli aralıklarla çalışacak phishing kampanyalarını yönetin
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleCreate}>
          <span className="icon">➕</span>
          Yeni Zamanlanmış Kampanya
        </button>
      </div>

      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : scheduledCampaigns.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>Henüz zamanlanmış kampanya yok</h3>
          <p>Otomatik olarak çalışacak ilk kampanyanızı oluşturun</p>
          <button className="btn btn-primary" onClick={handleCreate}>
            Zamanlanmış Kampanya Oluştur
          </button>
        </div>
      ) : (
        <div className="scheduled-campaigns-grid">
          {scheduledCampaigns.map((campaign) => (
            <div key={campaign._id} className={`campaign-card ${campaign.isActive ? 'active' : 'inactive'}`}>
              <div className="campaign-header">
                <div className="campaign-title-section">
                  <h3>{campaign.name}</h3>
                  <span className={`status-badge ${campaign.isActive ? 'active' : 'inactive'}`}>
                    {campaign.isActive ? '🟢 Aktif' : '⚫ Pasif'}
                  </span>
                </div>
                <div className="campaign-actions">
                  <button
                    className="btn-icon"
                    onClick={() => handleEdit(campaign)}
                    title="Düzenle"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => handleDelete(campaign._id)}
                    title="Sil"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="campaign-info">
                <div className="info-row">
                  <span className="info-label">Periyot:</span>
                  <span className="info-value">{getIntervalText(campaign.interval)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Zamanlama:</span>
                  <span className="info-value">{getScheduleText(campaign.interval, campaign.schedule)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Hedef Kullanıcı:</span>
                  <span className="info-value">{campaign.targetUsers?.length || 0} kişi</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Son Çalışma:</span>
                  <span className="info-value">{formatDate(campaign.lastRun)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Sonraki Çalışma:</span>
                  <span className="info-value highlight">{formatDate(campaign.nextRun)}</span>
                </div>
              </div>

              <div className="campaign-stats">
                <div className="stat">
                  <div className="stat-value">{campaign.stats.totalCampaigns}</div>
                  <div className="stat-label">Toplam Kampanya</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{campaign.stats.totalSent}</div>
                  <div className="stat-label">Gönderildi</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{campaign.stats.totalOpened}</div>
                  <div className="stat-label">Açıldı</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{campaign.stats.totalClicked}</div>
                  <div className="stat-label">Tıklandı</div>
                </div>
              </div>

              <div className="campaign-controls">
                {campaign.isActive ? (
                  <button
                    className="btn btn-danger"
                    onClick={() => handleStop(campaign._id)}
                  >
                    ⏹️ Durdur
                  </button>
                ) : (
                  <button
                    className="btn btn-success"
                    onClick={() => handleStart(campaign._id)}
                  >
                    ▶️ Başlat
                  </button>
                )}
                <button
                  className="btn btn-secondary"
                  onClick={() => handleExecuteNow(campaign._id)}
                  title="Hemen çalıştır (test amaçlı)"
                >
                  ⚡ Şimdi Çalıştır
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScheduledCampaigns;

