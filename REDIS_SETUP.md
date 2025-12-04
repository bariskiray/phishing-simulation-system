# Redis ve Bull Queue Kurulum Rehberi

Bu dokümantasyon, projeye eklenen Redis ve Bull queue sisteminin kurulumu ve kullanımı hakkında bilgi içermektedir.

## 🚀 Redis Kurulumu

### macOS için:

```bash
# Homebrew ile Redis kurulumu
brew install redis

# Redis'i başlat
brew services start redis

# Redis durumunu kontrol et
brew services list
```

### Docker ile (Alternatif):

```bash
# Redis container başlat
docker run -d -p 6379:6379 --name redis redis:alpine

# Container durumunu kontrol et
docker ps
```

### Redis Bağlantısını Test Et:

```bash
# Redis CLI ile bağlan
redis-cli

# Test komutu
127.0.0.1:6379> ping
PONG
```

## 📝 Environment Variables (.env dosyası)

Backend klasöründeki `.env` dosyanıza aşağıdaki değişkenleri ekleyin:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/phishing-simulation

# Redis Configuration (for Bull Queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email Queue Rate Limiting
EMAIL_RATE_LIMIT_PER_SECOND=5
EMAIL_RATE_LIMIT_PER_MINUTE=100

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Tracking Configuration
TRACKING_URL=http://localhost:5000
```

## 🎯 Kullanım

### 1. Kampanya Gönderimi (Queue ile)

Artık kampanyalar otomatik olarak Redis queue üzerinden gönderiliyor:

```javascript
POST /api/campaigns/:id/send
{
  "priority": "normal"  // "high", "normal", "low"
}
```

### 2. Queue Monitoring Dashboard

Bull Board dashboard'una erişim:

```
http://localhost:5000/admin/queues
```

Dashboard'da görebileceğiniz bilgiler:
- Bekleyen (waiting) joblar
- İşleniyor (active) joblar
- Tamamlanan (completed) joblar
- Başarısız (failed) joblar
- Job detayları ve retry durumları

### 3. Queue Management API

#### Queue İstatistikleri:
```
GET /api/queue/stats
```

#### Tüm Jobları Listele:
```
GET /api/queue/jobs?state=all&start=0&end=100
```

#### Belirli Bir Job'u Getir:
```
GET /api/queue/jobs/:jobId
```

#### Kampanyanın Tüm Joblarını Getir:
```
GET /api/queue/campaign/:campaignId
```

#### Job'u Yeniden Dene:
```
POST /api/queue/jobs/:jobId/retry
```

#### Job'u Sil:
```
DELETE /api/queue/jobs/:jobId
```

#### Queue'yu Temizle:
```
POST /api/queue/clean
{
  "grace": 0,
  "status": "completed"  // "completed", "failed", "all"
}
```

#### Queue'yu Duraklat:
```
POST /api/queue/pause
```

#### Queue'yu Devam Ettir:
```
POST /api/queue/resume
```

#### Başarısız Jobları Yeniden Dene:
```
POST /api/queue/retry-failed
```

## 🔧 Özellikler

### 1. Otomatik Retry Mekanizması

- Başarısız emailler **3 kez** otomatik olarak yeniden denenir
- **Exponential backoff** stratejisi kullanılır (2 saniye, 4 saniye, 8 saniye...)
- Retry logları Bull Board'da görülebilir

### 2. Rate Limiting

- **Saniyede maksimum 5 email** gönderilir
- **Dakikada maksimum 100 email** limiti
- SMTP provider limitlerini aşmayı önler

### 3. Job Priority

Kampanya gönderirken priority belirleyebilirsiniz:

```javascript
// Yüksek öncelikli
await sendCampaignEmailsViaQueue(campaignId, 'high');

// Normal öncelik (varsayılan)
await sendCampaignEmailsViaQueue(campaignId, 'normal');

// Düşük öncelik
await sendCampaignEmailsViaQueue(campaignId, 'low');
```

### 4. Persist Edilen Joblar

- Joblar Redis'te saklanır
- Sunucu yeniden başlatıldığında joblar kaybolmaz
- Tamamlanan ve başarısız joblar log olarak tutulur

### 5. Scheduled Campaigns Entegrasyonu

Zamanlanmış kampanyalar artık otomatik olarak queue sistemini kullanıyor:

- `node-cron` ile zamanlama devam ediyor
- Email gönderimi queue üzerinden yapılıyor
- Rate limiting ve retry özellikleri aktif

## 🐛 Troubleshooting

### Redis'e bağlanamıyor:

```bash
# Redis servisinin çalıştığını kontrol et
redis-cli ping

# Çalışmıyorsa başlat
brew services start redis
# veya
docker start redis
```

### Bull Board açılmıyor:

Backend server'ın çalıştığından emin olun:

```bash
cd backend
node server.js
```

### Queue işlenmiyor:

1. Redis bağlantısını kontrol edin
2. `.env` dosyasındaki Redis ayarlarını kontrol edin
3. Server loglarını kontrol edin
4. Bull Board'dan queue durumunu kontrol edin

### Joblar başarısız oluyor:

1. SMTP ayarlarını kontrol edin
2. Email rate limiting'i düşürün
3. Bull Board'dan hata loglarını inceleyin
4. Failed jobları manuel olarak retry edin

## 📊 Performans İpuçları

1. **Büyük kampanyalar için**: `priority: 'low'` kullanın ve sistem kaynaklarını koruyun
2. **Acil kampanyalar için**: `priority: 'high'` kullanın
3. **Rate limiting ayarı**: SMTP provider'ınızın limitine göre `EMAIL_RATE_LIMIT_*` değerlerini ayarlayın
4. **Queue temizliği**: Periyodik olarak tamamlanan jobları temizleyin:
   ```bash
   POST /api/queue/clean-all
   ```

## 🔄 Eski Sisteme Dönüş (Acil Durum)

Queue sisteminde sorun yaşarsanız, eski direkt gönderim sistemini kullanabilirsiniz:

```javascript
POST /api/campaigns/:id/send-direct
```

**Not**: Bu endpoint queue kullanmaz, direkt gönderim yapar.

## 📚 Ek Kaynaklar

- [Bull Documentation](https://github.com/OptimalBits/bull)
- [Bull Board Documentation](https://github.com/felixmosh/bull-board)
- [Redis Documentation](https://redis.io/documentation)

