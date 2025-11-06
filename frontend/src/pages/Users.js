import React, { useState, useEffect } from 'react';
import { getUsers, createUser, deleteUser } from '../services/api';
import './Users.css';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    group: 'Genel',
    department: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Kullanıcılar yüklenemedi:', error);
      setError('Kullanıcılar yüklenemedi');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await createUser(formData);
      setSuccess('Kullanıcı başarıyla eklendi');
      setShowModal(false);
      setFormData({ name: '', email: '', group: 'Genel', department: '' });
      loadUsers();
    } catch (error) {
      setError(error.response?.data?.message || 'Kullanıcı eklenemedi');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`${name} kullanıcısını silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      await deleteUser(id);
      setSuccess('Kullanıcı silindi');
      loadUsers();
    } catch (error) {
      setError('Kullanıcı silinemedi');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <div>
          <h1>Kullanıcı Yönetimi</h1>
          <p>Phishing simülasyonu hedef kullanıcılarını yönetin</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Yeni Kullanıcı
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="card">
        <div className="users-stats">
          <div className="stat">
            <span className="stat-label">Toplam Kullanıcı</span>
            <span className="stat-value">{users.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Aktif</span>
            <span className="stat-value">{users.filter(u => u.active).length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Gruplar</span>
            <span className="stat-value">
              {new Set(users.map(u => u.group)).size}
            </span>
          </div>
        </div>

        {users.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>İsim</th>
                <th>E-posta</th>
                <th>Grup</th>
                <th>Departman</th>
                <th>Durum</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.group}</td>
                  <td>{user.department || '-'}</td>
                  <td>
                    <span className={`badge badge-${user.active ? 'success' : 'secondary'}`}>
                      {user.active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(user._id, user.name)}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <p>Henüz kullanıcı bulunmuyor</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              İlk Kullanıcıyı Ekle
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Yeni Kullanıcı Ekle</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>İsim *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>E-posta *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Grup</label>
                <input
                  type="text"
                  name="group"
                  value={formData.group}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Departman</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;

