import React, { useState, useEffect } from 'react';
import {
  getUsers,
  createScheduledCampaign,
  updateScheduledCampaign
} from '../services/api';
import { emailTemplates, categoryColors } from '../data/emailTemplates';
import './ScheduledCampaignForm.css';

const ScheduledCampaignForm = ({ campaign, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    interval: 'daily',
    schedule: {
      hour: 9,
      minute: 0,
      dayOfWeek: 1,
      dayOfMonth: 1
    },
    campaignTemplate: {
      subject: '',
      body: '',
      template: 'basic',
      phishingUrl: ''
    },
    targetUsers: []
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState('empty');

  useEffect(() => {
    fetchUsers();
    
    // Düzenleme modunda mevcut kampanya verilerini yükle
    if (campaign) {
      setFormData({
        name: campaign.name,
        interval: campaign.interval,
        schedule: campaign.schedule,
        campaignTemplate: campaign.campaignTemplate,
        targetUsers: campaign.targetUsers.map(u => u._id || u)
      });
    }
  }, [campaign]);

  const fetchUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response.data.data);
    } catch (error) {
      console.error('Kullanıcılar yüklenemedi:', error);
      setError('Kullanıcılar yüklenemedi');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleScheduleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [name]: parseInt(value, 10)
      }
    }));
  };

  const handleTemplateChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      campaignTemplate: {
        ...prev.campaignTemplate,
        [name]: value
      }
    }));
  };

  const handleUserSelection = (userId) => {
    setFormData(prev => {
      const targetUsers = prev.targetUsers.includes(userId)
        ? prev.targetUsers.filter(id => id !== userId)
        : [...prev.targetUsers, userId];
      
      return { ...prev, targetUsers };
    });
  };

  const handleSelectAll = () => {
    if (formData.targetUsers.length === users.length) {
      setFormData(prev => ({ ...prev, targetUsers: [] }));
    } else {
      setFormData(prev => ({ ...prev, targetUsers: users.map(u => u._id) }));
    }
  };

  const handleEmailTemplateSelect = (templateId) => {
    setSelectedEmailTemplate(templateId);
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        campaignTemplate: {
          ...prev.campaignTemplate,
          subject: template.subject,
          body: template.body
        }
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validasyon
    if (!formData.name.trim()) {
      setError('Kampanya adı gereklidir');
      return;
    }
    
    if (!formData.campaignTemplate.subject.trim()) {
      setError('Mail konusu gereklidir');
      return;
    }
    
    if (!formData.campaignTemplate.body.trim()) {
      setError('Mail içeriği gereklidir');
      return;
    }
    
    if (formData.targetUsers.length === 0) {
      setError('En az bir hedef kullanıcı seçilmelidir');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (campaign) {
        await updateScheduledCampaign(campaign._id, formData);
      } else {
        await createScheduledCampaign(formData);
      }
      onSuccess();
    } catch (error) {
      console.error('Form gönderme hatası:', error);
      setError(error.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getDayOfWeekOptions = () => {
    return [
      { value: 0, label: 'Pazar' },
      { value: 1, label: 'Pazartesi' },
      { value: 2, label: 'Salı' },
      { value: 3, label: 'Çarşamba' },
      { value: 4, label: 'Perşembe' },
      { value: 5, label: 'Cuma' },
      { value: 6, label: 'Cumartesi' }
    ];
  };

  const getDayOfMonthOptions = () => {
    return Array.from({ length: 31 }, (_, i) => ({
      value: i + 1,
      label: `${i + 1}`
    }));
  };

  const getHourOptions = () => {
    return Array.from({ length: 24 }, (_, i) => ({
      value: i,
      label: `${String(i).padStart(2, '0')}:00`
    }));
  };

  return (
    <div className="scheduled-campaign-form">
      <div className="form-header">
        <h2>{campaign ? 'Zamanlanmış Kampanyayı Düzenle' : 'Yeni Zamanlanmış Kampanya'}</h2>
        <button type="button" className="btn-close" onClick={onCancel}>✕</button>
      </div>

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Temel Bilgiler */}
        <section className="form-section">
          <h3>Temel Bilgiler</h3>
          
          <div className="form-group">
            <label htmlFor="name">Kampanya Adı *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Örn: Aylık Güvenlik Testi"
              required
            />
          </div>
        </section>

        {/* Zamanlama */}
        <section className="form-section">
          <h3>Zamanlama</h3>
          
          <div className="form-group">
            <label htmlFor="interval">Tekrar Aralığı *</label>
            <select
              id="interval"
              name="interval"
              value={formData.interval}
              onChange={handleInputChange}
              required
            >
              <option value="daily">Günlük</option>
              <option value="weekly">Haftalık</option>
              <option value="monthly">Aylık</option>
            </select>
          </div>

          <div className="schedule-inputs">
            <div className="form-group">
              <label htmlFor="hour">Saat *</label>
              <select
                id="hour"
                name="hour"
                value={formData.schedule.hour}
                onChange={handleScheduleChange}
                required
              >
                {getHourOptions().map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {formData.interval === 'weekly' && (
              <div className="form-group">
                <label htmlFor="dayOfWeek">Gün *</label>
                <select
                  id="dayOfWeek"
                  name="dayOfWeek"
                  value={formData.schedule.dayOfWeek}
                  onChange={handleScheduleChange}
                  required
                >
                  {getDayOfWeekOptions().map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            {formData.interval === 'monthly' && (
              <div className="form-group">
                <label htmlFor="dayOfMonth">Ayın Günü *</label>
                <select
                  id="dayOfMonth"
                  name="dayOfMonth"
                  value={formData.schedule.dayOfMonth}
                  onChange={handleScheduleChange}
                  required
                >
                  {getDayOfMonthOptions().map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}. gün</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* Mail İçeriği */}
        <section className="form-section">
          <h3>Mail İçeriği</h3>
          
          <div className="form-group">
            <label>Mail Taslağı Seçin</label>
            <p className="form-hint">Hazır bir taslak seçin veya boş başlayın. Seçtikten sonra içeriği düzenleyebilirsiniz.</p>
            <div className="email-templates-grid">
              {emailTemplates.map(template => {
                const colors = categoryColors[template.category];
                return (
                  <div
                    key={template.id}
                    className={`email-template-card ${selectedEmailTemplate === template.id ? 'selected' : ''}`}
                    onClick={() => handleEmailTemplateSelect(template.id)}
                    style={{
                      '--card-bg': colors.bg,
                      '--card-border': colors.border,
                      '--card-text': colors.text
                    }}
                  >
                    <div className="template-icon">{template.icon}</div>
                    <div className="template-info">
                      <span className="template-name">{template.name}</span>
                      <span className="template-category">{template.categoryLabel}</span>
                    </div>
                    {selectedEmailTemplate === template.id && (
                      <div className="template-check">✓</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="template">Görsel Şablon *</label>
            <select
              id="template"
              name="template"
              value={formData.campaignTemplate.template}
              onChange={handleTemplateChange}
              required
            >
              <option value="basic">Temel</option>
              <option value="urgent">Acil</option>
              <option value="custom">Özel</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="subject">Mail Konusu *</label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.campaignTemplate.subject}
              onChange={handleTemplateChange}
              placeholder="Örn: Güvenlik Güncellemesi Gerekli"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="body">Mail İçeriği *</label>
            <textarea
              id="body"
              name="body"
              value={formData.campaignTemplate.body}
              onChange={handleTemplateChange}
              rows="8"
              placeholder="Mail içeriğini buraya yazın..."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phishingUrl">Phishing URL (Opsiyonel)</label>
            <input
              type="url"
              id="phishingUrl"
              name="phishingUrl"
              value={formData.campaignTemplate.phishingUrl}
              onChange={handleTemplateChange}
              placeholder="https://ornek.com/phishing-page"
            />
            <small>Mail içine eklenecek takip edilebilir bağlantı</small>
          </div>
        </section>

        {/* Hedef Kullanıcılar */}
        <section className="form-section">
          <h3>Hedef Kullanıcılar</h3>
          
          <div className="user-selection-header">
            <p>{formData.targetUsers.length} / {users.length} kullanıcı seçildi</p>
            <button type="button" className="btn-link" onClick={handleSelectAll}>
              {formData.targetUsers.length === users.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
            </button>
          </div>

          <div className="user-list">
            {users.map(user => (
              <label key={user._id} className="user-checkbox">
                <input
                  type="checkbox"
                  checked={formData.targetUsers.includes(user._id)}
                  onChange={() => handleUserSelection(user._id)}
                />
                <div className="user-info">
                  <span className="user-name">{user.name}</span>
                  <span className="user-email">{user.email}</span>
                  {user.group && <span className="user-group">{user.group}</span>}
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            İptal
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Kaydediliyor...' : campaign ? 'Güncelle' : 'Oluştur'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScheduledCampaignForm;

