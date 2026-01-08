# 🚀 Hızlı Başlangıç Kılavuzu

Bu kılavuz, sistemi en hızlı şekilde çalıştırmak için adım adım talimatlar içerir.

## ⚡ Hızlı Kurulum (5 Dakika)

### 1. Gereksinimler Kontrolü

```bash
# Node.js versiyonu
node --version  # v14+ olmalı

# Python versiyonu (ML servisi için)
python3 --version  # v3.8+ olmalı

# MongoDB durumu
mongod --version  # v4.4+ olmalı
```

### 2. Bağımlılıkları Yükleyin

```bash
# Ana dizinde
npm install

# Frontend
cd frontend && npm install && cd ..

# ML Servisi (opsiyonel)
cd ml-service
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 3. Ortam Değişkenlerini Ayarlayın

`.env` dosyasını oluşturun veya düzenleyin:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/phishing-sim

# Server
PORT=5000

# SMTP (Gmail örneği)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d

# ML Servisi (opsiyonel - boş bırakılırsa fallback modu)
ML_SERVICE_URL=http://localhost:8000
ML_SERVICE_API_KEY=
```

### 4. Servisleri Başlatın

**Seçenek 1: Tüm Servisler (Önerilen)**

4 terminal penceresi açın:

**Terminal 1 - MongoDB:**
```bash
# MongoDB zaten çalışıyorsa atlayın
sudo systemctl start mongod
# veya Docker:
docker start mongodb
```

**Terminal 2 - ML Servisi (Opsiyonel):**
```bash
cd ml-service
source venv/bin/activate
python app.py
# Çıktı: 🚀 ML Servisi başlatılıyor... Port: 8000
```

**Terminal 3 - Backend:**
```bash
cd /path/to/cyberSecurityProject
npm start
# Çıktı: Server 5000 portunda çalışıyor...
```

**Terminal 4 - Frontend:**
```bash
cd /path/to/cyberSecurityProject/frontend
npm start
# Çıktı: Compiled successfully! Local: http://localhost:3000
```

**Seçenek 2: Sadece Backend + Frontend (ML Servisi Olmadan)**

2 terminal penceresi açın:

**Terminal 1 - Backend:**
```bash
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend && npm start
```

Sistem fallback modunda çalışacaktır (basit kural tabanlı öneriler).

### 5. İlk Giriş

1. Tarayıcıda `http://localhost:3000` adresine gidin
2. İlk admin hesabını oluşturun (kullanıcı adı, e-posta, şifre)
3. Giriş yapın

## ✅ Servis Durumu Kontrolü

### Backend Kontrolü
```bash
curl http://localhost:5000
# Beklenen: {"message":"Phishing Simülasyon Sistemi API"}
```

### ML Servisi Kontrolü
```bash
curl http://localhost:8000/ml/training-need/health
# Beklenen: {"status":"ok","version":"1.0.0",...}
```

### Frontend Kontrolü
Tarayıcıda `http://localhost:3000` açılmalı.

## 🔧 Sorun Giderme

### MongoDB Bağlantı Hatası
```bash
# MongoDB'yi başlatın
sudo systemctl start mongod

# veya Docker ile
docker run -d -p 27017:27017 --name mongodb mongo
```

### Port Kullanımda Hatası
```bash
# Portu kullanan işlemi bulun
lsof -ti:5000  # Backend
lsof -ti:3000  # Frontend
lsof -ti:8000  # ML Servisi

# İşlemi durdurun
lsof -ti:5000 | xargs kill -9
```

### ML Servisi Bağlanamıyor
- ML servisi çalışmıyorsa sistem otomatik olarak fallback moduna geçer
- Backend loglarında "ML servisi hatası, fallback kullanılıyor" mesajı görünebilir
- Bu normaldir, sistem çalışmaya devam eder

### Python Bağımlılık Hatası
```bash
cd ml-service
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## 📊 Servis Portları

| Servis | Port | URL |
|--------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend | 5000 | http://localhost:5000 |
| ML Servisi | 8000 | http://localhost:8000 |
| MongoDB | 27017 | mongodb://localhost:27017 |

## 🎯 Sonraki Adımlar

1. **Kullanıcı Ekleme**: Dashboard → Kullanıcılar → Yeni Kullanıcı
2. **Kampanya Oluşturma**: Dashboard → Kampanyalar → Yeni Kampanya
3. **Risk Analizi**: Dashboard → Risk Analizi
4. **Eğitim Gereklilikleri**: Dashboard → Eğitim Gereklilikleri

## 💡 İpuçları

- **ML Servisi Opsiyonel**: Sistem ML servisi olmadan da tam çalışır
- **Cache Sistemi**: Risk analizi ve eğitim önerileri otomatik cache'lenir
- **Fallback Modu**: ML servisi down olsa bile sistem çalışmaya devam eder
- **Development Modu**: `npm run dev` ile hot-reload aktif olur

## 🆘 Yardım

Sorun yaşıyorsanız:
1. Tüm servislerin çalıştığından emin olun
2. `.env` dosyasını kontrol edin
3. Terminal loglarını inceleyin
4. MongoDB bağlantısını test edin

