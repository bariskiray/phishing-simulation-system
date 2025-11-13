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

## 🏗️ Teknoloji Stack

### Backend
- Node.js & Express
- MongoDB & Mongoose
- Nodemailer (SMTP)
- Node-cron (periyodik görevler)

### Frontend
- React 18
- React Router
- Axios
- Chart.js
- Modern CSS

## 📋 Gereksinimler

- Node.js (v14 veya üzeri)
- MongoDB (v4.4 veya üzeri)
- SMTP sunucu erişimi (Gmail, Outlook vb.)

## 🚀 Kurulum

### 1. Depoyu Klonlayın

```bash
cd phishing-simulation-system
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

### 4. MongoDB'yi Başlatın

```bash
# MongoDB'nin çalıştığından emin olun
# macOS/Linux:
sudo systemctl start mongod

# veya Docker ile:
docker run -d -p 27017:27017 --name mongodb mongo
```

### 5. Ortam Değişkenlerini Ayarlayın

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
```

**Not**: Gmail kullanıyorsanız, [App Password](https://support.google.com/accounts/answer/185833) oluşturmanız gerekir.

## 💻 Kullanım

### Backend'i Başlatın

```bash
npm start
# veya geliştirme modu için:
npm run dev
```

Backend `http://localhost:5000` adresinde çalışacaktır.

### Frontend'i Başlatın

Yeni bir terminal penceresinde:

```bash
cd frontend
npm start
```

Frontend `http://localhost:3000` adresinde çalışacaktır.

### Her İkisini Birden Başlatın

```bash
npm run dev:full
```

## 📖 Kullanım Kılavuzu

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

## 🔒 Güvenlik Notları

**ÖNEMLİ**: Bu sistem sadece eğitim ve farkındalık amaçlıdır!

- ✅ Sadece yetkili kullanıcılara test maili gönderin
- ✅ Kullanıcıları önceden bilgilendirin
- ✅ SMTP bilgilerinizi güvende tutun
- ✅ `.env` dosyasını asla paylaşmayın
- ✅ Test verilerini gerçek production verilerinden ayırın

## 📊 API Endpoints

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
lsof -ti:5000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
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

