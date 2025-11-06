const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Tüm kullanıcıları getir
router.get('/', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Kullanıcı listesi hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Kullanıcılar getirilemedi'
    });
  }
});

// Tek kullanıcı getir
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Kullanıcı getirme hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı getirilemedi'
    });
  }
});

// Yeni kullanıcı ekle
router.post('/', async (req, res) => {
  try {
    const user = await User.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      data: user
    });
  } catch (error) {
    console.error('Kullanıcı oluşturma hatası:', error.message);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Bu e-posta adresi zaten kayıtlı'
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Kullanıcı oluşturulamadı',
      error: error.message
    });
  }
});

// Toplu kullanıcı ekleme (CSV import için)
router.post('/bulk', async (req, res) => {
  try {
    const { users } = req.body;
    
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir kullanıcı listesi gönderilmedi'
      });
    }
    
    const results = {
      success: [],
      failed: []
    };
    
    for (const userData of users) {
      try {
        const user = await User.create(userData);
        results.success.push(user);
      } catch (error) {
        results.failed.push({
          email: userData.email,
          error: error.message
        });
      }
    }
    
    res.status(201).json({
      success: true,
      message: `${results.success.length} kullanıcı eklendi, ${results.failed.length} hata`,
      data: results
    });
  } catch (error) {
    console.error('Toplu kullanıcı ekleme hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Toplu ekleme işlemi başarısız'
    });
  }
});

// Kullanıcı güncelle
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'Kullanıcı güncellendi',
      data: user
    });
  } catch (error) {
    console.error('Kullanıcı güncelleme hatası:', error.message);
    res.status(400).json({
      success: false,
      message: 'Kullanıcı güncellenemedi',
      error: error.message
    });
  }
});

// Kullanıcı sil
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'Kullanıcı silindi'
    });
  } catch (error) {
    console.error('Kullanıcı silme hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı silinemedi'
    });
  }
});

// Gruba göre kullanıcıları getir
router.get('/group/:group', async (req, res) => {
  try {
    const users = await User.find({ group: req.params.group });
    
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Grup kullanıcıları hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Kullanıcılar getirilemedi'
    });
  }
});

module.exports = router;

