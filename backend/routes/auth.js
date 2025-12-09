const express = require('express');
const router = express.Router();
const AdminUser = require('../models/AdminUser');
const { protect, generateToken } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    İlk admin kaydı (sadece hiç admin yoksa çalışır)
// @access  Public (ilk kayıt için)
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Zaten admin var mı kontrol et
    const existingAdmin = await AdminUser.findOne();
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Sistem zaten bir admin hesabına sahip. Yeni kayıt yapılamaz.'
      });
    }

    // Validasyon
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Tüm alanları doldurunuz'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Şifre en az 6 karakter olmalıdır'
      });
    }

    // Admin oluştur
    const admin = await AdminUser.create({
      username,
      email,
      password
    });

    // Token oluştur
    const token = generateToken(admin._id);

    res.status(201).json({
      success: true,
      message: 'Admin hesabı oluşturuldu',
      data: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      },
      token
    });
  } catch (error) {
    console.error('Register hatası:', error.message);
    
    // Duplicate key hatası
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Bu kullanıcı adı veya e-posta zaten kullanımda'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Kayıt işlemi başarısız',
      error: error.message
    });
  }
});

// @route   POST /api/auth/login
// @desc    Admin girişi
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validasyon
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı adı ve şifre gereklidir'
      });
    }

    // Kullanıcıyı bul (password'ü de getir)
    const admin = await AdminUser.findOne({ username }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz kullanıcı adı veya şifre'
      });
    }

    // Şifre kontrolü
    const isMatch = await admin.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz kullanıcı adı veya şifre'
      });
    }

    // Token oluştur
    const token = generateToken(admin._id);

    res.json({
      success: true,
      message: 'Giriş başarılı',
      data: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      },
      token
    });
  } catch (error) {
    console.error('Login hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Giriş işlemi başarısız',
      error: error.message
    });
  }
});

// @route   GET /api/auth/me
// @desc    Mevcut kullanıcı bilgisi
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const admin = await AdminUser.findById(req.user._id);

    res.json({
      success: true,
      data: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        createdAt: admin.createdAt
      }
    });
  } catch (error) {
    console.error('Me endpoint hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı bilgisi alınamadı'
    });
  }
});

// @route   GET /api/auth/check
// @desc    İlk admin var mı kontrol et (kayıt sayfası için)
// @access  Public
router.get('/check', async (req, res) => {
  try {
    const adminExists = await AdminUser.findOne();
    
    res.json({
      success: true,
      adminExists: !!adminExists
    });
  } catch (error) {
    console.error('Check endpoint hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Kontrol başarısız'
    });
  }
});

module.exports = router;
