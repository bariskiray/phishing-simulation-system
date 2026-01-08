"""
Mock Dataset Generator
100 kullanıcı için gerçekçi eğitim verisi oluşturur
"""

import json
import random
from datetime import datetime, timedelta

# Departmanlar ve gruplar
DEPARTMENTS = ['IT', 'HR', 'Finance', 'Sales', 'Marketing', 'Operations', 'Legal', 'Engineering']
GROUPS = ['Managers', 'Developers', 'Analysts', 'Support', 'Executives', 'Interns', 'Contractors']

# Risk kategorileri
RISK_CATEGORIES = ['Düşük', 'Orta', 'Yüksek', 'Kritik']

def generate_mock_user_data(user_id):
    """Tek bir kullanıcı için mock veri oluştur"""
    
    # Risk skoru belirle (0-100)
    # Dağılım: %30 düşük, %40 orta, %20 yüksek, %10 kritik
    risk_distribution = random.choices(
        ['low', 'medium', 'high', 'critical'],
        weights=[30, 40, 20, 10]
    )[0]
    
    if risk_distribution == 'low':
        risk_score = random.randint(0, 25)
        risk_category = 'Düşük'
    elif risk_distribution == 'medium':
        risk_score = random.randint(26, 50)
        risk_category = 'Orta'
    elif risk_distribution == 'high':
        risk_score = random.randint(51, 75)
        risk_category = 'Yüksek'
    else:  # critical
        risk_score = random.randint(76, 100)
        risk_category = 'Kritik'
    
    # Kampanya istatistikleri
    # Basic kampanyalar
    basic_total = random.randint(5, 20)
    basic_opened = random.randint(0, basic_total)
    basic_clicked = random.randint(0, basic_opened)
    
    # Urgent kampanyalar
    urgent_total = random.randint(3, 15)
    urgent_opened = random.randint(0, urgent_total)
    urgent_clicked = random.randint(0, urgent_opened)
    
    # Custom kampanyalar
    custom_total = random.randint(4, 18)
    custom_opened = random.randint(0, custom_total)
    custom_clicked = random.randint(0, custom_opened)
    
    # Risk skoruna göre click rate'leri ayarla
    if risk_score >= 76:  # Kritik
        basic_clicked = int(basic_opened * random.uniform(0.6, 0.9))
        urgent_clicked = int(urgent_opened * random.uniform(0.7, 0.95))
        custom_clicked = int(custom_opened * random.uniform(0.5, 0.8))
    elif risk_score >= 51:  # Yüksek
        basic_clicked = int(basic_opened * random.uniform(0.4, 0.7))
        urgent_clicked = int(urgent_opened * random.uniform(0.5, 0.8))
        custom_clicked = int(custom_opened * random.uniform(0.3, 0.6))
    elif risk_score >= 26:  # Orta
        basic_clicked = int(basic_opened * random.uniform(0.2, 0.5))
        urgent_clicked = int(urgent_opened * random.uniform(0.3, 0.6))
        custom_clicked = int(custom_opened * random.uniform(0.1, 0.4))
    else:  # Düşük
        basic_clicked = int(basic_opened * random.uniform(0.0, 0.3))
        urgent_clicked = int(urgent_opened * random.uniform(0.0, 0.4))
        custom_clicked = int(custom_opened * random.uniform(0.0, 0.2))
    
    # Toplam kampanya sayısı
    total_campaigns = basic_total + urgent_total + custom_total
    
    # Genel click ve open rate
    total_opened = basic_opened + urgent_opened + custom_opened
    total_clicked = basic_clicked + urgent_clicked + custom_clicked
    
    overall_click_rate = (total_clicked / total_campaigns * 100) if total_campaigns > 0 else 0
    overall_open_rate = (total_opened / total_campaigns * 100) if total_campaigns > 0 else 0
    
    # Son 30 gün trend
    # Yüksek riskli kullanıcılar için artan trend
    if risk_score >= 51:
        recent_click_rate = overall_click_rate * random.uniform(1.1, 1.5)  # Artan
        trend = 'increasing'
    elif risk_score >= 26:
        recent_click_rate = overall_click_rate * random.uniform(0.9, 1.2)  # Stabil/Artan
        trend = random.choice(['increasing', 'stable'])
    else:
        recent_click_rate = overall_click_rate * random.uniform(0.7, 1.0)  # Azalan/Stabil
        trend = random.choice(['decreasing', 'stable'])
    
    # Recent click rate'i sınırla
    recent_click_rate = min(100, max(0, recent_click_rate))
    
    # Departman ve grup
    department = random.choice(DEPARTMENTS)
    group = random.choice(GROUPS)
    
    # Mock veri oluştur
    mock_data = {
        "userId": f"user_{user_id:03d}",
        "riskScore": risk_score,
        "riskCategory": risk_category,
        "campaignStats": {
            "basic": {
                "total": basic_total,
                "clicked": basic_clicked,
                "opened": basic_opened
            },
            "urgent": {
                "total": urgent_total,
                "clicked": urgent_clicked,
                "opened": urgent_opened
            },
            "custom": {
                "total": custom_total,
                "clicked": custom_clicked,
                "opened": custom_opened
            }
        },
        "recentTrend": {
            "clickRate": round(recent_click_rate, 2),
            "openRate": round(overall_open_rate * random.uniform(0.9, 1.1), 2),
            "trend": trend
        },
        "summary": {
            "totalCampaigns": total_campaigns,
            "clickRate": round(overall_click_rate, 2),
            "openRate": round(overall_open_rate, 2)
        },
        "department": department,
        "group": group,
        "susceptibility": {
            "basic": round(random.uniform(0.2, 0.8), 2),
            "urgent": round(random.uniform(0.3, 0.9), 2),
            "custom": round(random.uniform(0.25, 0.75), 2)
        }
    }
    
    return mock_data

def generate_mock_dataset(num_users=100, output_file='training_data.json'):
    """Mock dataset oluştur"""
    
    print(f'🔄 {num_users} kullanıcı için mock veri oluşturuluyor...')
    
    dataset = []
    
    for i in range(1, num_users + 1):
        user_data = generate_mock_user_data(i)
        dataset.append(user_data)
        
        if i % 10 == 0:
            print(f'   {i}/{num_users} kullanıcı oluşturuldu...')
    
    # Dosyaya kaydet
    output_path = f'./data/{output_file}'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)
    
    # İstatistikler
    risk_distribution = {}
    for data in dataset:
        category = data['riskCategory']
        risk_distribution[category] = risk_distribution.get(category, 0) + 1
    
    print(f'\n✅ Mock dataset oluşturuldu: {output_path}')
    print(f'   Toplam kullanıcı: {len(dataset)}')
    print(f'\n📊 Risk Dağılımı:')
    for category, count in sorted(risk_distribution.items()):
        print(f'   {category}: {count} kullanıcı ({count/len(dataset)*100:.1f}%)')
    
    # Örnek veri göster
    print(f'\n📝 Örnek Veri (İlk kullanıcı):')
    print(json.dumps(dataset[0], indent=2, ensure_ascii=False))
    
    return dataset

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Mock dataset oluşturucu')
    parser.add_argument('--users', type=int, default=100,
                       help='Kullanıcı sayısı (varsayılan: 100)')
    parser.add_argument('--output', type=str, default='training_data.json',
                       help='Çıktı dosya adı (varsayılan: training_data.json)')
    
    args = parser.parse_args()
    
    generate_mock_dataset(args.users, args.output)

