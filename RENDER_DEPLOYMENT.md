# Render.com Deployment Rehberi

Bu rehber, Phishing Simulation System'i Render.com'a deploy etmek için gerekli adımları içerir.

## 📋 Ön Gereksinimler

1. [Render.com](https://render.com) hesabı
2. GitHub/GitLab repository (kodunuz push'lanmış olmalı)
3. MongoDB Atlas hesabı (opsiyonel ama önerilir)

## 🚀 1. Redis Instance Oluşturma

### Adım 1: Render Dashboard'a Gidin
1. [Render Dashboard](https://dashboard.render.com) açın
2. **"New +"** butonuna tıklayın
3. **"Redis"** seçin

### Adım 2: Redis Ayarları
- **Name**: `phishing-redis` (veya istediğiniz isim)
- **Region**: Backend servisinizle aynı region'ı seçin (örn: Oregon)
- **Plan**: 
  - **Free**: Test için (25MB)
  - **Starter**: $7/ay (256MB)
  - **Standard**: $15/ay (1GB)

### Adım 3: Redis Oluştur ve URL'i Kaydet
1. **"Create Redis"** butonuna tıklayın
2. Redis oluşturulduktan sonra **"Internal Redis URL"** kısmını bulun
3. URL formatı şöyle olacak: `redis://red-xxxxx:6379`
4. Bu URL'i kopyalayın (environment variables'da kullanacaksınız)

## 🗄️ 2. MongoDB Kurulumu (Opsiyonel - Atlas Önerilir)

### MongoDB Atlas Kullanımı (Önerilen)
1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) ücretsiz hesap oluşturun
2. Yeni cluster oluşturun (Free tier yeterli)
3. Database user oluşturun
4. Network Access'te **"Allow access from anywhere"** (0.0.0.0/0) ekleyin
5. Connection string'i alın:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/phishing-sim?retryWrites=true&w=majority
   ```

### Render'da MongoDB Kullanımı
Alternatif olarak Render'ın managed MongoDB servisi de kullanılabilir (ücretli).

## 🖥️ 3. Backend Web Service Oluşturma

### Adım 1: New Web Service
1. Render Dashboard → **"New +"** → **"Web Service"**
2. GitHub/GitLab repository'nizi bağlayın
3. Repository'nizi seçin

### Adım 2: Service Ayarları
- **Name**: `phishing-backend`
- **Region**: Redis ile aynı region
- **Branch**: `main` (veya deploy etmek istediğiniz branch)
- **Root Directory**: `backend` (backend klasörünüz root'ta değilse)
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `node server.js` veya `npm start`
- **Plan**: Free veya ücretli plan

### Adım 3: Environment Variables Ekleyin

**"Advanced"** → **"Add Environment Variable"** → Şu değişkenleri ekleyin:

```env
# Server
NODE_ENV=production
PORT=5000

# MongoDB (Atlas kullanıyorsanız)
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/phishing-sim?retryWrites=true&w=majority

# Redis (RENDER'DAN ALDIĞINIZ URL)
REDIS_URL=redis://red-xxxxx:6379

# Email Queue Rate Limiting
EMAIL_RATE_LIMIT_PER_SECOND=5
EMAIL_RATE_LIMIT_PER_MINUTE=100

# SMTP Configuration (Gmail örneği)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Tracking URL (Backend URL'iniz)
TRACKING_URL=https://phishing-backend.onrender.com

# Frontend URL
FRONTEND_URL=https://your-frontend.onrender.com
```

**ÖNEMLİ**: 
- `REDIS_URL` değişkenini mutlaka ekleyin (Render Redis'ten aldığınız URL)
- Local'de kullandığınız `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` değişkenlerine GEREK YOK
- Sistem otomatik olarak `REDIS_URL` varsa onu kullanacak

### Adım 4: Deploy Et
1. **"Create Web Service"** butonuna tıklayın
2. Render otomatik olarak build ve deploy edecek
3. Deploy loglarını takip edin

## 🎨 4. Frontend Deployment (React)

### Adım 1: New Static Site
1. Render Dashboard → **"New +"** → **"Static Site"**
2. Repository'nizi seçin

### Adım 2: Static Site Ayarları
- **Name**: `phishing-frontend`
- **Branch**: `main`
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `build`

### Adım 3: Environment Variables
```env
REACT_APP_API_URL=https://phishing-backend.onrender.com
```

### Adım 4: Frontend Kodu Güncelleyin

`frontend/src/services/api.js` dosyasında:

```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
```

## ✅ 5. Deploy Sonrası Kontroller

### Backend Kontrolü
1. Backend URL'inizi açın: `https://phishing-backend.onrender.com`
2. API endpoint'lerini test edin:
   ```
   GET https://phishing-backend.onrender.com/api/users
   GET https://phishing-backend.onrender.com/api/queue/stats
   ```

3. Bull Board Dashboard'a erişin:
   ```
   https://phishing-backend.onrender.com/admin/queues
   ```

### Redis Bağlantı Testi
Backend loglarında şunları görmeli:
```
✅ MongoDB bağlantısı başarılı
📊 Bull Board Dashboard: https://phishing-backend.onrender.com/admin/queues
Server 5000 portunda çalışıyor...
```

Hata görüyorsanız:
```
❌ Error: connect ECONNREFUSED 127.0.0.1:6379
```
→ `REDIS_URL` environment variable'ını kontrol edin!

## 🔧 6. Troubleshooting

### Redis Bağlantı Hatası
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Çözüm:**
1. Render Dashboard → Backend Service → Environment
2. `REDIS_URL` değişkeninin eklendiğinden emin olun
3. Redis instance'ın aynı region'da olduğundan emin olun
4. Internal Redis URL'i kullanın (daha hızlı)

### MongoDB Bağlantı Hatası

**Çözüm:**
1. MongoDB Atlas → Network Access → 0.0.0.0/0 eklenmiş mi?
2. Connection string doğru mu?
3. Username/password özel karakterler içeriyorsa encode edilmiş mi?

### SMTP Gönderim Hatası

**Çözüm:**
1. Gmail kullanıyorsanız App Password kullanın
2. SMTP bilgilerinin production ortamında da geçerli olduğundan emin olun

### Free Plan Limitations

Render.com Free plan:
- **Backend**: 750 saat/ay (yeterli)
- **Redis**: 25MB (basit testler için yeterli)
- **Sleep after 15 min inactivity**: İlk istek sonrası ~30 saniye startup süresi

**Çözüm**: Ücretli plana geçin veya "ping" servisi kullanın.

## 📊 7. Monitoring & Logs

### Backend Logs
1. Render Dashboard → Backend Service → **"Logs"**
2. Real-time logları görebilirsiniz

### Bull Board Dashboard
Queue monitoring için:
```
https://phishing-backend.onrender.com/admin/queues
```

### Redis Monitoring
1. Render Dashboard → Redis Instance
2. Connection bilgileri ve metrics

## 🔐 8. Güvenlik Önerileri

1. **Environment Variables**:
   - Hassas bilgileri kesinlikle .env'de tutun
   - .env'yi .gitignore'a ekleyin (zaten ekli olmalı)

2. **CORS Ayarları**:
   Backend'de CORS'u sadece frontend domain'i için açın:
   ```javascript
   app.use(cors({
     origin: process.env.FRONTEND_URL || 'http://localhost:3000'
   }));
   ```

3. **Redis Password**:
   - Production Redis için mutlaka password kullanın
   - Free plan'da Redis password gelmeyebilir

4. **Rate Limiting**:
   - SMTP rate limiting'i provider'ınıza göre ayarlayın
   - Gmail: ~100-500 email/gün (free hesap)

## 🎯 9. Production Checklist

- [ ] Redis instance oluşturuldu
- [ ] MongoDB Atlas kuruldu
- [ ] Backend environment variables ayarlandı
- [ ] Frontend environment variables ayarlandı
- [ ] SMTP ayarları test edildi
- [ ] API endpoints çalışıyor
- [ ] Bull Board'a erişilebiliyor
- [ ] Queue sistemi çalışıyor
- [ ] Frontend backend'e bağlanabiliyor
- [ ] CORS ayarları yapıldı

## 📞 Destek

Sorun yaşarsanız:
1. Render loglarını kontrol edin
2. Environment variables'ları tekrar gözden geçirin
3. Redis ve MongoDB connection string'lerini doğrulayın

---

**Not**: Bu deployment rehberi production ortamı içindir. Development için local Redis kullanmaya devam edebilirsiniz.

