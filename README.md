# Phishing Simülasyon Sistemi

Güvenlik farkındalığı eğitimi için kapsamlı phishing simülasyon ve analiz platformu.

## 🎯 Özellikler

- **Mail Gönderimi**: SMTP üzerinden özelleştirilebilir phishing e-postaları
- **Tracking Sistemi**: Mail açılma ve link tıklama takibi
- **Kampanya Yönetimi**: Birden fazla kullanıcıya kampanya oluşturma ve yönetme
- **Detaylı Raporlama**: Kullanıcı ve kampanya bazlı analitik raporlar
- **Risk Analizi**: Kullanıcı risk seviyesi belirleme
- **Modern Dashboard**: React tabanlı kullanıcı dostu arayüz
- **Periyodik Kampanyalar**: Otomatik tekrarlayan kampanya desteği
- **JWT Authentication**: Güvenli admin girişi ve oturum yönetimi

## 🏗️ Teknoloji Stack

### Backend
- Node.js & Express
- MongoDB & Mongoose
- Nodemailer (SMTP)
- Node-cron (periyodik görevler)
- JWT (JSON Web Token) Authentication
- bcryptjs (şifre hashleme)
- Redis (cache ve queue - opsiyonel)
- node-cache (in-memory cache)

### Frontend
- React 18
- React Router
- Axios
- Chart.js
- Modern CSS

### ML Servisi
- Python 3.8+
- Flask
- scikit-learn
- pandas & numpy
- joblib

## 📋 Gereksinimler

- Node.js (v14 veya üzeri)
- MongoDB (v4.4 veya üzeri)
- Python 3.8+ (ML servisi için)
- SMTP sunucu erişimi (Gmail, Outlook vb.)
- Redis (opsiyonel - cache ve queue için)

## 🚀 Kurulum

### 1. Depoyu Klonlayın

```bash
cd cyberSecurityProject
```

### 2. Backend Kurulumu

```bash
# Ana dizinde bağımlılıkları yükleyin
npm install
```

### 3. Frontend Kurulumu

```bash
# Frontend dizinine gidin
cd frontend
npm install
cd ..
```

### 4. ML Servisi Kurulumu (Opsiyonel)

```bash
# ML servisi dizinine gidin
cd ml-service

# Python virtual environment oluşturun (önerilir)
python3 -m venv venv

# Virtual environment'ı aktifleştirin
# macOS/Linux:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

# Bağımlılıkları yükleyin
pip install -r requirements.txt

# Ana dizine geri dönün
cd ..
```

**Not**: ML servisi opsiyoneldir. Sistem ML servisi olmadan da çalışır (fallback modu ile).

### 5. MongoDB'yi Başlatın

```bash
# MongoDB'nin çalıştığından emin olun
# macOS/Linux:
sudo systemctl start mongod

# veya Docker ile:
docker run -d -p 27017:27017 --name mongodb mongo
```

### 6. Ortam Değişkenlerini Ayarlayın

`.env` dosyasını düzenleyin ve kendi bilgilerinizi girin:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/phishing-sim

# Server
PORT=5000
NODE_ENV=development

# SMTP (Gmail örneği)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=sizin-email@gmail.com
SMTP_PASS=sizin-uygulama-sifreniz

# URLs
FRONTEND_URL=http://localhost:3000
TRACKING_URL=http://localhost:5000

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# ML Servisi (Opsiyonel)
ML_SERVICE_URL=http://localhost:8000
ML_SERVICE_API_KEY=your-ml-service-api-key
ML_SERVICE_TIMEOUT=10000

# Redis (Opsiyonel - Cache için)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

**Not**: Gmail kullanıyorsanız, [App Password](https://support.google.com/accounts/answer/185833) oluşturmanız gerekir.

## 💻 Kullanım

### 1. MongoDB'yi Başlatın

MongoDB'nin çalıştığından emin olun:

```bash
# macOS/Linux:
sudo systemctl start mongod

# veya Docker ile:
docker run -d -p 27017:27017 --name mongodb mongo
```

### 2. ML Servisini Başlatın (Opsiyonel)

Yeni bir terminal penceresinde:

```bash
cd ml-service

# Virtual environment aktifse (yukarıda oluşturduysanız)
source venv/bin/activate  # macOS/Linux
# veya
venv\Scripts\activate  # Windows

# ML servisini başlatın
python app.py
```

ML Servisi `http://localhost:8000` adresinde çalışacaktır.

**Not**: ML servisi olmadan da sistem çalışır, ancak fallback (basit kural tabanlı) öneriler kullanılır.

### 3. Backend'i Başlatın

Yeni bir terminal penceresinde:

```bash
# Ana dizinde
npm start
# veya geliştirme modu için:
npm run dev
```

Backend `http://localhost:5000` adresinde çalışacaktır.

### 4. Frontend'i Başlatın

Yeni bir terminal penceresinde:

```bash
cd frontend
npm start
```

Frontend `http://localhost:3000` adresinde çalışacaktır.

### Tüm Servisleri Sırayla Başlatma

**Terminal 1 - MongoDB:**
```bash
# MongoDB zaten çalışıyorsa atlayın
sudo systemctl start mongod
```

**Terminal 2 - ML Servisi (Opsiyonel):**
```bash
cd ml-service
source venv/bin/activate  # veya venv\Scripts\activate (Windows)
python app.py
```

**Terminal 3 - Backend:**
```bash
cd /path/to/cyberSecurityProject
npm start
```

**Terminal 4 - Frontend:**
```bash
cd /path/to/cyberSecurityProject/frontend
npm start
```

### Hızlı Başlatma (ML Servisi Olmadan)

Sadece backend ve frontend:

```bash
# Terminal 1 - Backend
npm start

# Terminal 2 - Frontend
cd frontend && npm start
```

## 📖 Kullanım Kılavuzu

### Sistem Bileşenleri

1. **Backend (Node.js)**: Ana API servisi, veritabanı işlemleri, kampanya yönetimi
2. **Frontend (React)**: Kullanıcı arayüzü, dashboard, raporlar
3. **ML Servisi (Python)**: Eğitim gerekliliği analizi için ML modeli (opsiyonel)
4. **MongoDB**: Veritabanı
5. **Redis**: Cache ve queue (opsiyonel)

### 0. İlk Giriş (Admin Kaydı)

Sistem ilk kez çalıştırıldığında:
1. `http://localhost:3000` adresine gidin
2. Henüz admin hesabı olmadığı için kayıt formu görünecektir
3. Kullanıcı adı, e-posta ve şifre belirleyin
4. "Hesap Oluştur" butonuna tıklayın
5. Artık bu bilgilerle giriş yapabilirsiniz

**Not**: Güvenlik için sadece bir admin hesabı oluşturulabilir.

### 1. Kullanıcı Ekleme

- Dashboard'da "Kullanıcılar" sekmesine gidin
- "Yeni Kullanıcı" butonuna tıklayın
- İsim, e-posta, grup bilgilerini girin

### 2. Kampanya Oluşturma

- "Kampanyalar" sekmesine gidin
- "Yeni Kampanya" butonuna tıklayın
- Kampanya detaylarını doldurun:
  - Kampanya adı
  - Mail konusu
  - Mail içeriği (HTML destekli)
  - Template seçimi
  - Hedef kullanıcıları seçin

### 3. Kampanya Gönderimi

- Kampanya kartında "Gönder" butonuna tıklayın
- Onay verdikten sonra sistem otomatik olarak mailleri gönderir
- Tracking otomatik başlar

### 4. Raporları İnceleme

- "Raporlar" sekmesinde genel istatistikleri görün
- Kampanya detay sayfasında kullanıcı bazlı analizleri inceleyin
- Risk seviyesi yüksek kullanıcıları belirleyin

### 5. Risk Analizi ve Eğitim Gereklilikleri

- "Risk Analizi" sekmesinde kullanıcı risk skorlarını görün
- "Eğitim Gereklilikleri" sekmesinde kampanya ve risk bazlı eğitim analizlerini inceleyin
- "Eğitim Önerileri" sekmesinde kişiselleştirilmiş eğitim önerilerini görün
- ML servisi aktifse daha doğru öneriler alırsınız

## 🔒 Güvenlik Notları

**ÖNEMLİ**: Bu sistem sadece eğitim ve farkındalık amaçlıdır!

- ✅ Sadece yetkili kullanıcılara test maili gönderin
- ✅ Kullanıcıları önceden bilgilendirin
- ✅ SMTP bilgilerinizi güvende tutun
- ✅ `.env` dosyasını asla paylaşmayın
- ✅ Test verilerini gerçek production verilerinden ayırın

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - İlk admin kaydı (sadece admin yoksa)
- `POST /api/auth/login` - Admin girişi (JWT token döner)
- `GET /api/auth/me` - Mevcut kullanıcı bilgisi (token gerekli)
- `GET /api/auth/check` - Admin var mı kontrol

**Not**: Aşağıdaki tüm endpoint'ler JWT token gerektirir. Header'a `Authorization: Bearer <token>` ekleyin.

### Kullanıcılar
- `GET /api/users` - Tüm kullanıcıları listele
- `POST /api/users` - Yeni kullanıcı ekle
- `DELETE /api/users/:id` - Kullanıcı sil

### Kampanyalar
- `GET /api/campaigns` - Kampanyaları listele
- `POST /api/campaigns` - Yeni kampanya oluştur
- `POST /api/campaigns/:id/send` - Kampanya gönder
- `GET /api/campaigns/:id` - Kampanya detayı

### Raporlar
- `GET /api/reports` - Genel rapor
- `GET /api/reports/:campaignId` - Kampanya raporu
- `GET /api/reports/:campaignId/events` - Event detayları

### Risk Analizi
- `GET /api/risk-analysis/users` - Risk skorlarına göre kullanıcılar
- `GET /api/risk-analysis/user/:userId` - Kullanıcı risk analizi
- `GET /api/risk-analysis/campaign/:campaignId` - Kampanya risk analizi
- `POST /api/risk-analysis/calculate` - Risk skorlarını hesapla

### Eğitim Gereklilikleri
- `GET /api/training/needs/user/:userId` - Kullanıcı eğitim gereklilikleri
- `GET /api/training/needs/campaign/:campaignId` - Kampanya bazlı eğitim gereklilikleri
- `GET /api/training/recommendations/:userId` - Kişiselleştirilmiş eğitim önerileri
- `GET /api/training/content` - Eğitim içerikleri
- `POST /api/training/complete` - Eğitim tamamlama

### Tracking
- `GET /track/open/:campaignId/:userId` - Mail açılma
- `GET /track/click/:campaignId/:userId/:linkId` - Link tıklama

## 🎨 Ekran Görüntüleri

Dashboard, kampanya yönetimi ve detaylı raporlama özellikleri modern ve kullanıcı dostu arayüz ile sunulmaktadır.

## 🐛 Sorun Giderme

### MongoDB Bağlantı Hatası
```bash
# MongoDB'nin çalıştığından emin olun
sudo systemctl status mongod
```

### SMTP Gönderim Hatası
- SMTP bilgilerinin doğru olduğundan emin olun
- Gmail kullanıyorsanız "Daha az güvenli uygulama erişimi" ayarını kontrol edin
- App Password kullanın

### Port Zaten Kullanımda
```bash
# Portu kullanan işlemi bulun ve durdurun
# macOS/Linux:
lsof -ti:5000 | xargs kill -9  # Backend
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:8000 | xargs kill -9  # ML Servisi

# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### ML Servisi Bağlantı Hatası
- ML servisi çalışmıyorsa sistem fallback modunda çalışır
- `.env` dosyasında `ML_SERVICE_URL` doğru olduğundan emin olun
- ML servisi loglarını kontrol edin: `cd ml-service && python app.py`

### Python/ML Servisi Kurulum Hatası
```bash
# Python versiyonunu kontrol edin
python3 --version  # 3.8+ olmalı

# Virtual environment oluşturun
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## 📝 Lisans

Bu proje eğitim amaçlıdır. Ticari kullanım için lütfen iletişime geçin.

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📧 İletişim

Sorularınız için lütfen iletişime geçin.

---

**Uyarı**: Bu sistem sadece yasal ve etik amaçlar için kullanılmalıdır. Yetkisiz kullanım yasalara aykırıdır.

