const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminUserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Kullanıcı adı gereklidir'],
    unique: true,
    trim: true,
    minlength: [3, 'Kullanıcı adı en az 3 karakter olmalıdır']
  },
  email: {
    type: String,
    required: [true, 'E-posta gereklidir'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Geçerli bir e-posta adresi giriniz']
  },
  password: {
    type: String,
    required: [true, 'Şifre gereklidir'],
    minlength: [6, 'Şifre en az 6 karakter olmalıdır'],
    select: false // Varsayılan olarak password'ü getirme
  },
  role: {
    type: String,
    enum: ['admin'],
    default: 'admin'
  }
}, {
  timestamps: true
});

// Şifreyi kaydetmeden önce hashle
adminUserSchema.pre('save', async function(next) {
  // Şifre değişmediyse hashleme
  if (!this.isModified('password')) {
    return next();
  }
  
  // Şifreyi hashle
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Şifre karşılaştırma metodu
adminUserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('AdminUser', adminUserSchema);
