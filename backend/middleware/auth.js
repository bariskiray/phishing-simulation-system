const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');

// JWT Secret - MUTLAKA .env'den alınmalı, fallback yok (güvenlik)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET ortam değişkeni tanımlanmalı. .env dosyasını kontrol edin.');
}
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

// Token oluştur
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE
  });
};

// Route koruma middleware'i
const protect = async (req, res, next) => {
  let token;

  // Token'ı header'dan al
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Token yoksa hata döndür
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Bu işlem için giriş yapmanız gerekiyor'
    });
  }

  try {
    // Token'ı doğrula
    const decoded = jwt.verify(token, JWT_SECRET);

    // Kullanıcıyı bul ve request'e ekle
    req.user = await AdminUser.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    next();
  } catch (error) {
    console.error('Auth middleware hatası:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Geçersiz veya süresi dolmuş token'
    });
  }
};

module.exports = {
  protect,
  generateToken,
  JWT_SECRET,
  JWT_EXPIRE
};
