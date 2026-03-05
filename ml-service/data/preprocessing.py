"""
Veri ön işleme ve feature engineering
Regression modeli için continuous priority değerleri (0-1 arası)
"""

import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder


def preprocess_features(data):
    """
    Feature preprocessing - 10 özellik vektörü oluşturur
    """
    # Risk score normalization (0-100 -> 0-1)
    risk_score = data.get('riskScore', 0) / 100
    
    # Risk category encoding
    risk_category = data.get('riskCategory', 'Orta')
    risk_category_map = {'Düşük': 0, 'Orta': 1, 'Yüksek': 2, 'Kritik': 3}
    risk_category_encoded = risk_category_map.get(risk_category, 1) / 3
    
    # Campaign stats
    campaign_stats = data.get('campaignStats', {})
    
    basic_click_rate = 0
    if campaign_stats.get('basic'):
        total = campaign_stats['basic'].get('total', 0)
        clicked = campaign_stats['basic'].get('clicked', 0)
        basic_click_rate = clicked / total if total > 0 else 0
    
    urgent_click_rate = 0
    if campaign_stats.get('urgent'):
        total = campaign_stats['urgent'].get('total', 0)
        clicked = campaign_stats['urgent'].get('clicked', 0)
        urgent_click_rate = clicked / total if total > 0 else 0
    
    custom_click_rate = 0
    if campaign_stats.get('custom'):
        total = campaign_stats['custom'].get('total', 0)
        clicked = campaign_stats['custom'].get('clicked', 0)
        custom_click_rate = clicked / total if total > 0 else 0
    
    # Recent trend
    recent_trend = data.get('recentTrend', {})
    recent_click_rate = recent_trend.get('clickRate', 0) / 100
    trend_value = recent_trend.get('trend', 'stable')
    trend_increasing = 1 if trend_value == 'increasing' else (0 if trend_value == 'stable' else -0.5)
    
    # Summary
    summary = data.get('summary', {})
    total_campaigns = summary.get('totalCampaigns', 0) / 100  # Normalize
    overall_click_rate = summary.get('clickRate', 0) / 100
    overall_open_rate = summary.get('openRate', 0) / 100
    
    # Feature vector
    features = np.array([
        risk_score,
        risk_category_encoded,
        basic_click_rate,
        urgent_click_rate,
        custom_click_rate,
        recent_click_rate,
        trend_increasing,
        total_campaigns,
        overall_click_rate,
        overall_open_rate
    ])
    
    return features


def calculate_priority(base_priority, click_rate, trend, campaign_specific_rate=0):
    """
    Priority hesaplama yardımcı fonksiyonu
    
    Formül:
    priority = base_priority * 0.3 + click_rate * 0.4 + trend_factor * 0.15 + campaign_specific * 0.15
    """
    trend_factor = 0.3 if trend == 'increasing' else (0.0 if trend == 'stable' else -0.1)
    
    priority = (
        base_priority * 0.3 +
        click_rate * 0.4 +
        trend_factor * 0.15 +
        campaign_specific_rate * 0.15
    )
    
    # 0-1 arasında sınırla
    return max(0.0, min(1.0, priority))


def create_labels(data):
    """
    Regression için continuous priority değerleri oluştur (0-1 arası)
    7 kategori için ayrı priority değerleri
    
    Kategoriler:
    0: phishing-basics
    1: urgent-emails
    2: link-security
    3: social-engineering
    4: company-policies
    5: advanced-threats
    6: time-based-threats
    """
    labels = np.zeros(7)
    
    # Veri çıkarımı
    risk_score = data.get('riskScore', 0)
    risk_category = data.get('riskCategory', 'Orta')
    campaign_stats = data.get('campaignStats', {})
    recent_trend = data.get('recentTrend', {})
    summary = data.get('summary', {})
    
    # Temel değerler
    total_campaigns = summary.get('totalCampaigns', 0)
    overall_click_rate = summary.get('clickRate', 0) / 100
    trend = recent_trend.get('trend', 'stable')
    
    # Kampanya bazlı tıklama oranları
    basic_total = campaign_stats.get('basic', {}).get('total', 0)
    basic_clicked = campaign_stats.get('basic', {}).get('clicked', 0)
    basic_rate = basic_clicked / basic_total if basic_total > 0 else 0
    
    urgent_total = campaign_stats.get('urgent', {}).get('total', 0)
    urgent_clicked = campaign_stats.get('urgent', {}).get('clicked', 0)
    urgent_rate = urgent_clicked / urgent_total if urgent_total > 0 else 0
    
    custom_total = campaign_stats.get('custom', {}).get('total', 0)
    custom_clicked = campaign_stats.get('custom', {}).get('clicked', 0)
    custom_rate = custom_clicked / custom_total if custom_total > 0 else 0
    
    total_clicked = basic_clicked + urgent_clicked + custom_clicked
    
    # ==========================================
    # ÖZEL DURUMLAR - ÖNCELİKLİ KONTROLLER
    # ==========================================
    
    # Hiç kampanya yoksa - çok düşük priority
    if total_campaigns == 0:
        labels[0] = 0.15  # phishing-basics - sadece genel farkındalık
        labels[1] = 0.10
        labels[2] = 0.10
        labels[3] = 0.10
        labels[4] = 0.12
        labels[5] = 0.08
        labels[6] = 0.08
        return labels
    
    # Hiç tıklama yoksa - düşük priority
    if total_clicked == 0:
        labels[0] = 0.20  # phishing-basics - koruyucu eğitim
        labels[1] = 0.15
        labels[2] = 0.12
        labels[3] = 0.12
        labels[4] = 0.15
        labels[5] = 0.10
        labels[6] = 0.10
        return labels
    
    # ==========================================
    # NORMAL DURUMLAR - GERÇEK VERİYE DAYALI
    # ==========================================
    
    # Risk bazlı base priority
    if risk_category == 'Kritik' or risk_score >= 76:
        base_priority = 0.85
    elif risk_category == 'Yüksek' or risk_score >= 51:
        base_priority = 0.65
    elif risk_category == 'Orta' or risk_score >= 26:
        base_priority = 0.45
    else:
        base_priority = 0.25
    
    # Trend faktörü
    trend_multiplier = 1.2 if trend == 'increasing' else (1.0 if trend == 'stable' else 0.85)
    
    # ==========================================
    # KATEGORİ BAZLI PRİORİTY HESAPLAMA
    # ==========================================
    
    # 0: phishing-basics - Genel tıklama oranına dayalı
    labels[0] = calculate_priority(
        base_priority,
        overall_click_rate,
        trend,
        basic_rate
    )
    
    # 1: urgent-emails - Urgent kampanya tıklamalarına dayalı
    labels[1] = calculate_priority(
        base_priority * 0.9,
        urgent_rate,
        trend,
        overall_click_rate
    )
    # Urgent tıklama yoksa düşür
    if urgent_clicked == 0:
        labels[1] *= 0.5
    
    # 2: link-security - Genel tıklama + custom kampanyalara dayalı
    labels[2] = calculate_priority(
        base_priority * 0.85,
        (overall_click_rate + custom_rate) / 2,
        trend,
        basic_rate
    )
    
    # 3: social-engineering - Urgent ve custom kampanyalara dayalı
    labels[3] = calculate_priority(
        base_priority * 0.8,
        (urgent_rate + custom_rate) / 2,
        trend,
        overall_click_rate
    )
    
    # 4: company-policies - Genel tıklama oranı ve risk skoruna dayalı
    labels[4] = calculate_priority(
        base_priority * 0.75,
        overall_click_rate * 0.8,
        trend,
        0
    )
    
    # 5: advanced-threats - Yüksek risk ve yüksek tıklama için
    if risk_score >= 51 and overall_click_rate >= 0.2:
        labels[5] = calculate_priority(
            base_priority * 0.9,
            overall_click_rate,
            trend,
            urgent_rate
        )
    else:
        labels[5] = base_priority * 0.3 * trend_multiplier
    
    # 6: time-based-threats - Trend artışı varsa öncelikli
    if trend == 'increasing':
        labels[6] = calculate_priority(
            base_priority * 0.85,
            overall_click_rate,
            trend,
            urgent_rate
        )
    else:
        labels[6] = base_priority * 0.4
    
    # Trend multiplier uygula
    labels = labels * trend_multiplier
    
    # Sınırları kontrol et (0-1 arası)
    labels = np.clip(labels, 0.0, 1.0)
    
    return labels


def create_labels_binary(data):
    """
    Eski binary label fonksiyonu - geriye uyumluluk için
    """
    labels = np.zeros(7)
    
    risk_score = data.get('riskScore', 0)
    campaign_stats = data.get('campaignStats', {})
    
    # Risk bazlı labels
    if risk_score >= 76:
        labels[0] = 1  # phishing-basics
        labels[1] = 1  # urgent-emails
    elif risk_score >= 51:
        labels[0] = 1  # phishing-basics
    elif risk_score >= 26:
        labels[0] = 1  # phishing-basics (düşük öncelik)
    
    # Kampanya bazlı labels
    if campaign_stats.get('urgent'):
        urgent_rate = campaign_stats['urgent'].get('clicked', 0) / max(1, campaign_stats['urgent'].get('total', 1))
        if urgent_rate > 0.3:
            labels[1] = 1  # urgent-emails
    
    if campaign_stats.get('basic'):
        basic_rate = campaign_stats['basic'].get('clicked', 0) / max(1, campaign_stats['basic'].get('total', 1))
        if basic_rate > 0.2:
            labels[0] = 1  # phishing-basics
    
    return labels
