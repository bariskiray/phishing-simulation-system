"""
Gelişmiş Mock Dataset Generator
300+ kullanıcı için gerçekçi eğitim verisi oluşturur
Çeşitli senaryolar: hiç tıklama yok, yeni kullanıcı, kritik risk, vb.
"""

import json
import random
import math
from datetime import datetime, timedelta

# Departmanlar ve gruplar
DEPARTMENTS = ['IT', 'HR', 'Finance', 'Sales', 'Marketing', 'Operations', 'Legal', 'Engineering', 'Support', 'Executive']
GROUPS = ['Managers', 'Developers', 'Analysts', 'Support', 'Executives', 'Interns', 'Contractors', 'Senior', 'Junior']

# Risk kategorileri
RISK_CATEGORIES = ['Düşük', 'Orta', 'Yüksek', 'Kritik']

# Senaryo tipleri
SCENARIO_TYPES = [
    'no_campaigns',      # Hiç kampanya gönderilmemiş (%10)
    'no_clicks',         # Hiç tıklama yok (%20)
    'only_urgent',       # Sadece urgent'a tıklıyor (%10)
    'only_basic',        # Sadece basic'e tıklıyor (%10)
    'critical_risk',     # Kritik risk - yüksek tıklama (%10)
    'high_risk',         # Yüksek risk (%10)
    'medium_risk',       # Orta risk (%15)
    'low_risk',          # Düşük risk (%15)
]

SCENARIO_WEIGHTS = [10, 20, 10, 10, 10, 10, 15, 15]


def calculate_risk_score_from_clicks(click_rate, trend='stable'):
    """Tıklama oranından risk skoru hesapla"""
    base_score = click_rate * 100
    
    if trend == 'increasing':
        base_score *= 1.3
    elif trend == 'decreasing':
        base_score *= 0.7
    
    return min(100, max(0, int(base_score)))


def get_risk_category(risk_score):
    """Risk skorundan kategori belirle"""
    if risk_score >= 76:
        return 'Kritik'
    elif risk_score >= 51:
        return 'Yüksek'
    elif risk_score >= 26:
        return 'Orta'
    else:
        return 'Düşük'


def generate_no_campaigns_user(user_id):
    """Hiç kampanya gönderilmemiş kullanıcı"""
    return {
        "userId": f"user_{user_id:03d}",
        "riskScore": 0,
        "riskCategory": "Düşük",
        "campaignStats": {
            "basic": {"total": 0, "clicked": 0, "opened": 0},
            "urgent": {"total": 0, "clicked": 0, "opened": 0},
            "custom": {"total": 0, "clicked": 0, "opened": 0}
        },
        "recentTrend": {
            "clickRate": 0,
            "openRate": 0,
            "trend": "stable"
        },
        "summary": {
            "totalCampaigns": 0,
            "clickRate": 0,
            "openRate": 0
        },
        "department": random.choice(DEPARTMENTS),
        "group": random.choice(GROUPS),
        "susceptibility": {
            "basic": 0.0,
            "urgent": 0.0,
            "custom": 0.0
        },
        "scenario": "no_campaigns"
    }


def generate_no_clicks_user(user_id):
    """Kampanya var ama hiç tıklama yok - ideal kullanıcı"""
    basic_total = random.randint(5, 25)
    urgent_total = random.randint(3, 15)
    custom_total = random.randint(4, 20)
    
    # Açılmış olabilir ama tıklama yok
    basic_opened = random.randint(0, basic_total)
    urgent_opened = random.randint(0, urgent_total)
    custom_opened = random.randint(0, custom_total)
    
    total_campaigns = basic_total + urgent_total + custom_total
    total_opened = basic_opened + urgent_opened + custom_opened
    open_rate = (total_opened / total_campaigns * 100) if total_campaigns > 0 else 0
    
    return {
        "userId": f"user_{user_id:03d}",
        "riskScore": random.randint(0, 15),  # Çok düşük risk
        "riskCategory": "Düşük",
        "campaignStats": {
            "basic": {"total": basic_total, "clicked": 0, "opened": basic_opened},
            "urgent": {"total": urgent_total, "clicked": 0, "opened": urgent_opened},
            "custom": {"total": custom_total, "clicked": 0, "opened": custom_opened}
        },
        "recentTrend": {
            "clickRate": 0,
            "openRate": round(open_rate * random.uniform(0.8, 1.1), 2),
            "trend": random.choice(["stable", "decreasing"])
        },
        "summary": {
            "totalCampaigns": total_campaigns,
            "clickRate": 0,
            "openRate": round(open_rate, 2)
        },
        "department": random.choice(DEPARTMENTS),
        "group": random.choice(GROUPS),
        "susceptibility": {
            "basic": round(random.uniform(0.0, 0.2), 2),
            "urgent": round(random.uniform(0.0, 0.25), 2),
            "custom": round(random.uniform(0.0, 0.15), 2)
        },
        "scenario": "no_clicks"
    }


def generate_only_urgent_user(user_id):
    """Sadece urgent kampanyalara tıklayan kullanıcı"""
    basic_total = random.randint(8, 20)
    urgent_total = random.randint(5, 15)
    custom_total = random.randint(6, 18)
    
    basic_opened = random.randint(int(basic_total * 0.3), basic_total)
    urgent_opened = random.randint(int(urgent_total * 0.5), urgent_total)
    custom_opened = random.randint(int(custom_total * 0.2), custom_total)
    
    # Sadece urgent'a tıklama
    basic_clicked = 0
    urgent_clicked = random.randint(2, min(8, urgent_opened))  # Urgent'a tıklama
    custom_clicked = 0
    
    total_campaigns = basic_total + urgent_total + custom_total
    total_clicked = urgent_clicked
    total_opened = basic_opened + urgent_opened + custom_opened
    
    click_rate = (total_clicked / total_campaigns * 100) if total_campaigns > 0 else 0
    open_rate = (total_opened / total_campaigns * 100) if total_campaigns > 0 else 0
    
    risk_score = random.randint(35, 60)  # Orta-Yüksek arası risk
    
    return {
        "userId": f"user_{user_id:03d}",
        "riskScore": risk_score,
        "riskCategory": get_risk_category(risk_score),
        "campaignStats": {
            "basic": {"total": basic_total, "clicked": basic_clicked, "opened": basic_opened},
            "urgent": {"total": urgent_total, "clicked": urgent_clicked, "opened": urgent_opened},
            "custom": {"total": custom_total, "clicked": custom_clicked, "opened": custom_opened}
        },
        "recentTrend": {
            "clickRate": round(click_rate * random.uniform(0.9, 1.3), 2),
            "openRate": round(open_rate * random.uniform(0.9, 1.1), 2),
            "trend": "stable"
        },
        "summary": {
            "totalCampaigns": total_campaigns,
            "clickRate": round(click_rate, 2),
            "openRate": round(open_rate, 2)
        },
        "department": random.choice(DEPARTMENTS),
        "group": random.choice(GROUPS),
        "susceptibility": {
            "basic": round(random.uniform(0.1, 0.3), 2),
            "urgent": round(random.uniform(0.5, 0.85), 2),
            "custom": round(random.uniform(0.1, 0.25), 2)
        },
        "scenario": "only_urgent"
    }


def generate_only_basic_user(user_id):
    """Sadece basic kampanyalara tıklayan kullanıcı"""
    basic_total = random.randint(8, 20)
    urgent_total = random.randint(5, 15)
    custom_total = random.randint(6, 18)
    
    basic_opened = random.randint(int(basic_total * 0.5), basic_total)
    urgent_opened = random.randint(int(urgent_total * 0.3), urgent_total)
    custom_opened = random.randint(int(custom_total * 0.3), custom_total)
    
    # Sadece basic'e tıklama
    basic_clicked = random.randint(2, min(6, basic_opened))
    urgent_clicked = 0
    custom_clicked = 0
    
    total_campaigns = basic_total + urgent_total + custom_total
    total_clicked = basic_clicked
    total_opened = basic_opened + urgent_opened + custom_opened
    
    click_rate = (total_clicked / total_campaigns * 100) if total_campaigns > 0 else 0
    open_rate = (total_opened / total_campaigns * 100) if total_campaigns > 0 else 0
    
    risk_score = random.randint(25, 45)  # Orta risk
    
    return {
        "userId": f"user_{user_id:03d}",
        "riskScore": risk_score,
        "riskCategory": get_risk_category(risk_score),
        "campaignStats": {
            "basic": {"total": basic_total, "clicked": basic_clicked, "opened": basic_opened},
            "urgent": {"total": urgent_total, "clicked": urgent_clicked, "opened": urgent_opened},
            "custom": {"total": custom_total, "clicked": custom_clicked, "opened": custom_opened}
        },
        "recentTrend": {
            "clickRate": round(click_rate * random.uniform(0.8, 1.2), 2),
            "openRate": round(open_rate * random.uniform(0.9, 1.1), 2),
            "trend": random.choice(["stable", "increasing"])
        },
        "summary": {
            "totalCampaigns": total_campaigns,
            "clickRate": round(click_rate, 2),
            "openRate": round(open_rate, 2)
        },
        "department": random.choice(DEPARTMENTS),
        "group": random.choice(GROUPS),
        "susceptibility": {
            "basic": round(random.uniform(0.4, 0.7), 2),
            "urgent": round(random.uniform(0.1, 0.3), 2),
            "custom": round(random.uniform(0.15, 0.35), 2)
        },
        "scenario": "only_basic"
    }


def generate_critical_risk_user(user_id):
    """Kritik risk - yüksek tıklama oranı"""
    basic_total = random.randint(10, 25)
    urgent_total = random.randint(8, 20)
    custom_total = random.randint(8, 22)
    
    basic_opened = random.randint(int(basic_total * 0.6), basic_total)
    urgent_opened = random.randint(int(urgent_total * 0.7), urgent_total)
    custom_opened = random.randint(int(custom_total * 0.5), custom_total)
    
    # Yüksek tıklama oranları
    basic_clicked = random.randint(int(basic_opened * 0.5), int(basic_opened * 0.8))
    urgent_clicked = random.randint(int(urgent_opened * 0.6), int(urgent_opened * 0.9))
    custom_clicked = random.randint(int(custom_opened * 0.4), int(custom_opened * 0.7))
    
    total_campaigns = basic_total + urgent_total + custom_total
    total_clicked = basic_clicked + urgent_clicked + custom_clicked
    total_opened = basic_opened + urgent_opened + custom_opened
    
    click_rate = (total_clicked / total_campaigns * 100) if total_campaigns > 0 else 0
    open_rate = (total_opened / total_campaigns * 100) if total_campaigns > 0 else 0
    
    risk_score = random.randint(76, 98)  # Kritik risk
    
    return {
        "userId": f"user_{user_id:03d}",
        "riskScore": risk_score,
        "riskCategory": "Kritik",
        "campaignStats": {
            "basic": {"total": basic_total, "clicked": basic_clicked, "opened": basic_opened},
            "urgent": {"total": urgent_total, "clicked": urgent_clicked, "opened": urgent_opened},
            "custom": {"total": custom_total, "clicked": custom_clicked, "opened": custom_opened}
        },
        "recentTrend": {
            "clickRate": round(click_rate * random.uniform(1.1, 1.4), 2),
            "openRate": round(open_rate * random.uniform(1.0, 1.2), 2),
            "trend": "increasing"
        },
        "summary": {
            "totalCampaigns": total_campaigns,
            "clickRate": round(click_rate, 2),
            "openRate": round(open_rate, 2)
        },
        "department": random.choice(DEPARTMENTS),
        "group": random.choice(GROUPS),
        "susceptibility": {
            "basic": round(random.uniform(0.6, 0.9), 2),
            "urgent": round(random.uniform(0.7, 0.95), 2),
            "custom": round(random.uniform(0.5, 0.8), 2)
        },
        "scenario": "critical_risk"
    }


def generate_high_risk_user(user_id):
    """Yüksek risk kullanıcısı"""
    basic_total = random.randint(8, 22)
    urgent_total = random.randint(6, 18)
    custom_total = random.randint(6, 20)
    
    basic_opened = random.randint(int(basic_total * 0.4), basic_total)
    urgent_opened = random.randint(int(urgent_total * 0.5), urgent_total)
    custom_opened = random.randint(int(custom_total * 0.4), custom_total)
    
    # Orta-yüksek tıklama oranları
    basic_clicked = random.randint(int(basic_opened * 0.3), int(basic_opened * 0.6))
    urgent_clicked = random.randint(int(urgent_opened * 0.4), int(urgent_opened * 0.7))
    custom_clicked = random.randint(int(custom_opened * 0.2), int(custom_opened * 0.5))
    
    total_campaigns = basic_total + urgent_total + custom_total
    total_clicked = basic_clicked + urgent_clicked + custom_clicked
    total_opened = basic_opened + urgent_opened + custom_opened
    
    click_rate = (total_clicked / total_campaigns * 100) if total_campaigns > 0 else 0
    open_rate = (total_opened / total_campaigns * 100) if total_campaigns > 0 else 0
    
    risk_score = random.randint(51, 75)  # Yüksek risk
    
    return {
        "userId": f"user_{user_id:03d}",
        "riskScore": risk_score,
        "riskCategory": "Yüksek",
        "campaignStats": {
            "basic": {"total": basic_total, "clicked": basic_clicked, "opened": basic_opened},
            "urgent": {"total": urgent_total, "clicked": urgent_clicked, "opened": urgent_opened},
            "custom": {"total": custom_total, "clicked": custom_clicked, "opened": custom_opened}
        },
        "recentTrend": {
            "clickRate": round(click_rate * random.uniform(1.0, 1.3), 2),
            "openRate": round(open_rate * random.uniform(0.9, 1.1), 2),
            "trend": random.choice(["increasing", "stable"])
        },
        "summary": {
            "totalCampaigns": total_campaigns,
            "clickRate": round(click_rate, 2),
            "openRate": round(open_rate, 2)
        },
        "department": random.choice(DEPARTMENTS),
        "group": random.choice(GROUPS),
        "susceptibility": {
            "basic": round(random.uniform(0.4, 0.7), 2),
            "urgent": round(random.uniform(0.5, 0.8), 2),
            "custom": round(random.uniform(0.3, 0.6), 2)
        },
        "scenario": "high_risk"
    }


def generate_medium_risk_user(user_id):
    """Orta risk kullanıcısı"""
    basic_total = random.randint(8, 20)
    urgent_total = random.randint(5, 15)
    custom_total = random.randint(6, 18)
    
    basic_opened = random.randint(int(basic_total * 0.3), basic_total)
    urgent_opened = random.randint(int(urgent_total * 0.4), urgent_total)
    custom_opened = random.randint(int(custom_total * 0.3), custom_total)
    
    # Düşük-orta tıklama oranları
    basic_clicked = random.randint(0, int(basic_opened * 0.4))
    urgent_clicked = random.randint(0, int(urgent_opened * 0.5))
    custom_clicked = random.randint(0, int(custom_opened * 0.3))
    
    # En az bir tıklama olsun
    if basic_clicked + urgent_clicked + custom_clicked == 0:
        if random.random() > 0.5:
            basic_clicked = random.randint(1, 3)
        else:
            urgent_clicked = random.randint(1, 2)
    
    total_campaigns = basic_total + urgent_total + custom_total
    total_clicked = basic_clicked + urgent_clicked + custom_clicked
    total_opened = basic_opened + urgent_opened + custom_opened
    
    click_rate = (total_clicked / total_campaigns * 100) if total_campaigns > 0 else 0
    open_rate = (total_opened / total_campaigns * 100) if total_campaigns > 0 else 0
    
    risk_score = random.randint(26, 50)  # Orta risk
    
    return {
        "userId": f"user_{user_id:03d}",
        "riskScore": risk_score,
        "riskCategory": "Orta",
        "campaignStats": {
            "basic": {"total": basic_total, "clicked": basic_clicked, "opened": basic_opened},
            "urgent": {"total": urgent_total, "clicked": urgent_clicked, "opened": urgent_opened},
            "custom": {"total": custom_total, "clicked": custom_clicked, "opened": custom_opened}
        },
        "recentTrend": {
            "clickRate": round(click_rate * random.uniform(0.8, 1.2), 2),
            "openRate": round(open_rate * random.uniform(0.9, 1.1), 2),
            "trend": random.choice(["stable", "increasing", "decreasing"])
        },
        "summary": {
            "totalCampaigns": total_campaigns,
            "clickRate": round(click_rate, 2),
            "openRate": round(open_rate, 2)
        },
        "department": random.choice(DEPARTMENTS),
        "group": random.choice(GROUPS),
        "susceptibility": {
            "basic": round(random.uniform(0.2, 0.5), 2),
            "urgent": round(random.uniform(0.3, 0.6), 2),
            "custom": round(random.uniform(0.2, 0.45), 2)
        },
        "scenario": "medium_risk"
    }


def generate_low_risk_user(user_id):
    """Düşük risk kullanıcısı - çok az tıklama"""
    basic_total = random.randint(10, 25)
    urgent_total = random.randint(5, 18)
    custom_total = random.randint(8, 20)
    
    basic_opened = random.randint(int(basic_total * 0.4), basic_total)
    urgent_opened = random.randint(int(urgent_total * 0.3), urgent_total)
    custom_opened = random.randint(int(custom_total * 0.4), custom_total)
    
    # Çok düşük tıklama oranları (0-2 tıklama)
    basic_clicked = random.randint(0, min(2, basic_opened))
    urgent_clicked = random.randint(0, min(1, urgent_opened))
    custom_clicked = random.randint(0, min(1, custom_opened))
    
    total_campaigns = basic_total + urgent_total + custom_total
    total_clicked = basic_clicked + urgent_clicked + custom_clicked
    total_opened = basic_opened + urgent_opened + custom_opened
    
    click_rate = (total_clicked / total_campaigns * 100) if total_campaigns > 0 else 0
    open_rate = (total_opened / total_campaigns * 100) if total_campaigns > 0 else 0
    
    risk_score = random.randint(5, 25)  # Düşük risk
    
    return {
        "userId": f"user_{user_id:03d}",
        "riskScore": risk_score,
        "riskCategory": "Düşük",
        "campaignStats": {
            "basic": {"total": basic_total, "clicked": basic_clicked, "opened": basic_opened},
            "urgent": {"total": urgent_total, "clicked": urgent_clicked, "opened": urgent_opened},
            "custom": {"total": custom_total, "clicked": custom_clicked, "opened": custom_opened}
        },
        "recentTrend": {
            "clickRate": round(click_rate * random.uniform(0.7, 1.0), 2),
            "openRate": round(open_rate * random.uniform(0.9, 1.1), 2),
            "trend": random.choice(["stable", "decreasing"])
        },
        "summary": {
            "totalCampaigns": total_campaigns,
            "clickRate": round(click_rate, 2),
            "openRate": round(open_rate, 2)
        },
        "department": random.choice(DEPARTMENTS),
        "group": random.choice(GROUPS),
        "susceptibility": {
            "basic": round(random.uniform(0.1, 0.3), 2),
            "urgent": round(random.uniform(0.15, 0.35), 2),
            "custom": round(random.uniform(0.1, 0.25), 2)
        },
        "scenario": "low_risk"
    }


def generate_user_by_scenario(user_id, scenario):
    """Senaryo tipine göre kullanıcı oluştur"""
    generators = {
        'no_campaigns': generate_no_campaigns_user,
        'no_clicks': generate_no_clicks_user,
        'only_urgent': generate_only_urgent_user,
        'only_basic': generate_only_basic_user,
        'critical_risk': generate_critical_risk_user,
        'high_risk': generate_high_risk_user,
        'medium_risk': generate_medium_risk_user,
        'low_risk': generate_low_risk_user,
    }
    
    return generators[scenario](user_id)


def generate_mock_dataset(num_users=300, output_file='training_data.json'):
    """Mock dataset oluştur"""
    
    print(f'🔄 {num_users} kullanıcı için mock veri oluşturuluyor...')
    
    dataset = []
    scenario_counts = {s: 0 for s in SCENARIO_TYPES}
    
    for i in range(1, num_users + 1):
        # Senaryo seç
        scenario = random.choices(SCENARIO_TYPES, weights=SCENARIO_WEIGHTS)[0]
        scenario_counts[scenario] += 1
        
        user_data = generate_user_by_scenario(i, scenario)
        dataset.append(user_data)
        
        if i % 50 == 0:
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
    
    print(f'\n📊 Senaryo Dağılımı:')
    for scenario, count in sorted(scenario_counts.items()):
        print(f'   {scenario}: {count} kullanıcı ({count/len(dataset)*100:.1f}%)')
    
    print(f'\n📊 Risk Dağılımı:')
    for category, count in sorted(risk_distribution.items()):
        print(f'   {category}: {count} kullanıcı ({count/len(dataset)*100:.1f}%)')
    
    # Click istatistikleri
    total_no_click = sum(1 for d in dataset if (
        d['campaignStats']['basic']['clicked'] + 
        d['campaignStats']['urgent']['clicked'] + 
        d['campaignStats']['custom']['clicked']
    ) == 0)
    
    print(f'\n📊 Tıklama İstatistikleri:')
    print(f'   Hiç tıklamayan: {total_no_click} kullanıcı ({total_no_click/len(dataset)*100:.1f}%)')
    
    # Örnek veri göster
    print(f'\n📝 Örnek Veriler:')
    for scenario in ['no_campaigns', 'no_clicks', 'critical_risk']:
        example = next((d for d in dataset if d.get('scenario') == scenario), None)
        if example:
            print(f'\n   --- {scenario} ---')
            print(f'   Risk: {example["riskScore"]} ({example["riskCategory"]})')
            clicks = (example['campaignStats']['basic']['clicked'] + 
                     example['campaignStats']['urgent']['clicked'] + 
                     example['campaignStats']['custom']['clicked'])
            print(f'   Toplam tıklama: {clicks}')
    
    return dataset


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Gelişmiş mock dataset oluşturucu')
    parser.add_argument('--users', type=int, default=300,
                       help='Kullanıcı sayısı (varsayılan: 300)')
    parser.add_argument('--output', type=str, default='training_data.json',
                       help='Çıktı dosya adı (varsayılan: training_data.json)')
    
    args = parser.parse_args()
    
    generate_mock_dataset(args.users, args.output)
