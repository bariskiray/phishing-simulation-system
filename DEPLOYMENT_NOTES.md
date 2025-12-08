# Deployment Notları

## Render.com SMTP Sorunu ve Çözümü

### Sorun
Render.com'da mail gönderirken "Connection timeout" hatası alınıyor.

### Çözüm 1: Port 465 (SSL) Kullanın - ÖNERİLEN ✅

Render.com Dashboard → Environment Variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
NODE_ENV=production
TRACKING_URL=https://your-app.onrender.com
```

**Not**: Gmail App Password oluşturmak için:
1. Google Account → Security → 2-Step Verification
2. App Passwords → Generate
3. "Mail" seçin ve password'u kopyalayın

### Çözüm 2: SendGrid Kullanın (Ücretsiz 100 mail/gün)

1. SendGrid'e kaydolun: https://sendgrid.com/
2. API Key oluşturun
3. Environment variables:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
NODE_ENV=production
```

### Çözüm 3: Mailgun Kullanın

1. Mailgun'a kaydolun: https://mailgun.com/
2. SMTP credentials alın
3. Environment variables:

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-mailgun-smtp-user
SMTP_PASS=your-mailgun-smtp-password
NODE_ENV=production
```

## Backend Timeout Ayarları

Backend'de aşağıdaki timeout ayarları yapıldı:
- Connection Timeout: 60 saniye
- Greeting Timeout: 30 saniye
- Socket Timeout: 60 saniye
- Connection Pool: Aktif
- Rate Limit: 5 mail/saniye

## Deploy Sonrası Kontrol

1. **Render.com Logs**:
   ```
   Dashboard → Logs → "📧 SMTP Config" mesajını kontrol edin
   ```

2. **Test Mail Gönderimi**:
   - Frontend'den bir kampanya oluşturun
   - "Gönder" butonuna tıklayın
   - Logs'da mail gönderim durumunu kontrol edin

3. **Hata Durumunda**:
   ```
   - Logs'da "Mail gönderim hatası" mesajını arayın
   - SMTP config değerlerini doğrulayın
   - Port ve secure ayarlarını kontrol edin
   ```

## Önemli Notlar

⚠️ **Gmail SMTP Limitleri**:
- Günlük 500 mail limiti var
- Production için SendGrid veya Mailgun önerilir

⚠️ **Render.com Port Kısıtlamaları**:
- Port 25: Engellenmiş
- Port 587: Bazen timeout veriyor
- Port 465: En güvenilir seçenek

⚠️ **Environment Variables**:
- Render.com'da değişiklik yaptıktan sonra backend otomatik yeniden başlar
- Environment değişkenlerinde boşluk bırakmayın
- SMTP_PASS için özel karakterler sorun çıkarabilir, tırnak işareti kullanmayın

## Başarı Mesajları

✅ **Mail başarıyla gönderildiyse log'larda görülecekler**:
```
📧 SMTP Config: { host: 'smtp.gmail.com', port: 465, secure: true, user: 'your-email@gmail.com' }
🎯 Tracking pixel oluşturuluyor: https://...
✅ Tracking pixel <body> tagından sonra eklendi
📧 Mail gönderiliyor - To: user@example.com
```

## Troubleshooting

### Problem: "Connection timeout" hatası devam ediyor
**Çözüm**: Port 465 ve SMTP_SECURE=true kullanın

### Problem: "Invalid login" hatası
**Çözüm**: Gmail App Password oluşturun, normal şifre çalışmaz

### Problem: "Too many connections"
**Çözüm**: Rate limiting ayarlarını düşürün (emailService.js'de rateLimit değeri)

### Problem: Mail gidiyor ama tracking çalışmıyor
**Çözüm**: TRACKING_URL environment variable'ını kontrol edin
