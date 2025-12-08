import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCampaigns, createCampaign, deleteCampaign, sendCampaign, getUsers } from '../services/api';
import './Campaigns.css';

function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sendingCampaignId, setSendingCampaignId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    template: 'basic',
    targetUsers: [],
    phishingUrl: 'https://example.com/verify'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [campaignsRes, usersRes] = await Promise.all([
        getCampaigns(),
        getUsers()
      ]);
      setCampaigns(campaignsRes.data.data);
      setUsers(usersRes.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      setError('Veriler yüklenemedi');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.targetUsers.length === 0) {
      setError('En az bir hedef kullanıcı seçmelisiniz');
      return;
    }

    try {
      await createCampaign(formData);
      setSuccess('Kampanya başarıyla oluşturuldu');
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      setError(error.response?.data?.message || 'Kampanya oluşturulamadı');
    }
  };

  const handleSend = async (id, name) => {
    if (!window.confirm(`"${name}" kampanyasını göndermek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      setSendingCampaignId(id);
      setError('');
      const response = await sendCampaign(id);
      setSuccess(`Kampanya başarıyla gönderildi! ${response.data.data.sent} e-posta gönderildi.`);
      await loadData();
      setSendingCampaignId(null);
    } catch (error) {
      setError(error.response?.data?.message || 'Kampanya gönderilemedi');
      setSendingCampaignId(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}" kampanyasını silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      await deleteCampaign(id);
      setSuccess('Kampanya silindi');
      loadData();
    } catch (error) {
      setError('Kampanya silinemedi');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleUserSelect = (userId) => {
    const currentUsers = [...formData.targetUsers];
    const index = currentUsers.indexOf(userId);
    
    if (index > -1) {
      currentUsers.splice(index, 1);
    } else {
      currentUsers.push(userId);
    }
    
    setFormData({ ...formData, targetUsers: currentUsers });
  };

  const selectAllUsers = () => {
    if (formData.targetUsers.length === users.length) {
      setFormData({ ...formData, targetUsers: [] });
    } else {
      setFormData({ ...formData, targetUsers: users.map(u => u._id) });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      body: '',
      template: 'basic',
      targetUsers: [],
      phishingUrl: 'https://example.com/verify'
    });
  };

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  return (
    <div className="campaigns-page">
      <div className="page-header">
        <div>
          <h1>Kampanya Yönetimi</h1>
          <p>Phishing simülasyon kampanyalarını yönetin</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Yeni Kampanya
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="campaigns-stats">
        <div className="stat-box">
          <span className="stat-num">{campaigns.length}</span>
          <span className="stat-label">Toplam</span>
        </div>
        <div className="stat-box">
          <span className="stat-num">{campaigns.filter(c => c.status === 'draft').length}</span>
          <span className="stat-label">Taslak</span>
        </div>
        <div className="stat-box">
          <span className="stat-num">{campaigns.filter(c => c.status === 'processing').length}</span>
          <span className="stat-label">İşleniyor</span>
        </div>
        <div className="stat-box">
          <span className="stat-num">{campaigns.filter(c => c.status === 'sent').length}</span>
          <span className="stat-label">Gönderildi</span>
        </div>
      </div>

      <div className="campaigns-grid">
        {campaigns.length > 0 ? (
          campaigns.map(campaign => (
            <div key={campaign._id} className="campaign-card">
              <div className="campaign-header">
                <h3>{campaign.name}</h3>
                <span className={`badge badge-${getStatusColor(campaign.status)}`}>
                  {getStatusText(campaign.status)}
                </span>
              </div>
              <div className="campaign-body">
                <p className="campaign-subject">{campaign.subject}</p>
                <div className="campaign-stats-row">
                  <div className="mini-stat">
                    <span className="mini-stat-icon">👥</span>
                    <span>{campaign.targetUsers.length} hedef</span>
                  </div>
                  <div className="mini-stat">
                    <span className="mini-stat-icon">📧</span>
                    <span>{campaign.stats.sent} gönderildi</span>
                  </div>
                  <div className="mini-stat">
                    <span className="mini-stat-icon">👁️</span>
                    <span>{campaign.stats.opened} açıldı</span>
                  </div>
                  <div className="mini-stat">
                    <span className="mini-stat-icon">🖱️</span>
                    <span>{campaign.stats.clicked} tıklandı</span>
                  </div>
                </div>
              </div>
              <div className="campaign-footer">
                <Link to={`/campaigns/${campaign._id}`} className="btn btn-secondary btn-sm">
                  Detay
                </Link>
                {campaign.status === 'draft' && (
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleSend(campaign._id, campaign.name)}
                    disabled={sendingCampaignId === campaign._id}
                  >
                    {sendingCampaignId === campaign._id ? 'Gönderiliyor...' : 'Gönder'}
                  </button>
                )}
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(campaign._id, campaign.name)}
                  disabled={sendingCampaignId === campaign._id}
                >
                  Sil
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>Henüz kampanya bulunmuyor</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              İlk Kampanyayı Oluştur
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal campaign-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Yeni Kampanya Oluştur</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Kampanya Adı *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Örn: Q1 2024 Güvenlik Testi"
                />
              </div>

              <div className="form-group">
                <label>Mail Konusu *</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="Örn: Hesabınızı Doğrulayın"
                />
              </div>

              <div className="form-group">
                <label>Mail İçeriği *</label>
                <textarea
                  name="body"
                  value={formData.body}
                  onChange={handleChange}
                  required
                  rows="6"
                  placeholder="Mail içeriğini buraya yazın. HTML kullanabilirsiniz."
                />
              </div>

              <div className="form-group">
                <label>Template</label>
                <select name="template" value={formData.template} onChange={handleChange}>
                  <option value="basic">Temel</option>
                  <option value="urgent">Acil</option>
                  <option value="custom">Özel</option>
                </select>
              </div>

              <div className="form-group">
                <label>Phishing URL</label>
                <input
                  type="text"
                  name="phishingUrl"
                  value={formData.phishingUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/verify"
                />
              </div>

              <div className="form-group">
                <label>Hedef Kullanıcılar *</label>
                <div className="user-select-header">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={selectAllUsers}
                  >
                    {formData.targetUsers.length === users.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                  </button>
                  <span>{formData.targetUsers.length} kullanıcı seçildi</span>
                </div>
                <div className="user-select-list">
                  {users.map(user => (
                    <label key={user._id} className="user-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.targetUsers.includes(user._id)}
                        onChange={() => handleUserSelect(user._id)}
                      />
                      <span>{user.name} ({user.email})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

export default Campaigns;

