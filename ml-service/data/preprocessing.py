"""
Veri ön işleme ve feature engineering
"""

import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder

def preprocess_features(data):
    """
    Feature preprocessing
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
    trend_increasing = 1 if recent_trend.get('trend') == 'increasing' else 0
    
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

def create_labels(data):
    """
    Label oluştur (multi-label)
    Her kategori için 0 veya 1
    """
    labels = np.zeros(7)  # 7 kategori
    
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

