# Mock Dataset Kullanım Kılavuzu

## 📊 Oluşturulan Dataset

100 kullanıcı için gerçekçi mock veri oluşturuldu:
- **Dosya**: `ml-service/data/training_data.json`
- **Format**: JSON array
- **Risk Dağılımı**:
  - Düşük: ~40 kullanıcı (40%)
  - Orta: ~32 kullanıcı (32%)
  - Yüksek: ~18 kullanıcı (18%)
  - Kritik: ~10 kullanıcı (10%)

## 🚀 Kullanım

### 1. Model Eğitimi

Mock dataset ile model eğitimi:

```bash
cd ml-service

# Virtual environment aktifleştirin
source venv/bin/activate  # macOS/Linux
# veya
venv\Scripts\activate  # Windows

# Model eğitimi
python training/train_model.py --data ./data/training_data.json --output ./models/training_need_model.pkl
```

### 2. Daha Fazla Veri Oluşturma

Farklı sayıda kullanıcı için veri oluşturma:

```bash
# 200 kullanıcı için
python3 data/generate_mock_data.py --users 200 --output training_data_200.json

# 500 kullanıcı için
python3 data/generate_mock_data.py --users 500 --output training_data_500.json
```

### 3. Veri Yapısı

Her kullanıcı için şu bilgiler içerilir:

```json
{
  "userId": "user_001",
  "riskScore": 75,
  "riskCategory": "Yüksek",
  "campaignStats": {
    "basic": { "total": 10, "clicked": 3, "opened": 5 },
    "urgent": { "total": 5, "clicked": 4, "opened": 5 },
    "custom": { "total": 8, "clicked": 2, "opened": 4 }
  },
  "recentTrend": {
    "clickRate": 45.5,
    "openRate": 60.2,
    "trend": "increasing"
  },
  "summary": {
    "totalCampaigns": 23,
    "clickRate": 35.2,
    "openRate": 60.5
  },
  "department": "IT",
  "group": "Developers",
  "susceptibility": {
    "basic": 0.65,
    "urgent": 0.80,
    "custom": 0.45
  }
}
```

## 📈 Veri Özellikleri

### Gerçekçi Dağılımlar

- **Risk Skorları**: Risk kategorisine göre gerçekçi dağılım
- **Kampanya İstatistikleri**: Risk seviyesine göre uyumlu click/open oranları
- **Trend Verileri**: Yüksek riskli kullanıcılar için artan trend
- **Departman/Grup**: Çeşitli departman ve grup kombinasyonları

### Senaryolar

Mock dataset şu senaryoları içerir:

1. **Düşük Riskli Kullanıcılar**: Az kampanya, düşük click rate
2. **Orta Riskli Kullanıcılar**: Orta seviye etkileşim
3. **Yüksek Riskli Kullanıcılar**: Yüksek click rate, artan trend
4. **Kritik Riskli Kullanıcılar**: Çok yüksek click rate, özellikle urgent kampanyalarda

## 🔄 Veri Güncelleme

Yeni mock veri oluşturmak için:

```bash
cd ml-service
python3 data/generate_mock_data.py --users 100
```

Bu komut mevcut `training_data.json` dosyasını günceller.

## ⚠️ Notlar

- Mock veri gerçek veri yerine kullanılabilir
- Model eğitimi için minimum 50-100 kayıt önerilir
- Daha iyi sonuçlar için gerçek veri kullanılmalıdır
- Mock veri her çalıştırmada farklı olacaktır (random seed yok)

## 📝 Sonraki Adımlar

1. Mock dataset ile model eğitimi yapın
2. Model performansını değerlendirin
3. Gerçek veri toplandığında modeli yeniden eğitin
4. A/B test ile model performansını karşılaştırın

